import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { GameContext } from '../../app/GameContext'
import * as cloudAuth from '../../app/cloud/cloudAuth'
import * as cloudStore from '../../app/cloud/cloudProfileStore'
import { createDefaultProfile } from '../../domain/progression/profile'
import { AccountPage } from './AccountPage'

vi.mock('../../app/cloud/cloudAuth', () => ({
  isCloudAuthEnabled: vi.fn(() => true),
  getCloudSessionUser: vi.fn(async () => null),
  signInCloud: vi.fn(async () => ({ id: 'user-1', email: 'test@example.com' })),
  signUpCloud: vi.fn(async () => ({ id: 'user-1', email: 'test@example.com' })),
  signOutCloud: vi.fn(async () => undefined),
  onCloudAuthStateChange: vi.fn(() => () => undefined),
}))

vi.mock('../../app/cloud/cloudProfileStore', () => ({
  fetchCloudProfile: vi.fn(async () => null),
  saveCloudProfile: vi.fn(async () => undefined),
}))

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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(cloudAuth.isCloudAuthEnabled).mockReturnValue(true)
  vi.mocked(cloudAuth.getCloudSessionUser).mockResolvedValue(null)
  vi.mocked(cloudAuth.signInCloud).mockResolvedValue({ id: 'user-1', email: 'test@example.com' })
  vi.mocked(cloudAuth.signUpCloud).mockResolvedValue({ id: 'user-1', email: 'test@example.com' })
  vi.mocked(cloudAuth.signOutCloud).mockResolvedValue(undefined)
  vi.mocked(cloudAuth.onCloudAuthStateChange).mockReturnValue(() => undefined)
  vi.mocked(cloudStore.fetchCloudProfile).mockResolvedValue(null)
  vi.mocked(cloudStore.saveCloudProfile).mockResolvedValue(undefined)
})

describe('AccountPage', () => {
  test('submits sign-in credentials', async () => {
    const user = userEvent.setup()

    renderAccountPage()

    await waitFor(() => {
      expect(screen.queryByText('Loading cloud session...')).not.toBeInTheDocument()
    })

    await user.type(screen.getByLabelText('Email'), 'alice@example.com')
    await user.type(screen.getByLabelText('Password'), 'hunter2')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(cloudAuth.signInCloud).toHaveBeenCalledWith('alice@example.com', 'hunter2')
    })
  })

  test('uploads active local profile to cloud when connected', async () => {
    const user = userEvent.setup()
    vi.mocked(cloudAuth.getCloudSessionUser).mockResolvedValueOnce({ id: 'user-42', email: 'tester@example.com' })

    const profile = createDefaultProfile()
    profile.playerName = 'UploadMe'
    renderAccountPage({ profile })

    await waitFor(() => {
      expect(screen.getByText('Connected as tester@example.com')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Upload Local Profile' }))

    await waitFor(() => {
      expect(cloudStore.saveCloudProfile).toHaveBeenCalledWith('user-42', expect.objectContaining({ playerName: 'UploadMe' }))
    })
  })

  test('shows local profile sections when cloud auth is disabled', () => {
    vi.mocked(cloudAuth.isCloudAuthEnabled).mockReturnValue(false)

    renderAccountPage()

    expect(screen.getByText('Cloud auth is disabled for this app build.')).toBeInTheDocument()
    expect(screen.getByTestId('account-local-profile-section')).toBeInTheDocument()
    expect(screen.getByTestId('account-profiles-block')).toBeInTheDocument()
    expect(screen.getByTestId('account-danger-zone')).toBeInTheDocument()
  })

  test('renames the local player profile', async () => {
    const user = userEvent.setup()
    const renamePlayer = vi.fn(() => ({ valid: true }))

    renderAccountPage({ renamePlayer })
    await waitFor(() => {
      expect(screen.queryByText('Loading cloud session...')).not.toBeInTheDocument()
    })

    await user.clear(screen.getByTestId('account-player-name-input'))
    await user.type(screen.getByTestId('account-player-name-input'), 'Alice')
    await user.click(screen.getByTestId('account-player-name-submit'))

    expect(renamePlayer).toHaveBeenCalledWith('Alice')
  })

  test('creates a new tester profile from account page', async () => {
    const user = userEvent.setup()
    const createStoredProfile = vi.fn(() => ({ valid: true }))

    renderAccountPage({ createStoredProfile })
    await waitFor(() => {
      expect(screen.queryByText('Loading cloud session...')).not.toBeInTheDocument()
    })

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
    await waitFor(() => {
      expect(screen.queryByText('Loading cloud session...')).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Switch' }))

    expect(switchStoredProfile).toHaveBeenCalledWith('alice')
  })

  test('shows local validation error when creating invalid tester profile', async () => {
    const user = userEvent.setup()
    const createStoredProfile = vi.fn(() => ({ valid: false, reason: 'Invalid profile name.' }))

    renderAccountPage({ createStoredProfile })
    await waitFor(() => {
      expect(screen.queryByText('Loading cloud session...')).not.toBeInTheDocument()
    })

    await user.type(screen.getByTestId('account-profile-create-input'), '   ')
    await user.click(screen.getByTestId('account-profile-create-submit'))

    expect(screen.getByText('Invalid profile name.')).toBeInTheDocument()
  })

  test('resets local profile from danger zone confirmation', async () => {
    const user = userEvent.setup()
    const resetProfile = vi.fn()

    renderAccountPage({ resetProfile })
    await waitFor(() => {
      expect(screen.queryByText('Loading cloud session...')).not.toBeInTheDocument()
    })

    await user.click(screen.getByTestId('account-reset-trigger'))
    await user.click(screen.getByTestId('account-reset-confirm'))

    expect(resetProfile).toHaveBeenCalledTimes(1)
  })
})
