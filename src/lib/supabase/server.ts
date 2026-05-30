// ═══════════════════════════════════════════════════════════════
// Supabase Server Client (for API routes / server actions)
// ═══════════════════════════════════════════════════════════════

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with service-role privileges.
 * Use ONLY in API routes / server-side code — never expose to the browser.
 * Returns null if Supabase env vars are not configured.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const key = serviceKey || anonKey

  if (!url || !key || url.includes('your-project')) {
    return null
  }

  return createSupabaseClient(url, key)
}

/**
 * Check if Supabase is properly configured on the server
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!(url && key && !url.includes('your-project'))
}
