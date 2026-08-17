export interface ExecutionPayload {
  stdout: string
  stderr: string
  result: string
  error: string
  durationMs: number
}

interface PyodideProxy {
  toString(): string
  destroy(): void
}

export interface PyodideLike {
  setStdout(options: { batched: (text: string) => void }): void
  setStderr(options: { batched: (text: string) => void }): void
  runPythonAsync(code: string): Promise<unknown>
}

export async function executePython(
  pyodide: PyodideLike,
  code: string,
  now: () => number,
): Promise<ExecutionPayload> {
  let stdout = ''
  let stderr = ''
  const startedAt = now()

  pyodide.setStdout({ batched: (text) => { stdout += text } })
  pyodide.setStderr({ batched: (text) => { stderr += text } })

  try {
    const value = await pyodide.runPythonAsync(code)
    const result = value == null ? '' : String(value)

    if (
      value &&
      typeof value === 'object' &&
      'destroy' in value &&
      typeof (value as Partial<PyodideProxy>).destroy === 'function'
    ) {
      ;(value as PyodideProxy).destroy()
    }

    return { stdout, stderr, result, error: '', durationMs: now() - startedAt }
  } catch (error) {
    const readable = error instanceof Error
      ? (error.stack ?? error.message)
      : String(error)

    return {
      stdout,
      stderr,
      result: '',
      error: readable,
      durationMs: now() - startedAt,
    }
  }
}
