import { useCallback, useEffect, useMemo, useState } from 'react'
import type { WorkerResultMessage } from '../python/protocol'
import { PyodideWorkerClient } from '../python/PyodideWorkerClient'
import { normalizeWorkerResult } from '../python/result'
import type { PythonRunDraft } from '../python/types'

export type PythonRunnerState = 'initializing' | 'ready' | 'running' | 'recovering' | 'init-error'

interface PythonRunnerClient {
  initialize(): Promise<void>
  run(code: string): Promise<WorkerResultMessage>
  dispose(): void
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function usePythonRunner(client: PythonRunnerClient) {
  const [state, setState] = useState<PythonRunnerState>('initializing')
  const [currentResult, setCurrentResult] = useState<PythonRunDraft | null>(null)

  const initialize = useCallback(() => {
    setState('initializing')
    void client.initialize()
      .then(() => setState('ready'))
      .catch((error) => {
        setCurrentResult({
          code: '',
          stdout: '',
          stderr: '',
          result: '',
          error: readableError(error),
          status: 'error',
          durationMs: 0,
        })
        setState('init-error')
      })
  }, [client])

  useEffect(() => {
    initialize()
    return () => client.dispose()
  }, [client, initialize])

  const run = useCallback(async (code: string) => {
    if (state !== 'ready') return
    setState('running')
    try {
      const response = await client.run(code)
      setCurrentResult(normalizeWorkerResult(response, code))
      setState('ready')
    } catch (error) {
      const codeValue = error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : ''
      setCurrentResult({
        code,
        stdout: '',
        stderr: '',
        result: '',
        error: readableError(error),
        status: 'error',
        durationMs: 0,
      })
      if (codeValue === 'PYTHON_TIMEOUT') {
        setState('recovering')
        void client.initialize()
          .then(() => setState('ready'))
          .catch((initError) => {
            setCurrentResult((previous) => ({
              ...(previous ?? { code, stdout: '', stderr: '', result: '', durationMs: 0 }),
              error: readableError(initError),
              status: 'error',
            }))
            setState('init-error')
          })
      } else {
        setState('ready')
      }
    }
  }, [client, state])

  return useMemo(() => ({ state, run, retry: initialize, currentResult }), [
    currentResult,
    initialize,
    run,
    state,
  ])
}

export type PythonRunner = ReturnType<typeof usePythonRunner>

export type { PythonRunnerClient }

export function createPythonWorkerClient() {
  return new PyodideWorkerClient()
}
