import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'
import * as cloudAuth from '../../app/cloud/cloudAuth'
import * as supabaseClient from '../../app/cloud/supabaseClient'
import { AdminImagesPage } from './AdminImagesPage'

vi.mock('../../app/cloud/cloudAuth', () => ({
  getCloudSessionUser: vi.fn(async () => ({ id: 'admin-1', email: 'admin@example.com' })),
  onCloudAuthStateChange: vi.fn(() => () => undefined),
}))

vi.mock('../../app/cloud/supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: 'supabase-token' } },
        error: null,
      })),
    },
  })),
}))

function createDefaultMockSupabaseClient() {
  return {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: 'supabase-token' } },
        error: null,
      })),
    },
  } as unknown as NonNullable<ReturnType<typeof supabaseClient.getSupabaseClient>>
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function setPromptValue(prompt: string) {
  fireEvent.input(screen.getByTestId('admin-images-prompt-input'), { target: { value: prompt } })
}

function submitAdminImagesForm() {
  fireEvent.submit(screen.getByTestId('admin-images-form'))
}

function generationCalls() {
  return vi.mocked(fetch).mock.calls.filter((entry) => entry[0] === '/api/admin/images/generate')
}

describe('AdminImagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    import.meta.env.VITE_ADMIN_BYPASS_LOCAL_AUTH = 'false'
    import.meta.env.VITE_ADMIN_ALLOWED_EMAILS = 'admin@example.com'
    vi.mocked(cloudAuth.getCloudSessionUser).mockResolvedValue({ id: 'admin-1', email: 'admin@example.com' })
    vi.mocked(cloudAuth.onCloudAuthStateChange).mockReturnValue(() => undefined)
    vi.mocked(supabaseClient.getSupabaseClient).mockImplementation(() => createDefaultMockSupabaseClient())
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.mocked(supabaseClient.getSupabaseClient).mockReset()
  })

  test('shows unauthorized message for non-admin users', async () => {
    vi.mocked(cloudAuth.getCloudSessionUser).mockResolvedValueOnce({ id: 'user-2', email: 'player@example.com' })

    render(<AdminImagesPage />)

    expect(await screen.findByText('Accès admin requis.')).toBeInTheDocument()
    expect(screen.queryByTestId('admin-images-form')).not.toBeInTheDocument()
  })

  test('shows sign-in message when no cloud session exists', async () => {
    vi.mocked(cloudAuth.getCloudSessionUser).mockResolvedValueOnce(null)

    render(<AdminImagesPage />)

    expect(await screen.findByText("Connecte-toi d'abord.")).toBeInTheDocument()
    expect(screen.queryByTestId('admin-images-form')).not.toBeInTheDocument()
  })

  test('allows access when client allowlist is empty and user is signed in', async () => {
    import.meta.env.VITE_ADMIN_ALLOWED_EMAILS = ''
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ images: [] }))

    render(<AdminImagesPage />)

    await waitFor(() => expect(screen.getByTestId('admin-images-form')).toBeInTheDocument())
  })

  test('submits generation request and allows image download', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ images: [] }))
      .mockResolvedValueOnce(
        jsonResponse({
          model: 'google/imagen-4.0-generate-001',
          createdAt: '2026-03-01T12:00:00.000Z',
          images: [{ mediaType: 'image/png', base64: 'abc123', filename: 'card.png' }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          images: [
            {
              filename: 'card.png',
              url: '/admin-images/card.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T12:00:00.000Z',
            },
          ],
        }),
      )

    render(<AdminImagesPage />)

    await waitFor(() => expect(screen.getByTestId('admin-images-form')).toBeInTheDocument())

    setPromptValue('Legendary electric creature')
    fireEvent.change(screen.getByTestId('admin-images-variants-select'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('admin-images-aspect-select'), { target: { value: '1:1' } })
    submitAdminImagesForm()

    await waitFor(() => expect(generationCalls()).toHaveLength(1))
    await waitFor(() => expect(screen.getByTestId('admin-image-preview-0')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByTestId('admin-gallery-image-0')).toBeInTheDocument())

    const request = generationCalls()[0]
    expect(request?.[0]).toBe('/api/admin/images/generate')
    expect(request?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer supabase-token' }),
    })

    fireEvent.click(screen.getByTestId('admin-image-download-0'))
    expect(clickSpy).toHaveBeenCalled()
  })

  test('renders the optional filename field under the prompt', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ images: [] }))

    render(<AdminImagesPage />)

    await waitFor(() => expect(screen.getByTestId('admin-images-form')).toBeInTheDocument())
    expect(screen.getByTestId('admin-images-filename-input')).toBeInTheDocument()
  })

  test('does not show unsupported 21:9 in aspect ratio choices', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ images: [] }))

    render(<AdminImagesPage />)

    await waitFor(() => expect(screen.getByTestId('admin-images-form')).toBeInTheDocument())
    expect(screen.queryByRole('option', { name: 'Cinematic (21:9)' })).not.toBeInTheDocument()
  })

  test('loads existing gallery images from public gallery endpoint', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        images: [
          {
            filename: 'stored.png',
            url: '/admin-images/stored.png',
            mediaType: 'image/png',
            createdAt: '2026-03-01T12:00:00.000Z',
          },
        ],
      }),
    )

    render(<AdminImagesPage />)

    expect(await screen.findByTestId('admin-gallery-image-0')).toBeInTheDocument()
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain('/api/admin/images/gallery')
  })

  test('renames a gallery image when clicking its filename', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          images: [
            {
              filename: 'cards/pikachu.png',
              url: '/cards/pikachu.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T12:00:00.000Z',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          image: {
            filename: 'cards/raichu.png',
            url: '/cards/raichu.png',
            mediaType: 'image/png',
            createdAt: '2026-03-01T12:00:10.000Z',
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          images: [
            {
              filename: 'cards/raichu.png',
              url: '/cards/raichu.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T12:00:10.000Z',
            },
          ],
        }),
      )

    render(<AdminImagesPage />)

    expect(await screen.findByTestId('admin-gallery-image-0')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('admin-gallery-filename-button-0'))
    fireEvent.input(screen.getByTestId('admin-gallery-rename-input-0'), {
      target: { value: 'raichu' },
    })
    await waitFor(() =>
      expect((screen.getByTestId('admin-gallery-rename-input-0') as HTMLInputElement).value).toBe('raichu'),
    )
    fireEvent.click(screen.getByTestId('admin-gallery-rename-save-0'))

    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some((entry) => entry[0] === '/api/admin/images/rename'),
      ).toBe(true),
    )

    const renameCall = vi.mocked(fetch).mock.calls.find((entry) => entry[0] === '/api/admin/images/rename')
    expect(renameCall?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer supabase-token' }),
      body: JSON.stringify({ sourceFilename: 'cards/pikachu.png', targetName: 'raichu' }),
    })
  })

  test('shows local runtime guidance when rename endpoint returns 404', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          images: [
            {
              filename: 'cards/pikachu.png',
              url: '/cards/pikachu.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T12:00:00.000Z',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: 'Not Found' }, 404))

    render(<AdminImagesPage />)

    expect(await screen.findByTestId('admin-gallery-image-0')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('admin-gallery-filename-button-0'))
    fireEvent.click(screen.getByTestId('admin-gallery-rename-save-0'))

    expect(await screen.findByTestId('admin-images-error')).toHaveTextContent("Relance 'bun run dev'")
  })

  test('groups gallery by directory and switches with folder tabs', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        images: [
          {
            filename: 'cards/pikachu.png',
            url: '/cards/pikachu.png',
            mediaType: 'image/png',
            createdAt: '2026-03-01T12:00:02.000Z',
          },
          {
            filename: 'ui/backgrounds/app-dark.jpg',
            url: '/ui/backgrounds/app-dark.jpg',
            mediaType: 'image/jpeg',
            createdAt: '2026-03-01T12:00:01.000Z',
          },
          {
            filename: 'ui/backgrounds/app-light.jpg',
            url: '/ui/backgrounds/app-light.jpg',
            mediaType: 'image/jpeg',
            createdAt: '2026-03-01T12:00:00.000Z',
          },
        ],
      }),
    )

    render(<AdminImagesPage />)

    expect(await screen.findByTestId('admin-gallery-tab-cards')).toBeInTheDocument()
    expect(screen.getByTestId('admin-gallery-tab-ui-backgrounds')).toBeInTheDocument()
    expect(screen.getByText('cards/pikachu.png')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('admin-gallery-tab-ui-backgrounds'))

    await waitFor(() => expect(screen.queryByText('cards/pikachu.png')).not.toBeInTheDocument())
    expect(screen.getByText('ui/backgrounds/app-dark.jpg')).toBeInTheDocument()
    expect(screen.getByText('ui/backgrounds/app-light.jpg')).toBeInTheDocument()
  })

  test('moves a gallery image by drag and drop on a folder tab', async () => {
    const setData = vi.fn()
    const getData = vi.fn(() => 'admin-images/card.png')

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          images: [
            {
              filename: 'admin-images/card.png',
              url: '/admin-images/card.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T12:00:02.000Z',
            },
            {
              filename: 'cards/existing.png',
              url: '/cards/existing.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T12:00:01.000Z',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          image: {
            filename: 'cards/card.png',
            url: '/cards/card.png',
            mediaType: 'image/png',
            createdAt: '2026-03-01T12:00:10.000Z',
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          images: [
            {
              filename: 'cards/card.png',
              url: '/cards/card.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T12:00:10.000Z',
            },
            {
              filename: 'cards/existing.png',
              url: '/cards/existing.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T12:00:01.000Z',
            },
          ],
        }),
      )

    render(<AdminImagesPage />)

    expect(await screen.findByTestId('admin-gallery-image-0')).toBeInTheDocument()
    const sourceCard = screen.getByTestId('admin-gallery-image-0')
    const cardsTab = screen.getByTestId('admin-gallery-tab-cards')
    const dataTransfer = { setData, getData, effectAllowed: 'move', dropEffect: 'move' } as unknown as DataTransfer

    fireEvent.dragStart(sourceCard, { dataTransfer })
    fireEvent.dragOver(cardsTab, { dataTransfer })
    fireEvent.drop(cardsTab, { dataTransfer })

    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some((entry) => entry[0] === '/api/admin/images/move'),
      ).toBe(true),
    )

    const moveCall = vi.mocked(fetch).mock.calls.find((entry) => entry[0] === '/api/admin/images/move')
    expect(moveCall?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer supabase-token' }),
      body: JSON.stringify({ sourceFilename: 'admin-images/card.png', targetDirectory: 'cards' }),
    })
    expect(setData).toHaveBeenCalledWith('text/plain', 'admin-images/card.png')
  })

  test('moves a generated image to a selected public folder', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          images: [
            {
              filename: 'admin-images/existing.png',
              url: '/admin-images/existing.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T11:59:00.000Z',
            },
            {
              filename: 'cards/existing.png',
              url: '/cards/existing.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T11:58:00.000Z',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          model: 'google/imagen-4.0-generate-001',
          createdAt: '2026-03-01T12:00:00.000Z',
          images: [{ mediaType: 'image/png', base64: 'abc123', filename: 'card.png' }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          images: [
            {
              filename: 'admin-images/card.png',
              url: '/admin-images/card.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T12:00:00.000Z',
            },
            {
              filename: 'cards/existing.png',
              url: '/cards/existing.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T11:58:00.000Z',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          image: {
            filename: 'cards/card.png',
            url: '/cards/card.png',
            mediaType: 'image/png',
            createdAt: '2026-03-01T12:00:10.000Z',
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          images: [
            {
              filename: 'cards/card.png',
              url: '/cards/card.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T12:00:10.000Z',
            },
            {
              filename: 'cards/existing.png',
              url: '/cards/existing.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T11:58:00.000Z',
            },
          ],
        }),
      )

    render(<AdminImagesPage />)

    await waitFor(() => expect(screen.getByTestId('admin-images-form')).toBeInTheDocument())
    setPromptValue('Legendary electric creature')
    submitAdminImagesForm()

    await waitFor(() => expect(screen.getByTestId('admin-image-preview-0')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('admin-image-transfer-target-0'), {
      target: { value: 'cards' },
    })
    fireEvent.click(screen.getByTestId('admin-image-transfer-0'))

    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some((entry) => entry[0] === '/api/admin/images/move'),
      ).toBe(true),
    )

    const moveCall = vi.mocked(fetch).mock.calls.find((entry) => entry[0] === '/api/admin/images/move')
    expect(moveCall?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer supabase-token' }),
      body: JSON.stringify({ sourceFilename: 'admin-images/card.png', targetDirectory: 'cards' }),
    })
  })

  test('deletes a generated image from public storage', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          images: [
            {
              filename: 'admin-images/card.png',
              url: '/admin-images/card.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T12:00:00.000Z',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          model: 'google/imagen-4.0-generate-001',
          createdAt: '2026-03-01T12:00:00.000Z',
          images: [{ mediaType: 'image/png', base64: 'abc123', filename: 'card.png' }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          images: [
            {
              filename: 'admin-images/card.png',
              url: '/admin-images/card.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T12:00:00.000Z',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ deleted: true }))
      .mockResolvedValueOnce(jsonResponse({ images: [] }))

    render(<AdminImagesPage />)

    await waitFor(() => expect(screen.getByTestId('admin-images-form')).toBeInTheDocument())
    setPromptValue('Legendary electric creature')
    submitAdminImagesForm()

    await waitFor(() => expect(screen.getByTestId('admin-image-preview-0')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('admin-image-delete-0'))

    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some((entry) => entry[0] === '/api/admin/images/delete'),
      ).toBe(true),
    )

    const deleteCall = vi.mocked(fetch).mock.calls.find((entry) => entry[0] === '/api/admin/images/delete')
    expect(deleteCall?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer supabase-token' }),
      body: JSON.stringify({ filename: 'admin-images/card.png' }),
    })
  })

  test('deletes an image directly from gallery', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          images: [
            {
              filename: 'cards/pikachu.png',
              url: '/cards/pikachu.png',
              mediaType: 'image/png',
              createdAt: '2026-03-01T12:00:00.000Z',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ deleted: true }))
      .mockResolvedValueOnce(jsonResponse({ images: [] }))

    render(<AdminImagesPage />)

    expect(await screen.findByTestId('admin-gallery-image-0')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('admin-gallery-delete-0'))

    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some((entry) => entry[0] === '/api/admin/images/delete'),
      ).toBe(true),
    )
  })

  test('shows a specific error message on 403 response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ images: [] })).mockResolvedValueOnce(jsonResponse({ error: 'Admin access required.' }, 403))

    render(<AdminImagesPage />)

    await waitFor(() => expect(screen.getByTestId('admin-images-form')).toBeInTheDocument())
    setPromptValue('Mystic forest')
    submitAdminImagesForm()

    expect(await screen.findByTestId('admin-images-error')).toHaveTextContent('Accès admin requis.')
  })

  test('shows local runtime guidance on 404 API response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ images: [] })).mockResolvedValueOnce(jsonResponse({ error: 'Not Found' }, 404))

    render(<AdminImagesPage />)

    await waitFor(() => expect(screen.getByTestId('admin-images-form')).toBeInTheDocument())
    setPromptValue('Mystic forest')
    submitAdminImagesForm()

    expect(await screen.findByTestId('admin-images-error')).toHaveTextContent("Relance 'bun run dev'")
  })

  test('shows connection error when no session token is available', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ images: [] }))
    vi.mocked(supabaseClient.getSupabaseClient).mockReturnValueOnce({
      auth: {
        getSession: vi.fn(async () => ({
          data: { session: null },
          error: null,
        })),
      },
    } as unknown as ReturnType<typeof supabaseClient.getSupabaseClient>)

    render(<AdminImagesPage />)

    await waitFor(() => expect(screen.getByTestId('admin-images-form')).toBeInTheDocument())
    setPromptValue('Phoenix')
    submitAdminImagesForm()

    expect(await screen.findByTestId('admin-images-error')).toHaveTextContent("Connecte-toi d'abord.")
  })

  test('submits without session token when local bypass is enabled', async () => {
    import.meta.env.VITE_ADMIN_BYPASS_LOCAL_AUTH = 'true'
    vi.mocked(cloudAuth.getCloudSessionUser).mockResolvedValueOnce(null)
    vi.mocked(supabaseClient.getSupabaseClient).mockReturnValueOnce(null)

    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ images: [] }))
      .mockResolvedValueOnce(
        jsonResponse({
          model: 'google/imagen-4.0-generate-001',
          createdAt: '2026-03-01T12:00:00.000Z',
          images: [{ mediaType: 'image/png', base64: 'abc123', filename: 'card.png' }],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ images: [] }))

    render(<AdminImagesPage />)

    await waitFor(() => expect(screen.getByTestId('admin-images-form')).toBeInTheDocument())
    setPromptValue('Legendary electric creature')
    submitAdminImagesForm()

    await waitFor(() => expect(generationCalls()).toHaveLength(1))
    const request = generationCalls()[0]
    expect(request?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.not.objectContaining({ Authorization: expect.any(String) }),
    })
  })
})
