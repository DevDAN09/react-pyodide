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
