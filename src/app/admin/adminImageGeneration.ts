import { generateImage } from 'ai'
import { parseAdminAllowedEmails } from './adminAllowlist'

export { parseAdminAllowedEmails }

export const ADMIN_IMAGE_MODEL = 'google/imagen-4.0-generate-001'
const IMAGE_GENERATION_TIMEOUT_MS = 45_000
const MAX_PROMPT_LENGTH = 1_000
const MAX_FILENAME_LENGTH = 120
const GATEWAY_SETUP_ERROR = 'AI Gateway auth failed. Set AI_GATEWAY_API_KEY in server env and restart the dev server.'

export type AdminImageAspectRatio = '1:1' | '16:9' | '9:16'

export interface AdminImageGenerateRequest {
  prompt: string
  variants: number
  aspectRatio: AdminImageAspectRatio
  style?: string
  filename?: string
}

export interface AdminImageGenerateResponse {
  model: string
  createdAt: string
  images: Array<{
    mediaType: string
    base64: string
    filename: string
  }>
}

export class AdminImageValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdminImageValidationError'
  }
}

interface ValidateSuccess {
  ok: true
  value: AdminImageGenerateRequest
}

interface ValidateFailure {
  ok: false
  message: string
}

type ValidateResult = ValidateSuccess | ValidateFailure

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function resolveExtension(mediaType: string): string {
  const slashIndex = mediaType.indexOf('/')
  if (slashIndex === -1) {
    return 'png'
  }

  const subtype = mediaType.slice(slashIndex + 1)
  const plusIndex = subtype.indexOf('+')
  const extension = plusIndex === -1 ? subtype : subtype.slice(0, plusIndex)
  return extension.length > 0 ? extension : 'png'
}

function buildTimestampFragment(isoDate: string): string {
  return isoDate.replace(/[-:.]/g, '')
}

function sanitizeFilenameBase(value: string): string {
  const normalizedSeparators = value.replace(/\\/g, '/')
  const basename = normalizedSeparators.includes('/') ? normalizedSeparators.slice(normalizedSeparators.lastIndexOf('/') + 1) : normalizedSeparators
  const withoutExtension = basename.replace(/\.[^/.]+$/, '')
  const collapsedWhitespace = withoutExtension.replace(/\s+/g, '-')
  const safe = collapsedWhitespace.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^[-._]+|[-._]+$/g, '')
  return safe.toLowerCase()
}

function composePrompt(prompt: string, style: string | undefined): string {
  if (!style) {
    return prompt
  }

  return `${prompt}\nStyle: ${style}`
}

function readEnvValue(env: Record<string, string | undefined>, name: string): string {
  const value = env[name]
  return typeof value === 'string' ? value.trim() : ''
}

export function getAdminImageGatewayConfigError(env: Record<string, string | undefined> = process.env): string | null {
  const apiKey = readEnvValue(env, 'AI_GATEWAY_API_KEY')
  if (apiKey.length > 0) {
    return null
  }

  const vercelFlag = readEnvValue(env, 'VERCEL')
  const vercelEnv = readEnvValue(env, 'VERCEL_ENV')
  if (vercelFlag.length > 0 || vercelEnv.length > 0) {
    return null
  }

  return GATEWAY_SETUP_ERROR
}

function normalizeImageGenerationErrorMessage(error: unknown): string {
  const message = error instanceof Error && error.message.trim().length > 0 ? error.message.trim() : 'Image generation failed.'
  const normalized = message.toLowerCase()

  if (normalized.includes('cookies is not iterable')) {
    return GATEWAY_SETUP_ERROR
  }

  if (normalized.includes('gateway request failed') && normalized.includes('invalid error response format')) {
    return GATEWAY_SETUP_ERROR
  }

  return message
}

export function validateAdminImageGenerateRequest(input: unknown): ValidateResult {
  if (!isRecord(input)) {
    return { ok: false, message: 'Payload must be an object.' }
  }

  if (typeof input.prompt !== 'string' || input.prompt.trim().length === 0) {
    return { ok: false, message: 'Prompt is required.' }
  }

  const prompt = input.prompt.trim()
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { ok: false, message: 'Prompt cannot exceed 1000 characters.' }
  }

  if (typeof input.variants !== 'number' || !Number.isInteger(input.variants)) {
    return { ok: false, message: 'Variants must be an integer.' }
  }

  if (input.variants < 1 || input.variants > 4) {
    return { ok: false, message: 'Variants must be between 1 and 4.' }
  }

  if (input.aspectRatio !== '1:1' && input.aspectRatio !== '16:9' && input.aspectRatio !== '9:16') {
    return { ok: false, message: 'Aspect ratio must be one of 1:1, 16:9, or 9:16.' }
  }

  if (input.style !== undefined && typeof input.style !== 'string') {
    return { ok: false, message: 'Style must be a string.' }
  }

  if (input.filename !== undefined && typeof input.filename !== 'string') {
    return { ok: false, message: 'Filename must be a string.' }
  }

  const style = typeof input.style === 'string' && input.style.trim().length > 0 ? input.style.trim() : undefined
  const filename =
    typeof input.filename === 'string' && input.filename.trim().length > 0 ? sanitizeFilenameBase(input.filename.trim()) : undefined

  if (typeof input.filename === 'string' && input.filename.trim().length > MAX_FILENAME_LENGTH) {
    return { ok: false, message: 'Filename cannot exceed 120 characters.' }
  }

  if (typeof input.filename === 'string' && input.filename.trim().length > 0 && !filename) {
    return { ok: false, message: 'Filename must include letters or numbers.' }
  }

  return {
    ok: true,
    value: {
      prompt,
      variants: input.variants,
      aspectRatio: input.aspectRatio,
      style,
      filename,
    },
  }
}

interface GenerateAdminImagesDeps {
  now?: () => Date
  generateImage?: (options: {
    model: string
    prompt: string
    n: number
    aspectRatio: AdminImageAspectRatio
    abortSignal: AbortSignal
  }) => Promise<{
    images: Array<{
      mediaType: string
      base64: string
    }>
  }>
}

export async function generateAdminImages(
  input: unknown,
  deps: GenerateAdminImagesDeps = {},
): Promise<AdminImageGenerateResponse> {
  const validation = validateAdminImageGenerateRequest(input)
  if (!validation.ok) {
    throw new AdminImageValidationError(validation.message)
  }

  const executeGenerateImage =
    deps.generateImage ??
    ((options) =>
      generateImage(options as Parameters<typeof generateImage>[0]) as Promise<{
        images: Array<{
          mediaType: string
          base64: string
        }>
      }>)
  if (!deps.generateImage) {
    const gatewayConfigError = getAdminImageGatewayConfigError()
    if (gatewayConfigError) {
      throw new Error(gatewayConfigError)
    }
  }
  const now = deps.now ?? (() => new Date())
  const createdAt = now().toISOString()
  const timestamp = buildTimestampFragment(createdAt)
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), IMAGE_GENERATION_TIMEOUT_MS)

  try {
    let result: {
      images: Array<{
        mediaType: string
        base64: string
      }>
    }

    try {
      result = await executeGenerateImage({
        model: ADMIN_IMAGE_MODEL,
        prompt: composePrompt(validation.value.prompt, validation.value.style),
        n: validation.value.variants,
        aspectRatio: validation.value.aspectRatio,
        abortSignal: abortController.signal,
      })
    } catch (error) {
      throw new Error(normalizeImageGenerationErrorMessage(error))
    }

    const images = result.images
      .filter((image) => image.mediaType.startsWith('image/'))
      .map((image, index) => {
        const extension = resolveExtension(image.mediaType)
        const filename = validation.value.filename
          ? `${validation.value.filename}${validation.value.variants > 1 ? `-${index + 1}` : ''}.${extension}`
          : `admin-image-${timestamp}-${index + 1}.${extension}`
        return {
          mediaType: image.mediaType,
          base64: image.base64,
          filename,
        }
      })

    if (images.length === 0) {
      throw new Error('No image was generated.')
    }

    return {
      model: ADMIN_IMAGE_MODEL,
      createdAt,
      images,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
