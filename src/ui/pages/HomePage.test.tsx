import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'
import { GameContext } from '../../app/GameContext'
import { createDefaultProfile } from '../../domain/progression/profile'
import { HomePage } from './HomePage'

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>

function createContextValue(overrides: Partial<GameContextValue> = {}): GameContextValue {
  return {
    profile: createDefaultProfile(),
    currentMatch: null,
    lastMatchSummary: null,
    recentRankRewards: [],
    clearRecentRankRewards: () => {
      throw new Error('Not implemented in test.')
    },
    startMatch: () => {
      throw new Error('Not implemented in test.')
    },
    selectDeckSlot: () => {
      throw new Error('Not implemented in test.')
    },
    renameDeckSlot: () => {
      throw new Error('Not implemented in test.')
    },
    toggleDeckSlotCard: () => {
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
    addTestGold: () => {
      throw new Error('Not implemented in test.')
    },
    resetProfile: () => {
      throw new Error('Not implemented in test.')
    },
    ...overrides,
  }
}

describe('HomePage rank rewards banner', () => {
  test('shows rank rewards banner and lets the player dismiss it', async () => {
    const user = userEvent.setup()
    const clearRecentRankRewards = vi.fn()

    const contextValue = createContextValue({
      recentRankRewards: [
        {
          rankId: 'R2',
          rankName: 'Twilight Cadet',
          reward: {
            gold: 60,
            packs: { common: 1 },
          },
        },
      ],
      clearRecentRankRewards,
    })

    render(
      <MemoryRouter>
        <GameContext.Provider value={contextValue}>
          <HomePage />
        </GameContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('home-rank-rewards-banner')).toBeInTheDocument()
    expect(screen.getByTestId('home-rank-rewards-banner')).toHaveTextContent('Twilight Cadet')
    expect(screen.getByTestId('home-rank-rewards-banner')).toHaveTextContent('+60 gold')

    await user.click(screen.getByTestId('home-rank-rewards-dismiss'))
    expect(clearRecentRankRewards).toHaveBeenCalledTimes(1)
  })

  test('hides rank rewards banner when no rewards are pending', () => {
    const contextValue = createContextValue({
      recentRankRewards: [],
    })

    render(
      <MemoryRouter>
        <GameContext.Provider value={contextValue}>
          <HomePage />
        </GameContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.queryByTestId('home-rank-rewards-banner')).not.toBeInTheDocument()
  })
})
