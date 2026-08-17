import { useState } from 'react'
import { CodeEditor } from './components/CodeEditor'
import { CurrentResult } from './components/CurrentResult'
import { HeroSection } from './components/HeroSection'
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
      <HeroSection />
      <CodeEditor {...runner} />
      <CurrentResult result={runner.currentResult} />
    </main>
  )
}
