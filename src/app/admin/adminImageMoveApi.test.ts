import { describe, expect, test, vi } from 'bun:test'
import { handleAdminImageMoveRequest } from './adminImageMoveApi'

describe('handleAdminImageMoveRequest', () => {
  test('returns 401 when auth header is missing', async () => {
    const result = await handleAdminImageMoveRequest(
      { method: 'POST', headers: {}, body: {} },
      {
        verifyAccessToken: vi.fn(),
        moveImage: vi.fn(),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(401)
    expect(result.body).toEqual({ error: 'Authentication required.' })
  })

  test('returns 403 when user email is not allowlisted', async () => {
    const result = await handleAdminImageMoveRequest(
      { method: 'POST', headers: { authorization: 'Bearer token' }, body: {} },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'player@example.com' })),
        moveImage: vi.fn(),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(403)
    expect(result.body).toEqual({ error: 'Admin access required.' })
  })

  test('returns 400 for invalid payload', async () => {
    const result = await handleAdminImageMoveRequest(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: { sourceFilename: '', targetDirectory: 'cards' },
      },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'admin@example.com' })),
        moveImage: vi.fn(),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'Source filename is required.' })
  })

  test('returns 404 when source image does not exist', async () => {
    const result = await handleAdminImageMoveRequest(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: { sourceFilename: 'admin-images/missing.png', targetDirectory: 'cards' },
      },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'admin@example.com' })),
        moveImage: vi.fn(async () => {
          throw new Error('Source image not found.')
        }),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(404)
    expect(result.body).toEqual({ error: 'Source image not found.' })
  })

  test('returns 200 with moved image metadata', async () => {
    const moveImage = vi.fn(async () => ({
      filename: 'cards/generated.png',
      url: '/cards/generated.png',
      mediaType: 'image/png',
      createdAt: '2026-03-01T12:00:00.000Z',
    }))

    const result = await handleAdminImageMoveRequest(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: { sourceFilename: 'admin-images/generated.png', targetDirectory: 'cards' },
      },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'admin@example.com' })),
        moveImage,
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(200)
    expect(moveImage).toHaveBeenCalledWith({ sourceFilename: 'admin-images/generated.png', targetDirectory: 'cards' })
    expect(result.body).toEqual({
      image: {
        filename: 'cards/generated.png',
        url: '/cards/generated.png',
        mediaType: 'image/png',
        createdAt: '2026-03-01T12:00:00.000Z',
      },
    })
  })

  test('bypasses auth checks when bypassAuth is enabled', async () => {
    const moveImage = vi.fn(async () => ({
      filename: 'cards/generated.png',
      url: '/cards/generated.png',
      mediaType: 'image/png',
      createdAt: '2026-03-01T12:00:00.000Z',
    }))

    const result = await handleAdminImageMoveRequest(
      {
        method: 'POST',
        headers: {},
        body: { sourceFilename: 'admin-images/generated.png', targetDirectory: 'cards' },
      },
      {
        verifyAccessToken: vi.fn(),
        moveImage,
        allowedEmailsRaw: '',
        bypassAuth: true,
      },
    )

    expect(result.status).toBe(200)
    expect(moveImage).toHaveBeenCalledWith({ sourceFilename: 'admin-images/generated.png', targetDirectory: 'cards' })
  })
})
