/**
 * Supabase client for browser-side Storage and Realtime.
 *
 * When NEXT_PUBLIC_SUPABASE_URL is set, this provides:
 *   - Direct file uploads (signed URLs from FastAPI, upload to Supabase)
 *   - Realtime channel subscriptions (typing, presence, notifications)
 *   - Public URLs for avatars and post images
 *
 * When NOT set, the app falls back to FastAPI for everything —
 * no Supabase client is created.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Returns the Supabase client, or null when not configured.
 * Always check for null before using Supabase features.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

/** True when Supabase credentials are configured in environment. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Get a public URL for a file in a public bucket. */
export function getPublicUrl(bucket: string, path: string): string {
  if (!supabaseUrl) return path;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
