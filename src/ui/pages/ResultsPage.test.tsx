import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'bun:test'
import { GameContext } from '../../app/GameContext'
import { createDefaultProfile } from '../../domain/progression/profile'
import type { TowerRelicRewardOffer } from '../../domain/tower/types'
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

function buildContext(queue: 'normal' | 'ranked' | 'tower'): GameContextValue {
  const profile = createDefaultProfile()
  if (queue !== 'tower') {
    profile.cardFragmentsById.c41 = 1
  }
  const towerRelics = {
    golden_pass: 0,
    initiative_core: 0,
    boss_breaker: 0,
    stabilizer: 0,
    deep_pockets: 0,
    draft_chisel: 0,
    high_risk_token: 0,
  }
  const towerPendingReward: TowerRelicRewardOffer | null =
    queue === 'tower'
      ? {
          kind: 'relic' as const,
          floor: 3,
          choices: [
            { id: 'golden_pass' as const, title: 'Golden Pass', description: '+15% gold' },
            { id: 'stabilizer' as const, title: 'Stabilizer', description: '-1 non-boss score bonus' },
            { id: 'initiative_core' as const, title: 'Initiative Core', description: 'Start first' },
          ] as [
            TowerRelicRewardOffer['choices'][0],
            TowerRelicRewardOffer['choices'][1],
            TowerRelicRewardOffer['choices'][2],
          ],
        }
      : null

  return {
    profile,
    towerRun:
      queue === 'tower'
        ? {
            mode: '4x4',
            floor: 4,
            checkpointFloor: 0,
            deck: profile.deckSlots[0].cards4x4,
            relics: towerRelics,
            pendingRewards: towerPendingReward ? [towerPendingReward] : [],
            seed: 1234,
          }
        : null,
    towerProgress:
      queue === 'tower'
        ? {
            bestFloor: 3,
            checkpointFloor: 0,
            highestClearedFloor: 0,
            clearedFloor100: false,
          }
        : undefined,
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
    lastMatchSummary: {
      queue,
      result: {
        mode: queue === 'tower' ? '4x4' : '3x3',
        winner: 'player',
        playerCount: queue === 'tower' ? 10 : 6,
        cpuCount: queue === 'tower' ? 6 : 3,
        turns: queue === 'tower' ? 16 : 9,
        rules: { open: true, same: false, plus: false },
      },
      rewards: {
        goldAwarded: 60,
        bonusGoldFromDuplicate: 0,
        bonusGoldFromDifficulty: 28,
        bonusGoldFromComboBounty: 0,
        bonusGoldFromCleanVictory: 0,
        bonusGoldFromSecondarySynergy: 0,
        bonusGoldFromCriticalVictory: 0,
        bonusGoldFromAutoDeck: 0,
        criticalVictory: false,
        droppedCardId: queue === 'tower' ? null : 'c41',
        duplicateConverted: false,
        newlyUnlockedAchievements: [],
      },
      newlyOwnedCards: queue === 'tower' ? [] : ['c41'],
      opponent: {
        level: 8,
        aiProfile: 'expert',
        scoreRange: { min: 156, max: 183 },
        deckScore: 160,
        winGoldBonus: 28,
      },
      rankedMode: queue === 'ranked' ? '3x3' : null,
      rankedUpdate:
        queue === 'ranked'
          ? {
              previous: {
                ...profile.rankedByMode['3x3'],
                tier: 'iron',
                division: 'IV',
                lp: 95,
              },
              next: {
                ...profile.rankedByMode['3x3'],
                tier: 'iron',
                division: 'III',
                lp: 15,
              },
              deltaLp: 20,
              promoted: true,
              demoted: false,
            }
          : null,
      tower:
        queue === 'tower'
          ? {
              floor: 3,
              checkpointFloor: 0,
              status: 'continue',
              pendingReward: towerPendingReward,
              nextFloor: 4,
            }
          : undefined,
    },
    startMatch: () => {
      throw new Error('Not implemented in test.')
    },
    startTowerRun: () => {
      throw new Error('Not implemented in test.')
    },
    resumeTowerRun: () => {
      throw new Error('Not implemented in test.')
    },
    continueTowerRun: () => {
      throw new Error('Not implemented in test.')
    },
    selectTowerReward: () => {
      throw new Error('Not implemented in test.')
    },
    abandonTowerRun: () => {
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

function buildContextWithOutcome(
  winner: 'player' | 'cpu' | 'draw',
  playerCount: number,
  cpuCount: number,
): GameContextValue {
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
        winner,
        playerCount,
        cpuCount,
      },
      rewards: {
        ...context.lastMatchSummary.rewards,
        droppedCardId: winner === 'player' ? context.lastMatchSummary.rewards.droppedCardId : null,
      },
      newlyOwnedCards: winner === 'player' ? context.lastMatchSummary.newlyOwnedCards : [],
    },
  }
}

describe('ResultsPage finish header', () => {
  test('shows score header and WIN outcome while hiding legacy sections', () => {
    renderResults(buildContextWithOutcome('player', 6, 3))

    expect(screen.getByTestId('results-player-score')).toHaveTextContent('6')
    expect(screen.getByTestId('results-cpu-score')).toHaveTextContent('3')
    expect(screen.getByTestId('results-outcome')).toHaveTextContent('WIN')
    expect(screen.queryByText(/^Winner:/)).not.toBeInTheDocument()
    expect(screen.queryByText('Achievements')).not.toBeInTheDocument()
    expect(screen.queryByText('New Cards')).not.toBeInTheDocument()
  })

  test('shows LOSE outcome when cpu wins', () => {
    renderResults(buildContextWithOutcome('cpu', 3, 6))

    expect(screen.getByTestId('results-outcome')).toHaveTextContent('LOSE')
  })

  test('shows DRAW outcome on tie result', () => {
    renderResults(buildContextWithOutcome('draw', 4, 4))

    expect(screen.getByTestId('results-outcome')).toHaveTextContent('DRAW')
  })
})

describe('ResultsPage ranked section', () => {
  test('shows ranked LP recap with emblem, delta, and progress for ranked queue', () => {
    renderResults(buildContext('ranked'))

    expect(screen.getByText('Queue: Ranked')).toBeInTheDocument()
    expect(screen.getByTestId('results-ranked-recap')).toBeInTheDocument()
    expect(screen.getByTestId('results-ranked-emblem')).toHaveAttribute('src', '/ranks/iron.png')
    expect(screen.getByTestId('results-ranked-delta')).toHaveTextContent('+20 LP')
    expect(screen.getByTestId('results-ranked-progress')).toHaveAttribute('role', 'progressbar')
  })

  test('hides ranked LP recap for normal queue', () => {
    renderResults(buildContext('normal'))

    expect(screen.getByText('Queue: Normal')).toBeInTheDocument()
    expect(screen.queryByTestId('results-ranked-recap')).not.toBeInTheDocument()
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

    expect(screen.getByText('Card Fragment')).toBeInTheDocument()
    expect(screen.getByText('You recovered 1 card fragment: C41.')).toBeInTheDocument()
    expect(screen.getByTestId('results-fragment-total')).toHaveTextContent('Fragment progress: 1/3')
  })

  test('shows no-claim message when no card is awarded', () => {
    renderResults(buildContextWithoutClaimedCard())

    expect(screen.getByText('Card Fragment')).toBeInTheDocument()
    expect(screen.getByText('No fragment gained this match.')).toBeInTheDocument()
  })
})

describe('ResultsPage tower flow', () => {
  test('shows tower queue labels and tower-specific claimed card copy', () => {
    renderResults(buildContext('tower'))

    expect(screen.getByText('Queue: Tower')).toBeInTheDocument()
    expect(screen.getByTestId('results-tower-summary')).toBeInTheDocument()
    expect(screen.getByText('Tower mode does not grant card fragments.')).toBeInTheDocument()
    expect(screen.getByTestId('results-tower-floor')).toHaveTextContent('Floor 3')
  })

  test('calls selectTowerReward when a reward choice is selected', async () => {
    const user = userEvent.setup()
    const context = buildContext('tower')
    const selectTowerRewardMock = vi.fn()
    context.selectTowerReward = selectTowerRewardMock as unknown as GameContextValue['selectTowerReward']

    renderResults(context)

    await user.click(screen.getByTestId('results-tower-choice-golden_pass'))

    expect(selectTowerRewardMock).toHaveBeenCalledWith('golden_pass')
  })
})
