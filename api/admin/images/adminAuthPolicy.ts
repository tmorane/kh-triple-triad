export function readBooleanEnvValue(value: string | null | undefined): boolean | null {
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

interface ResolveAdminBypassOptions {
  rawBypassValue: string | null | undefined
  nodeEnv: string | null | undefined
}

export function isAdminAuthBypassEnabled(options: ResolveAdminBypassOptions): boolean {
  if (options.nodeEnv?.toLowerCase() === 'production') {
    return false
  }

  const explicit = readBooleanEnvValue(options.rawBypassValue)
  if (explicit !== null) {
    return explicit
  }

  return true
}
