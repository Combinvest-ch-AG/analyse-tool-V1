import type { Metadata, Viewport } from "next"
import { Manrope } from "next/font/google"
import "./globals.css"

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Combinvest – Berater-Portal",
  description:
    "Das Combinvest Beratungs- und Analyse-Tool: Kunden, Termine und Finanzanalysen an einem Ort.",
}

export const viewport: Viewport = {
  themeColor: "#3978f6",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de-CH" className={`${manrope.variable} bg-background`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
