import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { translations } from './translations'
import type { Language, Translations } from './types'

interface I18nContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: Translations
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode
  initialLanguage?: Language
}) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (initialLanguage) return initialLanguage
    try {
      const saved = localStorage.getItem('app_language')
      if (saved === 'en' || saved === 'ko') return saved
    } catch {
      // ignore storage access errors
    }
    return 'ko'
  })

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem('app_language', lang)
    } catch {
      // ignore storage access errors
    }
  }

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value: I18nContextValue = {
    language,
    setLanguage,
    t: translations[language],
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    return {
      language: 'ko',
      setLanguage: () => {},
      t: translations.ko,
    }
  }
  return context
}
