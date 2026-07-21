"use client"

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react"

const LENGTH = 6

/**
 * Accessible 6-digit segmented code input with auto-advance and paste support.
 * Emits the joined value into a hidden input named `token` for form submission.
 */
export function OtpInput({ disabled = false }: { disabled?: boolean }) {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""))
  const refs = useRef<Array<HTMLInputElement | null>>([])

  const value = digits.join("")

  function focus(index: number) {
    const el = refs.current[Math.max(0, Math.min(LENGTH - 1, index))]
    el?.focus()
    el?.select()
  }

  function setAt(index: number, char: string) {
    setDigits((prev) => {
      const nextDigits = [...prev]
      nextDigits[index] = char
      return nextDigits
    })
  }

  function handleChange(index: number, raw: string) {
    const char = raw.replace(/\D/g, "").slice(-1)
    if (!char) {
      setAt(index, "")
      return
    }
    setAt(index, char)
    if (index < LENGTH - 1) focus(index + 1)
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        setAt(index, "")
      } else if (index > 0) {
        focus(index - 1)
        setAt(index - 1, "")
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault()
      focus(index - 1)
    } else if (e.key === "ArrowRight" && index < LENGTH - 1) {
      e.preventDefault()
      focus(index + 1)
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH)
    if (!pasted) return
    const nextDigits = Array(LENGTH).fill("")
    for (let i = 0; i < pasted.length; i++) nextDigits[i] = pasted[i]
    setDigits(nextDigits)
    focus(pasted.length >= LENGTH ? LENGTH - 1 : pasted.length)
  }

  return (
    <div>
      <input type="hidden" name="token" value={value} />
      <div className="flex justify-between gap-2" role="group" aria-label="6-stelliger Sicherheitscode">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            disabled={disabled}
            value={digit}
            aria-label={`Ziffer ${i + 1}`}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className="h-14 w-full rounded-xl border border-input bg-card text-center text-xl font-bold text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/40 disabled:opacity-50"
          />
        ))}
      </div>
    </div>
  )
}
