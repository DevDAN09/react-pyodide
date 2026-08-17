import { useState } from 'react'
import type { PythonRunner } from '../hooks/usePythonRunner'
import { useI18n } from '../i18n/I18nContext'

const defaultCode = 'print("hello")\n1 + 2'

export function CodeEditor({ state, run, retry }: Pick<PythonRunner, 'state' | 'run' | 'retry'>) {
  const { t } = useI18n()
  const [code, setCode] = useState(defaultCode)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void run(code)
  }

  function getStatusMessage(runnerState: PythonRunner['state']) {
    switch (runnerState) {
      case 'initializing':
        return t.editor.status.initializing
      case 'running':
        return t.editor.status.running
      case 'recovering':
        return t.editor.status.recovering
      case 'init-error':
        return t.editor.status.initError
      default:
        return t.editor.status.ready
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="python-code">{t.editor.label}</label>
      <textarea
        id="python-code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        rows={10}
        spellCheck={false}
      />
      <div className="editor-actions">
        <button type="submit" disabled={state !== 'ready'}>
          {t.editor.runButton}
        </button>
        {state === 'init-error' && (
          <button type="button" onClick={retry}>
            {t.editor.retryButton}
          </button>
        )}
      </div>
      <p role="status" aria-live="polite">
        {getStatusMessage(state)}
      </p>
    </form>
  )
}
