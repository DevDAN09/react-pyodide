import { useState } from 'react'
import { CodeEditor } from './components/CodeEditor'
import { CurrentResult } from './components/CurrentResult'
import { HeroSection } from './components/HeroSection'
import {
  createPythonWorkerClient,
  usePythonRunner,
} from './hooks/usePythonRunner'
import type { PythonRunnerClient } from './hooks/usePythonRunner'
import { I18nProvider } from './i18n/I18nContext'
import type { Language } from './i18n/types'

export function App({
  client,
  initialLanguage,
}: {
  client?: PythonRunnerClient
  initialLanguage?: Language
}) {
  const [ownedClient] = useState(() => client ?? createPythonWorkerClient())
  const runner = usePythonRunner(ownedClient)

  return (
    <I18nProvider initialLanguage={initialLanguage}>
      <main>
        <HeroSection runnerState={runner.state} />
        <CodeEditor {...runner} />
        <CurrentResult result={runner.currentResult} />
      </main>
    </I18nProvider>
  )
}
