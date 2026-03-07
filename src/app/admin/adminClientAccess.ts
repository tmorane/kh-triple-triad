import { isAdminEmailAllowed, parseAdminAllowedEmails } from './adminAllowlist'

function readBooleanEnv(value: unknown): boolean | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1') {
    return true
  }
  if (normalized === 'false' || normalized === '0') {
    return false
  }
  return null
}

export function isAdminAuthBypassedInClient(): boolean {
  const explicit = readBooleanEnv(import.meta.env.VITE_ADMIN_BYPASS_LOCAL_AUTH)
  if (explicit !== null) {
    return explicit
  }

  return import.meta.env.DEV && import.meta.env.MODE !== 'test'
}

function readAdminAllowlistFromEnv(): string | null {
  const raw = import.meta.env.VITE_ADMIN_ALLOWED_EMAILS
  if (typeof raw !== 'string') {
    return null
  }

  const normalized = raw.trim()
  if (normalized.length === 0 || normalized === 'undefined' || normalized === 'null') {
    return null
  }

  return normalized
}

export function canAccessAdminImages(email: string | null | undefined): boolean {
  if (isAdminAuthBypassedInClient()) {
    return true
  }

  if (!email) {
    return false
  }

  const allowlist = parseAdminAllowedEmails(readAdminAllowlistFromEnv())
  if (allowlist.size === 0) {
    return true
  }

  return isAdminEmailAllowed(email, allowlist)
}
