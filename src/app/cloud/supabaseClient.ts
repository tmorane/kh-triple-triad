import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let client: SupabaseClient | null | undefined

export function isCloudAuthEnabled(): boolean {
  return typeof supabaseUrl === 'string' && supabaseUrl.length > 0 && typeof supabaseAnonKey === 'string' && supabaseAnonKey.length > 0
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isCloudAuthEnabled()) {
    return null
  }

  if (client === undefined) {
    client = createClient(supabaseUrl, supabaseAnonKey)
  }

  return client
}
