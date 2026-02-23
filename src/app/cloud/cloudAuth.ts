import type { User } from '@supabase/supabase-js'
import { getSupabaseClient, isCloudAuthEnabled } from './supabaseClient'

export interface CloudSessionUser {
  id: string
  email: string | null
}

export { isCloudAuthEnabled }

function ensureClient() {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error('Cloud auth is disabled. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  return client
}

function mapUser(user: User | null): CloudSessionUser | null {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email ?? null,
  }
}

export async function getCloudSessionUser(): Promise<CloudSessionUser | null> {
  const client = getSupabaseClient()
  if (!client) {
    return null
  }

  const { data, error } = await client.auth.getSession()
  if (error) {
    throw new Error(error.message)
  }

  return mapUser(data.session?.user ?? null)
}

export async function signInCloud(email: string, password: string): Promise<CloudSessionUser> {
  const client = ensureClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(error.message)
  }

  const mapped = mapUser(data.user ?? null)
  if (!mapped) {
    throw new Error('Sign-in succeeded but no user session is available.')
  }

  return mapped
}

export async function signUpCloud(email: string, password: string): Promise<CloudSessionUser> {
  const client = ensureClient()
  const { data, error } = await client.auth.signUp({ email, password })
  if (error) {
    throw new Error(error.message)
  }

  const mapped = mapUser(data.user ?? null)
  if (!mapped) {
    throw new Error('Sign-up succeeded but no user was returned.')
  }

  return mapped
}

export async function signOutCloud(): Promise<void> {
  const client = ensureClient()
  const { error } = await client.auth.signOut()
  if (error) {
    throw new Error(error.message)
  }
}

export function onCloudAuthStateChange(handler: (user: CloudSessionUser | null) => void): () => void {
  const client = getSupabaseClient()
  if (!client || !isCloudAuthEnabled()) {
    return () => undefined
  }

  const { data } = client.auth.onAuthStateChange((_event, session) => {
    handler(mapUser(session?.user ?? null))
  })

  return () => data.subscription.unsubscribe()
}
