import { describe, expect, test, vi } from 'bun:test'
import { handleAdminImageRenameRequest } from './adminImageRenameApi'

describe('handleAdminImageRenameRequest', () => {
  test('returns 401 when auth header is missing', async () => {
    const result = await handleAdminImageRenameRequest(
      { method: 'POST', headers: {}, body: {} },
      {
        verifyAccessToken: vi.fn(),
        renameImage: vi.fn(),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(401)
    expect(result.body).toEqual({ error: 'Authentication required.' })
  })

  test('returns 400 for invalid payload', async () => {
    const result = await handleAdminImageRenameRequest(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: { sourceFilename: 'cards/pikachu.png', targetName: '' },
      },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'admin@example.com' })),
        renameImage: vi.fn(),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'Target name is required.' })
  })

  test('returns 200 with renamed image metadata', async () => {
    const renameImage = vi.fn(async () => ({
      filename: 'cards/raichu.png',
      url: '/cards/raichu.png',
      mediaType: 'image/png',
      createdAt: '2026-03-01T12:00:00.000Z',
    }))

    const result = await handleAdminImageRenameRequest(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: { sourceFilename: 'cards/pikachu.png', targetName: 'raichu' },
      },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'admin@example.com' })),
        renameImage,
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(200)
    expect(renameImage).toHaveBeenCalledWith({ sourceFilename: 'cards/pikachu.png', targetName: 'raichu' })
    expect(result.body).toEqual({
      image: {
        filename: 'cards/raichu.png',
        url: '/cards/raichu.png',
        mediaType: 'image/png',
        createdAt: '2026-03-01T12:00:00.000Z',
      },
    })
  })
})
