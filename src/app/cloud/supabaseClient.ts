import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://dufnghfphczftetkpcqf.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_RyP064ovRl0TW8yypqtyag_xuZ-TsQL'

function readEnvValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const supabaseUrl = readEnvValue(import.meta.env.VITE_SUPABASE_URL) ?? DEFAULT_SUPABASE_URL
const supabaseAnonKey = readEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY) ?? DEFAULT_SUPABASE_ANON_KEY

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
