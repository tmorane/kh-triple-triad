import type { DragEvent, FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { canAccessAdminImages, isAdminAuthBypassedInClient } from '../../app/admin/adminClientAccess'
import {
  deleteAdminPublicImage,
  fetchAdminPublicGallery,
  groupAdminPublicGalleryByDirectory,
  moveAdminPublicImage,
  renameAdminPublicImage,
  type AdminPublicGalleryImage,
} from '../../app/admin/adminPublicGallery'
import { getCloudSessionUser, onCloudAuthStateChange } from '../../app/cloud/cloudAuth'
import { getSupabaseClient } from '../../app/cloud/supabaseClient'

type AdminImageAspectRatio = '1:1' | '16:9' | '9:16'

interface AdminGeneratedImage {
  mediaType: string
  base64: string
  filename: string
}

interface AdminImageGenerateResponse {
  model: string
  createdAt: string
  images: AdminGeneratedImage[]
}

const ROOT_DIRECTORY = '(root)'
const ALL_GALLERY_DIRECTORIES = '__all__'

const aspectRatioLabels: Record<AdminImageAspectRatio, string> = {
  '1:1': 'Square (1:1)',
  '16:9': 'Landscape (16:9)',
  '9:16': 'Portrait (9:16)',
}

function buildDataUrl(image: AdminGeneratedImage): string {
  return `data:${image.mediaType};base64,${image.base64}`
}

function triggerImageDownload(image: AdminGeneratedImage): void {
  const link = document.createElement('a')
  link.href = buildDataUrl(image)
  link.download = image.filename
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
}

function triggerPublicImageDownload(image: AdminPublicGalleryImage): void {
  const link = document.createElement('a')
  link.href = image.url
  link.download = image.filename
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
}

function toDirectoryTestId(directory: string): string {
  const normalized = directory
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .toLowerCase()
  return normalized.length > 0 ? normalized : 'root'
}

function directoryFromFilename(filename: string): string {
  const normalized = filename.replace(/\\/g, '/').replace(/^\/+/, '').trim()
  if (!normalized.includes('/')) {
    return ROOT_DIRECTORY
  }
  return normalized.slice(0, normalized.lastIndexOf('/'))
}

function basenameFromFilename(filename: string): string {
  const normalized = filename.replace(/\\/g, '/').replace(/^\/+/, '').trim()
  const slashIndex = normalized.lastIndexOf('/')
  return slashIndex === -1 ? normalized : normalized.slice(slashIndex + 1)
}

function resolveGeneratedSourceFilename(image: AdminGeneratedImage): string {
  const normalized = image.filename.replace(/\\/g, '/').replace(/^\/+/, '').trim()
  if (normalized.includes('/')) {
    return normalized
  }
  return `admin-images/${normalized}`
}

function generatedImageKey(image: AdminGeneratedImage, index: number): string {
  return `${index}:${image.filename}`
}

export function AdminImagesPage() {
  const isLocalAuthBypass = isAdminAuthBypassedInClient()
  const [isLoadingAccess, setIsLoadingAccess] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [filename, setFilename] = useState('')
  const [style, setStyle] = useState('')
  const [variants, setVariants] = useState('1')
  const [aspectRatio, setAspectRatio] = useState<AdminImageAspectRatio>('1:1')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [result, setResult] = useState<AdminImageGenerateResponse | null>(null)
  const [gallery, setGallery] = useState<AdminPublicGalleryImage[]>([])
  const [selectedGalleryDirectory, setSelectedGalleryDirectory] = useState<string>(ALL_GALLERY_DIRECTORIES)
  const [transferTargets, setTransferTargets] = useState<Record<string, string>>({})
  const [movingImageKey, setMovingImageKey] = useState<string | null>(null)
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null)
  const [draggedGalleryFilename, setDraggedGalleryFilename] = useState<string | null>(null)
  const [dropTargetDirectory, setDropTargetDirectory] = useState<string | null>(null)
  const [movingGalleryFilename, setMovingGalleryFilename] = useState<string | null>(null)
  const [renamingFilename, setRenamingFilename] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [savingRenameFilename, setSavingRenameFilename] = useState<string | null>(null)
  const renameInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const renameInFlightRef = useRef<Record<string, boolean>>({})

  useEffect(() => {
    let mounted = true

    const applySession = (email: string | null | undefined) => {
      if (!mounted) {
        return
      }
      setHasSession(Boolean(email) || isLocalAuthBypass)
      setIsAuthorized(canAccessAdminImages(email))
      setIsLoadingAccess(false)
    }

    void getCloudSessionUser()
      .then((user) => {
        applySession(user?.email ?? null)
      })
      .catch(() => {
        if (!mounted) {
          return
        }
        setHasSession(isLocalAuthBypass)
        setIsAuthorized(isLocalAuthBypass)
        setIsLoadingAccess(false)
      })

    const unsubscribe = onCloudAuthStateChange((user) => {
      applySession(user?.email ?? null)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [isLocalAuthBypass])

  const canAccessPage = !isLoadingAccess && hasSession && isAuthorized

  useEffect(() => {
    if (!canAccessPage) {
      return
    }

    let cancelled = false
    void fetchAdminPublicGallery().then((images) => {
      if (!cancelled) {
        setGallery(images)
      }
    })

    return () => {
      cancelled = true
    }
  }, [canAccessPage])

  const canSubmit = useMemo(() => {
    return (isLocalAuthBypass || hasSession) && isAuthorized && !isSubmitting && prompt.trim().length > 0
  }, [hasSession, isAuthorized, isLocalAuthBypass, isSubmitting, prompt])

  const galleryGroups = useMemo(() => groupAdminPublicGalleryByDirectory(gallery), [gallery])

  const galleryTabs = useMemo(
    () => [
      { directory: ALL_GALLERY_DIRECTORIES, count: gallery.length, label: `Tous (${gallery.length})` },
      ...galleryGroups.map((group) => ({
        directory: group.directory,
        count: group.images.length,
        label: `${group.directory} (${group.images.length})`,
      })),
    ],
    [gallery, galleryGroups],
  )

  const transferDirectories = useMemo(() => {
    const directories = new Set<string>([ROOT_DIRECTORY, 'admin-images'])
    for (const group of galleryGroups) {
      directories.add(group.directory)
    }

    return [...directories].sort((a, b) => {
      if (a === ROOT_DIRECTORY) {
        return -1
      }
      if (b === ROOT_DIRECTORY) {
        return 1
      }
      return a.localeCompare(b)
    })
  }, [galleryGroups])

  const defaultTransferDirectory = useMemo(() => {
    if (selectedGalleryDirectory !== ALL_GALLERY_DIRECTORIES && selectedGalleryDirectory !== ROOT_DIRECTORY) {
      return selectedGalleryDirectory
    }
    if (transferDirectories.includes('admin-images')) {
      return 'admin-images'
    }
    return transferDirectories[0] ?? ROOT_DIRECTORY
  }, [selectedGalleryDirectory, transferDirectories])

  const visibleGalleryGroups = useMemo(() => {
    if (selectedGalleryDirectory === ALL_GALLERY_DIRECTORIES) {
      return galleryGroups
    }
    return galleryGroups.filter((group) => group.directory === selectedGalleryDirectory)
  }, [galleryGroups, selectedGalleryDirectory])

  const visibleGalleryEntries = useMemo(() => {
    let flatIndex = 0
    return visibleGalleryGroups.map((group) => ({
      directory: group.directory,
      images: group.images.map((image) => {
        const entry = { image, flatIndex }
        flatIndex += 1
        return entry
      }),
    }))
  }, [visibleGalleryGroups])

  useEffect(() => {
    if (selectedGalleryDirectory === ALL_GALLERY_DIRECTORIES) {
      return
    }

    const hasSelectedDirectory = galleryGroups.some((group) => group.directory === selectedGalleryDirectory)
    if (!hasSelectedDirectory) {
      setSelectedGalleryDirectory(ALL_GALLERY_DIRECTORIES)
    }
  }, [galleryGroups, selectedGalleryDirectory])

  const resolveAccessToken = async (): Promise<{ accessToken: string | null; errorMessage: string | null }> => {
    if (isLocalAuthBypass) {
      return { accessToken: null, errorMessage: null }
    }

    if (!hasSession) {
      return { accessToken: null, errorMessage: "Connecte-toi d'abord." }
    }

    const client = getSupabaseClient()
    if (!client) {
      return { accessToken: null, errorMessage: "Connecte-toi d'abord." }
    }

    const { data, error: sessionError } = await client.auth.getSession()
    if (sessionError || !data.session?.access_token) {
      return { accessToken: null, errorMessage: "Connecte-toi d'abord." }
    }

    return { accessToken: data.session.access_token, errorMessage: null }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setInfo(null)
    const formData = new FormData(event.currentTarget)
    const promptValue = String(formData.get('prompt') ?? '').trim()
    const filenameValue = String(formData.get('filename') ?? '').trim()
    const styleValue = String(formData.get('style') ?? '').trim()

    if (!isLocalAuthBypass && !hasSession) {
      setError("Connecte-toi d'abord.")
      return
    }

    if (!isAuthorized) {
      setError('Accès admin requis.')
      return
    }

    const { accessToken, errorMessage } = await resolveAccessToken()
    if (errorMessage) {
      setError(errorMessage)
      return
    }

    const requestPayload = {
      prompt: promptValue,
      filename: filenameValue.length > 0 ? filenameValue : undefined,
      variants: Number.parseInt(variants, 10),
      aspectRatio,
      style: styleValue.length > 0 ? styleValue : undefined,
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/images/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(requestPayload),
      })

      let payload: { error?: string } | AdminImageGenerateResponse | null = null
      try {
        payload = (await response.json()) as { error?: string } | AdminImageGenerateResponse
      } catch {
        payload = null
      }

      if (!response.ok) {
        if (response.status === 404) {
          setError("API locale introuvable. Relance 'bun run dev' (ou 'bunx vercel dev').")
          return
        }
        if (response.status === 401) {
          setError("Connecte-toi d'abord.")
          return
        }
        if (response.status === 403) {
          setError('Accès admin requis.')
          return
        }

        const apiError = payload && 'error' in payload && typeof payload.error === 'string' ? payload.error : null
        setError(apiError ?? 'Échec génération, réessaie.')
        return
      }

      const successPayload = payload as AdminImageGenerateResponse
      setResult(successPayload)
      setInfo(`${successPayload.images.length} image(s) générée(s).`)
      setGallery(await fetchAdminPublicGallery())
    } catch {
      setError('Échec génération, réessaie.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const transferTargetForImage = (image: AdminGeneratedImage, index: number): string => {
    const key = generatedImageKey(image, index)
    const fromState = transferTargets[key]
    if (fromState && transferDirectories.includes(fromState)) {
      return fromState
    }
    return defaultTransferDirectory
  }

  const handleTransferGeneratedImage = async (image: AdminGeneratedImage, index: number) => {
    setError(null)
    setInfo(null)

    if (!isAuthorized) {
      setError('Accès admin requis.')
      return
    }

    const key = generatedImageKey(image, index)
    const targetDirectory = transferTargetForImage(image, index)
    const sourceFilename = resolveGeneratedSourceFilename(image)
    const sourceDirectory = directoryFromFilename(sourceFilename)
    if (targetDirectory === sourceDirectory) {
      setInfo('Image déjà dans ce dossier.')
      return
    }

    const { accessToken, errorMessage } = await resolveAccessToken()
    if (errorMessage) {
      setError(errorMessage)
      return
    }

    setMovingImageKey(key)
    const moveResult = await moveAdminPublicImage(
      {
        sourceFilename,
        targetDirectory: targetDirectory === ROOT_DIRECTORY ? '' : targetDirectory,
      },
      accessToken,
    )
    setMovingImageKey(null)

    if (!moveResult.image) {
      if (moveResult.status === 401) {
        setError("Connecte-toi d'abord.")
        return
      }
      if (moveResult.status === 403) {
        setError('Accès admin requis.')
        return
      }
      if (moveResult.status === 404) {
        setError('Image source introuvable.')
        return
      }
      setError(moveResult.error ?? 'Échec transfert, réessaie.')
      return
    }

    setInfo(`Image transférée vers ${targetDirectory}.`)
    setGallery(await fetchAdminPublicGallery())
  }

  const handleDeletePublicImage = async (filename: string) => {
    setError(null)
    setInfo(null)

    if (!isAuthorized) {
      setError('Accès admin requis.')
      return
    }

    const { accessToken, errorMessage } = await resolveAccessToken()
    if (errorMessage) {
      setError(errorMessage)
      return
    }

    setDeletingFilename(filename)
    const deleteResult = await deleteAdminPublicImage(filename, accessToken)
    setDeletingFilename(null)

    if (!deleteResult.deleted) {
      if (deleteResult.status === 401) {
        setError("Connecte-toi d'abord.")
        return
      }
      if (deleteResult.status === 403) {
        setError('Accès admin requis.')
        return
      }
      if (deleteResult.status === 404) {
        setError('Image introuvable.')
        return
      }
      setError(deleteResult.error ?? 'Échec suppression, réessaie.')
      return
    }

    setResult((current) => {
      if (!current) {
        return current
      }
      return {
        ...current,
        images: current.images.filter((image) => resolveGeneratedSourceFilename(image) !== filename),
      }
    })
    setInfo('Image supprimée.')
    setGallery(await fetchAdminPublicGallery())
  }

  const handleGalleryCardDragStart = (event: DragEvent<HTMLElement>, filename: string) => {
    setDraggedGalleryFilename(filename)
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', filename)
    }
  }

  const handleGalleryCardDragEnd = () => {
    setDraggedGalleryFilename(null)
    setDropTargetDirectory(null)
  }

  const handleGalleryTabDragOver = (event: DragEvent<HTMLElement>, directory: string) => {
    if (!draggedGalleryFilename || directory === ALL_GALLERY_DIRECTORIES) {
      return
    }

    if (directoryFromFilename(draggedGalleryFilename) === directory) {
      return
    }

    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
    setDropTargetDirectory(directory)
  }

  const moveGalleryImageToDirectory = async (sourceFilename: string, targetDirectory: string) => {
    setError(null)
    setInfo(null)

    if (!isAuthorized) {
      setError('Accès admin requis.')
      return
    }

    if (directoryFromFilename(sourceFilename) === targetDirectory) {
      setInfo('Image déjà dans ce dossier.')
      return
    }

    const { accessToken, errorMessage } = await resolveAccessToken()
    if (errorMessage) {
      setError(errorMessage)
      return
    }

    setMovingGalleryFilename(sourceFilename)
    const moveResult = await moveAdminPublicImage(
      {
        sourceFilename,
        targetDirectory: targetDirectory === ROOT_DIRECTORY ? '' : targetDirectory,
      },
      accessToken,
    )
    setMovingGalleryFilename(null)

    if (!moveResult.image) {
      if (moveResult.status === 401) {
        setError("Connecte-toi d'abord.")
        return
      }
      if (moveResult.status === 403) {
        setError('Accès admin requis.')
        return
      }
      if (moveResult.status === 404) {
        setError('Image source introuvable.')
        return
      }
      setError(moveResult.error ?? 'Échec transfert, réessaie.')
      return
    }

    setInfo(`Image transférée vers ${targetDirectory}.`)
    setSelectedGalleryDirectory(targetDirectory)
    setGallery(await fetchAdminPublicGallery())
  }

  const startRenamingGalleryImage = (sourceFilename: string) => {
    setRenamingFilename(sourceFilename)
    setRenameDraft(basenameFromFilename(sourceFilename))
    setError(null)
    setInfo(null)
  }

  const cancelRenamingGalleryImage = () => {
    if (renamingFilename) {
      delete renameInputRefs.current[renamingFilename]
    }
    setRenamingFilename(null)
    setRenameDraft('')
  }

  const submitRenamingGalleryImage = async (sourceFilename: string) => {
    if (renameInFlightRef.current[sourceFilename]) {
      return
    }

    const targetName = (renameInputRefs.current[sourceFilename]?.value ?? renameDraft).trim()
    if (targetName.length === 0) {
      setError("Le nom de l'image ne peut pas être vide.")
      return
    }

    if (!isAuthorized) {
      setError('Accès admin requis.')
      return
    }

    renameInFlightRef.current[sourceFilename] = true
    let renameResult:
      | {
          status: number
          image?: AdminPublicGalleryImage
          error?: string
        }
      | null = null
    try {
      const { accessToken, errorMessage } = await resolveAccessToken()
      if (errorMessage) {
        setError(errorMessage)
        return
      }

      setSavingRenameFilename(sourceFilename)
      renameResult = await renameAdminPublicImage({ sourceFilename, targetName }, accessToken)
      setSavingRenameFilename(null)
    } finally {
      setSavingRenameFilename((current) => (current === sourceFilename ? null : current))
      delete renameInFlightRef.current[sourceFilename]
    }

    if (!renameResult) {
      setError('Échec renommage, réessaie.')
      return
    }

    if (!renameResult.image) {
      if (renameResult.status === 401) {
        setError("Connecte-toi d'abord.")
        return
      }
      if (renameResult.status === 403) {
        setError('Accès admin requis.')
        return
      }
      if (renameResult.status === 404) {
        if (renameResult.error === 'Source image not found.') {
          setError('Image source introuvable.')
        } else {
          setError("API locale introuvable. Relance 'bun run dev' (ou 'bunx vercel dev').")
        }
        return
      }
      setError(renameResult.error ?? 'Échec renommage, réessaie.')
      return
    }

    setRenamingFilename(null)
    setRenameDraft('')
    delete renameInputRefs.current[sourceFilename]
    setInfo('Image renommée.')
    setGallery(await fetchAdminPublicGallery())
  }

  const handleGalleryTabDrop = async (event: DragEvent<HTMLElement>, directory: string) => {
    event.preventDefault()

    const draggedFilename = draggedGalleryFilename ?? event.dataTransfer?.getData('text/plain') ?? null
    setDropTargetDirectory(null)
    setDraggedGalleryFilename(null)

    if (!draggedFilename || directory === ALL_GALLERY_DIRECTORIES) {
      return
    }

    await moveGalleryImageToDirectory(draggedFilename, directory)
  }

  return (
    <section className="panel admin-images-panel" data-testid="admin-images-page">
      <div className="admin-images-head">
        <h1>Admin Images</h1>
        <p className="small">Generate artwork with AI SDK + Imagen.</p>
      </div>

      {isLoadingAccess ? <p className="small">Vérification des droits admin...</p> : null}
      {!isLoadingAccess && !hasSession ? <p className="error">Connecte-toi d'abord.</p> : null}
      {!isLoadingAccess && hasSession && !isAuthorized ? <p className="error">Accès admin requis.</p> : null}

      {!isLoadingAccess && hasSession && isAuthorized ? (
        <>
          <form className="admin-images-form" data-testid="admin-images-form" onSubmit={handleSubmit}>
            <label className="account-label" htmlFor="admin-images-prompt-input">
              Prompt
              <textarea
                id="admin-images-prompt-input"
                name="prompt"
                className="admin-images-textarea"
                data-testid="admin-images-prompt-input"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Illustration d'une carte légendaire..."
              />
            </label>

            <label className="account-label" htmlFor="admin-images-filename-input">
              Nom de fichier (optionnel)
              <input
                id="admin-images-filename-input"
                name="filename"
                data-testid="admin-images-filename-input"
                value={filename}
                onChange={(event) => setFilename(event.target.value)}
                maxLength={120}
                placeholder="electrik-logo"
              />
            </label>

            <div className="admin-images-grid">
              <label className="account-label" htmlFor="admin-images-variants-select">
                Variantes
                <select
                  id="admin-images-variants-select"
                  data-testid="admin-images-variants-select"
                  value={variants}
                  onChange={(event) => setVariants(event.target.value)}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </label>

              <label className="account-label" htmlFor="admin-images-aspect-select">
                Ratio
                <select
                  id="admin-images-aspect-select"
                  data-testid="admin-images-aspect-select"
                  value={aspectRatio}
                  onChange={(event) => setAspectRatio(event.target.value as AdminImageAspectRatio)}
                >
                  {Object.entries(aspectRatioLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="account-label" htmlFor="admin-images-style-input">
              Style (optionnel)
              <input
                id="admin-images-style-input"
                name="style"
                data-testid="admin-images-style-input"
                value={style}
                onChange={(event) => setStyle(event.target.value)}
                placeholder="anime cel-shaded, watercolor..."
              />
            </label>

            <div className="admin-images-actions">
              <button type="submit" className="button button-primary" data-testid="admin-images-submit" disabled={!canSubmit}>
                {isSubmitting ? 'Generating...' : 'Generate'}
              </button>
              {result ? (
                <button
                  type="button"
                  className="button"
                  data-testid="admin-images-download-all"
                  onClick={() => result.images.forEach((image) => triggerImageDownload(image))}
                >
                  Download all
                </button>
              ) : null}
            </div>
          </form>

          {info ? (
            <p className="small" data-testid="admin-images-success">
              {info}
            </p>
          ) : null}
          {error ? (
            <p className="error" role="alert" data-testid="admin-images-error">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="admin-images-results" data-testid="admin-images-results">
              {result.images.map((image, index) => {
                const imageKey = generatedImageKey(image, index)
                const sourceFilename = resolveGeneratedSourceFilename(image)
                const sourceDirectory = directoryFromFilename(sourceFilename)
                const transferTarget = transferTargetForImage(image, index)
                const isMoving = movingImageKey === imageKey
                const isDeleting = deletingFilename === sourceFilename
                const canTransfer = transferTarget !== sourceDirectory

                return (
                  <article className="admin-images-card" key={`${image.filename}-${index}`} data-testid={`admin-image-preview-${index}`}>
                    <img src={buildDataUrl(image)} alt={image.filename} />
                    <div className="admin-images-card__meta">
                      <p className="small">{image.filename}</p>
                      <button
                        type="button"
                        className="button"
                        data-testid={`admin-image-download-${index}`}
                        disabled={isDeleting}
                        onClick={() => triggerImageDownload(image)}
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        className="button"
                        data-testid={`admin-image-delete-${index}`}
                        disabled={isDeleting}
                        onClick={() => void handleDeletePublicImage(sourceFilename)}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                    <div className="admin-image-transfer">
                      <select
                        value={transferTarget}
                        data-testid={`admin-image-transfer-target-${index}`}
                        onChange={(event) =>
                          setTransferTargets((current) => ({
                            ...current,
                            [imageKey]: event.target.value,
                          }))
                        }
                      >
                        {transferDirectories.map((directory) => (
                          <option key={directory} value={directory}>
                            {directory}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="button"
                        data-testid={`admin-image-transfer-${index}`}
                        disabled={!canTransfer || isMoving || isDeleting}
                        onClick={() => void handleTransferGeneratedImage(image, index)}
                      >
                        {isMoving ? 'Moving...' : 'Transfer'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="small" data-testid="admin-images-empty">
              No generated images yet.
            </p>
          )}

          <div className="admin-images-gallery-head">
            <h2>Galerie</h2>
          </div>

          {galleryTabs.length > 0 ? (
            <div className="admin-gallery-tabs" role="tablist" aria-label="Dossiers public">
              {galleryTabs.map((tab) => {
                const selected = selectedGalleryDirectory === tab.directory
                const testIdDirectory = tab.directory === ALL_GALLERY_DIRECTORIES ? 'all' : toDirectoryTestId(tab.directory)
                const isDropTarget = dropTargetDirectory === tab.directory
                const sourceDirectory = draggedGalleryFilename ? directoryFromFilename(draggedGalleryFilename) : null
                const isDragDisabled =
                  tab.directory === ALL_GALLERY_DIRECTORIES || !draggedGalleryFilename || sourceDirectory === tab.directory

                return (
                  <button
                    key={tab.directory}
                    type="button"
                    role="tab"
                    className={`admin-gallery-tab${selected ? ' is-active' : ''}${isDropTarget ? ' is-drop-target' : ''}${
                      isDragDisabled ? ' is-drop-disabled' : ''
                    }`}
                    aria-selected={selected}
                    data-testid={`admin-gallery-tab-${testIdDirectory}`}
                    onClick={() => setSelectedGalleryDirectory(tab.directory)}
                    onDragOver={(event) => handleGalleryTabDragOver(event, tab.directory)}
                    onDragEnter={(event) => handleGalleryTabDragOver(event, tab.directory)}
                    onDragLeave={() => {
                      if (dropTargetDirectory === tab.directory) {
                        setDropTargetDirectory(null)
                      }
                    }}
                    onDrop={(event) => void handleGalleryTabDrop(event, tab.directory)}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          ) : null}

          {gallery.length > 0 ? (
            <div className="admin-gallery-groups" data-testid="admin-gallery-results">
              {visibleGalleryEntries.map((group) => (
                <section className="admin-gallery-group" key={group.directory} data-testid={`admin-gallery-group-${toDirectoryTestId(group.directory)}`}>
                  {selectedGalleryDirectory === ALL_GALLERY_DIRECTORIES ? (
                    <div className="admin-gallery-group__summary">
                      <span>{group.directory}</span>
                      <span className="small">{group.images.length}</span>
                    </div>
                  ) : null}
                  <div className="admin-images-results">
                    {group.images.map(({ image, flatIndex }) => {
                      const isDeleting = deletingFilename === image.filename
                      const isMoving = movingGalleryFilename === image.filename
                      const isRenaming = renamingFilename === image.filename
                      const isSavingRename = savingRenameFilename === image.filename
                      return (
                        <article
                          className="admin-images-card admin-gallery-card"
                          key={`${image.filename}-${image.createdAt}-${flatIndex}`}
                          data-testid={`admin-gallery-image-${flatIndex}`}
                          draggable={!isDeleting && !isMoving && !isRenaming && !isSavingRename}
                          onDragStart={(event) => handleGalleryCardDragStart(event, image.filename)}
                          onDragEnd={handleGalleryCardDragEnd}
                        >
                        <img className="admin-gallery-card__image" src={image.url} alt={image.filename} />
                        <div className="admin-images-card__meta">
                          {isRenaming ? (
                            <div className="admin-gallery-rename">
                              <input
                                className="admin-gallery-rename__input"
                                data-testid={`admin-gallery-rename-input-${flatIndex}`}
                                value={renameDraft}
                                ref={(element) => {
                                  renameInputRefs.current[image.filename] = element
                                }}
                                disabled={isSavingRename}
                                onChange={(event) => setRenameDraft(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault()
                                    void submitRenamingGalleryImage(renamingFilename ?? image.filename)
                                  }
                                  if (event.key === 'Escape') {
                                    event.preventDefault()
                                    cancelRenamingGalleryImage()
                                  }
                                }}
                              />
                              <div className="admin-gallery-rename__actions">
                                <button
                                  type="button"
                                  className="button"
                                  data-testid={`admin-gallery-rename-save-${flatIndex}`}
                                  disabled={isSavingRename}
                                  onClick={() => void submitRenamingGalleryImage(renamingFilename ?? image.filename)}
                                >
                                  {isSavingRename ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  className="button"
                                  data-testid={`admin-gallery-rename-cancel-${flatIndex}`}
                                  disabled={isSavingRename}
                                  onClick={cancelRenamingGalleryImage}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="admin-gallery-filename-button small"
                              data-testid={`admin-gallery-filename-button-${flatIndex}`}
                              disabled={isDeleting || isMoving}
                              onClick={() => startRenamingGalleryImage(image.filename)}
                            >
                              {image.filename}
                            </button>
                          )}
                          <div className="admin-gallery-card__actions">
                            <button
                              type="button"
                              className="button"
                              data-testid={`admin-gallery-download-${flatIndex}`}
                              disabled={isDeleting || isMoving || isRenaming || isSavingRename}
                              onClick={() => triggerPublicImageDownload(image)}
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              className="button"
                              data-testid={`admin-gallery-delete-${flatIndex}`}
                              disabled={isDeleting || isMoving || isRenaming || isSavingRename}
                              onClick={() => void handleDeletePublicImage(image.filename)}
                            >
                              {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                        </article>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="small" data-testid="admin-gallery-empty">
              Galerie vide.
            </p>
          )}
        </>
      ) : null}
    </section>
  )
}
