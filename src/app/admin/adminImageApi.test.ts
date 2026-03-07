import { describe, expect, test, vi } from 'bun:test'
import { handleAdminImageGenerateRequest } from './adminImageApi'

describe('handleAdminImageGenerateRequest', () => {
  test('returns 401 when auth header is missing', async () => {
    const result = await handleAdminImageGenerateRequest(
      { method: 'POST', headers: {}, body: {} },
      {
        verifyAccessToken: vi.fn(),
        generateImages: vi.fn(),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(401)
    expect(result.body).toEqual({ error: 'Authentication required.' })
  })

  test('returns 403 when user email is not allowlisted', async () => {
    const result = await handleAdminImageGenerateRequest(
      { method: 'POST', headers: { authorization: 'Bearer token' }, body: {} },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'player@example.com' })),
        generateImages: vi.fn(),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(403)
    expect(result.body).toEqual({ error: 'Admin access required.' })
  })

  test('returns 400 when payload is invalid', async () => {
    const result = await handleAdminImageGenerateRequest(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: { prompt: '', variants: 1, aspectRatio: '1:1' },
      },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'admin@example.com' })),
        generateImages: vi.fn(),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'Prompt is required.' })
  })

  test('returns 400 when aspect ratio is unsupported', async () => {
    const result = await handleAdminImageGenerateRequest(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: { prompt: 'dragon', variants: 1, aspectRatio: '21:9' },
      },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'admin@example.com' })),
        generateImages: vi.fn(),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'Aspect ratio must be one of 1:1, 16:9, or 9:16.' })
  })

  test('returns 200 with generated images for admin users', async () => {
    const generateImages = vi.fn(async () => ({
      model: 'google/imagen-4.0-generate-001',
      createdAt: '2026-03-01T12:00:00.000Z',
      images: [{ mediaType: 'image/png', base64: 'abc123', filename: 'a.png' }],
    }))
    const persistGeneratedImages = vi.fn(async () => undefined)

    const result = await handleAdminImageGenerateRequest(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: { prompt: 'dragon', variants: 1, aspectRatio: '1:1', filename: 'dragon-card' },
      },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'admin@example.com' })),
        generateImages,
        persistGeneratedImages,
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(200)
    expect(generateImages).toHaveBeenCalledWith({ prompt: 'dragon', variants: 1, aspectRatio: '1:1', filename: 'dragon-card' })
    expect(result.body).toEqual({
      model: 'google/imagen-4.0-generate-001',
      createdAt: '2026-03-01T12:00:00.000Z',
      images: [{ mediaType: 'image/png', base64: 'abc123', filename: 'a.png' }],
    })
    expect(persistGeneratedImages).toHaveBeenCalledWith({
      model: 'google/imagen-4.0-generate-001',
      createdAt: '2026-03-01T12:00:00.000Z',
      images: [{ mediaType: 'image/png', base64: 'abc123', filename: 'a.png' }],
    })
  })

  test('bypasses auth checks when bypassAuth is enabled', async () => {
    const generateImages = vi.fn(async () => ({
      model: 'google/imagen-4.0-generate-001',
      createdAt: '2026-03-01T12:00:00.000Z',
      images: [{ mediaType: 'image/png', base64: 'abc123', filename: 'local.png' }],
    }))

    const result = await handleAdminImageGenerateRequest(
      {
        method: 'POST',
        headers: {},
        body: { prompt: 'dragon', variants: 1, aspectRatio: '1:1' },
      },
      {
        verifyAccessToken: vi.fn(),
        generateImages,
        allowedEmailsRaw: '',
        bypassAuth: true,
      },
    )

    expect(result.status).toBe(200)
    expect(generateImages).toHaveBeenCalledWith({ prompt: 'dragon', variants: 1, aspectRatio: '1:1' })
  })

  test('returns 500 when persisting images fails', async () => {
    const generateImages = vi.fn(async () => ({
      model: 'google/imagen-4.0-generate-001',
      createdAt: '2026-03-01T12:00:00.000Z',
      images: [{ mediaType: 'image/png', base64: 'abc123', filename: 'a.png' }],
    }))

    const result = await handleAdminImageGenerateRequest(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: { prompt: 'dragon', variants: 1, aspectRatio: '1:1' },
      },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'admin@example.com' })),
        generateImages,
        persistGeneratedImages: vi.fn(async () => {
          throw new Error('Unable to persist images in public.')
        }),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(500)
    expect(result.body).toEqual({ error: 'Unable to persist images in public.' })
  })
})
