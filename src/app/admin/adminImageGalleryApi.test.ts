import { describe, expect, test, vi } from 'bun:test'
import { handleAdminImageGalleryRequest } from './adminImageGalleryApi'

describe('handleAdminImageGalleryRequest', () => {
  test('returns 401 when auth header is missing', async () => {
    const result = await handleAdminImageGalleryRequest(
      { method: 'GET', headers: {} },
      {
        verifyAccessToken: vi.fn(),
        listImages: vi.fn(),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(401)
    expect(result.body).toEqual({ error: 'Authentication required.' })
  })

  test('returns 403 when user email is not allowlisted', async () => {
    const result = await handleAdminImageGalleryRequest(
      { method: 'GET', headers: { authorization: 'Bearer token' } },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'player@example.com' })),
        listImages: vi.fn(),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(403)
    expect(result.body).toEqual({ error: 'Admin access required.' })
  })

  test('returns 200 with gallery images', async () => {
    const listImages = vi.fn(async () => [
      {
        filename: 'admin-images/generated.png',
        url: '/admin-images/generated.png',
        mediaType: 'image/png',
        createdAt: '2026-03-01T12:00:00.000Z',
      },
    ])

    const result = await handleAdminImageGalleryRequest(
      { method: 'GET', headers: { authorization: 'Bearer token' } },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'admin@example.com' })),
        listImages,
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(200)
    expect(listImages).toHaveBeenCalled()
    expect(result.body).toEqual({
      images: [
        {
          filename: 'admin-images/generated.png',
          url: '/admin-images/generated.png',
          mediaType: 'image/png',
          createdAt: '2026-03-01T12:00:00.000Z',
        },
      ],
    })
  })

  test('bypasses auth checks when bypassAuth is enabled', async () => {
    const listImages = vi.fn(async () => [])

    const result = await handleAdminImageGalleryRequest(
      { method: 'GET', headers: {} },
      {
        verifyAccessToken: vi.fn(),
        listImages,
        allowedEmailsRaw: '',
        bypassAuth: true,
      },
    )

    expect(result.status).toBe(200)
    expect(listImages).toHaveBeenCalled()
  })
})
