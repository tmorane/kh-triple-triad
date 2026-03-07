import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { AdminImageGenerateResponse } from '../../../src/app/admin/adminImageGeneration'

export interface AdminPublicGalleryImage {
  filename: string
  url: string
  mediaType: string
  createdAt: string
}

interface GalleryManifest {
  images: AdminPublicGalleryImage[]
}

const PUBLIC_ADMIN_IMAGES_DIR = path.resolve(process.cwd(), 'public', 'admin-images')
const PUBLIC_ADMIN_IMAGES_MANIFEST_PATH = path.join(PUBLIC_ADMIN_IMAGES_DIR, 'gallery.json')
const DEFAULT_PUBLIC_ROOT_DIR = path.resolve(process.cwd(), 'public')
const IMAGE_MEDIA_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
}

interface PublicDirectoryOptions {
  publicRootDir?: string
}

interface MoveImageInPublicRequest {
  sourceFilename: string
  targetDirectory: string
}

interface RenameImageInPublicRequest {
  sourceFilename: string
  targetName: string
}

interface DeleteImageInPublicRequest {
  filename: string
}

function toPosixPath(inputPath: string): string {
  return inputPath.split(path.sep).join('/')
}

function resolvePublicRootDir(options: PublicDirectoryOptions = {}): string {
  return options.publicRootDir ? path.resolve(options.publicRootDir) : DEFAULT_PUBLIC_ROOT_DIR
}

function resolveMediaType(filePath: string): string | null {
  const extension = path.extname(filePath).toLowerCase()
  return IMAGE_MEDIA_TYPES[extension] ?? null
}

function normalizeRelativePath(input: string): string | null {
  const normalized = input.replace(/\\/g, '/').trim()
  if (normalized.length === 0) {
    return null
  }

  if (normalized.startsWith('/')) {
    return null
  }

  const collapsed = path.posix.normalize(normalized)
  if (collapsed === '.' || collapsed === '..' || collapsed.startsWith('../') || collapsed.includes('/../')) {
    return null
  }

  const segments = collapsed.split('/').filter((segment) => segment.length > 0)
  if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) {
    return null
  }

  return segments.join('/')
}

function normalizeTargetDirectory(input: string): string | null {
  const raw = input.replace(/\\/g, '/').trim()
  if (raw.length === 0 || raw === '(root)') {
    return ''
  }

  return normalizeRelativePath(raw)
}

function resolvePathWithinRoot(rootDir: string, relativePath: string): string | null {
  const resolved = path.resolve(rootDir, relativePath)
  if (resolved === rootDir || resolved.startsWith(`${rootDir}${path.sep}`)) {
    return resolved
  }
  return null
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fileStat = await stat(filePath)
    return fileStat.isFile()
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false
    }
    throw error
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function collectPublicImageFiles(rootDir: string, currentDir: string): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectPublicImageFiles(rootDir, absolutePath)))
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    if (resolveMediaType(entry.name)) {
      files.push(absolutePath)
    }
  }

  return files
}

export async function listAllPublicImages(options: PublicDirectoryOptions = {}): Promise<AdminPublicGalleryImage[]> {
  const publicRootDir = resolvePublicRootDir(options)
  const filePaths = await collectPublicImageFiles(publicRootDir, publicRootDir)

  const images = await Promise.all(
    filePaths.map(async (filePath) => {
      const mediaType = resolveMediaType(filePath)
      if (!mediaType) {
        return null
      }

      const fileStats = await stat(filePath)
      const relativePath = toPosixPath(path.relative(publicRootDir, filePath))
      return {
        filename: relativePath,
        url: `/${relativePath}`,
        mediaType,
        createdAt: fileStats.mtime.toISOString(),
      } satisfies AdminPublicGalleryImage
    }),
  )

  return images
    .filter((image): image is AdminPublicGalleryImage => image !== null)
    .sort((a, b) => {
      if (a.createdAt === b.createdAt) {
        return a.filename.localeCompare(b.filename)
      }
      return a.createdAt > b.createdAt ? -1 : 1
    })
}

export async function movePublicImageToDirectory(
  request: MoveImageInPublicRequest,
  options: PublicDirectoryOptions = {},
): Promise<AdminPublicGalleryImage> {
  const publicRootDir = resolvePublicRootDir(options)
  const sourceRelativePath = normalizeRelativePath(request.sourceFilename)
  if (!sourceRelativePath) {
    throw new Error('Invalid source filename.')
  }

  const targetDirectory = normalizeTargetDirectory(request.targetDirectory)
  if (targetDirectory === null) {
    throw new Error('Invalid target directory.')
  }

  const sourceMediaType = resolveMediaType(sourceRelativePath)
  if (!sourceMediaType) {
    throw new Error('Source file must be an image.')
  }

  const sourceAbsolutePath = resolvePathWithinRoot(publicRootDir, sourceRelativePath)
  if (!sourceAbsolutePath) {
    throw new Error('Invalid source filename.')
  }

  let sourceStats: Awaited<ReturnType<typeof stat>>
  try {
    sourceStats = await stat(sourceAbsolutePath)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new Error('Source image not found.')
    }
    throw error
  }

  if (!sourceStats.isFile()) {
    throw new Error('Source image not found.')
  }

  const sourceDirectory = path.posix.dirname(sourceRelativePath) === '.' ? '' : path.posix.dirname(sourceRelativePath)
  if (sourceDirectory === targetDirectory) {
    return {
      filename: sourceRelativePath,
      url: `/${sourceRelativePath}`,
      mediaType: sourceMediaType,
      createdAt: sourceStats.mtime.toISOString(),
    }
  }

  const targetDirectoryAbsolutePath = resolvePathWithinRoot(publicRootDir, targetDirectory)
  if (!targetDirectoryAbsolutePath) {
    throw new Error('Invalid target directory.')
  }

  await mkdir(targetDirectoryAbsolutePath, { recursive: true })

  const extension = path.posix.extname(sourceRelativePath)
  const baseName = path.posix.basename(sourceRelativePath, extension)
  let suffix = 1
  let destinationFilename = path.posix.basename(sourceRelativePath)
  let destinationRelativePath = targetDirectory ? `${targetDirectory}/${destinationFilename}` : destinationFilename
  let destinationAbsolutePath = resolvePathWithinRoot(publicRootDir, destinationRelativePath)
  if (!destinationAbsolutePath) {
    throw new Error('Invalid target directory.')
  }

  while (await fileExists(destinationAbsolutePath)) {
    suffix += 1
    destinationFilename = `${baseName}-${suffix}${extension}`
    destinationRelativePath = targetDirectory ? `${targetDirectory}/${destinationFilename}` : destinationFilename
    destinationAbsolutePath = resolvePathWithinRoot(publicRootDir, destinationRelativePath)
    if (!destinationAbsolutePath) {
      throw new Error('Invalid target directory.')
    }
  }

  await rename(sourceAbsolutePath, destinationAbsolutePath)
  const destinationStats = await stat(destinationAbsolutePath)

  return {
    filename: destinationRelativePath,
    url: `/${destinationRelativePath}`,
    mediaType: sourceMediaType,
    createdAt: destinationStats.mtime.toISOString(),
  }
}

function sanitizeTargetName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '')
}

export async function renamePublicImage(
  request: RenameImageInPublicRequest,
  options: PublicDirectoryOptions = {},
): Promise<AdminPublicGalleryImage> {
  const publicRootDir = resolvePublicRootDir(options)
  const sourceRelativePath = normalizeRelativePath(request.sourceFilename)
  if (!sourceRelativePath) {
    throw new Error('Invalid source filename.')
  }

  if (typeof request.targetName !== 'string' || request.targetName.trim().length === 0) {
    throw new Error('Invalid target name.')
  }

  const targetRaw = request.targetName.trim().replace(/\\/g, '/')
  if (targetRaw.includes('/')) {
    throw new Error('Invalid target name.')
  }

  const sourceMediaType = resolveMediaType(sourceRelativePath)
  if (!sourceMediaType) {
    throw new Error('Source file must be an image.')
  }

  const sourceAbsolutePath = resolvePathWithinRoot(publicRootDir, sourceRelativePath)
  if (!sourceAbsolutePath) {
    throw new Error('Invalid source filename.')
  }

  let sourceStats: Awaited<ReturnType<typeof stat>>
  try {
    sourceStats = await stat(sourceAbsolutePath)
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new Error('Source image not found.')
    }
    throw error
  }

  if (!sourceStats.isFile()) {
    throw new Error('Source image not found.')
  }

  const sourceDirectory = path.posix.dirname(sourceRelativePath) === '.' ? '' : path.posix.dirname(sourceRelativePath)
  const sourceExtension = path.posix.extname(sourceRelativePath)
  const targetExtension = path.posix.extname(targetRaw)

  if (targetExtension.length > 0 && targetExtension.toLowerCase() !== sourceExtension.toLowerCase()) {
    throw new Error('Target extension must match source image type.')
  }

  const targetBaseCandidate =
    targetExtension.length > 0 ? targetRaw.slice(0, -targetExtension.length) : targetRaw
  const targetBase = sanitizeTargetName(targetBaseCandidate)
  if (targetBase.length === 0) {
    throw new Error('Invalid target name.')
  }

  let destinationFilename = `${targetBase}${sourceExtension}`
  let destinationRelativePath = sourceDirectory ? `${sourceDirectory}/${destinationFilename}` : destinationFilename
  let destinationAbsolutePath = resolvePathWithinRoot(publicRootDir, destinationRelativePath)
  if (!destinationAbsolutePath) {
    throw new Error('Invalid target name.')
  }

  if (destinationRelativePath === sourceRelativePath) {
    return {
      filename: sourceRelativePath,
      url: `/${sourceRelativePath}`,
      mediaType: sourceMediaType,
      createdAt: sourceStats.mtime.toISOString(),
    }
  }

  let suffix = 1
  while (await fileExists(destinationAbsolutePath)) {
    suffix += 1
    destinationFilename = `${targetBase}-${suffix}${sourceExtension}`
    destinationRelativePath = sourceDirectory ? `${sourceDirectory}/${destinationFilename}` : destinationFilename
    destinationAbsolutePath = resolvePathWithinRoot(publicRootDir, destinationRelativePath)
    if (!destinationAbsolutePath) {
      throw new Error('Invalid target name.')
    }
  }

  await rename(sourceAbsolutePath, destinationAbsolutePath)
  const destinationStats = await stat(destinationAbsolutePath)

  return {
    filename: destinationRelativePath,
    url: `/${destinationRelativePath}`,
    mediaType: sourceMediaType,
    createdAt: destinationStats.mtime.toISOString(),
  }
}

function normalizeStoredImage(value: unknown): AdminPublicGalleryImage | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const record = value as Record<string, unknown>
  if (
    typeof record.filename !== 'string' ||
    typeof record.url !== 'string' ||
    typeof record.mediaType !== 'string' ||
    typeof record.createdAt !== 'string'
  ) {
    return null
  }

  if (
    record.filename.trim().length === 0 ||
    record.url.trim().length === 0 ||
    !record.mediaType.startsWith('image/') ||
    Number.isNaN(Date.parse(record.createdAt))
  ) {
    return null
  }

  return {
    filename: record.filename,
    url: record.url,
    mediaType: record.mediaType,
    createdAt: record.createdAt,
  }
}

function sanitizeFilename(filename: string, fallbackIndex: number): string {
  const base = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '-')
  if (base.length > 0) {
    return base
  }

  return `admin-image-${Date.now()}-${fallbackIndex + 1}.png`
}

async function readManifest(): Promise<GalleryManifest> {
  try {
    const raw = await readFile(PUBLIC_ADMIN_IMAGES_MANIFEST_PATH, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) {
      return { images: [] }
    }

    const imagesValue = (parsed as Record<string, unknown>).images
    if (!Array.isArray(imagesValue)) {
      return { images: [] }
    }

    return {
      images: imagesValue.map(normalizeStoredImage).filter((image): image is AdminPublicGalleryImage => image !== null),
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return { images: [] }
    }
    throw error
  }
}

async function updateManifestAfterDelete(deletedFilename: string): Promise<void> {
  const manifest = await readManifest()
  const next = manifest.images.filter((image) => image.filename !== deletedFilename)

  if (next.length === manifest.images.length) {
    return
  }

  await writeFile(PUBLIC_ADMIN_IMAGES_MANIFEST_PATH, JSON.stringify({ images: next }, null, 2), 'utf8')
}

function mergeGalleryImages(newImages: AdminPublicGalleryImage[], previousImages: AdminPublicGalleryImage[]): AdminPublicGalleryImage[] {
  const next = [...newImages]
  const knownFilenames = new Set(newImages.map((image) => image.filename))

  for (const image of previousImages) {
    if (!knownFilenames.has(image.filename)) {
      knownFilenames.add(image.filename)
      next.push(image)
    }
  }

  return next
}

export async function persistGeneratedImagesToPublic(response: AdminImageGenerateResponse): Promise<void> {
  await mkdir(PUBLIC_ADMIN_IMAGES_DIR, { recursive: true })

  const newGalleryEntries: AdminPublicGalleryImage[] = []

  for (let index = 0; index < response.images.length; index += 1) {
    const image = response.images[index]
    const filename = sanitizeFilename(image.filename, index)
    const imagePath = path.join(PUBLIC_ADMIN_IMAGES_DIR, filename)

    await writeFile(imagePath, Buffer.from(image.base64, 'base64'))
    newGalleryEntries.push({
      filename,
      url: `/admin-images/${filename}`,
      mediaType: image.mediaType,
      createdAt: response.createdAt,
    })
  }

  const previous = await readManifest()
  const next: GalleryManifest = {
    images: mergeGalleryImages(newGalleryEntries, previous.images),
  }

  await writeFile(PUBLIC_ADMIN_IMAGES_MANIFEST_PATH, JSON.stringify(next, null, 2), 'utf8')
}

export async function deletePublicImage(
  request: DeleteImageInPublicRequest,
  options: PublicDirectoryOptions = {},
): Promise<{ deleted: true }> {
  const publicRootDir = resolvePublicRootDir(options)
  const relativePath = normalizeRelativePath(request.filename)
  if (!relativePath) {
    throw new Error('Invalid filename.')
  }

  const mediaType = resolveMediaType(relativePath)
  if (!mediaType) {
    throw new Error('File must be an image.')
  }

  const absolutePath = resolvePathWithinRoot(publicRootDir, relativePath)
  if (!absolutePath) {
    throw new Error('Invalid filename.')
  }

  try {
    const fileStat = await stat(absolutePath)
    if (!fileStat.isFile()) {
      throw new Error('Image not found.')
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new Error('Image not found.')
    }
    if (error instanceof Error && error.message === 'Image not found.') {
      throw error
    }
    throw error
  }

  await unlink(absolutePath)

  const manifestPath = resolvePathWithinRoot(publicRootDir, 'admin-images/gallery.json')
  if (manifestPath && path.resolve(manifestPath) === path.resolve(PUBLIC_ADMIN_IMAGES_MANIFEST_PATH)) {
    await updateManifestAfterDelete(relativePath)
  } else if (manifestPath) {
    try {
      const raw = await readFile(manifestPath, 'utf8')
      const parsed = JSON.parse(raw) as unknown
      if (isRecord(parsed) && Array.isArray(parsed.images)) {
        const nextImages = parsed.images.filter((entry) => isRecord(entry) && entry.filename !== relativePath)
        await writeFile(manifestPath, JSON.stringify({ images: nextImages }, null, 2), 'utf8')
      }
    } catch {
      // No manifest or invalid JSON in custom root: nothing to sync.
    }
  }

  return { deleted: true }
}
