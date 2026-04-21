// Removed — Junction lab parser no longer active.
// Lab parsing is handled by OpenAI in /api/labs/upload.
// Junction is retained only for wearable integrations.

import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ error: "Junction lab parser removed. Use /api/labs/upload instead." }, { status: 410 })
}
