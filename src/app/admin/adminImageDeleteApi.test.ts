import { describe, expect, test, vi } from 'bun:test'
import { handleAdminImageDeleteRequest } from './adminImageDeleteApi'

describe('handleAdminImageDeleteRequest', () => {
  test('returns 401 when auth header is missing', async () => {
    const result = await handleAdminImageDeleteRequest(
      { method: 'POST', headers: {}, body: {} },
      {
        verifyAccessToken: vi.fn(),
        deleteImage: vi.fn(),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(401)
    expect(result.body).toEqual({ error: 'Authentication required.' })
  })

  test('returns 403 when user email is not allowlisted', async () => {
    const result = await handleAdminImageDeleteRequest(
      { method: 'POST', headers: { authorization: 'Bearer token' }, body: {} },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'player@example.com' })),
        deleteImage: vi.fn(),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(403)
    expect(result.body).toEqual({ error: 'Admin access required.' })
  })

  test('returns 400 for invalid payload', async () => {
    const result = await handleAdminImageDeleteRequest(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: { filename: '' },
      },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'admin@example.com' })),
        deleteImage: vi.fn(),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'Filename is required.' })
  })

  test('returns 404 when image does not exist', async () => {
    const result = await handleAdminImageDeleteRequest(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: { filename: 'admin-images/missing.png' },
      },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'admin@example.com' })),
        deleteImage: vi.fn(async () => {
          throw new Error('Image not found.')
        }),
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(404)
    expect(result.body).toEqual({ error: 'Image not found.' })
  })

  test('returns 200 when delete succeeds', async () => {
    const deleteImage = vi.fn(async () => ({ deleted: true }))

    const result = await handleAdminImageDeleteRequest(
      {
        method: 'POST',
        headers: { authorization: 'Bearer token' },
        body: { filename: 'admin-images/generated.png' },
      },
      {
        verifyAccessToken: vi.fn(async () => ({ email: 'admin@example.com' })),
        deleteImage,
        allowedEmailsRaw: 'admin@example.com',
      },
    )

    expect(result.status).toBe(200)
    expect(deleteImage).toHaveBeenCalledWith({ filename: 'admin-images/generated.png' })
    expect(result.body).toEqual({ deleted: true })
  })

  test('bypasses auth checks when bypassAuth is enabled', async () => {
    const deleteImage = vi.fn(async () => ({ deleted: true }))

    const result = await handleAdminImageDeleteRequest(
      {
        method: 'POST',
        headers: {},
        body: { filename: 'admin-images/generated.png' },
      },
      {
        verifyAccessToken: vi.fn(),
        deleteImage,
        allowedEmailsRaw: '',
        bypassAuth: true,
      },
    )

    expect(result.status).toBe(200)
    expect(deleteImage).toHaveBeenCalledWith({ filename: 'admin-images/generated.png' })
  })
})
