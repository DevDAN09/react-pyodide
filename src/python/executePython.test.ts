import { describe, expect, it, vi } from 'vitest'
import { executePython } from './executePython'

function createPyodide(options: {
  value?: unknown
  stdout?: string[]
  stderr?: string[]
  error?: Error
}) {
  return {
    setStdout: vi.fn(({ batched }: { batched: (text: string) => void }) => {
      for (const text of options.stdout ?? []) batched(text)
    }),
    setStderr: vi.fn(({ batched }: { batched: (text: string) => void }) => {
      for (const text of options.stderr ?? []) batched(text)
    }),
    runPythonAsync: vi.fn(async () => {
      if (options.error) throw options.error
      return options.value
    }),
  }
}

describe('executePython', () => {
  it('captures stdout, stderr, final value, and duration', async () => {
    const runtime = createPyodide({ value: '3', stdout: ['hello'], stderr: ['warn'] })

    await expect(executePython(runtime, '1 + 2', () => 12)).resolves.toEqual({
      stdout: 'hello',
      stderr: 'warn',
      result: '3',
      error: '',
      durationMs: 0,
    })
  })

  it('preserves output and returns an error when Python throws', async () => {
    const runtime = createPyodide({ error: new Error('Traceback: boom') })

    await expect(executePython(runtime, 'raise', () => 0)).resolves.toMatchObject({
      result: '',
      error: expect.stringContaining('Traceback: boom'),
    })
  })

  it('converts a proxy to text and destroys it', async () => {
    const destroy = vi.fn()
    const runtime = createPyodide({ value: { toString: () => 'value', destroy } })

    await executePython(runtime, 'value', () => 0)

    expect(destroy).toHaveBeenCalledOnce()
  })
})
