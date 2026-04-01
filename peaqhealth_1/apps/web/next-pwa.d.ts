declare module "next-pwa" {
  import type { NextConfig } from "next"
  interface PWAConfig {
    dest?: string
    register?: boolean
    skipWaiting?: boolean
    disable?: boolean
    runtimeCaching?: Array<{
      urlPattern: RegExp
      handler: "NetworkFirst" | "CacheFirst" | "StaleWhileRevalidate" | "NetworkOnly" | "CacheOnly"
      options?: {
        cacheName?: string
        expiration?: { maxEntries?: number; maxAgeSeconds?: number }
      }
    }>
  }
  export default function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig
}
