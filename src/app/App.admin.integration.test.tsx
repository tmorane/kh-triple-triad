import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeEach, describe, expect, mock, test, vi } from 'bun:test'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { GameProvider } from './GameContext'
import * as cloudAuth from './cloud/cloudAuth'

vi.mock('./cloud/cloudAuth', () => ({
  getCloudSessionUser: vi.fn(async () => ({ id: 'admin-1', email: 'admin@example.com' })),
  onCloudAuthStateChange: vi.fn(() => () => undefined),
  isCloudAuthEnabled: vi.fn(() => false),
}))

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <GameProvider>
        <App />
      </GameProvider>
    </MemoryRouter>,
  )
}

describe('App admin images integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    import.meta.env.VITE_ADMIN_BYPASS_LOCAL_AUTH = 'false'
    import.meta.env.VITE_ADMIN_ALLOWED_EMAILS = 'admin@example.com'
  })

  test('shows Admin Images link in More menu for allowlisted admins', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    expect(await screen.findByTestId('topbar-more-link-admin-images')).toHaveAttribute('href', '/admin/images')
  })

  test('hides Admin Images link for non-admin users', async () => {
    const user = userEvent.setup()
    vi.mocked(cloudAuth.getCloudSessionUser).mockResolvedValueOnce({ id: 'user-1', email: 'player@example.com' })

    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    await waitFor(() => expect(screen.queryByTestId('topbar-more-link-admin-images')).not.toBeInTheDocument())
  })

  test('shows Admin Images link for signed-in users when client allowlist is empty', async () => {
    const user = userEvent.setup()
    import.meta.env.VITE_ADMIN_ALLOWED_EMAILS = ''

    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    expect(await screen.findByTestId('topbar-more-link-admin-images')).toHaveAttribute('href', '/admin/images')
  })

  test('shows Admin Images link in local bypass mode even without session', async () => {
    const user = userEvent.setup()
    import.meta.env.VITE_ADMIN_BYPASS_LOCAL_AUTH = 'true'
    vi.mocked(cloudAuth.getCloudSessionUser).mockResolvedValueOnce(null)

    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    expect(await screen.findByTestId('topbar-more-link-admin-images')).toHaveAttribute('href', '/admin/images')
  })

  test('renders admin images page route', async () => {
    renderApp('/admin/images')

    expect(await screen.findByRole('heading', { name: 'Admin Images' })).toBeInTheDocument()
  })
})

afterAll(() => {
  mock.restore()
})
