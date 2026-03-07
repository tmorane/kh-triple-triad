import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'bun:test'
import { GameContext } from '../../app/GameContext'
import { createDefaultProfile } from '../../domain/progression/profile'
import { AchievementsPage } from './AchievementsPage'

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>

function renderAchievements(valueOverrides: Partial<GameContextValue> = {}) {
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
  }

  const contextValue: GameContextValue = {
    ...baseContextValue,
    ...valueOverrides,
    storedProfiles: valueOverrides.storedProfiles ?? baseContextValue.storedProfiles,
  }

  return render(
    <MemoryRouter>
      <GameContext.Provider value={contextValue}>
        <AchievementsPage />
      </GameContext.Provider>
    </MemoryRouter>,
  )
}

describe('AchievementsPage', () => {
  test('renders forty achievements with unlocked counter', () => {
    renderAchievements()

    expect(screen.getAllByTestId(/^achievement-item-/)).toHaveLength(40)
    expect(screen.getByRole('heading', { name: 'Succès' })).toBeInTheDocument()
    expect(screen.getByTestId('achievements-unlocked-count')).toHaveTextContent('Débloqués 0/40')
    expect(screen.getByTestId('achievements-claimable-summary')).toHaveTextContent('Récompenses claimables: 0 pack(s) commun(s)')
    expect(screen.getByTestId('achievements-claim-all-button')).toBeDisabled()
  })

  test('highlights the full card when unlocked and does not show unlock date', () => {
    const profile = createDefaultProfile()
    profile.achievements = [{ id: 'match_1', unlockedAt: '2026-02-22T10:11:12.000Z' }]

    renderAchievements({ profile })

    expect(screen.getByTestId('achievement-item-match_1')).toHaveClass('is-unlocked')
    expect(screen.getByTestId('achievement-item-match_10')).toHaveClass('is-locked')
    expect(screen.getByTestId('achievement-item-match_1')).toHaveTextContent('Jouer 1 match')
    expect(screen.getByTestId('achievement-item-match_10')).toHaveTextContent('Jouer 10 matchs')
    expect(screen.queryByText('Hover')).not.toBeInTheDocument()
    expect(screen.getByTestId('achievement-status-match_1')).toHaveClass('is-unlocked')
    expect(screen.getByTestId('achievement-status-match_10')).toHaveClass('is-locked')
    expect(screen.queryByTestId('achievement-date-match_1')).not.toBeInTheDocument()
    expect(screen.queryByText(/2026-02-22/)).not.toBeInTheDocument()
  })

  test('shows condition tooltip on hover, focus, and tap toggle', async () => {
    const user = userEvent.setup()
    renderAchievements()

    const item = screen.getByTestId('achievement-item-match_1')
    const tooltip = screen.getByTestId('achievement-tooltip-match_1')

    expect(tooltip).toHaveAttribute('hidden')

    await user.hover(item)
    expect(tooltip).not.toHaveAttribute('hidden')

    await user.unhover(item)
    expect(tooltip).toHaveAttribute('hidden')

    await user.tab()
    expect(tooltip).not.toHaveAttribute('hidden')

    await user.tab()
    expect(tooltip).toHaveAttribute('hidden')

    await user.click(item)
    expect(tooltip).not.toHaveAttribute('hidden')

    await user.click(item)
    expect(tooltip).toHaveAttribute('hidden')
  })

  test('shows global claim button with dynamic amount and calls claim action', async () => {
    const user = userEvent.setup()
    const profile = createDefaultProfile()
    profile.achievements = [
      { id: 'match_1', unlockedAt: '2026-03-02T10:00:00.000Z' },
      { id: 'win_1', unlockedAt: '2026-03-02T10:01:00.000Z' },
      { id: 'gold_250', unlockedAt: '2026-03-02T10:02:00.000Z' },
    ]
    profile.achievementRewardsClaimedById = { win_1: true }

    let called = 0
    renderAchievements({
      profile,
      claimAllAchievementRewards: () => {
        called += 1
        return { claimedCount: 2, grantedCommonPacks: 2 }
      },
    })

    expect(screen.getByTestId('achievements-claimable-summary')).toHaveTextContent('Récompenses claimables: 2 pack(s) commun(s)')

    const button = screen.getByTestId('achievements-claim-all-button')
    expect(button).toBeEnabled()
    expect(button).toHaveTextContent('Récupérer 2 pack(s) commun(s)')

    await user.click(button)
    expect(called).toBe(1)
  })
})
