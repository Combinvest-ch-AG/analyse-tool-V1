"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, LineChart, Calculator, UserPlus, Menu, X, LogOut } from "lucide-react"
import { signOut } from "@/app/actions/auth"

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> }

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Übersicht", icon: LayoutDashboard },
  { href: "/kunden", label: "Kunden", icon: Users },
  { href: "/analysen", label: "Analysen", icon: LineChart },
  { href: "/rechner", label: "Rechner", icon: Calculator },
]

export function PortalRail({
  advisorName,
  advisorRole,
  advisorTitle,
  isManagement,
}: {
  advisorName: string
  advisorRole: string
  advisorTitle: string | null
  isManagement: boolean
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const nav = isManagement
    ? [...NAV, { href: "/admin/invitations", label: "Berater einladen", icon: UserPlus }]
    : NAV

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border bg-[#0b1933] px-4 py-3 text-white lg:hidden">
        <Link href="/dashboard" className="flex items-center">
          <Image src="/combinvest-logo.png" alt="Combinvest" width={120} height={26} className="h-6 w-auto brightness-0 invert" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white"
          aria-label={open ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          open ? "block" : "hidden"
        } border-b border-white/10 bg-gradient-to-b from-[#0e2040] to-[#09162d] text-white lg:sticky lg:top-0 lg:block lg:h-dvh lg:border-b-0`}
      >
        <div className="flex h-full flex-col px-5 py-6">
          <Link href="/dashboard" className="mb-10 hidden items-center lg:flex">
            <Image
              src="/combinvest-logo.png"
              alt="Combinvest"
              width={150}
              height={32}
              className="h-8 w-auto brightness-0 invert"
              priority
            />
          </Link>

          <nav className="flex flex-col gap-1">
            {nav.map((item) => {
              const active =
                item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    active ? "bg-white/12 text-white" : "text-[#b9c6da] hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto border-t border-white/12 pt-5">
            <p className="text-sm font-semibold text-white">{advisorName}</p>
            <p className="mt-1 text-xs capitalize text-[#97a8c1]">{advisorTitle || advisorRole}</p>
            <form action={signOut} className="mt-4">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/17 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  )
}
