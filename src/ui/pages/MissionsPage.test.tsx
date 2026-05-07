import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'bun:test'
import { GameContext } from '../../app/GameContext'
import { createDefaultProfile } from '../../domain/progression/profile'
import { MissionsPage } from './MissionsPage'

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>

function createContextValue(overrides: Partial<GameContextValue> = {}): GameContextValue {
  const profile = createDefaultProfile()

  const baseContextValue: GameContextValue = {
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
    addTestOr: () => {
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
  }

  return {
    ...baseContextValue,
    ...overrides,
    storedProfiles: overrides.storedProfiles ?? baseContextValue.storedProfiles,
  }
}

function renderMissions(valueOverrides: Partial<GameContextValue> = {}) {
  return render(
    <MemoryRouter>
      <GameContext.Provider value={createContextValue(valueOverrides)}>
        <MissionsPage />
      </GameContext.Provider>
    </MemoryRouter>,
  )
}

describe('MissionsPage', () => {
  test('renders six mission cards with default progress', () => {
    renderMissions()

    expect(screen.getByRole('heading', { name: 'Missions' })).toBeInTheDocument()
    expect(screen.getByTestId('missions-summary')).toHaveTextContent('0/6 terminées')
    expect(screen.getByTestId('missions-progress-m1_type_specialist')).toHaveTextContent('0/5')
    expect(screen.getByTestId('missions-progress-m2_combo_practitioner')).toHaveTextContent('0/6')
    expect(screen.getByTestId('missions-progress-m3_corner_tactician')).toHaveTextContent('0/12')
    expect(screen.getByTestId('missions-progress-b1_win_streak')).toHaveTextContent('0/5')
    expect(screen.getByTestId('missions-progress-b2_match_grinder')).toHaveTextContent('0/25')
    expect(screen.getByTestId('missions-progress-b3_collection_hunter')).toHaveTextContent('0/30')
  })

  test('renders claim action on completed mission and calls context', async () => {
    const user = userEvent.setup()
    const claimMission = vi.fn(() => ({ valid: true }))
    const profile = createDefaultProfile()
    profile.missions.m1_type_specialist.progress = 5
    profile.missions.m1_type_specialist.completed = true

    renderMissions({ profile, claimMission })

    const claimButton = screen.getByTestId('missions-claim-m1_type_specialist')
    await user.click(claimButton)

    expect(claimMission).toHaveBeenCalledWith('m1_type_specialist')
    expect(screen.getByTestId('missions-feedback')).toHaveTextContent('Récompense récupérée. Nouvelle mission lancée.')
  })

  test('shows reward history note when mission reward was already granted before reset', () => {
    const profile = createDefaultProfile()
    profile.missionRewardsGrantedById.m1_type_specialist = true

    renderMissions({ profile })

    expect(screen.getByTestId('missions-reward-history-m1_type_specialist')).toHaveTextContent(
      'Récompense déjà accordée avant réinitialisation.',
    )
  })
})
