import { isAdminEmailAllowed, parseAdminAllowedEmails } from './adminAllowlist'

interface AdminImageMoveApiRequest {
  method?: string
  headers?: Record<string, string | undefined>
  body?: unknown
}

export interface AdminImageMoveApiResponse {
  status: number
  body: unknown
}

export interface AdminImageMoveRequestPayload {
  sourceFilename: string
  targetDirectory: string
}

interface MovedPublicImage {
  filename: string
  url: string
  mediaType: string
  createdAt: string
}

interface AdminImageMoveApiDeps {
  verifyAccessToken: (token: string) => Promise<{ email: string | null }>
  moveImage: (request: AdminImageMoveRequestPayload) => Promise<MovedPublicImage>
  allowedEmailsRaw: string | null | undefined
  bypassAuth?: boolean
}

interface ValidateMovePayloadSuccess {
  ok: true
  value: AdminImageMoveRequestPayload
}

interface ValidateMovePayloadFailure {
  ok: false
  message: string
}

type ValidateMovePayloadResult = ValidateMovePayloadSuccess | ValidateMovePayloadFailure

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

function validateMovePayload(body: unknown): ValidateMovePayloadResult {
  if (!isRecord(body)) {
    return { ok: false, message: 'Payload must be an object.' }
  }

  if (typeof body.sourceFilename !== 'string' || body.sourceFilename.trim().length === 0) {
    return { ok: false, message: 'Source filename is required.' }
  }

  if (typeof body.targetDirectory !== 'string') {
    return { ok: false, message: 'Target directory must be a string.' }
  }

  return {
    ok: true,
    value: {
      sourceFilename: body.sourceFilename.trim(),
      targetDirectory: body.targetDirectory.trim(),
    },
  }
}

function isBadRequestMoveError(message: string): boolean {
  return (
    message === 'Invalid source filename.' ||
    message === 'Invalid target directory.' ||
    message === 'Source file must be an image.'
  )
}

export async function handleAdminImageMoveRequest(
  request: AdminImageMoveApiRequest,
  deps: AdminImageMoveApiDeps,
): Promise<AdminImageMoveApiResponse> {
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
  const validation = validateMovePayload(payload)
  if (!validation.ok) {
    return { status: 400, body: { error: validation.message } }
  }

  try {
    const image = await deps.moveImage(validation.value)
    return {
      status: 200,
      body: { image },
    }
  } catch (error) {
    const message = error instanceof Error && error.message.trim().length > 0 ? error.message : 'Image move failed.'
    if (message === 'Source image not found.') {
      return { status: 404, body: { error: message } }
    }
    if (isBadRequestMoveError(message)) {
      return { status: 400, body: { error: message } }
    }

    return { status: 500, body: { error: message } }
  }
}
