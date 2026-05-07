import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'bun:test'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { GameProvider } from './GameContext'

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

  test('hides Admin Images link for allowlisted admins while connection is removed', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    await waitFor(() => expect(screen.queryByTestId('topbar-more-link-admin-images')).not.toBeInTheDocument())
  })

  test('hides Admin Images link for signed-in users when client allowlist is empty', async () => {
    const user = userEvent.setup()
    import.meta.env.VITE_ADMIN_ALLOWED_EMAILS = ''

    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    await waitFor(() => expect(screen.queryByTestId('topbar-more-link-admin-images')).not.toBeInTheDocument())
  })

  test('shows Admin Images link in local bypass mode even without session', async () => {
    const user = userEvent.setup()
    import.meta.env.VITE_ADMIN_BYPASS_LOCAL_AUTH = 'true'

    renderApp('/')

    await user.click(screen.getByTestId('topbar-more-toggle'))
    expect(await screen.findByTestId('topbar-more-link-admin-images')).toHaveAttribute('href', '/admin/images')
  })

  test('renders admin images page route', async () => {
    import.meta.env.VITE_ADMIN_BYPASS_LOCAL_AUTH = 'true'
    renderApp('/admin/images')

    expect(await screen.findByRole('heading', { name: 'Images admin' })).toBeInTheDocument()
  })
})
