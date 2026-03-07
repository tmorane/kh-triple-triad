import { isAdminEmailAllowed, parseAdminAllowedEmails } from './adminAllowlist'
import {
  AdminImageValidationError,
  type AdminImageGenerateResponse,
  generateAdminImages,
  validateAdminImageGenerateRequest,
} from './adminImageGeneration'

interface AdminImageApiRequest {
  method?: string
  headers?: Record<string, string | undefined>
  body?: unknown
}

export interface AdminImageApiResponse {
  status: number
  body: unknown
}

interface AdminImageApiDeps {
  verifyAccessToken: (token: string) => Promise<{ email: string | null }>
  generateImages?: typeof generateAdminImages
  persistGeneratedImages?: (response: AdminImageGenerateResponse) => Promise<void>
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

function parseBody(body: unknown): unknown {
  if (typeof body !== 'string') {
    return body
  }

  try {
    return JSON.parse(body)
  } catch {
    return undefined
  }
}

export async function handleAdminImageGenerateRequest(
  request: AdminImageApiRequest,
  deps: AdminImageApiDeps,
): Promise<AdminImageApiResponse> {
  if (request.method !== 'POST') {
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

  const executeGenerateImages = deps.generateImages ?? generateAdminImages

  try {
    const payload = parseBody(request.body)
    const validation = validateAdminImageGenerateRequest(payload)
    if (!validation.ok) {
      return { status: 400, body: { error: validation.message } }
    }

    const result = await executeGenerateImages(validation.value)
    if (deps.persistGeneratedImages) {
      await deps.persistGeneratedImages(result)
    }
    return { status: 200, body: result }
  } catch (error) {
    if (error instanceof AdminImageValidationError) {
      return { status: 400, body: { error: error.message } }
    }

    const message = error instanceof Error && error.message.trim().length > 0 ? error.message : 'Image generation failed.'
    return { status: 500, body: { error: message } }
  }
}
