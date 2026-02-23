import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
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
    expect(screen.getByTestId('achievements-unlocked-count')).toHaveTextContent('Unlocked 0/40')
  })

  test('highlights the full card when unlocked and does not show unlock date', () => {
    const profile = createDefaultProfile()
    profile.achievements = [{ id: 'play_1', unlockedAt: '2026-02-22T10:11:12.000Z' }]

    renderAchievements({ profile })

    expect(screen.getByTestId('achievement-item-play_1')).toHaveClass('is-unlocked')
    expect(screen.getByTestId('achievement-item-play_3')).toHaveClass('is-locked')
    expect(screen.getByTestId('achievement-item-play_1')).toHaveTextContent('Play 1 match')
    expect(screen.getByTestId('achievement-item-play_3')).toHaveTextContent('Play 3 matches')
    expect(screen.queryByText('Hover')).not.toBeInTheDocument()
    expect(screen.getByTestId('achievement-status-play_1')).toHaveClass('is-unlocked')
    expect(screen.getByTestId('achievement-status-play_3')).toHaveClass('is-locked')
    expect(screen.queryByTestId('achievement-date-play_1')).not.toBeInTheDocument()
    expect(screen.queryByText(/2026-02-22/)).not.toBeInTheDocument()
  })

  test('shows condition tooltip on hover, focus, and tap toggle', async () => {
    const user = userEvent.setup()
    renderAchievements()

    const item = screen.getByTestId('achievement-item-play_1')
    const tooltip = screen.getByTestId('achievement-tooltip-play_1')

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
})
