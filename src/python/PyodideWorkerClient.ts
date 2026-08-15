import type {
  WorkerRequestMessage,
  WorkerResponseMessage,
  WorkerResultMessage,
} from './protocol'

type WorkerFactory = () => Worker

type ClientErrorCode =
  | 'PYTHON_BUSY'
  | 'PYTHON_DISPOSED'
  | 'PYTHON_INIT'
  | 'PYTHON_NOT_READY'
  | 'PYTHON_TIMEOUT'

interface ClientOptions {
  createWorker?: WorkerFactory
  timeoutMs?: number
}

interface Initialization {
  promise: Promise<void>
  resolve: () => void
  reject: (reason: unknown) => void
}

interface ActiveRun {
  requestId: string
  resolve: (message: WorkerResultMessage) => void
  reject: (reason: unknown) => void
  timeout: ReturnType<typeof setTimeout>
}

const createProductionWorker: WorkerFactory = () =>
  new Worker(new URL('./pyodide.worker.ts', import.meta.url), {
    type: 'module',
  })

export class PyodideWorkerClientError extends Error {
  constructor(
    message: string,
    readonly code: ClientErrorCode,
  ) {
    super(message)
    this.name = 'PyodideWorkerClientError'
  }
}

export class PyodideWorkerClient {
  private readonly createWorker: WorkerFactory
  private readonly timeoutMs: number
  private worker: Worker
  private workerListener: (event: MessageEvent<WorkerResponseMessage>) => void
  private initialization: Initialization | null = null
  private activeRun: ActiveRun | null = null
  private ready = false
  private disposed = false
  private nextRequestId = 1

  constructor({
    createWorker = createProductionWorker,
    timeoutMs = 10_000,
  }: ClientOptions = {}) {
    this.createWorker = createWorker
    this.timeoutMs = timeoutMs
    this.worker = this.createWorker()
    this.workerListener = this.createMessageListener(this.worker)
    this.worker.addEventListener('message', this.workerListener)
  }

  initialize(): Promise<void> {
    if (this.disposed) {
      return Promise.reject(
        new PyodideWorkerClientError(
          'The Python worker client has been disposed.',
          'PYTHON_DISPOSED',
        ),
      )
    }
    if (this.ready) return Promise.resolve()
    if (this.initialization) return this.initialization.promise

    let resolve!: () => void
    let reject!: (reason: unknown) => void
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise
      reject = rejectPromise
    })
    this.initialization = { promise, resolve, reject }
    this.postMessage({ type: 'init' })
    return promise
  }

  run(code: string): Promise<WorkerResultMessage> {
    if (this.disposed) {
      return Promise.reject(
        new PyodideWorkerClientError(
          'The Python worker client has been disposed.',
          'PYTHON_DISPOSED',
        ),
      )
    }
    if (!this.ready) {
      return Promise.reject(
        new PyodideWorkerClientError(
          'The Python worker is not ready.',
          'PYTHON_NOT_READY',
        ),
      )
    }
    if (this.activeRun) {
      return Promise.reject(
        new PyodideWorkerClientError(
          'A Python run is already active.',
          'PYTHON_BUSY',
        ),
      )
    }

    const requestId = String(this.nextRequestId++)
    return new Promise<WorkerResultMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.activeRun?.requestId !== requestId) return

        this.activeRun = null
        this.replaceWorker()
        reject(
          new PyodideWorkerClientError(
            `Python execution exceeded ${this.timeoutMs} ms.`,
            'PYTHON_TIMEOUT',
          ),
        )
        void this.initialize().catch(() => undefined)
      }, this.timeoutMs)

      this.activeRun = { requestId, resolve, reject, timeout }
      this.postMessage({ type: 'run', requestId, code })
    })
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.ready = false
    this.detachAndTerminateWorker()
    this.initialization?.reject(
      new PyodideWorkerClientError(
        'The Python worker client was disposed during initialization.',
        'PYTHON_DISPOSED',
      ),
    )
    this.initialization = null
    if (this.activeRun) {
      clearTimeout(this.activeRun.timeout)
      this.activeRun.reject(
        new PyodideWorkerClientError(
          'The Python worker client was disposed during execution.',
          'PYTHON_DISPOSED',
        ),
      )
      this.activeRun = null
    }
  }

  private createMessageListener(worker: Worker) {
    return (event: MessageEvent<WorkerResponseMessage>) => {
      if (worker !== this.worker || this.disposed) return
      this.handleMessage(event.data)
    }
  }

  private handleMessage(message: WorkerResponseMessage) {
    if (message.type === 'ready') {
      this.ready = true
      this.initialization?.resolve()
      this.initialization = null
      return
    }

    if (message.type === 'init-error') {
      this.ready = false
      this.initialization?.reject(
        new PyodideWorkerClientError(message.error, 'PYTHON_INIT'),
      )
      this.initialization = null
      return
    }

    if (
      message.type === 'result' &&
      this.activeRun?.requestId === message.requestId
    ) {
      const activeRun = this.activeRun
      this.activeRun = null
      clearTimeout(activeRun.timeout)
      activeRun.resolve(message)
    }
  }

  private postMessage(message: WorkerRequestMessage) {
    this.worker.postMessage(message)
  }

  private replaceWorker() {
    this.ready = false
    this.initialization?.reject(
      new PyodideWorkerClientError(
        'The Python worker was replaced.',
        'PYTHON_INIT',
      ),
    )
    this.initialization = null
    this.detachAndTerminateWorker()
    this.worker = this.createWorker()
    this.workerListener = this.createMessageListener(this.worker)
    this.worker.addEventListener('message', this.workerListener)
  }

  private detachAndTerminateWorker() {
    this.worker.removeEventListener('message', this.workerListener)
    this.worker.terminate()
  }
}
