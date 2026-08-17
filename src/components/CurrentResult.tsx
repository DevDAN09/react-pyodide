import type { PythonRunDraft } from '../python/types'

export function CurrentResult({ result }: { result: PythonRunDraft | null }) {
  if (!result) return null

  return (
    <section aria-labelledby="current-result-heading">
      <h2 id="current-result-heading">Current result</h2>
      {result.stdout && <OutputField label="Standard output" value={result.stdout} />}
      {result.stderr && <OutputField label="Standard error" value={result.stderr} />}
      {result.result && <OutputField label="Result" value={result.result} />}
      {result.error && (
        <div role="alert">
          <h3>Error</h3>
          <pre>{result.error}</pre>
        </div>
      )}
    </section>
  )
}

function OutputField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h3>{label}</h3>
      <pre>{value}</pre>
    </div>
  )
}
