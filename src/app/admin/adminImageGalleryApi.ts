import { isAdminEmailAllowed, parseAdminAllowedEmails } from './adminAllowlist.js'

interface AdminImageGalleryApiRequest {
  method?: string
  headers?: Record<string, string | undefined>
}

export interface AdminImageGalleryApiResponse {
  status: number
  body: unknown
}

interface AdminPublicGalleryImage {
  filename: string
  url: string
  mediaType: string
  createdAt: string
}

interface AdminImageGalleryApiDeps {
  verifyAccessToken: (token: string) => Promise<{ email: string | null }>
  listImages: () => Promise<AdminPublicGalleryImage[]>
  allowedEmailsRaw: string | null | undefined
  bypassAuth?: boolean
}

function getAuthorizationHeader(headers: Record<string, string | undefined> | undefined): string | null {
  if (!headers) {
    return null
  }

  const direct = headers.authorization
  if (direct) {
    return direct
  }

  const key = Object.keys(headers).find((entry) => entry.toLowerCase() === 'authorization')
  return key ? headers[key] ?? null : null
}

function parseBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/)
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null
  }

  return token
}

export async function handleAdminImageGalleryRequest(
  request: AdminImageGalleryApiRequest,
  deps: AdminImageGalleryApiDeps,
): Promise<AdminImageGalleryApiResponse> {
  if (request.method !== 'GET') {
    return { status: 405, body: { error: 'Method Not Allowed' } }
  }

  if (!deps.bypassAuth) {
    const token = parseBearerToken(getAuthorizationHeader(request.headers))
    if (!token) {
      return { status: 401, body: { error: 'Authentication required.' } }
    }

    let authUser: { email: string | null }
    try {
      authUser = await deps.verifyAccessToken(token)
    } catch {
      return { status: 401, body: { error: 'Authentication required.' } }
    }

    const allowedEmails = parseAdminAllowedEmails(deps.allowedEmailsRaw)
    if (!isAdminEmailAllowed(authUser.email, allowedEmails)) {
      return { status: 403, body: { error: 'Admin access required.' } }
    }
  }

  try {
    const images = await deps.listImages()
    return { status: 200, body: { images } }
  } catch {
    return { status: 500, body: { error: 'Unable to read public gallery.' } }
  }
}
