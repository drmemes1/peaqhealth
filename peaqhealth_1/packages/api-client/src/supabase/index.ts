import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export type { Database }

// ─── Client factory ───────────────────────────────────────────────────────────

/**
 * Browser / React Native client (uses anon key + RLS)
 */
export function createBrowserClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?? process.env.EXPO_PUBLIC_SUPABASE_URL
    ?? ''
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    ?? ''
  return createClient<Database>(url, key)
}

/**
 * Server / Edge Function client (uses service role key — never expose to client)
 */
export function createServerClient() {
  const url  = process.env.SUPABASE_URL ?? ''
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  })
}

// ─── Typed query helpers ──────────────────────────────────────────────────────

export type SupabaseClient = ReturnType<typeof createBrowserClient>

export async function getUserProfile(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function getLatestLabResult(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('lab_results')
    .select('*')
    .eq('user_id', userId)
    .order('collection_date', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error  // PGRST116 = no rows
  return data ?? null
}

export async function getLatestOralKit(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('oral_kit_orders')
    .select('*')
    .eq('user_id', userId)
    .order('ordered_at', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data ?? null
}

export async function getLatestLifestyle(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('lifestyle_records')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data ?? null
}

export async function getScoreHistory(
  client: SupabaseClient,
  userId: string,
  opts: { limit?: number } = {}
) {
  const { data, error } = await client
    .from('score_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(opts.limit ?? 30)
  if (error) throw error
  return data ?? []
}

export async function upsertLifestyle(
  client: SupabaseClient,
  userId: string,
  answers: Record<string, unknown>
) {
  const { data, error } = await client
    .from('lifestyle_records')
    .upsert(
      { user_id: userId, ...answers, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}
