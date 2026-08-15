import type { WorkerResultMessage } from './protocol'
import type { PythonRunDraft } from './types'

export function normalizeWorkerResult(
  message: WorkerResultMessage,
  code: string,
): PythonRunDraft {
  return {
    code,
    stdout: message.stdout,
    stderr: message.stderr,
    result: message.result,
    error: message.error,
    status: message.error ? 'error' : 'success',
    durationMs: message.durationMs,
  }
}
