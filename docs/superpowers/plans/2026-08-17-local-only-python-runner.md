# Local-only Python Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run Python in a timeout-safe Pyodide Web Worker and show its latest result in React without initializing or calling Supabase.

**Architecture:** A pure execution adapter is called by a module Worker. A React hook owns the existing Worker-client lifecycle; focused components render editor, status, and result. No repository boundary is connected to `App`.

**Tech Stack:** Vite, React 19, TypeScript, Pyodide, Vitest, React Testing Library, Playwright.

## Global Constraints

- Do not import, initialize, or call `@supabase/supabase-js` from application code.
- Do not render persistence, history, configuration, save, or retry UI.
- Maintain one active execution and the existing 10-second Worker timeout recovery.
- Use TDD: observe every new behavior test fail before implementation.

---

## File structure

- `src/python/executePython.ts`: structured output capture.
- `src/python/pyodide.worker.ts`: one-time Pyodide initialization and Worker protocol adapter.
- `src/hooks/usePythonRunner.ts`: client lifecycle and result state.
- `src/components/CodeEditor.tsx`: labelled source input and execution control.
- `src/components/CurrentResult.tsx`: separated semantic output fields.
- `src/styles.css`: responsive local-only runner presentation.
- `e2e/pyodide.spec.ts`: real-browser Worker smoke tests.

### Task 1: Execute Python in a module Worker

**Files:**

- Create: `src/python/executePython.test.ts`
- Create: `src/python/executePython.ts`
- Create: `src/python/pyodide.worker.ts`

**Interfaces:**

- Consumes: `WorkerRequestMessage` and `WorkerResponseMessage` from `src/python/protocol.ts`.
- Produces: `executePython(pyodide, code, now): Promise<ExecutionPayload>`, whose payload has `stdout`, `stderr`, `result`, `error`, and `durationMs`.

- [x] **Step 1: Write failing behavior tests**

```ts
it('captures stdout, stderr, final value, and duration', async () => {
  const runtime = createPyodide({ value: '3', stdout: ['hello'], stderr: ['warn'] })
  await expect(executePython(runtime, '1 + 2', () => 12)).resolves.toEqual({
    stdout: 'hello', stderr: 'warn', result: '3', error: '', durationMs: 0,
  })
})

it('preserves output and returns an error when Python throws', async () => {
  const runtime = createPyodide({ error: new Error('Traceback: boom') })
  await expect(executePython(runtime, 'raise', () => 0)).resolves.toMatchObject({
    result: '', error: expect.stringContaining('Traceback: boom'),
  })
})

it('converts a proxy to text and destroys it', async () => {
  const destroy = vi.fn()
  const runtime = createPyodide({ value: { toString: () => 'value', destroy } })
  await executePython(runtime, 'value', () => 0)
  expect(destroy).toHaveBeenCalledOnce()
})
```

- [x] **Step 2: Verify RED**

Run: `npm run test:run -- src/python/executePython.test.ts`

Expected: FAIL because `executePython` does not exist.

- [x] **Step 3: Implement the adapter**

```ts
export interface ExecutionPayload {
  stdout: string; stderr: string; result: string; error: string; durationMs: number
}

export async function executePython(pyodide: PyodideLike, code: string, now: () => number): Promise<ExecutionPayload> {
  let stdout = ''; let stderr = ''; const startedAt = now()
  pyodide.setStdout({ batched: text => { stdout += text } })
  pyodide.setStderr({ batched: text => { stderr += text } })
  try {
    const value = await pyodide.runPythonAsync(code)
    const result = value == null ? '' : String(value)
    if (value && typeof value === 'object' && 'destroy' in value && typeof value.destroy === 'function') value.destroy()
    return { stdout, stderr, result, error: '', durationMs: now() - startedAt }
  } catch (error) {
    const readable = error instanceof Error ? (error.stack ?? error.message) : String(error)
    return { stdout, stderr, result: '', error: readable, durationMs: now() - startedAt }
  }
}
```

Add `pyodide.worker.ts` with `const ready = loadPyodide()`. On `init`, await it then post `ready`, or `init-error` with a readable message. On `run`, call `executePython(pyodide, code, performance.now.bind(performance))` and post a `result` using the original request ID. Do not access DOM APIs.

- [x] **Step 4: Verify GREEN**

Run: `npm run test:run -- src/python/executePython.test.ts && npm run typecheck && npm run build`

Expected: passing tests, zero type errors, and a Worker-containing Vite build.

- [x] **Step 5: Commit**

```bash
git add src/python/executePython.ts src/python/executePython.test.ts src/python/pyodide.worker.ts
git commit -m "feat: execute python in pyodide worker"
```

### Task 2: Add the local-only React execution workflow

**Files:**

- Create: `src/hooks/usePythonRunner.ts`
- Create: `src/components/CodeEditor.tsx`
- Create: `src/components/CurrentResult.tsx`
- Modify: `src/App.tsx`
- Replace: `src/App.test.tsx`

**Interfaces:**

- Consumes: `PyodideWorkerClient` and `normalizeWorkerResult`.
- Produces: `usePythonRunner(client)` with `state`, `run(code)`, `retry()`, and `currentResult`. `App` accepts an optional test client.

- [x] **Step 1: Write failing workflow tests**

```tsx
it('disables Run Python until the client is ready', async () => {
  render(<App client={client} />)
  expect(screen.getByRole('button', { name: /run python/i })).toBeDisabled()
  resolveInitialization()
  expect(await screen.findByRole('button', { name: /run python/i })).toBeEnabled()
})

it('renders a run result without any persistence UI', async () => {
  client.run.mockResolvedValue(result({ stdout: 'hello', result: '3', durationMs: 12 }))
  render(<App client={client} />); resolveInitialization()
  await userEvent.click(await screen.findByRole('button', { name: /run python/i }))
  expect(await screen.findByText('hello')).toBeVisible()
  expect(screen.getByText('3', { exact: true })).toBeVisible()
  expect(screen.queryByText(/history|save|supabase/i)).not.toBeInTheDocument()
})
```

Also test Python error rendering, duplicate-run prevention, init retry, and recovery from a `PYTHON_TIMEOUT`.

- [x] **Step 2: Verify RED**

Run: `npm run test:run -- src/App.test.tsx`

Expected: FAIL because the shell App lacks the workflow.

- [x] **Step 3: Implement hook and components**

```tsx
export function App({ client = new PyodideWorkerClient() }: { client?: PyodideWorkerClient }) {
  const runner = usePythonRunner(client)
  return <main><h1>Python Runner</h1><CodeEditor {...runner} /><CurrentResult result={runner.currentResult} /></main>
}
```

`usePythonRunner` initializes on mount, disposes on unmount, exposes `initializing | ready | running | recovering | init-error`, and normalizes successful Worker responses. It renders client failures as an error result. `CodeEditor` must associate a `Python code` label with `textarea#python-code`, show readiness with `role="status"`, and provide an init retry button. `CurrentResult` shows only non-empty stdout, stderr, result, and error fields in individually labelled sections; values are `<pre>` elements and errors use `role="alert"`. Do not add any repository or Supabase imports.

- [x] **Step 4: Verify GREEN**

Run: `npm run test:run -- src/App.test.tsx && npm run typecheck`

Expected: all workflow tests pass with no TypeScript errors.

- [x] **Step 5: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/components src/hooks
git commit -m "feat: add local-only python runner"
```

### Task 3: Add responsive accessible styling

**Files:**

- Create: `src/styles.css`
- Modify: `src/main.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**

- Consumes: labelled controls and semantic regions from Task 2.
- Produces: a readable one-column screen that works at narrow and wide viewport widths.

- [x] **Step 1: Write failing accessibility tests**

```tsx
expect(screen.getByLabelText(/python code/i)).toBeVisible()
expect(screen.getByRole('status')).toBeVisible()
expect(screen.getByRole('button', { name: /run python/i })).toBeVisible()
expect(screen.getByRole('alert')).toHaveTextContent('ValueError')
```

- [x] **Step 2: Verify RED**

Run: `npm run test:run -- src/App.test.tsx`

Expected: FAIL until absent semantics are implemented.

- [x] **Step 3: Implement styling**

Import `./styles.css` from `src/main.tsx`. Style a one-column `main` with a 72rem maximum width, system body type, monospace editor/output, `white-space: pre-wrap`, high-contrast visible `:focus-visible`, and responsive padding. Do not build an empty second history column.

- [x] **Step 4: Verify GREEN**

Run: `npm run test:run -- src/App.test.tsx && npm run typecheck && npm run build`

Expected: passing tests, typecheck, and production build.

- [x] **Step 5: Commit**

```bash
git add src/styles.css src/main.tsx src/App.test.tsx src/components
git commit -m "feat: style accessible python runner"
```

### Task 4: Add browser smoke tests and local-only documentation

**Files:**

- Create: `playwright.config.ts`
- Create: `e2e/pyodide.spec.ts`
- Create: `README.md`
- Modify: `package.json`

**Interfaces:**

- Consumes: the production Vite app.
- Produces: two Chromium smoke tests needing no Supabase project or credentials.

- [x] **Step 1: Write failing browser tests**

```ts
test('runs Python in a Worker', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /run python/i })).toBeEnabled({ timeout: 30_000 })
  await page.getByLabel(/python code/i).fill('print("hello")\n1 + 2')
  await page.getByRole('button', { name: /run python/i }).click()
  await expect(page.getByText('hello', { exact: true })).toBeVisible()
  await expect(page.getByText('3', { exact: true })).toBeVisible()
})
test('shows a Python exception', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/python code/i).fill('raise ValueError("boom")')
  await page.getByRole('button', { name: /run python/i }).click()
  await expect(page.getByRole('alert')).toContainText('ValueError')
})
```

- [x] **Step 2: Verify RED**

Run: `npm run test:e2e`

Expected: FAIL because Playwright configuration is absent.

- [x] **Step 3: Configure browser testing and documentation**

Use a Chromium `playwright.config.ts` with `baseURL: 'http://127.0.0.1:4173'` and a reusable `npm run dev -- --host 127.0.0.1 --port 4173` web server. README must provide prerequisites, install/dev/test/typecheck/build/e2e commands, sample code, timeout recovery behavior, and explicitly state that Supabase code is present but inactive and no credentials are needed.

- [x] **Step 4: Verify final result**

Run: `npm run test:run && npm run typecheck && npm run build && npm run test:e2e`

Expected: all unit/integration tests, typecheck, build, and two Chromium smoke tests pass.

- [x] **Step 5: Commit**

```bash
git add playwright.config.ts e2e/pyodide.spec.ts README.md package.json package-lock.json
git commit -m "test: add local pyodide smoke coverage"
```

