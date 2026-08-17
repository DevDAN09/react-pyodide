import { useRef, useState } from 'react'
import type { PythonRunner } from '../hooks/usePythonRunner'
import { useI18n } from '../i18n/I18nContext'

const defaultCode = 'print("hello")\n1 + 2'

const PRESET_CODES: Record<string, string> = {
  hello: 'print("hello")\n1 + 2',
  fibonacci: `def fibonacci(n):
    a, b = 0, 1
    seq = []
    for _ in range(n):
        seq.append(a)
        a, b = b, a + b
    return seq

print("Fibonacci(10):", fibonacci(10))`,
  primes: `# Find prime numbers under 50 using list comprehension
primes = [x for x in range(2, 50) if all(x % y != 0 for y in range(2, x))]
print("Primes under 50:", primes)`,
  exceptions: `try:
    print("Attempting division by zero...")
    result = 10 / 0
except ZeroDivisionError as e:
    print(f"Handled exception gracefully: {e}")`,
  timeout: `# 10-second timeout recovery test
import time
print("Starting heavy infinite loop...")
while True:
    pass`,
}

export function CodeEditor({ state, run, retry }: Pick<PythonRunner, 'state' | 'run' | 'retry'>) {
  const { t } = useI18n()
  const [code, setCode] = useState(defaultCode)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)

  const lineCount = Math.max(code.split('\n').length, 10)
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'ready') {
      void run(code)
    }
  }

  function handleScroll() {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const textarea = textareaRef.current
    if (!textarea) return

    // Shortcut: Cmd+Enter (Mac) or Ctrl+Enter (Win/Linux) to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (state === 'ready') {
        void run(code)
      }
      return
    }

    const { selectionStart, selectionEnd, value } = textarea

    // Tab key: Insert 4 spaces or handle indentation
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        // Shift+Tab: Unindent
        const before = value.substring(0, selectionStart)
        const lineStart = before.lastIndexOf('\n') + 1
        const line = value.substring(lineStart, selectionStart)
        if (line.startsWith('    ')) {
          const updated = value.substring(0, lineStart) + line.substring(4) + value.substring(selectionStart)
          setCode(updated)
          requestAnimationFrame(() => {
            textarea.selectionStart = Math.max(lineStart, selectionStart - 4)
            textarea.selectionEnd = Math.max(lineStart, selectionEnd - 4)
          })
        }
      } else {
        // Tab: Insert 4 spaces
        const updated = value.substring(0, selectionStart) + '    ' + value.substring(selectionEnd)
        setCode(updated)
        requestAnimationFrame(() => {
          textarea.selectionStart = selectionStart + 4
          textarea.selectionEnd = selectionStart + 4
        })
      }
      return
    }

    // Enter key: Auto-indent to match previous line
    if (e.key === 'Enter') {
      e.preventDefault()
      const beforeCursor = value.substring(0, selectionStart)
      const afterCursor = value.substring(selectionEnd)
      const currentLineStart = beforeCursor.lastIndexOf('\n') + 1
      const currentLine = beforeCursor.substring(currentLineStart)
      
      const indentMatch = currentLine.match(/^[ ]*/)
      let indent = indentMatch ? indentMatch[0] : ''
      
      // If line ends with colon (:), add 4 extra spaces
      if (currentLine.trim().endsWith(':')) {
        indent += '    '
      }

      const insertion = '\n' + indent
      const updated = beforeCursor + insertion + afterCursor
      setCode(updated)
      requestAnimationFrame(() => {
        textarea.selectionStart = selectionStart + insertion.length
        textarea.selectionEnd = selectionStart + insertion.length
      })
      return
    }

    // Auto-closing brackets and quotes
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
    }

    if (pairs[e.key] && selectionStart === selectionEnd) {
      e.preventDefault()
      const openChar = e.key
      const closeChar = pairs[openChar]
      const updated = value.substring(0, selectionStart) + openChar + closeChar + value.substring(selectionEnd)
      setCode(updated)
      requestAnimationFrame(() => {
        textarea.selectionStart = selectionStart + 1
        textarea.selectionEnd = selectionStart + 1
      })
    }
  }

  function handlePresetChange(presetKey: string) {
    if (PRESET_CODES[presetKey]) {
      setCode(PRESET_CODES[presetKey])
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }

  function handleCopy() {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleClear() {
    setCode('')
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  function handleReset() {
    setCode(defaultCode)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
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
    <form onSubmit={handleSubmit} className="editor-form">
      <div className="editor-top-bar">
        <label htmlFor="python-code" className="editor-label">
          {t.editor.label}
        </label>
        
        {/* Preset Selector & Quick Tools */}
        <div className="editor-preset-wrapper">
          <span className="preset-hint-label">{t.editor.presetLabel}</span>
          <select
            className="preset-select"
            onChange={(e) => handlePresetChange(e.target.value)}
            defaultValue=""
            aria-label="Preset code selection"
          >
            <option value="" disabled>
              -- Select Example --
            </option>
            <option value="hello">{t.editor.presets.hello}</option>
            <option value="fibonacci">{t.editor.presets.fibonacci}</option>
            <option value="primes">{t.editor.presets.primes}</option>
            <option value="exceptions">{t.editor.presets.exceptions}</option>
            <option value="timeout">{t.editor.presets.timeout}</option>
          </select>
        </div>
      </div>

      {/* Editor Main Canvas with CSS-counter Gutter */}
      <div className="editor-container">
        <div className="editor-gutter" ref={lineNumbersRef} aria-hidden="true">
          {lineNumbers.map((num) => (
            <div key={num} className="gutter-line-number" />
          ))}
        </div>
        <textarea
          ref={textareaRef}
          id="python-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          rows={10}
          spellCheck={false}
          className="code-textarea"
          placeholder="# Write Python code here..."
        />
      </div>

      {/* Action Toolbar */}
      <div className="editor-footer">
        <div className="editor-actions">
          <button type="submit" disabled={state !== 'ready'} className="run-button">
            {t.editor.runButton}
          </button>
          {state === 'init-error' && (
            <button type="button" onClick={retry} className="retry-button">
              {t.editor.retryButton}
            </button>
          )}
          <span className="shortcut-tag">{t.editor.shortcutHint}</span>
        </div>

        <div className="editor-quick-tools">
          <button type="button" onClick={handleCopy} className="tool-btn" title="Copy code">
            {copied ? t.editor.copiedButton : t.editor.copyButton}
          </button>
          <button type="button" onClick={handleReset} className="tool-btn" title="Reset default code">
            {t.editor.resetButton}
          </button>
          <button type="button" onClick={handleClear} className="tool-btn" title="Clear editor">
            {t.editor.clearButton}
          </button>
        </div>
      </div>

      <p role="status" aria-live="polite" className="editor-status-text">
        {getStatusMessage(state)}
      </p>
    </form>
  )
}
