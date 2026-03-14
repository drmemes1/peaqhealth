import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { LifestyleForm } from "./lifestyle-form";

export default async function LifestylePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/settings/lifestyle");

  const { data: existing } = await supabase
    .from("lifestyle_records")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <LifestyleForm
      userId={user.id}
      existing={existing as Record<string, unknown> | null}
    />
  );
}
