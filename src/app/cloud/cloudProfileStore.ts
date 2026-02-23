import type { PlayerProfile } from '../../domain/types'
import { parseStoredProfileSnapshot } from '../../domain/progression/profile'
import { upsertCloudLadderEntry } from './cloudLadderStore'
import { getSupabaseClient } from './supabaseClient'

const PLAYER_PROFILES_TABLE = 'player_profiles'

function ensureClient() {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error('Cloud auth is disabled. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  return client
}

export async function fetchCloudProfile(userId: string): Promise<PlayerProfile | null> {
  const client = ensureClient()
  const { data, error } = await client
    .from(PLAYER_PROFILES_TABLE)
    .select('profile')
    .eq('user_id', userId)
    .maybeSingle<{ profile: unknown }>()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  const profile = parseStoredProfileSnapshot(data.profile)
  if (!profile) {
    throw new Error('Cloud profile payload is invalid.')
  }

  return profile
}

export async function saveCloudProfile(userId: string, profile: PlayerProfile): Promise<void> {
  const client = ensureClient()
  const { error } = await client.from(PLAYER_PROFILES_TABLE).upsert(
    {
      user_id: userId,
      profile,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) {
    throw new Error(error.message)
  }

  try {
    await upsertCloudLadderEntry(userId, profile)
  } catch {
    // Keep profile sync resilient if ladder table is not configured yet.
  }
}
