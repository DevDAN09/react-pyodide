import { useI18n } from '../i18n/I18nContext'

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n()

  return (
    <div className="language-switcher" role="group" aria-label="Language selection">
      <button
        type="button"
        className={`lang-btn ${language === 'ko' ? 'active' : ''}`}
        onClick={() => setLanguage('ko')}
        aria-pressed={language === 'ko'}
      >
        한국어
      </button>
      <span className="lang-divider" aria-hidden="true">|</span>
      <button
        type="button"
        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
      >
        English
      </button>
    </div>
  )
}
