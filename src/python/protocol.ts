export interface WorkerInitMessage {
  type: 'init'
}

export interface WorkerReadyMessage {
  type: 'ready'
}

export interface WorkerRunMessage {
  type: 'run'
  requestId: string
  code: string
}

export interface WorkerResultMessage {
  type: 'result'
  requestId: string
  stdout: string
  stderr: string
  result: string
  error: string
  durationMs: number
}

export interface WorkerInitErrorMessage {
  type: 'init-error'
  error: string
}

export type WorkerRequestMessage = WorkerInitMessage | WorkerRunMessage

export type WorkerResponseMessage =
  | WorkerReadyMessage
  | WorkerResultMessage
  | WorkerInitErrorMessage

export type WorkerMessage = WorkerRequestMessage | WorkerResponseMessage
