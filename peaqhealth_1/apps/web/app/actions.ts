"use server";

import { createClient } from "@supabase/supabase-js";

export async function joinWaitlist(
  _prev: { ok: boolean; message: string } | null,
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  const email = formData.get("email") as string | null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Graceful fallback when Supabase is not configured yet
    console.log(`[waitlist] Would store: ${email}`);
    return { ok: true, message: "You're on the list. We'll be in touch." };
  }

  const supabase = createClient(url, key);

  const { error } = await supabase
    .from("waitlist")
    .upsert({ email }, { onConflict: "email" });

  if (error) {
    console.error("[waitlist]", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  return { ok: true, message: "You're on the list. We'll be in touch." };
}
