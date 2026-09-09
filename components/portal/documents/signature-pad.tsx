"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"

export type SignaturePadHandle = {
  isEmpty: () => boolean
  clear: () => void
  toDataURL: () => string
}

export const SignaturePad = forwardRef<SignaturePadHandle, { ariaLabel?: string }>(function SignaturePad(
  { ariaLabel },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasInk = useRef(false)

  useImperativeHandle(ref, () => ({
    isEmpty: () => !hasInk.current,
    clear: () => {
      const c = canvasRef.current
      if (!c) return
      const ctx = c.getContext("2d")
      ctx?.clearRect(0, 0, c.width, c.height)
      hasInk.current = false
    },
    toDataURL: () => canvasRef.current?.toDataURL("image/png") ?? "",
  }))

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return

    function resize() {
      const rect = c!.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const ratio = window.devicePixelRatio || 1
      const old = hasInk.current ? c!.toDataURL() : null
      c!.width = rect.width * ratio
      c!.height = rect.height * ratio
      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx!.lineWidth = 2.2
      ctx!.lineCap = "round"
      ctx!.strokeStyle = "#111d33"
      if (old) {
        const img = new Image()
        img.onload = () => ctx!.drawImage(img, 0, 0, rect.width, rect.height)
        img.src = old
      }
    }

    function point(e: PointerEvent) {
      const rect = c!.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    function down(e: PointerEvent) {
      drawing.current = true
      hasInk.current = true
      c!.setPointerCapture(e.pointerId)
      const p = point(e)
      ctx!.beginPath()
      ctx!.moveTo(p.x, p.y)
    }
    function move(e: PointerEvent) {
      if (!drawing.current) return
      const p = point(e)
      ctx!.lineTo(p.x, p.y)
      ctx!.stroke()
    }
    function up() {
      drawing.current = false
    }

    resize()
    window.addEventListener("resize", resize)
    c.addEventListener("pointerdown", down)
    c.addEventListener("pointermove", move)
    c.addEventListener("pointerup", up)
    return () => {
      window.removeEventListener("resize", resize)
      c.removeEventListener("pointerdown", down)
      c.removeEventListener("pointermove", move)
      c.removeEventListener("pointerup", up)
    }
  }, [])

  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-background">
      <canvas ref={canvasRef} aria-label={ariaLabel} className="block h-40 w-full touch-none" />
    </div>
  )
})
