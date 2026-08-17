import type { PythonRunDraft } from '../python/types'
import { useI18n } from '../i18n/I18nContext'

export function CurrentResult({ result }: { result: PythonRunDraft | null }) {
  const { t } = useI18n()
  if (!result) return null

  return (
    <section aria-labelledby="current-result-heading">
      <h2 id="current-result-heading">{t.result.heading}</h2>
      {result.stdout && <OutputField label={t.result.stdout} value={result.stdout} />}
      {result.stderr && <OutputField label={t.result.stderr} value={result.stderr} />}
      {result.result && <OutputField label={t.result.result} value={result.result} />}
      {result.error && (
        <div role="alert">
          <h3>{t.result.error}</h3>
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
