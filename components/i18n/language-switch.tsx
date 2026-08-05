"use client"

import { Languages } from "lucide-react"
import { useLanguage } from "@/components/i18n/language-provider"

export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage()

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-white/15 bg-white/6 p-1 ${compact ? "gap-0.5" : "w-full gap-1"}`}
      role="group"
      aria-label="Sprache"
      title="Sprache"
    >
      {!compact ? <Languages className="ml-2 h-4 w-4 shrink-0 text-[#97a8c1]" aria-hidden="true" /> : null}
      {(["de", "en"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          aria-pressed={locale === item}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-extrabold tracking-wide transition-colors ${
            locale === item
              ? "bg-white text-[#0b1933] shadow-sm"
              : "text-[#b9c6da] hover:bg-white/10 hover:text-white"
          }`}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
