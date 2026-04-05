"use client"

import { AuthSidebar } from "./auth-sidebar"
import { AuthTopbar } from "./auth-topbar"

interface AuthLayoutProps {
  pageId: "dashboard" | "panels" | "science" | "shop" | "settings"
  initials: string
  firstName?: string
  lastSyncAt?: string | null
  wearableProvider?: string
  onSync?: () => void
  syncing?: boolean
  children: React.ReactNode
}

export function AuthLayout({
  pageId,
  initials,
  firstName,
  lastSyncAt,
  wearableProvider,
  onSync,
  syncing,
  children,
}: AuthLayoutProps) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--off-white, #F6F4EF)" }}>
      <AuthSidebar initials={initials} />
      <AuthTopbar
        pageId={pageId}
        firstName={firstName}
        lastSyncAt={lastSyncAt}
        wearableProvider={wearableProvider}
        onSync={onSync}
        syncing={syncing}
      />
      <div style={{ marginLeft: 62 }}>
        {children}
      </div>
    </div>
  )
}
