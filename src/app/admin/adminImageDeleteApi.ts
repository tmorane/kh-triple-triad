import { isAdminEmailAllowed, parseAdminAllowedEmails } from './adminAllowlist'

interface AdminImageDeleteApiRequest {
  method?: string
  headers?: Record<string, string | undefined>
  body?: unknown
}

export interface AdminImageDeleteApiResponse {
  status: number
  body: unknown
}

interface AdminImageDeleteRequestPayload {
  filename: string
}

interface AdminImageDeleteApiDeps {
  verifyAccessToken: (token: string) => Promise<{ email: string | null }>
  deleteImage: (request: AdminImageDeleteRequestPayload) => Promise<{ deleted: true }>
  allowedEmailsRaw: string | null | undefined
  bypassAuth?: boolean
}

interface ValidatePayloadSuccess {
  ok: true
  value: AdminImageDeleteRequestPayload
}

interface ValidatePayloadFailure {
  ok: false
  message: string
}

type ValidatePayloadResult = ValidatePayloadSuccess | ValidatePayloadFailure

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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

function validatePayload(body: unknown): ValidatePayloadResult {
  if (!isRecord(body)) {
    return { ok: false, message: 'Payload must be an object.' }
  }

  if (typeof body.filename !== 'string' || body.filename.trim().length === 0) {
    return { ok: false, message: 'Filename is required.' }
  }

  return {
    ok: true,
    value: {
      filename: body.filename.trim(),
    },
  }
}

function isBadRequestDeleteError(message: string): boolean {
  return message === 'Invalid filename.' || message === 'File must be an image.'
}

export async function handleAdminImageDeleteRequest(
  request: AdminImageDeleteApiRequest,
  deps: AdminImageDeleteApiDeps,
): Promise<AdminImageDeleteApiResponse> {
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

  const payload = parseBody(request.body)
  const validation = validatePayload(payload)
  if (!validation.ok) {
    return { status: 400, body: { error: validation.message } }
  }

  try {
    return {
      status: 200,
      body: await deps.deleteImage(validation.value),
    }
  } catch (error) {
    const message = error instanceof Error && error.message.trim().length > 0 ? error.message : 'Image delete failed.'
    if (message === 'Image not found.') {
      return { status: 404, body: { error: message } }
    }
    if (isBadRequestDeleteError(message)) {
      return { status: 400, body: { error: message } }
    }
    return { status: 500, body: { error: message } }
  }
}
