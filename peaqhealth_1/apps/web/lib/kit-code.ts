export function generateKitCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const seg2 = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `PEAQ-${seg1}-${seg2}`
}

export function validateKitCode(code: string): boolean {
  return /^PEAQ-[A-Z2-9]{4}-[A-Z2-9]{5}$/.test(code)
}
