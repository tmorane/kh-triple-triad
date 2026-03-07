import { mkdtemp, mkdir, readFile, utimes, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'bun:test'
import { deletePublicImage, listAllPublicImages, movePublicImageToDirectory, renamePublicImage } from './publicGalleryStore'

const tempDirs: string[] = []

afterEach(async () => {
  for (const dir of tempDirs) {
    await Bun.$`rm -rf ${dir}`.quiet()
  }
  tempDirs.length = 0
})

describe('listAllPublicImages', () => {
  test('returns nested public images and ignores non-image files', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'public-gallery-store-'))
    tempDirs.push(rootDir)

    await mkdir(path.join(rootDir, 'cards'), { recursive: true })
    await mkdir(path.join(rootDir, 'misc'), { recursive: true })

    const cardPng = path.join(rootDir, 'cards', 'card.png')
    const iconSvg = path.join(rootDir, 'misc', 'icon.svg')
    const ignoredTxt = path.join(rootDir, 'misc', 'notes.txt')

    await writeFile(cardPng, 'png-bytes')
    await writeFile(iconSvg, '<svg></svg>')
    await writeFile(ignoredTxt, 'not an image')

    const baseTime = new Date('2026-03-01T12:00:00.000Z')
    await utimes(cardPng, baseTime, baseTime)
    await utimes(iconSvg, new Date(baseTime.getTime() + 1000), new Date(baseTime.getTime() + 1000))

    const images = await listAllPublicImages({ publicRootDir: rootDir })
    expect(images).toHaveLength(2)

    expect(images[0]).toMatchObject({
      filename: 'misc/icon.svg',
      url: '/misc/icon.svg',
      mediaType: 'image/svg+xml',
    })
    expect(images[1]).toMatchObject({
      filename: 'cards/card.png',
      url: '/cards/card.png',
      mediaType: 'image/png',
    })
  })
})

describe('movePublicImageToDirectory', () => {
  test('moves an image to a target public directory and returns updated metadata', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'public-gallery-move-'))
    tempDirs.push(rootDir)

    await mkdir(path.join(rootDir, 'admin-images'), { recursive: true })
    const sourcePath = path.join(rootDir, 'admin-images', 'generated.png')
    await writeFile(sourcePath, 'png-bytes')

    const moved = await movePublicImageToDirectory(
      { sourceFilename: 'admin-images/generated.png', targetDirectory: 'cards' },
      { publicRootDir: rootDir },
    )

    expect(moved).toMatchObject({
      filename: 'cards/generated.png',
      url: '/cards/generated.png',
      mediaType: 'image/png',
    })

    const images = await listAllPublicImages({ publicRootDir: rootDir })
    expect(images.some((entry) => entry.filename === 'cards/generated.png')).toBe(true)
    expect(images.some((entry) => entry.filename === 'admin-images/generated.png')).toBe(false)
  })

  test('avoids overriding existing files by appending a suffix', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'public-gallery-move-collision-'))
    tempDirs.push(rootDir)

    await mkdir(path.join(rootDir, 'admin-images'), { recursive: true })
    await mkdir(path.join(rootDir, 'cards'), { recursive: true })
    await writeFile(path.join(rootDir, 'admin-images', 'generated.png'), 'new-bytes')
    await writeFile(path.join(rootDir, 'cards', 'generated.png'), 'old-bytes')

    const moved = await movePublicImageToDirectory(
      { sourceFilename: 'admin-images/generated.png', targetDirectory: 'cards' },
      { publicRootDir: rootDir },
    )

    expect(moved.filename).toBe('cards/generated-2.png')
  })

  test('rejects path traversal attempts', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'public-gallery-move-security-'))
    tempDirs.push(rootDir)

    await mkdir(path.join(rootDir, 'admin-images'), { recursive: true })
    await writeFile(path.join(rootDir, 'admin-images', 'generated.png'), 'png-bytes')

    await expect(
      movePublicImageToDirectory(
        { sourceFilename: '../generated.png', targetDirectory: 'cards' },
        { publicRootDir: rootDir },
      ),
    ).rejects.toThrow('Invalid source filename.')
  })
})

describe('renamePublicImage', () => {
  test('renames an image in place and returns updated metadata', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'public-gallery-rename-'))
    tempDirs.push(rootDir)

    await mkdir(path.join(rootDir, 'cards'), { recursive: true })
    await writeFile(path.join(rootDir, 'cards', 'pikachu.png'), 'png-bytes')

    const renamed = await renamePublicImage(
      { sourceFilename: 'cards/pikachu.png', targetName: 'raichu' },
      { publicRootDir: rootDir },
    )

    expect(renamed).toMatchObject({
      filename: 'cards/raichu.png',
      url: '/cards/raichu.png',
      mediaType: 'image/png',
    })

    const images = await listAllPublicImages({ publicRootDir: rootDir })
    expect(images.some((entry) => entry.filename === 'cards/raichu.png')).toBe(true)
    expect(images.some((entry) => entry.filename === 'cards/pikachu.png')).toBe(false)
  })
})

describe('deletePublicImage', () => {
  test('deletes an existing public image', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'public-gallery-delete-'))
    tempDirs.push(rootDir)

    await mkdir(path.join(rootDir, 'cards'), { recursive: true })
    await writeFile(path.join(rootDir, 'cards', 'pikachu.png'), 'png-bytes')

    await deletePublicImage({ filename: 'cards/pikachu.png' }, { publicRootDir: rootDir })

    const images = await listAllPublicImages({ publicRootDir: rootDir })
    expect(images.some((entry) => entry.filename === 'cards/pikachu.png')).toBe(false)
  })

  test('rejects traversal paths', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'public-gallery-delete-security-'))
    tempDirs.push(rootDir)

    await expect(deletePublicImage({ filename: '../secret.png' }, { publicRootDir: rootDir })).rejects.toThrow(
      'Invalid filename.',
    )
  })

  test('removes deleted image from admin manifest when present', async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), 'public-gallery-delete-manifest-'))
    tempDirs.push(rootDir)

    await mkdir(path.join(rootDir, 'admin-images'), { recursive: true })
    await writeFile(path.join(rootDir, 'admin-images', 'to-delete.png'), 'png-bytes')
    await writeFile(
      path.join(rootDir, 'admin-images', 'gallery.json'),
      JSON.stringify({
        images: [
          {
            filename: 'admin-images/to-delete.png',
            url: '/admin-images/to-delete.png',
            mediaType: 'image/png',
            createdAt: '2026-03-01T12:00:00.000Z',
          },
          {
            filename: 'admin-images/keep.png',
            url: '/admin-images/keep.png',
            mediaType: 'image/png',
            createdAt: '2026-03-01T12:00:01.000Z',
          },
        ],
      }),
      'utf8',
    )

    await deletePublicImage({ filename: 'admin-images/to-delete.png' }, { publicRootDir: rootDir })

    const manifestRaw = await readFile(path.join(rootDir, 'admin-images', 'gallery.json'), 'utf8')
    const manifest = JSON.parse(manifestRaw) as { images: Array<{ filename: string }> }
    expect(manifest.images.map((entry) => entry.filename)).toEqual(['admin-images/keep.png'])
  })
})
