import { render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { GameContext } from '../../app/GameContext'
import { createMatchRuntime } from '../../domain/match/runtimeEcs'
import type { MatchState } from '../../domain/match/types'
import { createDefaultProfile } from '../../domain/progression/profile'
import { playCriticalVictorySound } from '../audio/criticalVictorySound'
import { MatchPage } from './MatchPage'

vi.mock('../audio/criticalVictorySound', () => ({
  playCriticalVictorySound: vi.fn(),
}))

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>

const baseDeck = ['c41', 'c42', 'c43', 'c44', 'c45']

function makeFinishedState(ownerByCell: Array<'player' | 'cpu'>): MatchState {
  return {
    config: {
      playerDeck: [...baseDeck],
      cpuDeck: ['c71', 'c72', 'c73', 'c74', 'c75'],
      rules: { open: true, same: false, plus: false },
      seed: 42,
    },
    rules: { open: true, same: false, plus: false },
    turn: 'player',
    board: ownerByCell.map((owner, index) => ({ owner, cardId: `c${(index % 5) + 41}` })),
    hands: { player: [], cpu: [] },
    turns: 9,
    status: 'finished',
    lastMove: null,
  }
}

function buildContextValue(
  state: MatchState,
  queue: 'normal' | 'ranked',
  opponentLevel: 1 | 8 = 1,
  overrides: Partial<GameContextValue> = {},
): GameContextValue {
  const profile = createDefaultProfile()
  profile.ranked.lp = 95
  const isHighLevelOpponent = opponentLevel === 8

  const runtime = createMatchRuntime(state)
  return {
    profile,
    currentMatch: {
      state,
      runtime,
      queue,
      cpuDeck: [...state.config.cpuDeck],
      seed: state.config.seed,
      opponent: {
        level: opponentLevel,
        tierId: isHighLevelOpponent ? 'master' : 'iron',
        scoreRange: isHighLevelOpponent ? { min: 156, max: 183 } : { min: 45, max: 50 },
        aiProfile: isHighLevelOpponent ? 'expert' : 'novice',
        baseTargetScore: isHighLevelOpponent ? 170 : 48,
        adaptiveTargetScore: isHighLevelOpponent ? 170 : 48,
        winGoldBonus: isHighLevelOpponent ? 28 : 0,
        deck: [...state.config.cpuDeck],
        deckScore: isHighLevelOpponent ? 160 : 45,
      },
      rewardMultiplier: 1,
      usedAutoDeck: false,
    },
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

function renderMatchPageWithContext(contextValue: GameContextValue) {
  return render(
    <MemoryRouter initialEntries={['/match']}>
      <GameContext.Provider value={contextValue}>
        <MatchPage />
      </GameContext.Provider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(playCriticalVictorySound).mockReset()
})

describe('MatchPage ranked preview', () => {
  test('shows ranked LP preview for ranked matches', async () => {
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'player', 'player', 'player', 'player', 'player'])

    renderMatchPageWithContext(buildContextValue(state, 'ranked'))

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(screen.getByText('Queue: Ranked')).toBeInTheDocument()
    expect(screen.getByText('Ranked LP')).toBeInTheDocument()
  })

  test('hides ranked LP preview for normal matches', async () => {
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'player', 'player', 'player', 'player', 'cpu'])

    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(screen.getByText('Queue: Normal')).toBeInTheDocument()
    expect(screen.queryByText('Ranked LP')).not.toBeInTheDocument()
  })
})

describe('MatchPage critical victory', () => {
  test('shows critical victory badge, details, and plays sound once', async () => {
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'player', 'player', 'player', 'player', 'player'])
    const contextValue = buildContextValue(state, 'normal', 8)
    const view = renderMatchPageWithContext(contextValue)

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(screen.getByText('Critical Victory')).toBeInTheDocument()
    expect(screen.getByText(/\+22 critical/)).toBeInTheDocument()
    expect(playCriticalVictorySound).toHaveBeenCalledTimes(1)

    view.rerender(
      <MemoryRouter initialEntries={['/match']}>
        <GameContext.Provider value={contextValue}>
          <MatchPage />
        </GameContext.Provider>
      </MemoryRouter>,
    )

    expect(playCriticalVictorySound).toHaveBeenCalledTimes(1)
  })

  test('does not show critical victory or play sound on non-critical win', async () => {
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'player', 'player', 'player', 'player', 'cpu'])

    renderMatchPageWithContext(buildContextValue(state, 'normal', 8))

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(screen.queryByText('Critical Victory')).not.toBeInTheDocument()
    expect(playCriticalVictorySound).not.toHaveBeenCalled()
  })
})

describe('MatchPage claimed card selection', () => {
  test('victory requires selecting one cpu card before continuing and passes selected card to finalize', async () => {
    const finalizeMock = vi.fn()
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'player', 'player', 'player', 'player', 'cpu'])
    const contextValue = buildContextValue(state, 'normal', 8, {
      finalizeCurrentMatch: finalizeMock as unknown as GameContextValue['finalizeCurrentMatch'],
    })

    renderMatchPageWithContext(contextValue)

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(screen.getByText('Choose 1 opponent card to claim')).toBeInTheDocument()
    expect(screen.getAllByTestId(/^match-claim-card-/)).toHaveLength(5)
    expect(screen.getByTestId('finish-match-button')).toBeDisabled()

    await waitFor(() => {
      expect(screen.getByTestId('match-claim-card-c71')).toBeInTheDocument()
    })
    screen.getByTestId('match-claim-card-c71').click()

    expect(screen.getByTestId('finish-match-button')).toBeEnabled()

    screen.getByTestId('finish-match-button').click()
    expect(finalizeMock).toHaveBeenCalledTimes(1)
    expect(finalizeMock).toHaveBeenCalledWith('c71')
  })

  test('draw/loss results do not show claim selector and continue stays enabled', async () => {
    const state = makeFinishedState(['cpu', 'cpu', 'cpu', 'cpu', 'cpu', 'cpu', 'player', 'player', 'player'])
    renderMatchPageWithContext(buildContextValue(state, 'normal', 8))

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(screen.queryByText('Choose 1 opponent card to claim')).not.toBeInTheDocument()
    expect(screen.queryAllByTestId(/^match-claim-card-/)).toHaveLength(0)
    expect(screen.getByTestId('finish-match-button')).toBeEnabled()
  })
})
