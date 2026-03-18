import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  // Verify this is a legitimate Vercel cron call
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find all rows whose lock window has expired and are not yet locked
  const { data: expiredRows, error: fetchError } = await supabase
    .from("lab_results")
    .select("id, user_id, collection_date, lab_name, hs_crp_mgl, vitamin_d_ngml, apob_mgdl, ldl_mgdl, hdl_mgdl, triglycerides_mgdl, lpa_mgdl, glucose_mgdl, hba1c_pct, esr_mmhr, homocysteine_umoll, ferritin_ngml")
    .eq("is_locked", false)
    .not("lock_expires_at", "is", null)
    .lt("lock_expires_at", new Date().toISOString())

  if (fetchError) {
    console.error("[cron/lock-labs] fetch error:", fetchError)
    return NextResponse.json({ error: "Failed to fetch expired rows" }, { status: 500 })
  }

  if (!expiredRows || expiredRows.length === 0) {
    return NextResponse.json({ locked: 0 })
  }

  let locked = 0

  for (const row of expiredRows) {
    // Get the current score snapshot for this user
    const { data: snapshot } = await supabase
      .from("score_snapshots")
      .select("score, blood_sub")
      .eq("user_id", row.user_id)
      .order("calculated_at", { ascending: false })
      .limit(1)
      .single()

    const now = new Date().toISOString()

    // Copy to lab_history
    const { error: historyError } = await supabase
      .from("lab_history")
      .insert({
        user_id:           row.user_id,
        collection_date:   row.collection_date,
        lab_name:          row.lab_name ?? null,
        hs_crp_mgl:        row.hs_crp_mgl        ?? null,
        vitamin_d_ngml:    row.vitamin_d_ngml     ?? null,
        apob_mgdl:         row.apob_mgdl          ?? null,
        ldl_mgdl:          row.ldl_mgdl           ?? null,
        hdl_mgdl:          row.hdl_mgdl           ?? null,
        triglycerides_mgdl: row.triglycerides_mgdl ?? null,
        lpa_mgdl:          row.lpa_mgdl           ?? null,
        glucose_mgdl:      row.glucose_mgdl       ?? null,
        hba1c_pct:         row.hba1c_pct          ?? null,
        esr_mmhr:          row.esr_mmhr           ?? null,
        homocysteine_umoll: row.homocysteine_umoll ?? null,
        ferritin_ngml:     row.ferritin_ngml      ?? null,
        total_score:       snapshot?.score        ?? null,
        blood_score:       snapshot?.blood_sub    ?? null,
        lock_type:         "auto",
        locked_at:         now,
      })

    if (historyError) {
      // Unique constraint violation means history already exists for this timestamp — skip
      if (historyError.code !== "23505") {
        console.error("[cron/lock-labs] history insert error for user", row.user_id, historyError)
        continue
      }
    }

    // Mark lab_results row as locked
    const { error: lockError } = await supabase
      .from("lab_results")
      .update({ is_locked: true, locked_at: now })
      .eq("id", row.id)

    if (lockError) {
      console.error("[cron/lock-labs] lock update error for user", row.user_id, lockError)
    } else {
      console.log("[cron] locked lab snapshot for user:", row.user_id)
      locked++
    }
  }

  return NextResponse.json({ locked, total: expiredRows.length })
}
