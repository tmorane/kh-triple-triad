import { describe, expect, test, vi } from 'bun:test'
import {
  ADMIN_IMAGE_MODEL,
  generateAdminImages,
  getAdminImageGatewayConfigError,
  parseAdminAllowedEmails,
  validateAdminImageGenerateRequest,
} from './adminImageGeneration'

describe('parseAdminAllowedEmails', () => {
  test('normalizes and filters empty values', () => {
    const result = parseAdminAllowedEmails('  ADMIN@example.com, ,test@example.com,, ')

    expect([...result]).toEqual(['admin@example.com', 'test@example.com'])
  })
})

describe('validateAdminImageGenerateRequest', () => {
  test('rejects an out-of-range variant count', () => {
    const result = validateAdminImageGenerateRequest({
      prompt: 'A dragon card',
      variants: 9,
      aspectRatio: '1:1',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe('Variants must be between 1 and 4.')
    }
  })

  test('rejects unsupported 21:9 aspect ratio', () => {
    const result = validateAdminImageGenerateRequest({
      prompt: 'A dragon card',
      variants: 1,
      aspectRatio: '21:9',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe('Aspect ratio must be one of 1:1, 16:9, or 9:16.')
    }
  })
})

describe('getAdminImageGatewayConfigError', () => {
  test('returns setup error when API key is missing outside Vercel', () => {
    const result = getAdminImageGatewayConfigError({
      AI_GATEWAY_API_KEY: '',
      VERCEL: '',
      VERCEL_ENV: '',
    })

    expect(result).toBe('AI Gateway auth failed. Set AI_GATEWAY_API_KEY in server env and restart the dev server.')
  })

  test('returns null when API key is present', () => {
    const result = getAdminImageGatewayConfigError({
      AI_GATEWAY_API_KEY: 'test-key',
      VERCEL: '',
      VERCEL_ENV: '',
    })

    expect(result).toBeNull()
  })
})

describe('generateAdminImages', () => {
  test('rewrites gateway cookies auth failure to actionable message', async () => {
    const failingGenerateImage = vi.fn(async () => {
      throw new Error('Invalid error response format: Gateway request failed: cookies is not iterable')
    })

    await expect(
      generateAdminImages(
        {
          prompt: 'Pokemon card art',
          variants: 1,
          aspectRatio: '1:1',
        },
        { generateImage: failingGenerateImage },
      ),
    ).rejects.toThrow('AI Gateway auth failed. Set AI_GATEWAY_API_KEY in server env and restart the dev server.')
  })

  test('uses custom filename base when provided', async () => {
    const generateImage = vi.fn(async () => ({
      images: [{ base64: 'abc123', mediaType: 'image/png' }],
    }))

    const response = await generateAdminImages(
      {
        prompt: 'Pokemon card art',
        variants: 1,
        aspectRatio: '1:1',
        filename: 'electrik logo',
      },
      {
        generateImage,
        now: () => new Date('2026-03-01T12:00:00.000Z'),
      },
    )

    expect(response.images[0]?.filename).toBe('electrik-logo.png')
  })

  test('maps generated files to stable API output', async () => {
    const generateImage = vi.fn(async () => ({
      images: [
        { base64: 'abc123', mediaType: 'image/png' },
        { base64: 'xyz789', mediaType: 'image/webp' },
      ],
    }))

    const response = await generateAdminImages(
      {
        prompt: 'Pokemon card art',
        variants: 2,
        aspectRatio: '16:9',
      },
      {
        generateImage,
        now: () => new Date('2026-03-01T12:00:00.000Z'),
      },
    )

    expect(generateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        model: ADMIN_IMAGE_MODEL,
        n: 2,
        aspectRatio: '16:9',
      }),
    )

    expect(response).toEqual({
      model: ADMIN_IMAGE_MODEL,
      createdAt: '2026-03-01T12:00:00.000Z',
      images: [
        {
          mediaType: 'image/png',
          base64: 'abc123',
          filename: 'admin-image-20260301T120000000Z-1.png',
        },
        {
          mediaType: 'image/webp',
          base64: 'xyz789',
          filename: 'admin-image-20260301T120000000Z-2.webp',
        },
      ],
    })
  })
})
