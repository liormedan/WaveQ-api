'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { translations, Lang } from '@/i18n/i18n'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: keyof typeof translations['he'], params?: Record<string, any>) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('he')

  const t = (key: keyof typeof translations['he'], params?: Record<string, any>) => {
    let text = translations[lang][key] as string
    if (params) {
      Object.keys(params).forEach(p => {
        text = text.replace(`{${p}}`, params[p])
      })
    }
    return text
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider')
  return ctx
}
