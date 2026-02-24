import { beforeEach, describe, expect, test, vi } from 'vitest'

describe('supabaseClient', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  test('keeps cloud auth enabled with built-in defaults when env vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    const module = await import('./supabaseClient')

    expect(module.isCloudAuthEnabled()).toBe(true)
    expect(module.getSupabaseClient()).not.toBeNull()
  })
})
