import { isAdminEmailAllowed, parseAdminAllowedEmails } from './adminAllowlist'

interface AdminImageRenameApiRequest {
  method?: string
  headers?: Record<string, string | undefined>
  body?: unknown
}

export interface AdminImageRenameApiResponse {
  status: number
  body: unknown
}

export interface AdminImageRenameRequestPayload {
  sourceFilename: string
  targetName: string
}

interface RenamedPublicImage {
  filename: string
  url: string
  mediaType: string
  createdAt: string
}

interface AdminImageRenameApiDeps {
  verifyAccessToken: (token: string) => Promise<{ email: string | null }>
  renameImage: (request: AdminImageRenameRequestPayload) => Promise<RenamedPublicImage>
  allowedEmailsRaw: string | null | undefined
  bypassAuth?: boolean
}

interface ValidatePayloadSuccess {
  ok: true
  value: AdminImageRenameRequestPayload
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

  if (typeof body.sourceFilename !== 'string' || body.sourceFilename.trim().length === 0) {
    return { ok: false, message: 'Source filename is required.' }
  }

  if (typeof body.targetName !== 'string' || body.targetName.trim().length === 0) {
    return { ok: false, message: 'Target name is required.' }
  }

  return {
    ok: true,
    value: {
      sourceFilename: body.sourceFilename.trim(),
      targetName: body.targetName.trim(),
    },
  }
}

function isBadRequestRenameError(message: string): boolean {
  return (
    message === 'Invalid source filename.' ||
    message === 'Invalid target name.' ||
    message === 'Source file must be an image.' ||
    message === 'Target extension must match source image type.'
  )
}

export async function handleAdminImageRenameRequest(
  request: AdminImageRenameApiRequest,
  deps: AdminImageRenameApiDeps,
): Promise<AdminImageRenameApiResponse> {
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
    const image = await deps.renameImage(validation.value)
    return {
      status: 200,
      body: { image },
    }
  } catch (error) {
    const message = error instanceof Error && error.message.trim().length > 0 ? error.message : 'Image rename failed.'
    if (message === 'Source image not found.') {
      return { status: 404, body: { error: message } }
    }
    if (isBadRequestRenameError(message)) {
      return { status: 400, body: { error: message } }
    }
    return { status: 500, body: { error: message } }
  }
}
