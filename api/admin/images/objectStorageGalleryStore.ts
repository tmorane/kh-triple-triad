/* global process */
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import path from 'node:path'
import type { AdminImageGenerateResponse } from '../../../src/app/admin/adminImageGeneration.js'
import type { AdminPublicGalleryImage } from './publicGalleryStore.js'

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

interface S3StorageConfig {
  bucket: string
  prefix: string
  publicBaseUrl: string
  region: string
  endpoint?: string
  forcePathStyle: boolean
  accessKeyId: string
  secretAccessKey: string
}

function readEnv(name: string): string | null {
  const value = process.env[name]
  if (typeof value !== 'string') {
    return null
  }
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function readBoolean(value: string | null): boolean {
  if (!value) {
    return false
  }
  const normalized = value.toLowerCase()
  return normalized === '1' || normalized === 'true'
}

function normalizePrefix(prefix: string): string {
  return prefix
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
}

function readS3StorageConfig(): S3StorageConfig | null {
  const backend = readEnv('ADMIN_IMAGES_STORAGE_BACKEND')
  if (!backend || backend.toLowerCase() !== 's3') {
    return null
  }

  const bucket = readEnv('ADMIN_IMAGES_S3_BUCKET')
  const region = readEnv('ADMIN_IMAGES_S3_REGION')
  const accessKeyId = readEnv('ADMIN_IMAGES_S3_ACCESS_KEY_ID')
  const secretAccessKey = readEnv('ADMIN_IMAGES_S3_SECRET_ACCESS_KEY')
  const publicBaseUrl = readEnv('ADMIN_IMAGES_PUBLIC_BASE_URL')

  if (!bucket || !region || !accessKeyId || !secretAccessKey || !publicBaseUrl) {
    throw new Error(
      'Missing required S3 admin image env vars. Expected ADMIN_IMAGES_S3_BUCKET, ADMIN_IMAGES_S3_REGION, ADMIN_IMAGES_S3_ACCESS_KEY_ID, ADMIN_IMAGES_S3_SECRET_ACCESS_KEY, ADMIN_IMAGES_PUBLIC_BASE_URL.',
    )
  }

  const prefix = normalizePrefix(readEnv('ADMIN_IMAGES_S3_PREFIX') ?? 'admin-images')
  if (prefix.length === 0) {
    throw new Error('ADMIN_IMAGES_S3_PREFIX must not be empty.')
  }

  return {
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    prefix,
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ''),
    endpoint: readEnv('ADMIN_IMAGES_S3_ENDPOINT') ?? undefined,
    forcePathStyle: readBoolean(readEnv('ADMIN_IMAGES_S3_FORCE_PATH_STYLE')),
  }
}

let cachedConfig: S3StorageConfig | null | undefined
let cachedClient: S3Client | null | undefined

function getS3Config(): S3StorageConfig | null {
  if (cachedConfig !== undefined) {
    return cachedConfig
  }
  cachedConfig = readS3StorageConfig()
  return cachedConfig
}

function getS3Client(config: S3StorageConfig): S3Client {
  if (cachedClient) {
    return cachedClient
  }
  cachedClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
  return cachedClient
}

function resolveMediaType(filePath: string): string | null {
  const extension = path.extname(filePath).toLowerCase()
  return IMAGE_MEDIA_TYPES[extension] ?? null
}

function normalizeRelativePath(input: string): string | null {
  const normalized = input.replace(/\\/g, '/').trim()
  if (normalized.length === 0 || normalized.startsWith('/')) {
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

function normalizeSourceFilename(config: S3StorageConfig, input: string): string | null {
  const normalized = normalizeRelativePath(input)
  if (!normalized || normalized === config.prefix) {
    return null
  }
  if (!normalized.startsWith(`${config.prefix}/`)) {
    return null
  }
  return normalized
}

function normalizeTargetDirectory(config: S3StorageConfig, input: string): string | null {
  const raw = input.replace(/\\/g, '/').trim()
  if (raw.length === 0 || raw === '(root)') {
    return config.prefix
  }

  const normalized = normalizeRelativePath(raw)
  if (!normalized) {
    return null
  }
  if (normalized !== config.prefix && !normalized.startsWith(`${config.prefix}/`)) {
    return null
  }
  return normalized
}

function toRelativePath(config: S3StorageConfig, filename: string): string {
  return filename.slice(config.prefix.length + 1)
}

function sanitizeFilename(filename: string, fallbackIndex: number): string {
  const base = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '-')
  if (base.length > 0) {
    return base
  }

  return `admin-image-${Date.now()}-${fallbackIndex + 1}.png`
}

function sanitizeTargetName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '')
}

function imageFromObjectKey(config: S3StorageConfig, objectKey: string, createdAt: string): AdminPublicGalleryImage | null {
  const normalized = objectKey.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized.startsWith(`${config.prefix}/`)) {
    return null
  }

  const mediaType = resolveMediaType(normalized)
  if (!mediaType) {
    return null
  }

  return {
    filename: normalized,
    url: `${config.publicBaseUrl}/${normalized}`,
    mediaType,
    createdAt,
  }
}

function getImageFromFilename(config: S3StorageConfig, filename: string, createdAt: string): AdminPublicGalleryImage {
  const mediaType = resolveMediaType(filename)
  if (!mediaType) {
    throw new Error('Source file must be an image.')
  }

  return {
    filename,
    url: `${config.publicBaseUrl}/${filename}`,
    mediaType,
    createdAt,
  }
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const record = error as {
    name?: unknown
    Code?: unknown
    code?: unknown
    $metadata?: { httpStatusCode?: unknown }
  }

  if (record.$metadata?.httpStatusCode === 404) {
    return true
  }

  const code = typeof record.Code === 'string' ? record.Code : typeof record.code === 'string' ? record.code : null
  if (code === 'NoSuchKey' || code === 'NotFound') {
    return true
  }

  return record.name === 'NotFound' || record.name === 'NoSuchKey'
}

async function objectExists(client: S3Client, config: S3StorageConfig, key: string): Promise<boolean> {
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    )
    return true
  } catch (error) {
    if (isNotFoundError(error)) {
      return false
    }
    throw error
  }
}

async function assertSourceExists(client: S3Client, config: S3StorageConfig, key: string): Promise<string> {
  try {
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    )
    return head.LastModified?.toISOString() ?? new Date().toISOString()
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new Error('Source image not found.')
    }
    throw error
  }
}

function toCopySource(config: S3StorageConfig, key: string): string {
  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${config.bucket}/${encodedKey}`
}

async function copyThenDelete(client: S3Client, config: S3StorageConfig, sourceKey: string, destinationKey: string): Promise<void> {
  await client.send(
    new CopyObjectCommand({
      Bucket: config.bucket,
      Key: destinationKey,
      CopySource: toCopySource(config, sourceKey),
    }),
  )

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: sourceKey,
    }),
  )
}

export function isObjectStorageEnabled(): boolean {
  return getS3Config() !== null
}

export async function listAllObjectStorageImages(): Promise<AdminPublicGalleryImage[]> {
  const config = getS3Config()
  if (!config) {
    throw new Error('Object storage backend is not enabled.')
  }
  const client = getS3Client(config)

  const images: AdminPublicGalleryImage[] = []
  let continuationToken: string | undefined

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: `${config.prefix}/`,
        ContinuationToken: continuationToken,
      }),
    )

    for (const object of response.Contents ?? []) {
      const key = object.Key
      if (!key || key.endsWith('/')) {
        continue
      }
      const createdAt = object.LastModified?.toISOString() ?? new Date().toISOString()
      const image = imageFromObjectKey(config, key, createdAt)
      if (image) {
        images.push(image)
      }
    }

    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return images.sort((a, b) => {
    if (a.createdAt === b.createdAt) {
      return a.filename.localeCompare(b.filename)
    }
    return a.createdAt > b.createdAt ? -1 : 1
  })
}

export async function persistGeneratedImagesToObjectStorage(response: AdminImageGenerateResponse): Promise<void> {
  const config = getS3Config()
  if (!config) {
    throw new Error('Object storage backend is not enabled.')
  }
  const client = getS3Client(config)

  for (let index = 0; index < response.images.length; index += 1) {
    const image = response.images[index]
    const filename = sanitizeFilename(image.filename, index)
    const key = `${config.prefix}/${filename}`.replace(/\/+/g, '/')

    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: Buffer.from(image.base64, 'base64'),
        ContentType: image.mediaType,
      }),
    )
  }
}

export async function moveObjectStorageImageToDirectory(request: {
  sourceFilename: string
  targetDirectory: string
}): Promise<AdminPublicGalleryImage> {
  const config = getS3Config()
  if (!config) {
    throw new Error('Object storage backend is not enabled.')
  }
  const client = getS3Client(config)

  const sourceFilename = normalizeSourceFilename(config, request.sourceFilename)
  if (!sourceFilename) {
    throw new Error('Invalid source filename.')
  }

  const targetDirectory = normalizeTargetDirectory(config, request.targetDirectory)
  if (!targetDirectory) {
    throw new Error('Invalid target directory.')
  }

  const sourceRelativePath = toRelativePath(config, sourceFilename)
  const sourceMediaType = resolveMediaType(sourceRelativePath)
  if (!sourceMediaType) {
    throw new Error('Source file must be an image.')
  }

  const sourceCreatedAt = await assertSourceExists(client, config, sourceFilename)
  const sourceDirectory = path.posix.dirname(sourceFilename) === '.' ? '' : path.posix.dirname(sourceFilename)

  if (sourceDirectory === targetDirectory) {
    return getImageFromFilename(config, sourceFilename, sourceCreatedAt)
  }

  const extension = path.posix.extname(sourceRelativePath)
  const baseName = path.posix.basename(sourceRelativePath, extension)
  let suffix = 1
  let destinationFilename = path.posix.basename(sourceRelativePath)
  let destinationKey = `${targetDirectory}/${destinationFilename}`.replace(/\/+/g, '/')

  while (await objectExists(client, config, destinationKey)) {
    suffix += 1
    destinationFilename = `${baseName}-${suffix}${extension}`
    destinationKey = `${targetDirectory}/${destinationFilename}`.replace(/\/+/g, '/')
  }

  await copyThenDelete(client, config, sourceFilename, destinationKey)

  return getImageFromFilename(config, destinationKey, new Date().toISOString())
}

export async function renameObjectStorageImage(request: {
  sourceFilename: string
  targetName: string
}): Promise<AdminPublicGalleryImage> {
  const config = getS3Config()
  if (!config) {
    throw new Error('Object storage backend is not enabled.')
  }
  const client = getS3Client(config)

  const sourceFilename = normalizeSourceFilename(config, request.sourceFilename)
  if (!sourceFilename) {
    throw new Error('Invalid source filename.')
  }

  if (typeof request.targetName !== 'string' || request.targetName.trim().length === 0) {
    throw new Error('Invalid target name.')
  }

  const targetRaw = request.targetName.trim().replace(/\\/g, '/')
  if (targetRaw.includes('/')) {
    throw new Error('Invalid target name.')
  }

  const sourceRelativePath = toRelativePath(config, sourceFilename)
  const sourceMediaType = resolveMediaType(sourceRelativePath)
  if (!sourceMediaType) {
    throw new Error('Source file must be an image.')
  }

  const sourceExtension = path.posix.extname(sourceRelativePath)
  const targetExtension = path.posix.extname(targetRaw)
  if (targetExtension.length > 0 && targetExtension.toLowerCase() !== sourceExtension.toLowerCase()) {
    throw new Error('Target extension must match source image type.')
  }

  const targetBaseCandidate = targetExtension.length > 0 ? targetRaw.slice(0, -targetExtension.length) : targetRaw
  const targetBase = sanitizeTargetName(targetBaseCandidate)
  if (targetBase.length === 0) {
    throw new Error('Invalid target name.')
  }

  const sourceCreatedAt = await assertSourceExists(client, config, sourceFilename)
  const sourceDirectory = path.posix.dirname(sourceFilename) === '.' ? '' : path.posix.dirname(sourceFilename)

  let destinationFilename = `${targetBase}${sourceExtension}`
  let destinationKey = sourceDirectory ? `${sourceDirectory}/${destinationFilename}` : destinationFilename
  destinationKey = destinationKey.replace(/\/+/g, '/')

  if (destinationKey === sourceFilename) {
    return getImageFromFilename(config, sourceFilename, sourceCreatedAt)
  }

  let suffix = 1
  while (await objectExists(client, config, destinationKey)) {
    suffix += 1
    destinationFilename = `${targetBase}-${suffix}${sourceExtension}`
    destinationKey = sourceDirectory ? `${sourceDirectory}/${destinationFilename}` : destinationFilename
    destinationKey = destinationKey.replace(/\/+/g, '/')
  }

  await copyThenDelete(client, config, sourceFilename, destinationKey)

  return getImageFromFilename(config, destinationKey, new Date().toISOString())
}

export async function deleteObjectStorageImage(request: { filename: string }): Promise<{ deleted: true }> {
  const config = getS3Config()
  if (!config) {
    throw new Error('Object storage backend is not enabled.')
  }
  const client = getS3Client(config)

  const filename = normalizeSourceFilename(config, request.filename)
  if (!filename) {
    throw new Error('Invalid filename.')
  }

  const relativePath = toRelativePath(config, filename)
  const mediaType = resolveMediaType(relativePath)
  if (!mediaType) {
    throw new Error('File must be an image.')
  }

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: filename,
      }),
    )
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new Error('Image not found.')
    }
    throw error
  }

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: filename,
    }),
  )
  return { deleted: true }
}
