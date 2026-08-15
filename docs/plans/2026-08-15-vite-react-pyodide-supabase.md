# Vite React Pyodide Supabase Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Run Python in a Pyodide Web Worker, display structured results in React, and persist and reload the latest runs from hosted Supabase.

**Architecture:** A React UI owns user state and coordinates two adapters: a request/response client around a module Web Worker and a repository around the Supabase browser client. The Worker owns Pyodide initialization and Python execution; a 10-second timeout terminates and recreates it. Execution and persistence errors remain independent so database failures never discard a valid Python result.

**Tech Stack:** Vite, React, TypeScript, Pyodide, Supabase JavaScript client, Vitest, React Testing Library, Playwright

---

## Preconditions

- Use Node.js 20 or newer.
- Use a hosted Supabase project dedicated to testing.
- Never place a Supabase service-role key in this project.
- Execute every task with `@test-driven-development` and finish with `@verification-before-completion`.

### Task 1: Scaffold the Vite React test harness

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/test/setup.ts`
- Create: `src/App.test.tsx`
- Create: `.gitignore`

**Step 1: Create package metadata and install dependencies**

Initialize the package and define the scripts exactly:

Run:

```bash
npm init -y
npm pkg set type=module
npm pkg set scripts.dev=vite scripts.build="tsc -b && vite build" scripts.typecheck="tsc -b --pretty false" scripts.test=vitest scripts.test:run="vitest run" scripts.test:e2e=playwright\ test
npm install react react-dom pyodide @supabase/supabase-js
npm install -D vite typescript @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom @playwright/test
```

Expected: dependencies install and `package-lock.json` is created.

**Step 2: Write the failing shell test**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the project heading', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /python runner/i }),
    ).toBeInTheDocument()
  })
})
```

Configure Vitest with `environment: 'jsdom'` and `setupFiles: ['./src/test/setup.ts']`. Import `@testing-library/jest-dom/vitest` in the setup file.

Use this Vite configuration:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

Add `/// <reference types="vitest/config" />` if the installed Vite/Vitest type combination does not recognize the `test` property.

**Step 3: Run the test to verify it fails**

Run: `npm run test:run -- src/App.test.tsx`

Expected: FAIL because `App` does not yet exist or does not render the heading.

**Step 4: Implement the minimal shell**

Create `src/App.tsx`:

```tsx
export function App() {
  return <h1>Python Runner</h1>
}
```

Create the standard Vite `index.html` and `src/main.tsx` entry that renders `<App />` into `#root`. Configure strict TypeScript project references and Vite's React plugin.

**Step 5: Verify the scaffold**

Run:

```bash
npm run test:run -- src/App.test.tsx
npm run typecheck
npm run build
```

Expected: one passing test, zero TypeScript errors, and a successful Vite build.

**Step 6: Commit**

```bash
git add .gitignore package.json package-lock.json index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts src/main.tsx src/App.tsx src/App.test.tsx src/test/setup.ts
git commit -m "chore: scaffold vite react test app"
```

### Task 2: Define the execution domain and Worker protocol

**Files:**
- Create: `src/python/types.ts`
- Create: `src/python/protocol.ts`
- Create: `src/python/result.ts`
- Test: `src/python/result.test.ts`

**Step 1: Write the failing normalization tests**

```ts
import { describe, expect, it } from 'vitest'
import { normalizeWorkerResult } from './result'

describe('normalizeWorkerResult', () => {
  it('maps a successful worker response', () => {
    expect(normalizeWorkerResult({
      type: 'result', requestId: '1', stdout: 'hello\n', stderr: '',
      result: '3', error: '', durationMs: 12,
    }, 'print("hello")\n1 + 2')).toEqual({
      code: 'print("hello")\n1 + 2', stdout: 'hello\n', stderr: '',
      result: '3', error: '', status: 'success', durationMs: 12,
    })
  })

  it('marks a traceback as an error', () => {
    expect(normalizeWorkerResult({
      type: 'result', requestId: '2', stdout: '', stderr: '', result: '',
      error: 'Traceback: ValueError', durationMs: 3,
    }, 'raise ValueError()').status).toBe('error')
  })
})
```

The final function signature is `normalizeWorkerResult(message, code)`.

**Step 2: Run the test to verify it fails**

Run: `npm run test:run -- src/python/result.test.ts`

Expected: FAIL because the modules do not exist.

**Step 3: Implement protocol and types**

Define:

```ts
export type RunStatus = 'success' | 'error'

export interface PythonRunDraft {
  code: string
  stdout: string
  stderr: string
  result: string
  error: string
  status: RunStatus
  durationMs: number
}

export interface PythonRun extends PythonRunDraft {
  id: string
  createdAt: string
}
```

The Worker protocol must be a discriminated union containing `init`, `ready`, `run`, `result`, and `init-error` messages. Every run and result message carries `requestId`. Keep all payloads structured-clone-safe strings and numbers.

Implement `normalizeWorkerResult` as a pure mapper. Treat a non-empty `error` as `status: 'error'`; otherwise use `success`.

**Step 4: Run tests**

Run: `npm run test:run -- src/python/result.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/python
git commit -m "feat: define python execution protocol"
```

### Task 3: Build the timeout-safe Worker client

**Files:**
- Create: `src/python/PyodideWorkerClient.ts`
- Test: `src/python/PyodideWorkerClient.test.ts`

**Step 1: Write failing tests with a fake Worker**

Cover these behaviors:

```ts
it('resolves init after a ready message')
it('matches results to request ids')
it('rejects a run while another run is active')
it('terminates and recreates the worker after 10 seconds')
it('can initialize and run again after timeout recovery')
it('removes listeners and terminates on dispose')
```

Inject both dependencies:

```ts
type WorkerFactory = () => Worker

new PyodideWorkerClient({
  createWorker,
  timeoutMs: 10_000,
})
```

Use Vitest fake timers for timeout tests. Assert that timeout returns or rejects with a typed error whose code is `PYTHON_TIMEOUT`.

**Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/python/PyodideWorkerClient.test.ts`

Expected: FAIL because `PyodideWorkerClient` does not exist.

**Step 3: Implement the minimal client**

The public API is:

```ts
export class PyodideWorkerClient {
  initialize(): Promise<void>
  run(code: string): Promise<WorkerResultMessage>
  dispose(): void
}
```

Create the production worker with:

```ts
() => new Worker(new URL('./pyodide.worker.ts', import.meta.url), {
  type: 'module',
})
```

Maintain one active request. On timeout, terminate the current Worker, reject the request, construct a replacement, and immediately begin replacement initialization. Ignore messages from replaced Workers.

**Step 4: Run tests**

Run: `npm run test:run -- src/python/PyodideWorkerClient.test.ts`

Expected: all client tests PASS.

**Step 5: Commit**

```bash
git add src/python/PyodideWorkerClient.ts src/python/PyodideWorkerClient.test.ts
git commit -m "feat: add timeout-safe pyodide worker client"
```

### Task 4: Implement the Pyodide Worker runtime

**Files:**
- Create: `src/python/pyodide.worker.ts`
- Create: `src/python/executePython.ts`
- Test: `src/python/executePython.test.ts`

**Step 1: Write failing execution tests**

Extract execution into an adapter that accepts a minimal Pyodide-like object. Test:

```ts
it('captures stdout, result, and duration')
it('captures stderr and traceback on failure')
it('returns an empty result for Python None')
it('destroys a returned PyProxy after converting it to text')
it('resets captured output between runs')
```

The adapter signature is:

```ts
executePython(pyodide, code, now): Promise<ExecutionPayload>
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/python/executePython.test.ts`

Expected: FAIL because the adapter does not exist.

**Step 3: Implement execution capture**

Use `pyodide.setStdout({ batched })` and `setStderr({ batched })`, then call `runPythonAsync(code)`. Convert a non-null result with `String(result)` and call `destroy()` when the value exposes it. Calculate `durationMs` with the injected clock. Convert caught values to an error string using `error.stack ?? error.message ?? String(error)`.

**Step 4: Implement the Worker entry**

Load Pyodide once:

```ts
import { loadPyodide } from 'pyodide'

const ready = loadPyodide()
```

Handle `init` by awaiting `ready` and posting `ready` or `init-error`. Handle `run` by awaiting the same instance, calling `executePython`, and posting a `result` message with the original request ID. Do not access DOM APIs.

**Step 5: Run tests and build**

Run:

```bash
npm run test:run -- src/python/executePython.test.ts
npm run typecheck
npm run build
```

Expected: tests PASS and Vite bundles the module Worker successfully.

**Step 6: Commit**

```bash
git add src/python/executePython.ts src/python/executePython.test.ts src/python/pyodide.worker.ts
git commit -m "feat: execute python in pyodide worker"
```

### Task 5: Add the Supabase schema and run repository

**Files:**
- Create: `supabase/migrations/20260815000000_create_python_runs.sql`
- Create: `src/runs/RunRepository.ts`
- Create: `src/runs/SupabaseRunRepository.ts`
- Create: `src/runs/createRunRepository.ts`
- Test: `src/runs/SupabaseRunRepository.test.ts`
- Create: `.env.example`

**Step 1: Write failing repository tests**

Use a small fake Supabase query builder and cover:

```ts
it('inserts a snake_case row and returns the stored run')
it('selects the latest 20 runs in descending creation order')
it('maps database rows to camelCase domain objects')
it('throws a repository error with the Supabase message')
```

Define the interface:

```ts
export interface RunRepository {
  save(run: PythonRunDraft): Promise<PythonRun>
  listLatest(limit?: number): Promise<PythonRun[]>
}
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/runs/SupabaseRunRepository.test.ts`

Expected: FAIL because repository modules do not exist.

**Step 3: Write the database migration**

Create `python_runs` with the approved columns, a `status in ('success', 'error')` check, non-negative `duration_ms`, defaults for text fields, and an index on `created_at desc`. Enable RLS and add explicit test-only `anon` select and insert policies. Add SQL comments warning that these policies are for a disposable public test table, not production data.

**Step 4: Implement the repository**

Use `insert(row).select().single()` for save and:

```ts
.select('id, code, stdout, stderr, result, error, status, duration_ms, created_at')
.order('created_at', { ascending: false })
.limit(limit)
```

Create the Supabase client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. If either is absent, return a repository whose methods reject with a clear configuration error; do not crash application startup.

Create `.env.example` with empty placeholder values only.

**Step 5: Run tests**

Run: `npm run test:run -- src/runs/SupabaseRunRepository.test.ts`

Expected: repository tests PASS.

**Step 6: Commit**

```bash
git add supabase/migrations src/runs .env.example
git commit -m "feat: persist python runs with supabase"
```

### Task 6: Implement the React execution workflow

**Files:**
- Create: `src/components/CodeEditor.tsx`
- Create: `src/components/CurrentResult.tsx`
- Create: `src/components/RunHistory.tsx`
- Create: `src/hooks/usePythonRunner.ts`
- Create: `src/hooks/useRunHistory.ts`
- Modify: `src/App.tsx`
- Replace: `src/App.test.tsx`

**Step 1: Write failing user-flow tests**

Inject a Worker client and repository into `App` through props with production defaults. Cover:

```ts
it('disables Run until Pyodide is ready')
it('runs code and renders stdout, final value, and duration')
it('saves a successful run then reloads history')
it('renders a Python traceback and saves an error run')
it('keeps the Python result visible when saving fails')
it('allows retrying a failed save without rerunning Python')
it('keeps execution enabled when history loading fails')
it('disables duplicate execution while a run is active')
it('shows timeout and becomes runnable after Worker recovery')
```

Use user-event to type code and click buttons. Mock only the two boundary interfaces; do not mock React internals.

**Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/App.test.tsx`

Expected: FAIL because the workflow UI is absent.

**Step 3: Implement the hooks**

`usePythonRunner` owns `initializing | ready | running | recovering | init-error`, the current code execution, and cleanup on unmount. It converts Worker results with `normalizeWorkerResult`.

`useRunHistory` owns `idle | loading | ready | error`, loads 20 records, saves the current draft, retains a failed draft for manual retry, and refreshes after successful save.

Keep the hook states independent.

**Step 4: Implement the components**

- `CodeEditor`: a labelled monospace `<textarea>`, Run button, readiness text, and init retry.
- `CurrentResult`: separate sections for stdout, stderr, final value, error, and duration; include persistence status and Retry save.
- `RunHistory`: latest-first list with code preview, status, timestamp, and duration; include Retry load.

Use this initial sample:

```py
print("Hello from Pyodide")
sum(range(10))
```

**Step 5: Run focused tests**

Run: `npm run test:run -- src/App.test.tsx`

Expected: all workflow tests PASS.

**Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/components src/hooks
git commit -m "feat: add python runner workflow"
```

### Task 7: Add responsive styling and accessible states

**Files:**
- Create: `src/styles.css`
- Modify: `src/main.tsx`
- Modify: `src/App.test.tsx`

**Step 1: Add failing accessibility assertions**

Assert that:

- the editor has an accessible label;
- async status messages use `role="status"`;
- errors use `role="alert"`;
- output uses semantic headings and preformatted regions;
- buttons have unambiguous accessible names.

**Step 2: Run tests to verify the new assertions fail**

Run: `npm run test:run -- src/App.test.tsx`

Expected: FAIL on missing roles or labels.

**Step 3: Implement layout and states**

Create a two-column desktop layout with the editor and current result on the left and history on the right. Collapse to one column below 900px. Use a restrained system font, a monospace editor and output, visible keyboard focus, adequate contrast, wrapping for long tracebacks, and no animation that blocks interaction.

Import `styles.css` from `main.tsx` and add the semantic attributes required by the tests.

**Step 4: Verify tests and build**

Run:

```bash
npm run test:run -- src/App.test.tsx
npm run typecheck
npm run build
```

Expected: tests PASS and production build succeeds.

**Step 5: Commit**

```bash
git add src/styles.css src/main.tsx src/App.test.tsx src/components
git commit -m "feat: style accessible python runner"
```

### Task 8: Add real-browser smoke coverage and setup documentation

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/pyodide.spec.ts`
- Create: `README.md`
- Modify: `package.json`

**Step 1: Write the browser smoke test**

Test the real Worker and Pyodide runtime:

```ts
test('runs Python without blocking the page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /run python/i })).toBeEnabled({
    timeout: 30_000,
  })
  await page.getByLabel(/python code/i).fill('print("hello")\n1 + 2')
  await page.getByRole('button', { name: /run python/i }).click()
  await expect(page.getByText('hello', { exact: true })).toBeVisible()
  await expect(page.getByText('3', { exact: true })).toBeVisible()
})
```

Add a second smoke test for `raise ValueError("boom")`. Keep the 10-second infinite-loop recovery as a manual hosted-browser check because WebAssembly cancellation timing is expensive and environment-sensitive in routine CI.

**Step 2: Run the smoke test before configuration**

Run: `npm run test:e2e`

Expected: FAIL because Playwright and its web server are not configured yet.

**Step 3: Configure Playwright**

Use Chromium, `baseURL: 'http://127.0.0.1:4173'`, and a web server command of `npm run dev -- --host 127.0.0.1 --port 4173`. Reuse an existing server outside CI.

**Step 4: Document setup and manual Supabase verification**

README must include:

1. prerequisites and install commands;
2. applying the SQL migration in the hosted Supabase SQL editor;
3. copying `.env.example` to `.env.local` and setting only URL and publishable/anon key;
4. local development, test, typecheck, build, and e2e commands;
5. warning about public test-only RLS policies;
6. manual checks for saving, refresh/reload, timeout recovery, save retry, and history retry.

**Step 5: Run the browser smoke test**

Run: `npx playwright install chromium` once if Chromium is unavailable, then `npm run test:e2e`.

Expected: two passing browser tests. If Pyodide CDN assets cannot be fetched in the execution environment, record that exact environmental limitation and rerun in a network-enabled browser before completion.

**Step 6: Commit**

```bash
git add playwright.config.ts e2e/pyodide.spec.ts README.md package.json package-lock.json
git commit -m "test: add pyodide browser smoke coverage"
```

### Task 9: Apply hosted Supabase configuration and perform final verification

**Files:**
- Local only: `.env.local`
- Verify: all project files

**Step 1: Apply the migration**

Run the migration in the dedicated hosted Supabase project. Confirm the `python_runs` table, check constraints, index, RLS enablement, and test-only policies exist.

**Step 2: Configure local public credentials**

Create `.env.local` from `.env.example` and fill in the project URL and publishable/anon key. Confirm `.env.local` remains ignored by Git.

**Step 3: Run the full automated verification**

Run:

```bash
npm run test:run
npm run typecheck
npm run build
npm run test:e2e
```

Expected: all unit and integration tests pass, typecheck reports zero errors, Vite build succeeds, and browser smoke tests pass.

**Step 4: Run the manual acceptance checks**

- Run `print("hello")` followed by `1 + 2`; verify stdout and result are separate.
- Run `raise ValueError("boom")`; verify traceback and failure persistence.
- Run `while True: pass`; verify timeout, Worker recreation, and a successful next run.
- Refresh the page; verify the newest 20 records reload in descending order.
- Temporarily use an invalid Supabase URL; verify execution remains usable and save/history retry controls appear.
- Restore the correct URL and verify retry behavior.

**Step 5: Inspect repository state**

Run:

```bash
git status --short
git log --oneline --decorate -10
```

Expected: no secrets or unintended files are staged; the worktree is clean after any final documentation commit.

**Step 6: Commit any verification-only documentation correction**

Only if the verification uncovered a documentation mismatch:

```bash
git add README.md
git commit -m "docs: align setup with verified workflow"
```
