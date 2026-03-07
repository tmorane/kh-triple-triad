import { describe, expect, test } from 'bun:test'
import { canAccessAdminImages, isAdminAuthBypassedInClient } from './adminClientAccess'

describe('isAdminAuthBypassedInClient', () => {
  test('returns true when explicit bypass env is enabled', () => {
    import.meta.env.VITE_ADMIN_BYPASS_LOCAL_AUTH = 'true'
    expect(isAdminAuthBypassedInClient()).toBe(true)
  })

  test('returns false when explicit bypass env is disabled', () => {
    import.meta.env.VITE_ADMIN_BYPASS_LOCAL_AUTH = 'false'
    expect(isAdminAuthBypassedInClient()).toBe(false)
  })
})

describe('canAccessAdminImages', () => {
  test('allows signed-in users when client allowlist is not configured', () => {
    import.meta.env.VITE_ADMIN_BYPASS_LOCAL_AUTH = 'false'
    import.meta.env.VITE_ADMIN_ALLOWED_EMAILS = ''

    expect(canAccessAdminImages('admin@example.com')).toBe(true)
  })

  test('rejects users not in configured allowlist', () => {
    import.meta.env.VITE_ADMIN_BYPASS_LOCAL_AUTH = 'false'
    import.meta.env.VITE_ADMIN_ALLOWED_EMAILS = 'admin@example.com'

    expect(canAccessAdminImages('player@example.com')).toBe(false)
  })

  test('rejects missing email', () => {
    import.meta.env.VITE_ADMIN_BYPASS_LOCAL_AUTH = 'false'
    import.meta.env.VITE_ADMIN_ALLOWED_EMAILS = 'admin@example.com'

    expect(canAccessAdminImages(null)).toBe(false)
  })

  test('allows access even without email when bypass is enabled', () => {
    import.meta.env.VITE_ADMIN_BYPASS_LOCAL_AUTH = 'true'
    import.meta.env.VITE_ADMIN_ALLOWED_EMAILS = 'admin@example.com'

    expect(canAccessAdminImages(null)).toBe(true)
  })
})
