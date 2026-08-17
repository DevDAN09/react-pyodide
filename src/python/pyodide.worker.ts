import { loadPyodide } from 'pyodide'
import { executePython } from './executePython'
import { getPyodideConfig } from './pyodideAssets'
import type {
  WorkerRequestMessage,
  WorkerRunMessage,
} from './protocol'

const ready = loadPyodide(getPyodideConfig())

function readableError(error: unknown) {
  return error instanceof Error ? (error.stack ?? error.message) : String(error)
}

async function handleMessage(message: WorkerRequestMessage) {
  if (message.type === 'init') {
    try {
      await ready
      self.postMessage({ type: 'ready' })
    } catch (error) {
      self.postMessage({ type: 'init-error', error: readableError(error) })
    }
    return
  }

  const runMessage = message as WorkerRunMessage
  try {
    const pyodide = await ready
    const payload = await executePython(pyodide, runMessage.code, performance.now.bind(performance))
    self.postMessage({ type: 'result', requestId: runMessage.requestId, ...payload })
  } catch (error) {
    self.postMessage({
      type: 'result',
      requestId: runMessage.requestId,
      stdout: '',
      stderr: '',
      result: '',
      error: readableError(error),
      durationMs: 0,
    })
  }
}

self.addEventListener('message', (event: MessageEvent<WorkerRequestMessage>) => {
  void handleMessage(event.data)
})
