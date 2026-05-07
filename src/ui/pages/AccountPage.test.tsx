import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'bun:test'
import { GameContext } from '../../app/GameContext'
import { createDefaultProfile } from '../../domain/progression/profile'
import { AccountPage } from './AccountPage'

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>

function createContextValue(overrides: Partial<GameContextValue> = {}): GameContextValue {
  const profile = createDefaultProfile()
  return {
    profile,
    storedProfiles: {
      activeProfileId: 'profile-1',
      profiles: [
        {
          id: 'profile-1',
          playerName: profile.playerName,
          gold: profile.gold,
          played: profile.stats.played,
          wins: profile.stats.won,
          isActive: true,
        },
      ],
    },
    currentMatch: null,
    lastMatchSummary: null,
    startMatch: () => {
      throw new Error('Not implemented in test.')
    },
    selectDeckSlot: () => {
      throw new Error('Not implemented in test.')
    },
    renamePlayer: () => {
      throw new Error('Not implemented in test.')
    },
    setAudioEnabled: () => {
      throw new Error('Not implemented in test.')
    },
    renameDeckSlot: () => {
      throw new Error('Not implemented in test.')
    },
    toggleDeckSlotCard: () => {
      throw new Error('Not implemented in test.')
    },
    setDeckSlotMode: () => {
      throw new Error('Not implemented in test.')
    },
    setDeckSlotRules: () => {
      throw new Error('Not implemented in test.')
    },
    updateCurrentMatch: () => {
      throw new Error('Not implemented in test.')
    },
    finalizeCurrentMatch: () => {
      throw new Error('Not implemented in test.')
    },
    clearLastMatchSummary: () => {
      throw new Error('Not implemented in test.')
    },
    purchaseShopPack: () => {
      throw new Error('Not implemented in test.')
    },
    openOwnedPack: () => {
      throw new Error('Not implemented in test.')
    },
    buySpecialPack: () => {
      throw new Error('Not implemented in test.')
    },
    addTestGold: () => {
      throw new Error('Not implemented in test.')
    },
    createStoredProfile: () => {
      throw new Error('Not implemented in test.')
    },
    switchStoredProfile: () => {
      throw new Error('Not implemented in test.')
    },
    deleteStoredProfile: () => {
      throw new Error('Not implemented in test.')
    },
    resetProfile: () => {
      throw new Error('Not implemented in test.')
    },
    ...overrides,
  }
}

function renderAccountPage(overrides: Partial<GameContextValue> = {}) {
  return render(
    <MemoryRouter>
      <GameContext.Provider value={createContextValue(overrides)}>
        <AccountPage />
      </GameContext.Provider>
    </MemoryRouter>,
  )
}

describe('AccountPage', () => {
  test('keeps account page local-only for now', () => {
    renderAccountPage()

    expect(screen.queryByTestId('account-cloud-section')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Mot de passe')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Connexion' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Créer un compte' })).not.toBeInTheDocument()
    expect(screen.getByTestId('account-local-profile-section')).toBeInTheDocument()
    expect(screen.getByTestId('account-profiles-block')).toBeInTheDocument()
    expect(screen.getByTestId('account-danger-zone')).toBeInTheDocument()
  })

  test('renames the local player profile', async () => {
    const user = userEvent.setup()
    const renamePlayer = vi.fn(() => ({ valid: true }))

    renderAccountPage({ renamePlayer })

    await user.clear(screen.getByTestId('account-player-name-input'))
    await user.type(screen.getByTestId('account-player-name-input'), 'Alice')
    await user.click(screen.getByTestId('account-player-name-submit'))

    expect(renamePlayer).toHaveBeenCalledWith('Alice')
  })

  test('toggles local audio setting from account page', async () => {
    const user = userEvent.setup()
    const setAudioEnabled = vi.fn()
    const profile = createDefaultProfile()
    profile.settings.audioEnabled = true

    renderAccountPage({ profile, setAudioEnabled })

    expect(screen.getByTestId('account-audio-state')).toHaveTextContent('Les effets sonores sont activés.')

    await user.click(screen.getByTestId('account-audio-toggle'))

    expect(setAudioEnabled).toHaveBeenCalledWith(false)
  })

  test('creates a new tester profile from account page', async () => {
    const user = userEvent.setup()
    const createStoredProfile = vi.fn(() => ({ valid: true }))

    renderAccountPage({ createStoredProfile })

    await user.type(screen.getByTestId('account-profile-create-input'), 'Bob')
    await user.click(screen.getByTestId('account-profile-create-submit'))

    expect(createStoredProfile).toHaveBeenCalledWith('Bob')
  })

  test('switches to another stored profile from account page', async () => {
    const user = userEvent.setup()
    const switchStoredProfile = vi.fn()
    const profile = createDefaultProfile()
    profile.playerName = 'Host'

    renderAccountPage({
      profile,
      storedProfiles: {
        activeProfileId: 'host',
        profiles: [
          {
            id: 'host',
            playerName: 'Host',
            gold: 120,
            played: 5,
            wins: 3,
            isActive: true,
          },
          {
            id: 'alice',
            playerName: 'Alice',
            gold: 80,
            played: 2,
            wins: 1,
            isActive: false,
          },
        ],
      },
      switchStoredProfile,
    })

    await user.click(screen.getByRole('button', { name: 'Changer' }))

    expect(switchStoredProfile).toHaveBeenCalledWith('alice')
  })

  test('shows local validation error when creating invalid tester profile', async () => {
    const user = userEvent.setup()
    const createStoredProfile = vi.fn(() => ({ valid: false, reason: 'Invalid profile name.' }))

    renderAccountPage({ createStoredProfile })

    await user.type(screen.getByTestId('account-profile-create-input'), '   ')
    await user.click(screen.getByTestId('account-profile-create-submit'))

    expect(screen.getByText('Invalid profile name.')).toBeInTheDocument()
  })

  test('resets local profile from danger zone confirmation', async () => {
    const user = userEvent.setup()
    const resetProfile = vi.fn()

    renderAccountPage({ resetProfile })

    await user.click(screen.getByTestId('account-reset-trigger'))
    await user.click(screen.getByTestId('account-reset-confirm'))

    expect(resetProfile).toHaveBeenCalledTimes(1)
  })
})
