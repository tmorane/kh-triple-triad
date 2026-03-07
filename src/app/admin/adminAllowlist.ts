function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function parseAdminAllowedEmails(raw: string | null | undefined): Set<string> {
  if (!raw) {
    return new Set()
  }

  const emails = raw
    .split(',')
    .map((entry) => normalizeEmail(entry))
    .filter((entry) => entry.length > 0)

  return new Set(emails)
}

export function isAdminEmailAllowed(email: string | null | undefined, allowedEmails: Set<string>): boolean {
  if (!email) {
    return false
  }

  return allowedEmails.has(normalizeEmail(email))
}
