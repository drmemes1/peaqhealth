const isDev = process.env.NODE_ENV === "development"

export function hashUserId(id: string): string {
  return id.slice(0, 8)
}

export function safeLog(tag: string, message: string, context?: Record<string, unknown>): void {
  const sanitized = context ? Object.fromEntries(
    Object.entries(context).map(([k, v]) => {
      if (k === "userId" || k === "user_id") return [k, typeof v === "string" ? hashUserId(v) : "?"]
      return [k, v]
    })
  ) : undefined
  if (sanitized) {
    console.log(`[${tag}] ${message}`, JSON.stringify(sanitized))
  } else {
    console.log(`[${tag}] ${message}`)
  }
}

export function safeWarn(tag: string, message: string): void {
  console.warn(`[${tag}] ${message}`)
}

export function safeError(tag: string, message: string, err?: unknown): void {
  const errMsg = err instanceof Error ? err.message : String(err ?? "")
  const sanitized = errMsg
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[uuid]")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[email]")
    .slice(0, 200)
  console.error(`[${tag}] ${message}${sanitized ? `: ${sanitized}` : ""}`)
}

export function devLog(tag: string, message: string, data?: unknown): void {
  if (!isDev) return
  console.log(`[${tag}:dev] ${message}`, data !== undefined ? data : "")
}
