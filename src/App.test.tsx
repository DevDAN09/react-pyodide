import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import type { WorkerResultMessage } from './python/protocol'
import type { PyodideWorkerClient } from './python/PyodideWorkerClient'

function result(overrides: Partial<WorkerResultMessage> = {}): WorkerResultMessage {
  return {
    type: 'result',
    requestId: '1',
    stdout: '',
    stderr: '',
    result: '',
    error: '',
    durationMs: 0,
    ...overrides,
  }
}

function createClient() {
  let resolveInitialization!: () => void
  let rejectInitialization!: (error: Error) => void
  let resolveRetry!: () => void
  const initialization = new Promise<void>((resolve, reject) => {
    resolveInitialization = resolve
    rejectInitialization = reject
  })
  const retryInitialization = new Promise<void>((resolve) => {
    resolveRetry = resolve
  })
  let initializeCalls = 0
  const client = {
    initialize: vi.fn(() => {
      initializeCalls += 1
      return initializeCalls === 1 ? initialization : retryInitialization
    }),
    run: vi.fn(),
    dispose: vi.fn(),
  } as unknown as PyodideWorkerClient

  return { client, resolveInitialization, rejectInitialization, resolveRetry }
}

describe('App', () => {
  it('renders the architecture hero section', () => {
    const { client } = createClient()
    render(<App client={client} />)

    expect(screen.getByRole('heading', { level: 1, name: /react & pyodide wasm runner/i })).toBeVisible()
    expect(screen.getByText(/web worker/i)).toBeVisible()
    expect(screen.getByText(/pyodide cpython/i)).toBeVisible()
  })

  it('supports switching between Korean and English', async () => {
    const { client } = createClient()
    render(<App client={client} initialLanguage="ko" />)

    expect(screen.getAllByText(/주문서 접수/i)[0]).toBeVisible()
    expect(screen.getByText(/서버 비용 0원/i)).toBeVisible()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /english/i }))

    expect(screen.getAllByText(/order ingestion/i)[0]).toBeVisible()
    expect(screen.getByText(/zero server cost/i)).toBeVisible()

    await user.click(screen.getByRole('button', { name: /한국어/i }))
    expect(screen.getAllByText(/주문서 접수/i)[0]).toBeVisible()
  })

  it('exposes labelled editor controls and live status semantics', () => {
    const { client } = createClient()
    render(<App client={client} />)

    expect(screen.getByLabelText(/python code/i)).toBeVisible()
    expect(screen.getByRole('status')).toBeVisible()
    expect(screen.getByRole('button', { name: /run python/i })).toBeVisible()
  })

  it('disables Run Python until the client is ready', async () => {
    const { client, resolveInitialization } = createClient()
    render(<App client={client} />)

    expect(screen.getByRole('button', { name: /run python/i })).toBeDisabled()
    resolveInitialization()
    expect(await screen.findByRole('button', { name: /run python/i })).toBeEnabled()
  })

  it('renders a run result without any persistence UI', async () => {
    const { client, resolveInitialization } = createClient()
    vi.mocked(client.run).mockResolvedValue(
      result({ stdout: 'hello', result: '3', durationMs: 12 }),
    )
    render(<App client={client} />)
    resolveInitialization()

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /run python/i }))

    expect(await screen.findByText('hello')).toBeVisible()
    expect(screen.getByText('3', { exact: true })).toBeVisible()
    expect(screen.queryByText(/history|save|supabase/i)).not.toBeInTheDocument()
  })

  it('renders Python errors as an alert', async () => {
    const { client, resolveInitialization } = createClient()
    vi.mocked(client.run).mockResolvedValue(
      result({ error: 'Traceback: ValueError: boom' }),
    )
    render(<App client={client} />)
    resolveInitialization()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /run python/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('ValueError')
  })

  it('prevents duplicate runs while execution is active', async () => {
    const { client, resolveInitialization } = createClient()
    let resolveRun!: (value: WorkerResultMessage) => void
    vi.mocked(client.run).mockReturnValue(new Promise((resolve) => { resolveRun = resolve }))
    render(<App client={client} />)
    resolveInitialization()
    const user = userEvent.setup()
    const runButton = await screen.findByRole('button', { name: /run python/i })

    await user.click(runButton)
    expect(runButton).toBeDisabled()
    expect(vi.mocked(client.run)).toHaveBeenCalledOnce()

    resolveRun(result({ result: '42' }))
    expect(await screen.findByText('42', { exact: true })).toBeVisible()
  })

  it('can retry initialization after an init error', async () => {
    const { client, rejectInitialization, resolveRetry } = createClient()
    render(<App client={client} />)
    rejectInitialization(new Error('Unable to load Pyodide'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load Pyodide')
    const retry = screen.getByRole('button', { name: /retry/i })
    expect(retry).toBeVisible()
    resolveRetry()
    await userEvent.setup().click(retry)
    expect(await screen.findByRole('button', { name: /run python/i })).toBeEnabled()
  })

  it('recovers after a Python timeout', async () => {
    const { client, resolveInitialization } = createClient()
    const timeout = Object.assign(new Error('timed out'), { code: 'PYTHON_TIMEOUT' })
    vi.mocked(client.run).mockRejectedValue(timeout)
    render(<App client={client} />)
    resolveInitialization()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /run python/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/recover/i)
  })
})
