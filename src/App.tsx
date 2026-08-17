import { useState } from 'react'
import { CodeEditor } from './components/CodeEditor'
import { CurrentResult } from './components/CurrentResult'
import {
  createPythonWorkerClient,
  usePythonRunner,
} from './hooks/usePythonRunner'
import type { PythonRunnerClient } from './hooks/usePythonRunner'

export function App({ client }: { client?: PythonRunnerClient }) {
  const [ownedClient] = useState(() => client ?? createPythonWorkerClient())
  const runner = usePythonRunner(ownedClient)

  return (
    <main>
      <h1>Python Runner</h1>
      <CodeEditor {...runner} />
      <CurrentResult result={runner.currentResult} />
    </main>
  )
}
