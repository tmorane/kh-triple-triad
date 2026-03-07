import { describe, expect, test } from 'bun:test'
import { groupAdminPublicGalleryByDirectory, type AdminPublicGalleryImage } from './adminPublicGallery'

describe('groupAdminPublicGalleryByDirectory', () => {
  test('groups images by public directory and sorts directories', () => {
    const images: AdminPublicGalleryImage[] = [
      {
        filename: 'ui/icons/star.png',
        url: '/ui/icons/star.png',
        mediaType: 'image/png',
        createdAt: '2026-03-01T12:00:00.000Z',
      },
      {
        filename: 'admin-images/generated.png',
        url: '/admin-images/generated.png',
        mediaType: 'image/png',
        createdAt: '2026-03-01T12:00:01.000Z',
      },
      {
        filename: 'ui/backgrounds/arena.jpg',
        url: '/ui/backgrounds/arena.jpg',
        mediaType: 'image/jpeg',
        createdAt: '2026-03-01T12:00:02.000Z',
      },
    ]

    const groups = groupAdminPublicGalleryByDirectory(images)
    expect(groups.map((group) => group.directory)).toEqual(['admin-images', 'ui/backgrounds', 'ui/icons'])
    expect(groups[2]?.images[0]?.filename).toBe('ui/icons/star.png')
  })
})

