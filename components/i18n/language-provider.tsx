"use client"

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from "react"
import {
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  translateUiText,
  type AppLocale,
} from "@/lib/i18n"

type LanguageContextValue = {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)
const ATTRIBUTES = ["aria-label", "placeholder", "title"] as const

export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: AppLocale
  children: React.ReactNode
}) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale)
  const localeRef = useRef(locale)
  const rootRef = useRef<HTMLDivElement>(null)
  const originalText = useRef(new WeakMap<Text, string>())
  const lastAppliedText = useRef(new WeakMap<Text, string>())
  const originalAttributes = useRef(new WeakMap<Element, Map<string, string>>())
  const lastAppliedAttributes = useRef(new WeakMap<Element, Map<string, string>>())

  localeRef.current = locale

  const applyText = useCallback((node: Text) => {
    const current = node.nodeValue ?? ""
    let source = originalText.current.get(node)
    if (source == null) {
      source = current
      originalText.current.set(node, source)
    } else {
      // React may reuse a text node for new dynamic content. In that case the
      // new German value becomes the canonical source for later toggles.
      const lastApplied = lastAppliedText.current.get(node)
      if (current !== source && current !== lastApplied) {
        source = current
        originalText.current.set(node, source)
      }
    }
    const translated = translateUiText(source, localeRef.current)
    lastAppliedText.current.set(node, translated)
    if (current !== translated) node.nodeValue = translated
  }, [])

  const applyElement = useCallback((element: Element) => {
    let stored = originalAttributes.current.get(element)
    if (!stored) {
      stored = new Map<string, string>()
      originalAttributes.current.set(element, stored)
    }
    let lastApplied = lastAppliedAttributes.current.get(element)
    if (!lastApplied) {
      lastApplied = new Map<string, string>()
      lastAppliedAttributes.current.set(element, lastApplied)
    }
    for (const attribute of ATTRIBUTES) {
      const current = element.getAttribute(attribute)
      if (current == null) continue
      let source = stored.get(attribute)
      if (source == null) {
        source = current
        stored.set(attribute, source)
      } else {
        if (current !== source && current !== lastApplied.get(attribute)) {
          source = current
          stored.set(attribute, source)
        }
      }
      const translated = translateUiText(source, localeRef.current)
      lastApplied.set(attribute, translated)
      if (current !== translated) element.setAttribute(attribute, translated)
    }
  }, [])

  const applyTree = useCallback((root: Node) => {
    if (root.nodeType === Node.TEXT_NODE) {
      applyText(root as Text)
      return
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return
    const element = root as Element
    applyElement(element)
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) applyText(node as Text)
      else applyElement(node as Element)
      node = walker.nextNode()
    }
  }, [applyElement, applyText])

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    document.documentElement.lang = locale === "en" ? "en" : "de-CH"
    document.documentElement.dataset.locale = locale
    applyTree(root)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") applyText(mutation.target as Text)
        if (mutation.type === "attributes") applyElement(mutation.target as Element)
        for (const node of mutation.addedNodes) applyTree(node)
      }
    })
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRIBUTES],
    })
    return () => observer.disconnect()
  }, [applyElement, applyText, applyTree, locale])

  const setLocale = useCallback((next: AppLocale) => {
    const normalized = normalizeLocale(next)
    localeRef.current = normalized
    setLocaleState(normalized)
    document.cookie = `${LOCALE_COOKIE}=${normalized}; path=/; max-age=31536000; SameSite=Lax`
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized)
    } catch {
      // The cookie remains the authoritative preference when storage is blocked.
    }
  }, [])

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      <div ref={rootRef} className="contents" data-advisory-language={locale}>
        {children}
      </div>
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider")
  return context
}
