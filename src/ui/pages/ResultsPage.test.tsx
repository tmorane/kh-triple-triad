import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { GameContext } from '../../app/GameContext'
import { createDefaultProfile } from '../../domain/progression/profile'
import { ResultsPage } from './ResultsPage'

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>

function renderResults(value: GameContextValue) {
  return render(
    <MemoryRouter initialEntries={['/results']}>
      <GameContext.Provider value={value}>
        <ResultsPage />
      </GameContext.Provider>
    </MemoryRouter>,
  )
}

function buildContext(queue: 'normal' | 'ranked'): GameContextValue {
  const profile = createDefaultProfile()

  return {
    profile,
    currentMatch: null,
    lastMatchSummary: {
      queue,
      result: {
        winner: 'player',
        playerCount: 6,
        cpuCount: 3,
        turns: 9,
        rules: { open: true, same: false, plus: false },
      },
      rewards: {
        goldAwarded: 60,
        bonusGoldFromDuplicate: 0,
        bonusGoldFromDifficulty: 28,
        bonusGoldFromCriticalVictory: 0,
        bonusGoldFromAutoDeck: 0,
        criticalVictory: false,
        droppedCardId: 'c41',
        duplicateConverted: false,
        newlyUnlockedAchievements: [],
      },
      newlyOwnedCards: ['c41'],
      opponent: {
        level: 8,
        aiProfile: 'expert',
        scoreRange: { min: 156, max: 183 },
        deckScore: 160,
        winGoldBonus: 28,
      },
      rankedUpdate:
        queue === 'ranked'
          ? {
              previous: {
                ...profile.ranked,
                tier: 'iron',
                division: 'IV',
                lp: 95,
              },
              next: {
                ...profile.ranked,
                tier: 'iron',
                division: 'III',
                lp: 15,
              },
              deltaLp: 20,
              promoted: true,
              demoted: false,
            }
          : null,
    },
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
  }
}

function buildContextWithCriticalVictory(criticalVictory: boolean, bonusGoldFromCriticalVictory: number): GameContextValue {
  const context = buildContext('normal')
  if (!context.lastMatchSummary) {
    throw new Error('Expected lastMatchSummary in test fixture.')
  }

  return {
    ...context,
    lastMatchSummary: {
      ...context.lastMatchSummary,
      result: {
        ...context.lastMatchSummary.result,
        playerCount: criticalVictory ? 9 : 6,
        cpuCount: criticalVictory ? 0 : 3,
      },
      rewards: {
        ...context.lastMatchSummary.rewards,
        criticalVictory,
        bonusGoldFromCriticalVictory,
      },
    },
  }
}

function buildContextWithoutClaimedCard(): GameContextValue {
  const context = buildContext('normal')
  if (!context.lastMatchSummary) {
    throw new Error('Expected lastMatchSummary in test fixture.')
  }

  return {
    ...context,
    lastMatchSummary: {
      ...context.lastMatchSummary,
      result: {
        ...context.lastMatchSummary.result,
        winner: 'draw',
      },
      rewards: {
        ...context.lastMatchSummary.rewards,
        droppedCardId: null,
      },
      newlyOwnedCards: [],
    },
  }
}

describe('ResultsPage ranked section', () => {
  test('shows ranked LP block for ranked queue', () => {
    renderResults(buildContext('ranked'))

    expect(screen.getByText('Queue: Ranked')).toBeInTheDocument()
    expect(screen.getByText(/\+20 LP/)).toBeInTheDocument()
  })

  test('hides ranked LP block for normal queue', () => {
    renderResults(buildContext('normal'))

    expect(screen.getByText('Queue: Normal')).toBeInTheDocument()
    expect(screen.queryByText('Ranked LP')).not.toBeInTheDocument()
  })
})

describe('ResultsPage critical victory', () => {
  test('shows critical victory badge and critical gold details', () => {
    renderResults(buildContextWithCriticalVictory(true, 22))

    expect(screen.getByText('Critical Victory')).toBeInTheDocument()
    expect(screen.getByText(/\+22 critical/)).toBeInTheDocument()
  })

  test('hides critical victory badge and critical details when not critical', () => {
    renderResults(buildContextWithCriticalVictory(false, 0))

    expect(screen.queryByText('Critical Victory')).not.toBeInTheDocument()
    expect(screen.queryByText(/\+0 critical/)).not.toBeInTheDocument()
  })
})

describe('ResultsPage claimed card summary', () => {
  test('shows claimed card details when one card was captured', () => {
    renderResults(buildContext('normal'))

    expect(screen.getByText('Claimed Card')).toBeInTheDocument()
    expect(screen.getByText('Claimed card: C41')).toBeInTheDocument()
  })

  test('shows no-claim message when no card is awarded', () => {
    renderResults(buildContextWithoutClaimedCard())

    expect(screen.getByText('Claimed Card')).toBeInTheDocument()
    expect(screen.getByText('No card claimed this match.')).toBeInTheDocument()
  })
})
