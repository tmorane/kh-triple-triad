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
  return resolveAdminAuthBypassForClient({
    rawBypassValue: import.meta.env.VITE_ADMIN_BYPASS_LOCAL_AUTH,
    isProd: import.meta.env.PROD,
    isDev: import.meta.env.DEV,
    mode: import.meta.env.MODE,
  })
}

interface ResolveAdminAuthBypassForClientOptions {
  rawBypassValue: unknown
  isProd: boolean
  isDev: boolean
  mode: string
}

export function resolveAdminAuthBypassForClient(options: ResolveAdminAuthBypassForClientOptions): boolean {
  if (options.isProd) {
    return false
  }

  const explicit = readBooleanEnv(options.rawBypassValue)
  if (explicit !== null) {
    return explicit
  }

  return false
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
    return false
  }

  return isAdminEmailAllowed(email, allowlist)
}
