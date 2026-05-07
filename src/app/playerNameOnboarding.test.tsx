import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'bun:test'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { PROFILE_STORAGE_KEY } from '../domain/progression/profile'
import { GameProvider } from './GameContext'
import * as cloudLadderStore from './cloud/cloudLadderStore'

vi.mock('./cloud/cloudLadderStore', () => ({
  fetchOwnedCardsLadder: vi.fn(async () => []),
  fetchPeakRankLadder: vi.fn(async () => []),
  isGlobalLadderEnabled: vi.fn(() => true),
}))

function readStoredPlayerName(): string {
  const saved = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? '{}') as { playerName?: string }
  return saved.playerName ?? 'Joueur'
}

function createLocalLadderEntry() {
  return {
    userId: 'local-player',
    playerName: readStoredPlayerName(),
    ownedCardsCount: 5,
    peakRankScore: 0,
    peakRankLabel: 'Iron IV',
    updatedAt: '2026-05-07T12:00:00.000Z',
  }
}

function renderApp(initialPath = '/home') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <GameProvider>
        <App />
      </GameProvider>
    </MemoryRouter>,
  )
}

describe('player name onboarding', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.mocked(cloudLadderStore.isGlobalLadderEnabled).mockReturnValue(true)
    vi.mocked(cloudLadderStore.fetchPeakRankLadder).mockImplementation(async () => [createLocalLadderEntry()])
    vi.mocked(cloudLadderStore.fetchOwnedCardsLadder).mockImplementation(async () => [createLocalLadderEntry()])
  })

  test('asks for a pseudo on first connection and uses it as the player identity', async () => {
    const user = userEvent.setup()
    renderApp()

    expect(screen.getByRole('dialog', { name: 'Choisis ton pseudo' })).toBeInTheDocument()

    await user.type(screen.getByTestId('player-name-onboarding-input'), 'Aqua')
    await user.click(screen.getByTestId('player-name-onboarding-submit'))

    expect(screen.queryByRole('dialog', { name: 'Choisis ton pseudo' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Bienvenue, Aqua' })).toBeInTheDocument()
    expect(screen.getByText(/Pose tes cartes sur la grille/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Aqua' })).toHaveAttribute('href', '/home')
    await waitFor(() => expect(screen.getByTestId('home-rank-ladder')).toHaveTextContent('Aqua'))
    expect(screen.getByTestId('home-owned-ladder')).toHaveTextContent('Aqua')

    const saved = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? '{}') as {
      playerName?: string
      hasChosenPlayerName?: boolean
    }
    expect(saved.playerName).toBe('Aqua')
    expect(saved.hasChosenPlayerName).toBe(true)

    await user.click(screen.getByTestId('player-welcome-dismiss'))

    expect(screen.queryByRole('dialog', { name: 'Bienvenue, Aqua' })).not.toBeInTheDocument()
  })
})
