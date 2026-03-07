export interface AdminPublicGalleryImage {
  filename: string
  url: string
  mediaType: string
  createdAt: string
}

export interface MoveAdminPublicImageRequest {
  sourceFilename: string
  targetDirectory: string
}

export interface RenameAdminPublicImageRequest {
  sourceFilename: string
  targetName: string
}

export interface AdminPublicGalleryDirectoryGroup {
  directory: string
  images: AdminPublicGalleryImage[]
}

interface GalleryPayload {
  images: AdminPublicGalleryImage[]
}

interface MovePayload {
  image?: AdminPublicGalleryImage
  error?: string
}

interface RenamePayload {
  image?: AdminPublicGalleryImage
  error?: string
}

interface DeletePayload {
  deleted?: boolean
  error?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeGalleryImage(value: unknown): AdminPublicGalleryImage | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.filename !== 'string' ||
    typeof value.url !== 'string' ||
    typeof value.mediaType !== 'string' ||
    typeof value.createdAt !== 'string'
  ) {
    return null
  }

  if (
    value.filename.trim().length === 0 ||
    value.url.trim().length === 0 ||
    !value.mediaType.startsWith('image/') ||
    Number.isNaN(Date.parse(value.createdAt))
  ) {
    return null
  }

  return {
    filename: value.filename,
    url: value.url,
    mediaType: value.mediaType,
    createdAt: value.createdAt,
  }
}

function normalizePayload(value: unknown): GalleryPayload {
  if (!isRecord(value) || !Array.isArray(value.images)) {
    return { images: [] }
  }

  return {
    images: value.images.map(normalizeGalleryImage).filter((image): image is AdminPublicGalleryImage => image !== null),
  }
}

function normalizeDirectory(filename: string): string {
  const normalized = filename.replace(/\\/g, '/').replace(/^\/+/, '').trim()
  if (normalized.length === 0 || !normalized.includes('/')) {
    return '(root)'
  }

  const segments = normalized.split('/')
  segments.pop()
  return segments.join('/')
}

function sortImages(images: AdminPublicGalleryImage[]): AdminPublicGalleryImage[] {
  return [...images].sort((a, b) => {
    if (a.createdAt === b.createdAt) {
      return a.filename.localeCompare(b.filename)
    }
    return a.createdAt > b.createdAt ? -1 : 1
  })
}

export function groupAdminPublicGalleryByDirectory(images: AdminPublicGalleryImage[]): AdminPublicGalleryDirectoryGroup[] {
  const groups = new Map<string, AdminPublicGalleryImage[]>()

  for (const image of sortImages(images)) {
    const directory = normalizeDirectory(image.filename)
    const group = groups.get(directory) ?? []
    group.push(image)
    groups.set(directory, group)
  }

  return [...groups.entries()]
    .map(([directory, directoryImages]) => ({
      directory,
      images: directoryImages,
    }))
    .sort((a, b) => {
      if (a.directory === '(root)') {
        return -1
      }
      if (b.directory === '(root)') {
        return 1
      }
      return a.directory.localeCompare(b.directory)
    })
}

export async function fetchAdminPublicGallery(): Promise<AdminPublicGalleryImage[]> {
  try {
    const response = await fetch(`/api/admin/images/gallery?t=${Date.now()}`, { cache: 'no-store' })
    if (response.status === 404) {
      return []
    }
    if (!response.ok) {
      return []
    }

    const payload = normalizePayload(await response.json())
    return payload.images
  } catch {
    return []
  }
}

export async function moveAdminPublicImage(
  request: MoveAdminPublicImageRequest,
  accessToken: string | null,
): Promise<{ status: number; image?: AdminPublicGalleryImage; error?: string }> {
  try {
    const response = await fetch('/api/admin/images/move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(request),
    })

    let payload: MovePayload | null = null
    try {
      payload = (await response.json()) as MovePayload
    } catch {
      payload = null
    }

    if (!response.ok) {
      return {
        status: response.status,
        error: payload && typeof payload.error === 'string' ? payload.error : 'Image move failed.',
      }
    }

    const image = normalizeGalleryImage(payload?.image)
    if (!image) {
      return {
        status: 500,
        error: 'Invalid move response.',
      }
    }

    return {
      status: response.status,
      image,
    }
  } catch {
    return {
      status: 0,
      error: 'Image move failed.',
    }
  }
}

export async function renameAdminPublicImage(
  request: RenameAdminPublicImageRequest,
  accessToken: string | null,
): Promise<{ status: number; image?: AdminPublicGalleryImage; error?: string }> {
  try {
    const response = await fetch('/api/admin/images/rename', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(request),
    })

    let payload: RenamePayload | null = null
    try {
      payload = (await response.json()) as RenamePayload
    } catch {
      payload = null
    }

    if (!response.ok) {
      return {
        status: response.status,
        error: payload && typeof payload.error === 'string' ? payload.error : 'Image rename failed.',
      }
    }

    const image = normalizeGalleryImage(payload?.image)
    if (!image) {
      return {
        status: 500,
        error: 'Invalid rename response.',
      }
    }

    return {
      status: response.status,
      image,
    }
  } catch {
    return {
      status: 0,
      error: 'Image rename failed.',
    }
  }
}

export async function deleteAdminPublicImage(
  filename: string,
  accessToken: string | null,
): Promise<{ status: number; deleted: boolean; error?: string }> {
  try {
    const response = await fetch('/api/admin/images/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ filename }),
    })

    let payload: DeletePayload | null = null
    try {
      payload = (await response.json()) as DeletePayload
    } catch {
      payload = null
    }

    if (!response.ok) {
      return {
        status: response.status,
        deleted: false,
        error: payload && typeof payload.error === 'string' ? payload.error : 'Image delete failed.',
      }
    }

    return {
      status: response.status,
      deleted: Boolean(payload?.deleted),
      error: payload && typeof payload.error === 'string' ? payload.error : undefined,
    }
  } catch {
    return {
      status: 0,
      deleted: false,
      error: 'Image delete failed.',
    }
  }
}
