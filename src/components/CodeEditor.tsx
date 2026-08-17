import { useState } from 'react'
import type { PythonRunner } from '../hooks/usePythonRunner'

const defaultCode = 'print("hello")\n1 + 2'

export function CodeEditor({ state, run, retry }: Pick<PythonRunner, 'state' | 'run' | 'retry'>) {
  const [code, setCode] = useState(defaultCode)
  const busy = state === 'initializing' || state === 'running' || state === 'recovering'

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void run(code)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="python-code">Python code</label>
      <textarea
        id="python-code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        rows={10}
        spellCheck={false}
      />
      <div className="editor-actions">
        <button type="submit" disabled={state !== 'ready'}>Run Python</button>
        {state === 'init-error' && <button type="button" onClick={retry}>Retry initialization</button>}
      </div>
      <p role="status" aria-live="polite">{statusText(state)}</p>
    </form>
  )
}

function statusText(state: PythonRunner['state']) {
  switch (state) {
    case 'initializing': return 'Initializing Python runtime…'
    case 'running': return 'Running Python…'
    case 'recovering': return 'Recovering Python runtime…'
    case 'init-error': return 'Python runtime initialization failed.'
    default: return 'Python runtime ready.'
  }
}
