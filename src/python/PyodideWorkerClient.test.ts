import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  WorkerRequestMessage,
  WorkerResponseMessage,
  WorkerResultMessage,
} from './protocol'
import {
  PyodideWorkerClient,
  PyodideWorkerClientError,
} from './PyodideWorkerClient'

class FakeWorker {
  readonly postedMessages: WorkerRequestMessage[] = []
  terminated = false
  private readonly messageListeners = new Set<
    (event: MessageEvent<WorkerResponseMessage>) => void
  >()
  private readonly errorListeners = new Set<(event: ErrorEvent) => void>()
  private readonly messageErrorListeners = new Set<
    (event: MessageEvent) => void
  >()

  postMessage(message: WorkerRequestMessage) {
    this.postedMessages.push(message)
  }

  addEventListener(
    type: string,
    listener: EventListener,
  ) {
    if (type === 'message') {
      this.messageListeners.add(
        listener as (event: MessageEvent<WorkerResponseMessage>) => void,
      )
    }
    if (type === 'error') {
      this.errorListeners.add(listener as (event: ErrorEvent) => void)
    }
    if (type === 'messageerror') {
      this.messageErrorListeners.add(
        listener as (event: MessageEvent) => void,
      )
    }
  }

  removeEventListener(
    type: string,
    listener: EventListener,
  ) {
    if (type === 'message') {
      this.messageListeners.delete(
        listener as (event: MessageEvent<WorkerResponseMessage>) => void,
      )
    }
    if (type === 'error') {
      this.errorListeners.delete(listener as (event: ErrorEvent) => void)
    }
    if (type === 'messageerror') {
      this.messageErrorListeners.delete(
        listener as (event: MessageEvent) => void,
      )
    }
  }

  terminate() {
    this.terminated = true
  }

  emit(message: WorkerResponseMessage) {
    for (const listener of this.messageListeners) {
      listener(new MessageEvent('message', { data: message }))
    }
  }

  emitError(message: string) {
    for (const listener of this.errorListeners) {
      listener(new ErrorEvent('error', { message }))
    }
  }

  get listenerCount() {
    return (
      this.messageListeners.size +
      this.errorListeners.size +
      this.messageErrorListeners.size
    )
  }
}

function createHarness(timeoutMs = 10_000) {
  const workers: FakeWorker[] = []
  const client = new PyodideWorkerClient({
    createWorker: () => {
      const worker = new FakeWorker()
      workers.push(worker)
      return worker as unknown as Worker
    },
    timeoutMs,
  })

  return { client, workers }
}

function result(requestId: string, value = '3'): WorkerResultMessage {
  return {
    type: 'result',
    requestId,
    stdout: '',
    stderr: '',
    result: value,
    error: '',
    durationMs: 1,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('PyodideWorkerClient', () => {
  it('resolves init after a ready message', async () => {
    const { client, workers } = createHarness()

    const initialized = client.initialize()
    expect(workers[0].postedMessages).toEqual([{ type: 'init' }])

    workers[0].emit({ type: 'ready' })

    await expect(initialized).resolves.toBeUndefined()
  })

  it('replaces a worker after init failure before retrying', async () => {
    const { client, workers } = createHarness()

    const firstInitialization = client.initialize()
    workers[0].emit({ type: 'init-error', error: 'Unable to load Pyodide' })

    await expect(firstInitialization).rejects.toMatchObject({
      code: 'PYTHON_INIT',
    })
    expect(workers[0].terminated).toBe(true)
    expect(workers).toHaveLength(2)

    const retry = client.initialize()
    expect(workers[1].postedMessages).toEqual([{ type: 'init' }])
    workers[1].emit({ type: 'ready' })
    await expect(retry).resolves.toBeUndefined()
  })

  it('rejects initialization when the worker emits an error', async () => {
    const { client, workers } = createHarness()

    const initialized = client.initialize()
    workers[0].emitError('Worker module failed to load')

    await expect(initialized).rejects.toMatchObject({
      code: 'PYTHON_INIT',
      message: 'Worker module failed to load',
    })
    expect(workers[0].terminated).toBe(true)
    expect(workers).toHaveLength(2)
  })

  it('matches results to request ids', async () => {
    const { client, workers } = createHarness()
    const initialized = client.initialize()
    workers[0].emit({ type: 'ready' })
    await initialized

    const run = client.run('1 + 2')
    const request = workers[0].postedMessages.at(-1)
    expect(request).toMatchObject({ type: 'run', code: '1 + 2' })
    if (!request || request.type !== 'run') throw new Error('Run not posted')

    workers[0].emit(result('stale', 'wrong'))
    workers[0].emit(result(request.requestId))

    await expect(run).resolves.toEqual(result(request.requestId))
  })

  it('rejects a run while another run is active', async () => {
    const { client, workers } = createHarness()
    const initialized = client.initialize()
    workers[0].emit({ type: 'ready' })
    await initialized

    const firstRun = client.run('1 + 1')
    await expect(client.run('2 + 2')).rejects.toMatchObject({
      code: 'PYTHON_BUSY',
    })

    const request = workers[0].postedMessages.at(-1)
    if (!request || request.type !== 'run') throw new Error('Run not posted')
    workers[0].emit(result(request.requestId, '2'))
    await firstRun
  })

  it('terminates and recreates the worker after 10 seconds', async () => {
    vi.useFakeTimers()
    const { client, workers } = createHarness()
    const initialized = client.initialize()
    workers[0].emit({ type: 'ready' })
    await initialized

    const run = client.run('while True: pass')
    const rejection = expect(run).rejects.toBeInstanceOf(PyodideWorkerClientError)
    await vi.advanceTimersByTimeAsync(10_000)

    await rejection
    await expect(run).rejects.toMatchObject({ code: 'PYTHON_TIMEOUT' })
    expect(workers[0].terminated).toBe(true)
    expect(workers).toHaveLength(2)
    expect(workers[1].postedMessages).toEqual([{ type: 'init' }])
  })

  it('can initialize and run again after timeout recovery', async () => {
    vi.useFakeTimers()
    const { client, workers } = createHarness(100)
    const initialized = client.initialize()
    workers[0].emit({ type: 'ready' })
    await initialized

    const timedOutRun = client.run('while True: pass')
    const timeoutRejection = expect(timedOutRun).rejects.toMatchObject({
      code: 'PYTHON_TIMEOUT',
    })
    await vi.advanceTimersByTimeAsync(100)
    await timeoutRejection

    workers[1].emit({ type: 'ready' })
    await client.initialize()
    const recoveredRun = client.run('6 * 7')
    const request = workers[1].postedMessages.at(-1)
    if (!request || request.type !== 'run') throw new Error('Run not posted')
    workers[1].emit(result(request.requestId, '42'))

    await expect(recoveredRun).resolves.toMatchObject({ result: '42' })
  })

  it('ignores messages from a replaced worker', async () => {
    vi.useFakeTimers()
    const { client, workers } = createHarness(100)
    const initialized = client.initialize()
    workers[0].emit({ type: 'ready' })
    await initialized

    const timedOutRun = client.run('while True: pass')
    const timeoutRejection = expect(timedOutRun).rejects.toMatchObject({
      code: 'PYTHON_TIMEOUT',
    })
    await vi.advanceTimersByTimeAsync(100)
    await timeoutRejection

    workers[0].emit({ type: 'ready' })
    workers[0].emit(result('1', 'stale'))
    await expect(client.run('6 * 7')).rejects.toMatchObject({
      code: 'PYTHON_NOT_READY',
    })

    workers[1].emit({ type: 'ready' })
    await client.initialize()
    const recoveredRun = client.run('6 * 7')
    const request = workers[1].postedMessages.at(-1)
    if (!request || request.type !== 'run') throw new Error('Run not posted')
    workers[1].emit(result(request.requestId, '42'))
    await expect(recoveredRun).resolves.toMatchObject({ result: '42' })
  })

  it('removes listeners and terminates on dispose', () => {
    const { client, workers } = createHarness()
    expect(workers[0].listenerCount).toBe(3)

    client.dispose()

    expect(workers[0].listenerCount).toBe(0)
    expect(workers[0].terminated).toBe(true)
  })
})
