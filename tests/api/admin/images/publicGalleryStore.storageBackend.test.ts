import { describe, expect, test, vi, beforeEach } from 'bun:test'
import type { AdminImageGenerateResponse } from '../../../../src/app/admin/adminImageGeneration'
import {
  deletePublicImage,
  listAllPublicImages,
  movePublicImageToDirectory,
  persistGeneratedImagesToPublic,
  renamePublicImage,
} from '../../../../api/admin/images/publicGalleryStore'
import * as objectStorage from '../../../../api/admin/images/objectStorageGalleryStore'

vi.mock('../../../../api/admin/images/objectStorageGalleryStore', () => ({
  isObjectStorageEnabled: vi.fn(() => false),
  listAllObjectStorageImages: vi.fn(async () => []),
  persistGeneratedImagesToObjectStorage: vi.fn(async () => undefined),
  moveObjectStorageImageToDirectory: vi.fn(async () => ({
    filename: 'admin-images/mock.png',
    url: 'https://cdn.example.com/admin-images/mock.png',
    mediaType: 'image/png',
    createdAt: '2026-03-10T00:00:00.000Z',
  })),
  renameObjectStorageImage: vi.fn(async () => ({
    filename: 'admin-images/renamed.png',
    url: 'https://cdn.example.com/admin-images/renamed.png',
    mediaType: 'image/png',
    createdAt: '2026-03-10T00:00:00.000Z',
  })),
  deleteObjectStorageImage: vi.fn(async () => ({ deleted: true })),
}))

describe('publicGalleryStore storage backend delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(objectStorage.isObjectStorageEnabled).mockReturnValue(false)
  })

  test('delegates list to object storage when enabled', async () => {
    vi.mocked(objectStorage.isObjectStorageEnabled).mockReturnValue(true)
    vi.mocked(objectStorage.listAllObjectStorageImages).mockResolvedValueOnce([
      {
        filename: 'admin-images/cards/card.png',
        url: 'https://cdn.example.com/admin-images/cards/card.png',
        mediaType: 'image/png',
        createdAt: '2026-03-10T00:00:00.000Z',
      },
    ])

    const images = await listAllPublicImages()

    expect(images).toEqual([
      {
        filename: 'admin-images/cards/card.png',
        url: 'https://cdn.example.com/admin-images/cards/card.png',
        mediaType: 'image/png',
        createdAt: '2026-03-10T00:00:00.000Z',
      },
    ])
    expect(objectStorage.listAllObjectStorageImages).toHaveBeenCalledTimes(1)
  })

  test('delegates persist generated images to object storage when enabled', async () => {
    vi.mocked(objectStorage.isObjectStorageEnabled).mockReturnValue(true)
    const payload: AdminImageGenerateResponse = {
      createdAt: '2026-03-10T00:00:00.000Z',
      prompt: 'card',
      model: 'gpt-image-1',
      provider: 'openai',
      images: [
        {
          filename: 'card.png',
          mediaType: 'image/png',
          base64: Buffer.from('x').toString('base64'),
        },
      ],
    }

    await persistGeneratedImagesToPublic(payload)

    expect(objectStorage.persistGeneratedImagesToObjectStorage).toHaveBeenCalledWith(payload)
  })

  test('delegates move to object storage when enabled', async () => {
    vi.mocked(objectStorage.isObjectStorageEnabled).mockReturnValue(true)

    const result = await movePublicImageToDirectory({
      sourceFilename: 'admin-images/source.png',
      targetDirectory: 'admin-images/cards',
    })

    expect(result).toEqual({
      filename: 'admin-images/mock.png',
      url: 'https://cdn.example.com/admin-images/mock.png',
      mediaType: 'image/png',
      createdAt: '2026-03-10T00:00:00.000Z',
    })
    expect(objectStorage.moveObjectStorageImageToDirectory).toHaveBeenCalledWith({
      sourceFilename: 'admin-images/source.png',
      targetDirectory: 'admin-images/cards',
    })
  })

  test('delegates rename to object storage when enabled', async () => {
    vi.mocked(objectStorage.isObjectStorageEnabled).mockReturnValue(true)

    const result = await renamePublicImage({
      sourceFilename: 'admin-images/source.png',
      targetName: 'target',
    })

    expect(result).toEqual({
      filename: 'admin-images/renamed.png',
      url: 'https://cdn.example.com/admin-images/renamed.png',
      mediaType: 'image/png',
      createdAt: '2026-03-10T00:00:00.000Z',
    })
    expect(objectStorage.renameObjectStorageImage).toHaveBeenCalledWith({
      sourceFilename: 'admin-images/source.png',
      targetName: 'target',
    })
  })

  test('delegates delete to object storage when enabled', async () => {
    vi.mocked(objectStorage.isObjectStorageEnabled).mockReturnValue(true)

    const result = await deletePublicImage({ filename: 'admin-images/source.png' })

    expect(result).toEqual({ deleted: true })
    expect(objectStorage.deleteObjectStorageImage).toHaveBeenCalledWith({ filename: 'admin-images/source.png' })
  })
})
