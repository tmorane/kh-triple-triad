import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useMemo, useState, type ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, beforeEach, describe, expect, mock, test, vi } from 'bun:test'
import { GameContext } from '../../app/GameContext'
import { cardPool } from '../../domain/cards/cardPool'
import { createMatchRuntime } from '../../domain/match/runtimeEcs'
import type { TutorialStep } from '../../domain/match/tutorialScenarios'
import type { MatchState } from '../../domain/match/types'
import { createDefaultProfile } from '../../domain/progression/profile'
import { playCriticalVictorySound } from '../audio/criticalVictorySound'
import { MatchPage } from './MatchPage'

vi.mock('../audio/criticalVictorySound', () => ({
  playCriticalVictorySound: vi.fn(),
}))

type GameContextValue = NonNullable<ComponentProps<typeof GameContext.Provider>['value']>

const baseDeck = ['c41', 'c42', 'c43', 'c44', 'c45']
const cardPoolIds = cardPool.map((card) => card.id)
const baseDeck4x4 = cardPoolIds.slice(0, 8)
const cpuDeck4x4 = cardPoolIds.slice(8, 16)

function createEmptyRelics() {
  return {
    golden_pass: 0,
    initiative_core: 0,
    boss_breaker: 0,
    stabilizer: 0,
    deep_pockets: 0,
    draft_chisel: 0,
    high_risk_token: 0,
  }
}

function createEmptyTypeSynergy() {
  return {
    player: { primaryTypeId: null, secondaryTypeId: null },
    cpu: { primaryTypeId: null, secondaryTypeId: null },
  } as const
}

function createEmptyMetrics() {
  return {
    playsByActor: { player: 0, cpu: 0 },
    samePlusTriggersByActor: { player: 0, cpu: 0 },
    cornerPlaysByActor: { player: 0, cpu: 0 },
  } as const
}

function makeFinishedState(ownerByCell: Array<'player' | 'cpu'>): MatchState {
  return {
    config: {
      playerDeck: [...baseDeck],
      cpuDeck: ['c71', 'c72', 'c73', 'c74', 'c75'],
      mode: '3x3',
      rules: { open: true, same: false, plus: false },
      seed: 42,
    },
    rules: { open: true, same: false, plus: false },
    typeSynergy: createEmptyTypeSynergy(),
    metrics: createEmptyMetrics(),
    turn: 'player',
    board: ownerByCell.map((owner, index) => ({ owner, cardId: `c${(index % 5) + 41}` })),
    hands: { player: [], cpu: [] },
    turns: 9,
    status: 'finished',
    lastMove: null,
  }
}

function makeActiveCpuTurnState(): MatchState {
  return {
    config: {
      playerDeck: [...baseDeck],
      cpuDeck: ['c71', 'c72', 'c73', 'c74', 'c75'],
      mode: '3x3',
      rules: { open: true, same: false, plus: false },
      seed: 42,
    },
    rules: { open: true, same: false, plus: false },
    typeSynergy: createEmptyTypeSynergy(),
    metrics: createEmptyMetrics(),
    turn: 'cpu',
    board: [{ owner: 'player', cardId: 'c41' }, null, null, null, null, null, null, null, null],
    hands: { player: ['c42', 'c43', 'c44', 'c45'], cpu: ['c71', 'c72', 'c73', 'c74', 'c75'] },
    turns: 1,
    status: 'active',
    lastMove: { actor: 'player', cardId: 'c41', cell: 0 },
  }
}

function makeActivePlayerTurnState(): MatchState {
  return {
    config: {
      playerDeck: [...baseDeck],
      cpuDeck: ['c71', 'c72', 'c73', 'c74', 'c75'],
      mode: '3x3',
      rules: { open: true, same: false, plus: false },
      seed: 42,
    },
    rules: { open: true, same: false, plus: false },
    typeSynergy: createEmptyTypeSynergy(),
    metrics: createEmptyMetrics(),
    turn: 'player',
    board: [{ owner: 'cpu', cardId: 'c71' }, null, null, null, null, null, null, null, null],
    hands: { player: ['c42', 'c43', 'c44', 'c45'], cpu: ['c72', 'c73', 'c74', 'c75'] },
    turns: 1,
    status: 'active',
    lastMove: { actor: 'cpu', cardId: 'c71', cell: 0 },
  }
}

function makeActivePlayerTurnStateWithCapture(): MatchState {
  return {
    config: {
      playerDeck: ['c110', 'c42', 'c43', 'c44', 'c45'],
      cpuDeck: ['c11', 'c72', 'c73', 'c74', 'c75'],
      mode: '3x3',
      rules: { open: true, same: false, plus: false },
      seed: 999,
    },
    rules: { open: true, same: false, plus: false },
    typeSynergy: createEmptyTypeSynergy(),
    metrics: createEmptyMetrics(),
    turn: 'player',
    board: [{ owner: 'cpu', cardId: 'c11' }, null, null, null, null, null, null, null, null],
    hands: { player: ['c110'], cpu: ['c72', 'c73', 'c74', 'c75'] },
    turns: 1,
    status: 'active',
    lastMove: { actor: 'cpu', cardId: 'c11', cell: 0 },
  }
}

function makeActivePlayerTurnStateWithWaterCastAnimation(): MatchState {
  const state = attachEffectsState(makeActivePlayerTurnState(), {
    strictPowerTargeting: true,
    usedOnPoseByActor: { player: {}, cpu: {} },
  })
  state.hands.player = ['c03']
  state.board = Array.from({ length: 9 }, () => null)
  state.lastMove = null
  return state
}

function makeActivePlayerTurnStateWithFloodPenaltyAnimation(): MatchState {
  const state = attachEffectsState(makeActivePlayerTurnState(), {
    strictPowerTargeting: false,
    usedOnPoseByActor: { player: {}, cpu: {} },
    floodedCell: 4,
  })
  state.hands.player = ['c43']
  state.board = [null, null, null, null, null, { owner: 'cpu', cardId: 'c71' }, null, null, null]
  state.lastMove = { actor: 'cpu', cardId: 'c71', cell: 5 }
  return state
}

function makeActivePlayerTurnStateWithGlaceCastAnimation(): MatchState {
  const state = attachEffectsState(makeActivePlayerTurnState(), {
    strictPowerTargeting: true,
    usedOnPoseByActor: { player: {}, cpu: {} },
  })
  state.hands.player = ['c134']
  state.board = Array.from({ length: 9 }, () => null)
  state.lastMove = null
  return state
}

function makeActivePlayerTurnStateWithSolCastAnimation(): MatchState {
  const state = attachEffectsState(makeActivePlayerTurnState(), {
    strictPowerTargeting: false,
    usedOnPoseByActor: { player: {}, cpu: {} },
  })
  state.hands.player = ['c45']
  state.board = [null, null, null, null, null, { owner: 'cpu', cardId: 'c71' }, null, null, null]
  state.lastMove = { actor: 'cpu', cardId: 'c71', cell: 5 }
  return state
}

function makeActivePlayerTurnStateWithFireCastAnimation(): MatchState {
  const state = attachEffectsState(makeActivePlayerTurnState(), {
    strictPowerTargeting: true,
    usedOnPoseByActor: { player: {}, cpu: {} },
  })
  state.hands.player = ['c02']
  state.board = [null, { owner: 'cpu', cardId: 'c71' }, null, null, null, null, null, null, null]
  state.lastMove = null
  return state
}

function makeActivePlayerTurnStateWithFireKeyboardTargeting(): MatchState {
  const state = attachEffectsState(makeActivePlayerTurnState(), {
    strictPowerTargeting: true,
    usedOnPoseByActor: { player: {}, cpu: {} },
  })
  state.hands.player = ['c02']
  state.board = [null, { owner: 'cpu', cardId: 'c71' }, null, null, null, null, null, { owner: 'cpu', cardId: 'c72' }, null]
  state.lastMove = null
  return state
}

function makeActivePlayerTurnStateWithFireNonTargetOccupiedCell(): MatchState {
  const state = attachEffectsState(makeActivePlayerTurnState(), {
    strictPowerTargeting: true,
    usedOnPoseByActor: { player: {}, cpu: {} },
  })
  state.hands.player = ['c02']
  state.board = [{ owner: 'cpu', cardId: 'c72' }, { owner: 'cpu', cardId: 'c71' }, null, null, null, null, null, null, null]
  state.lastMove = null
  return state
}

function makeActivePlayerTurnStateWithFrozenBlockedCell(): MatchState {
  const state = attachEffectsState(makeActivePlayerTurnState(), {
    strictPowerTargeting: false,
    usedOnPoseByActor: { player: {}, cpu: {} },
    frozenCellByActor: { player: { cell: 4, turnsRemaining: 2 } },
  })
  state.hands.player = ['c43']
  state.board = Array.from({ length: 9 }, () => null)
  state.lastMove = null
  return state
}

function makeActiveCpuTurnStateWithCapture(): MatchState {
  return {
    config: {
      playerDeck: ['c11', 'c42', 'c43', 'c44', 'c45'],
      cpuDeck: ['c110', 'c72', 'c73', 'c74', 'c75'],
      mode: '3x3',
      rules: { open: true, same: false, plus: false },
      seed: 1000,
    },
    rules: { open: true, same: false, plus: false },
    typeSynergy: createEmptyTypeSynergy(),
    metrics: createEmptyMetrics(),
    turn: 'cpu',
    board: [
      { owner: 'player', cardId: 'c11' },
      null,
      { owner: 'cpu', cardId: 'c72' },
      { owner: 'cpu', cardId: 'c73' },
      { owner: 'cpu', cardId: 'c74' },
      { owner: 'cpu', cardId: 'c75' },
      { owner: 'cpu', cardId: 'c72' },
      { owner: 'cpu', cardId: 'c73' },
      { owner: 'cpu', cardId: 'c74' },
    ],
    hands: { player: [], cpu: ['c110'] },
    turns: 8,
    status: 'active',
    lastMove: { actor: 'player', cardId: 'c11', cell: 0 },
  }
}

function makeActivePlayerTurnStateWithBlockedCells(): MatchState {
  return {
    config: {
      playerDeck: [...baseDeck],
      cpuDeck: ['c71', 'c72', 'c73', 'c74', 'c75'],
      mode: '3x3',
      rules: { open: true, same: false, plus: false },
      seed: 42,
    },
    rules: { open: true, same: false, plus: false },
    typeSynergy: createEmptyTypeSynergy(),
    metrics: createEmptyMetrics(),
    turn: 'player',
    board: [
      { owner: 'cpu', cardId: 'c71' },
      null,
      { owner: 'cpu', cardId: 'c72' },
      null,
      { owner: 'cpu', cardId: 'c73' },
      null,
      null,
      null,
      null,
    ],
    hands: { player: ['c42', 'c43', 'c44', 'c45'], cpu: ['c74', 'c75'] },
    turns: 2,
    status: 'active',
    lastMove: { actor: 'cpu', cardId: 'c73', cell: 4 },
  }
}

function makeActivePlayerTurnState4x4(): MatchState {
  if (baseDeck4x4.length < 8 || cpuDeck4x4.length < 8) {
    throw new Error('Expected at least 16 cards in the card pool for 4x4 test fixtures.')
  }

  return {
    config: {
      playerDeck: [...baseDeck4x4],
      cpuDeck: [...cpuDeck4x4],
      mode: '4x4',
      rules: { open: true, same: false, plus: false },
      seed: 84,
    },
    rules: { open: true, same: false, plus: false },
    typeSynergy: createEmptyTypeSynergy(),
    metrics: createEmptyMetrics(),
    turn: 'player',
    board: Array.from({ length: 16 }, () => null),
    hands: { player: [...baseDeck4x4], cpu: [...cpuDeck4x4] },
    turns: 0,
    status: 'active',
    lastMove: null,
  }
}

function attachEffectsState(
  state: MatchState,
  overrides?: Partial<NonNullable<MatchState['elementState']>>,
): MatchState {
  state.elementState = {
    enabled: true,
    mode: 'effects',
    strictPowerTargeting: false,
    usedOnPoseByActor: { player: {}, cpu: {} },
    actorTurnCount: { player: 1, cpu: 1 },
    frozenCellByActor: {},
    floodedCell: null,
    poisonedHandByActor: { player: [], cpu: [] },
    boardEffectsByCell: {},
    ...(overrides ?? {}),
  }
  return state
}

function makeFinishedState4x4(ownerByCell: Array<'player' | 'cpu'>): MatchState {
  if (baseDeck4x4.length < 8 || cpuDeck4x4.length < 8) {
    throw new Error('Expected at least 16 cards in the card pool for 4x4 test fixtures.')
  }

  return {
    config: {
      playerDeck: [...baseDeck4x4],
      cpuDeck: [...cpuDeck4x4],
      mode: '4x4',
      rules: { open: true, same: false, plus: false },
      seed: 42,
    },
    rules: { open: true, same: false, plus: false },
    typeSynergy: createEmptyTypeSynergy(),
    metrics: createEmptyMetrics(),
    turn: 'player',
    board: ownerByCell.map((owner, index) => ({ owner, cardId: baseDeck4x4[index % baseDeck4x4.length]! })),
    hands: { player: [], cpu: [] },
    turns: 16,
    status: 'finished',
    lastMove: null,
  }
}

function buildContextValue(
  state: MatchState,
  queue: 'normal' | 'ranked' | 'tower' | 'tutorial',
  opponentLevel: 1 | 8 = 1,
  overrides: Partial<GameContextValue> = {},
  tutorial?: {
    scenarioId: `element-${string}` | 'intro-basics'
    title: string
    description: string
    elementId?: string
    steps: TutorialStep[]
  },
): GameContextValue {
  const profile = createDefaultProfile()
  profile.rankedByMode['3x3'].lp = 95
  profile.rankedByMode['4x4'].lp = 95
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
        tierId: isHighLevelOpponent ? 'challenger' : 'iron',
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
      tutorial,
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
    setAudioEnabled:
      overrides.setAudioEnabled ??
      (() => {
        throw new Error('Not implemented in test.')
      }),
    storedProfiles: overrides.storedProfiles ?? {
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

function renderMatchPageWithStatefulContext(
  initialState: MatchState,
  queue: 'normal' | 'ranked' | 'tower' | 'tutorial' = 'normal',
  opponentLevel: 1 | 8 = 1,
  tutorial?: {
    scenarioId: `element-${string}` | 'intro-basics'
    title: string
    description: string
    elementId?: string
    steps: TutorialStep[]
  },
) {
  function MatchPageHarness() {
    const [state, setState] = useState(initialState)
    const contextValue = useMemo(
      () =>
        buildContextValue(
          state,
          queue,
          opponentLevel,
          {
            updateCurrentMatch: ((nextState) => setState(nextState)) as unknown as GameContextValue['updateCurrentMatch'],
          },
          tutorial,
        ),
      [state],
    )

    return (
      <MemoryRouter initialEntries={['/match']}>
        <GameContext.Provider value={contextValue}>
          <MatchPage />
        </GameContext.Provider>
      </MemoryRouter>
    )
  }

  return render(<MatchPageHarness />)
}

beforeEach(() => {
  vi.mocked(playCriticalVictorySound).mockReset()
})

afterAll(() => {
  mock.restore()
})

describe('MatchPage ranked preview', () => {
  test('hides CPU hand details when Open rule is disabled', () => {
    const state = makeActivePlayerTurnState()
    state.config.rules.open = false
    state.rules.open = false

    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    expect(screen.getByRole('heading', { name: 'CPU Hand (Hidden)' })).toBeInTheDocument()
    const cpuHand = screen.getByLabelText('CPU hand')
    expect(within(cpuHand).getAllByLabelText(/^Locked card /i).length).toBeGreaterThan(0)
  })

  test('shows ranked LP recap with emblem, delta, and progress for ranked matches', async () => {
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'player', 'player', 'player', 'player', 'player'])

    renderMatchPageWithContext(buildContextValue(state, 'ranked'))

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(screen.getByText('Queue: Ranked')).toBeInTheDocument()
    expect(screen.getByTestId('match-ranked-recap')).toBeInTheDocument()
    expect(screen.getByTestId('match-ranked-emblem')).toHaveAttribute('src', '/ranks/iron.png')
    expect(screen.getByTestId('match-ranked-delta')).toHaveTextContent('+60 LP')
    expect(screen.getByTestId('match-ranked-progress')).toHaveAttribute('role', 'progressbar')
  })

  test('hides ranked LP recap for normal matches', async () => {
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'player', 'player', 'player', 'player', 'cpu'])

    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(screen.getByText('Queue: Normal')).toBeInTheDocument()
    expect(screen.queryByTestId('match-ranked-recap')).not.toBeInTheDocument()
  })
})

describe('MatchPage finish header', () => {
  test('shows score header and WIN outcome while hiding legacy sections', async () => {
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'player', 'player', 'player', 'player', 'player'])

    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(screen.getByTestId('match-finish-player-score')).toHaveTextContent('9')
    expect(screen.getByTestId('match-finish-cpu-score')).toHaveTextContent('0')
    expect(screen.getByTestId('match-finish-outcome')).toHaveTextContent('WIN')
    expect(screen.queryByText('Match Finished')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Winner:/)).not.toBeInTheDocument()
    expect(screen.queryByText('Achievements')).not.toBeInTheDocument()
    expect(screen.queryByText('New Cards')).not.toBeInTheDocument()
  })

  test('shows LOSE outcome when cpu wins', async () => {
    const state = makeFinishedState(['cpu', 'cpu', 'cpu', 'cpu', 'cpu', 'cpu', 'player', 'player', 'player'])

    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(screen.getByTestId('match-finish-outcome')).toHaveTextContent('LOSE')
  })

  test('shows DRAW outcome on tie result', async () => {
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'cpu', 'cpu', 'cpu', 'cpu'])

    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(screen.getByTestId('match-finish-outcome')).toHaveTextContent('DRAW')
  })
})

describe('MatchPage turn visibility', () => {
  test('highlights player turn in hud badge, beacon and lane', () => {
    renderMatchPageWithContext(buildContextValue(makeActivePlayerTurnState(), 'normal'))

    const hud = screen.getByTestId('match-turn-indicator').closest('.match-board-hud')
    expect(hud).toHaveClass('match-board-hud--floating')
    expect(screen.getByTestId('match-turn-indicator')).toHaveAttribute('data-turn', 'player')
    expect(screen.getByTestId('match-turn-beacon')).toHaveAttribute('data-turn', 'player')
    expect(screen.getByTestId('match-turn-beacon-player')).toHaveClass('is-active')
    expect(screen.getByTestId('match-turn-beacon-cpu')).not.toHaveClass('is-active')
    expect(screen.getByTestId('match-lane-player')).toHaveClass('is-turn-active')
    expect(screen.getByTestId('match-lane-cpu')).not.toHaveClass('is-turn-active')
  })

  test('highlights cpu turn in hud badge, beacon and lane', () => {
    renderMatchPageWithContext(buildContextValue(makeActiveCpuTurnState(), 'normal'))

    expect(screen.getByTestId('match-turn-indicator')).toHaveAttribute('data-turn', 'cpu')
    expect(screen.getByTestId('match-turn-beacon')).toHaveAttribute('data-turn', 'cpu')
    expect(screen.getByTestId('match-turn-beacon-cpu')).toHaveClass('is-active')
    expect(screen.getByTestId('match-turn-beacon-player')).not.toHaveClass('is-active')
    expect(screen.getByTestId('match-lane-cpu')).toHaveClass('is-turn-active')
    expect(screen.getByTestId('match-lane-player')).not.toHaveClass('is-turn-active')
  })

  test('uses neutral rolling state during starter roll without active lane', async () => {
    renderMatchPageWithContext(buildContextValue(makeActivePlayerTurnState4x4(), 'normal'))

    await waitFor(() => {
      expect(screen.getByTestId('match-turn-indicator')).toHaveAttribute('data-turn', 'rolling')
    })
    expect(screen.getByTestId('match-turn-beacon')).toHaveAttribute('data-turn', 'rolling')
    expect(screen.getByTestId('match-turn-beacon-player')).not.toHaveClass('is-active')
    expect(screen.getByTestId('match-turn-beacon-cpu')).not.toHaveClass('is-active')
    expect(screen.getByTestId('match-lane-player')).not.toHaveClass('is-turn-active')
    expect(screen.getByTestId('match-lane-cpu')).not.toHaveClass('is-turn-active')
  })
})

describe('MatchPage gameplay capture metadata', () => {
  test('player capture applies flip state metadata on board cells', async () => {
    const user = userEvent.setup()
    renderMatchPageWithStatefulContext(makeActivePlayerTurnStateWithCapture())

    await user.click(screen.getByTestId('player-card-c110'))
    await user.click(screen.getByTestId('board-cell-1'))

    await waitFor(() => {
      const capturedCell = screen.getByTestId('board-cell-0')
      expect(capturedCell).toHaveClass('player')
      expect(capturedCell).toHaveAttribute('data-state', 'flipped')
      expect(capturedCell).toHaveAttribute('data-flip-direction', 'horizontal')
    })
  })

  test('cpu capture applies flip state metadata on board cells', async () => {
    vi.useFakeTimers()
    try {
      renderMatchPageWithStatefulContext(makeActiveCpuTurnStateWithCapture(), 'normal', 8)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_100)
      })

      await waitFor(() => {
        const capturedCell = screen.getByTestId('board-cell-0')
        expect(capturedCell).toHaveClass('cpu')
        expect(capturedCell).toHaveAttribute('data-state', 'flipped')
        expect(capturedCell).toHaveAttribute('data-flip-direction', 'horizontal')
      })
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('MatchPage tutorial guided flow', () => {
  test('blocks strict mismatch and shows guided why', async () => {
    const user = userEvent.setup()
    const state = makeActivePlayerTurnState()
    const tutorial = {
      scenarioId: 'intro-basics' as const,
      title: 'Tutoriel de base',
      description: 'Guidage strict',
      steps: [
        {
          actor: 'cpu' as const,
          move: { actor: 'cpu' as const, cardId: 'c71', cell: 0 },
          chapterId: 'lesson-1',
          chapterLabel: 'Lecon 1/3 - Controle du plateau',
          hint: 'Observe le CPU.',
          why: 'Observe la reponse.',
        },
        {
          actor: 'player' as const,
          move: { actor: 'player' as const, cardId: 'c43', cell: 4 },
          chapterId: 'lesson-1',
          chapterLabel: 'Lecon 1/3 - Controle du plateau',
          hint: 'Pose c43 au centre.',
          why: 'Le centre controle les 4 directions.',
        },
      ],
    }

    renderMatchPageWithStatefulContext(state, 'tutorial', 1, tutorial)

    await user.click(screen.getByTestId('player-card-c42'))
    await user.click(screen.getByTestId('board-cell-1'))

    expect(screen.getByTestId('match-status-message')).toHaveTextContent(
      'Action guidee: Pose c43 au centre. Pourquoi: Le centre controle les 4 directions.',
    )
    expect(screen.getByTestId('board-cell-1')).not.toHaveTextContent('Krabby')
    expect(screen.getByTestId('match-tutorial-hint')).toHaveTextContent('Pose c43 au centre.')
    expect(screen.getByTestId('match-tutorial-why')).toHaveTextContent('Le centre controle les 4 directions.')
  })

  test('accepts an alternative card when objective allows multiple card ids', async () => {
    const user = userEvent.setup()
    const state = makeActivePlayerTurnState()
    const tutorial = {
      scenarioId: 'intro-basics' as const,
      title: 'Tutoriel de base',
      description: 'Guidage souple',
      steps: [
        {
          actor: 'cpu' as const,
          move: { actor: 'cpu' as const, cardId: 'c71', cell: 0 },
          chapterId: 'lesson-1',
          chapterLabel: 'Lecon 1/3 - Controle du plateau',
          hint: 'Observe le CPU.',
          why: 'Observe la reponse.',
        },
        {
          actor: 'player' as const,
          move: { actor: 'player' as const, cardId: 'c43', cell: 4 },
          chapterId: 'lesson-1',
          chapterLabel: 'Lecon 1/3 - Controle du plateau',
          hint: 'Pose au centre.',
          why: 'Le centre donne du controle.',
          objective: {
            allowedCells: [4],
            allowedCardIds: ['c42', 'c43'],
          },
        },
      ],
    }

    renderMatchPageWithStatefulContext(state, 'tutorial', 1, tutorial)

    await user.click(screen.getByTestId('player-card-c42'))
    await user.click(screen.getByTestId('board-cell-4'))

    expect(screen.getByTestId('board-cell-4')).toHaveClass('player')
    expect(screen.getByTestId('match-status-message')).toHaveTextContent('')
  })

  test('shows explanatory guided error and highlights objective cell on wrong cell click', async () => {
    const user = userEvent.setup()
    const state = makeActivePlayerTurnState()
    const tutorial = {
      scenarioId: 'intro-basics' as const,
      title: 'Tutoriel de base',
      description: 'Guidage souple',
      steps: [
        {
          actor: 'cpu' as const,
          move: { actor: 'cpu' as const, cardId: 'c71', cell: 0 },
          chapterId: 'lesson-1',
          chapterLabel: 'Lecon 1/3 - Controle du plateau',
          hint: 'Observe le CPU.',
          why: 'Observe la reponse.',
        },
        {
          actor: 'player' as const,
          move: { actor: 'player' as const, cardId: 'c43', cell: 4 },
          chapterId: 'lesson-1',
          chapterLabel: 'Lecon 1/3 - Controle du plateau',
          hint: 'Pose au centre.',
          why: 'Le centre donne du controle.',
          objective: {
            allowedCells: [4],
            errorReason: 'Commence par le centre.',
          },
        },
      ],
    }

    renderMatchPageWithStatefulContext(state, 'tutorial', 1, tutorial)

    await user.click(screen.getByTestId('player-card-c43'))
    await user.click(screen.getByTestId('board-cell-1'))

    expect(screen.getByTestId('match-status-message')).toHaveTextContent(
      'Action guidee: Commence par le centre. Pourquoi: Le centre donne du controle.',
    )
    expect(screen.getByTestId('board-cell-4')).toHaveClass('is-highlighted')
  })

  test('disables non-allowed cards for objective step and shows chapter label', () => {
    const state = makeActivePlayerTurnState()
    const tutorial = {
      scenarioId: 'intro-basics' as const,
      title: 'Tutoriel de base',
      description: 'Guidage souple',
      steps: [
        {
          actor: 'cpu' as const,
          move: { actor: 'cpu' as const, cardId: 'c71', cell: 0 },
          chapterId: 'lesson-1',
          chapterLabel: 'Lecon 1/3 - Controle du plateau',
          hint: 'Observe le CPU.',
          why: 'Observe la reponse.',
        },
        {
          actor: 'player' as const,
          move: { actor: 'player' as const, cardId: 'c43', cell: 4 },
          chapterId: 'lesson-1',
          chapterLabel: 'Lecon 1/3 - Controle du plateau',
          hint: 'Pose au centre.',
          why: 'Le centre donne du controle.',
          objective: {
            allowedCells: [4],
            allowedCardIds: ['c43'],
          },
        },
      ],
    }

    renderMatchPageWithStatefulContext(state, 'tutorial', 1, tutorial)

    expect(screen.getByTestId('player-card-c42')).toBeDisabled()
    expect(screen.getByTestId('player-card-c44')).toBeDisabled()
    expect(screen.getByTestId('player-card-c43')).toBeEnabled()
    expect(screen.getByTestId('match-tutorial-chapter')).toHaveTextContent('Lecon 1/3 - Controle du plateau')
  })

  test('falls back to hint when strict tutorial step has no why copy', () => {
    const state = makeActiveCpuTurnState()
    state.turn = 'cpu'
    state.turns = 0
    const tutorial = {
      scenarioId: 'element-feu' as const,
      title: 'Tutoriel feu',
      description: 'Strict',
      steps: [
        {
          actor: 'cpu' as const,
          move: { actor: 'cpu' as const, cardId: 'c71', cell: 0 },
          chapterId: 'strict-demo',
          chapterLabel: 'Sequence guidee',
          hint: 'Observe le CPU.',
        },
        {
          actor: 'player' as const,
          move: { actor: 'player' as const, cardId: 'c43', cell: 4 },
          chapterId: 'strict-demo',
          chapterLabel: 'Sequence guidee',
          hint: 'Pose c43 au centre.',
          why: 'Pose c43 au centre.',
        },
      ],
    }

    renderMatchPageWithStatefulContext(state, 'tutorial', 1, tutorial)

    expect(screen.getByTestId('match-tutorial-why')).toHaveTextContent('Observe le CPU.')
  })

  test('shows forced-cell objective copy for strict steps and keeps the forced cell highlighted', () => {
    const state = makeActivePlayerTurnState()
    const tutorial = {
      scenarioId: 'element-feu' as const,
      title: 'Tutoriel feu',
      description: 'Strict',
      steps: [
        {
          actor: 'cpu' as const,
          move: { actor: 'cpu' as const, cardId: 'c71', cell: 0 },
          chapterId: 'strict-demo',
          chapterLabel: 'Sequence guidee',
          hint: 'Observe le CPU.',
          why: 'Observe la reponse.',
        },
        {
          actor: 'player' as const,
          move: { actor: 'player' as const, cardId: 'c43', cell: 4 },
          chapterId: 'strict-demo',
          chapterLabel: 'Sequence guidee',
          hint: 'Place ta carte en case 5.',
          why: 'Tu dois jouer la carte demandee pour cette etape.',
        },
      ],
    }

    renderMatchPageWithStatefulContext(state, 'tutorial', 1, tutorial)

    expect(screen.getByTestId('match-tutorial-objective')).toHaveTextContent('Case imposee (surlignee): 5')
    expect(screen.getByTestId('board-cell-4')).toHaveClass('is-highlighted')
    expect(screen.getByTestId('board-cell-4')).toHaveClass('is-tutorial-guided')
    expect(screen.getByTestId('board-cell-4-tutorial-guided')).toHaveTextContent('ICI')
  })

  test('allows feu targeting in strict tutorial steps when move target is not explicitly constrained', async () => {
    vi.useFakeTimers()
    try {
      const updateCurrentMatch = vi.fn()
      const state = makeActivePlayerTurnStateWithFireCastAnimation()
      state.turns = 1
      const tutorial = {
        scenarioId: 'element-feu' as const,
        title: 'Tutoriel feu',
        description: 'Strict',
        steps: [
          {
            actor: 'cpu' as const,
            move: { actor: 'cpu' as const, cardId: 'c71', cell: 1 },
            chapterId: 'element-intro',
            chapterLabel: 'Lecon 1/2 - Specificite feu',
            hint: 'Observe le coup CPU.',
            why: 'Le CPU te donne une cible adjacente.',
          },
          {
            actor: 'player' as const,
            move: { actor: 'player' as const, cardId: 'c02', cell: 4 },
            chapterId: 'strict-demo',
            chapterLabel: 'Sequence guidee',
            hint: 'Pose Salamèche au centre puis cible la carte ennemie.',
            why: 'Feu se lance sur une carte ennemie adjacente.',
          },
        ],
      }

      renderMatchPageWithContext(
        buildContextValue(
          state,
          'tutorial',
          1,
          {
            updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
          },
          tutorial,
        ),
      )

      fireEvent.click(screen.getByTestId('player-card-c02'))
      fireEvent.click(screen.getByTestId('board-cell-4'))
      fireEvent.click(screen.getByTestId('board-cell-1'))

      expect(screen.queryByText('Action guidee:')).not.toBeInTheDocument()
      expect(screen.getByTestId('board-cell-1')).toHaveClass('fallback-cell--fire-cast')
      expect(updateCurrentMatch).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(220)
      })

      expect(updateCurrentMatch).toHaveBeenCalledTimes(1)
      const resolvedState = updateCurrentMatch.mock.calls[0]?.[0] as MatchState
      expect(resolvedState.lastMove?.powerTarget?.targetCardCell).toBe(1)
    } finally {
      vi.useRealTimers()
    }
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

  test('does not play result sounds when audio is disabled', async () => {
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'player', 'player', 'player', 'player', 'player'])
    const contextValue = buildContextValue(state, 'normal', 8)
    contextValue.profile.settings.audioEnabled = false

    renderMatchPageWithContext(contextValue)
    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(playCriticalVictorySound).not.toHaveBeenCalled()
  })
})

describe('MatchPage claimed card selection', () => {
  test('uses the same card container classes as deck 3x3 selection', async () => {
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'player', 'player', 'player', 'player', 'cpu'])
    renderMatchPageWithContext(buildContextValue(state, 'normal', 8))

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    const claimGrid = screen.getByLabelText('Claim card selection')
    expect(claimGrid).toHaveClass('setup-selected-cards')

    const firstClaimCard = screen.getByTestId('match-claim-card-c71')
    expect(firstClaimCard).toHaveClass('setup-preview-card')
  })

  test('victory requires selecting one cpu card before continuing and passes selected card to finalize', async () => {
    const user = userEvent.setup()
    const finalizeMock = vi.fn()
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'player', 'player', 'player', 'player', 'cpu'])
    const contextValue = buildContextValue(state, 'normal', 8, {
      finalizeCurrentMatch: finalizeMock as unknown as GameContextValue['finalizeCurrentMatch'],
    })

    renderMatchPageWithContext(contextValue)

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(screen.getByText('Choose 1 opponent card to recover 1 fragment (not a full card)')).toBeInTheDocument()
    expect(screen.getAllByTestId(/^match-claim-card-/)).toHaveLength(5)
    expect(screen.getByTestId('finish-match-button')).toBeDisabled()

    await user.click(screen.getByTestId('match-claim-card-c71'))
    await waitFor(() => expect(screen.getByTestId('finish-match-button')).toBeEnabled())
    expect(screen.getByTestId('match-fragment-selection-status')).toHaveTextContent(
      'Selected: C71 - Current fragments: 0/6',
    )

    await user.click(screen.getByTestId('finish-match-button'))
    expect(finalizeMock).toHaveBeenCalledTimes(1)
    expect(finalizeMock).toHaveBeenCalledWith('c71')
  })

  test('draw/loss results do not show claim selector and continue stays enabled', async () => {
    const state = makeFinishedState(['cpu', 'cpu', 'cpu', 'cpu', 'cpu', 'cpu', 'player', 'player', 'player'])
    renderMatchPageWithContext(buildContextValue(state, 'normal', 8))

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(screen.queryByText('Choose 1 opponent card to recover 1 fragment (not a full card)')).not.toBeInTheDocument()
    expect(screen.queryAllByTestId(/^match-claim-card-/)).toHaveLength(0)
    expect(screen.getByTestId('finish-match-button')).toBeEnabled()
  })

  test('4x4 victories render 8 claim choices and still require one selection', async () => {
    const user = userEvent.setup()
    const finalizeMock = vi.fn()
    const state = makeFinishedState4x4([
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'cpu',
    ])
    const firstCpuCardId = state.config.cpuDeck[0]!
    const contextValue = buildContextValue(state, 'normal', 8, {
      finalizeCurrentMatch: finalizeMock as unknown as GameContextValue['finalizeCurrentMatch'],
    })

    renderMatchPageWithContext(contextValue)

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(screen.getAllByTestId(/^match-claim-card-/)).toHaveLength(8)
    expect(screen.getByTestId('finish-match-button')).toBeDisabled()

    await user.click(screen.getByTestId(`match-claim-card-${firstCpuCardId}`))
    await waitFor(() => expect(screen.getByTestId('finish-match-button')).toBeEnabled())

    await user.click(screen.getByTestId('finish-match-button'))
    expect(finalizeMock).toHaveBeenCalledTimes(1)
    expect(finalizeMock).toHaveBeenCalledWith(firstCpuCardId)
  })

  test('marks claim cards with a star and plus when they are not owned yet', async () => {
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'player', 'player', 'player', 'player', 'cpu'])
    renderMatchPageWithContext(buildContextValue(state, 'normal', 8))

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    const firstClaimCard = screen.getByTestId('match-claim-card-c71')
    const marker = within(firstClaimCard).getByTestId('triad-card-claim-new-marker')
    expect(within(marker).getByText('★')).toBeInTheDocument()
    expect(within(marker).getByText('+')).toBeInTheDocument()
  })

  test('does not mark already owned claim cards as NEW', async () => {
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'player', 'player', 'player', 'player', 'cpu'])
    const contextValue = buildContextValue(state, 'normal', 8)
    contextValue.profile.ownedCardIds.push('c71')
    contextValue.profile.cardCopiesById.c71 = 1

    renderMatchPageWithContext(contextValue)

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    const firstClaimCard = screen.getByTestId('match-claim-card-c71')
    expect(within(firstClaimCard).queryByTestId('triad-card-claim-new-marker')).not.toBeInTheDocument()
  })
})

describe('MatchPage cpu pacing', () => {
  test('does not replay starter roll after turn 0 and makes cpu think for 2 seconds before placing', async () => {
    vi.useFakeTimers()

    try {
      const updateCurrentMatch = vi.fn()
      const state = makeActiveCpuTurnState()
      const { container } = renderMatchPageWithContext(
        buildContextValue(state, 'normal', 8, {
          updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
        }),
      )

      const focusedCardLabels = new Set<string>()
      const collectFocusedCard = () => {
        const selectedCards = container.querySelectorAll('.hand-row--cpu .triad-card--hand-cpu.is-selected')
        expect(selectedCards.length).toBe(1)
        const cardLabel = selectedCards[0]?.getAttribute('aria-label')
        if (cardLabel) {
          focusedCardLabels.add(cardLabel)
        }
      }

      await waitFor(() => {
        collectFocusedCard()
      })

      for (let sampleIndex = 0; sampleIndex < 4; sampleIndex += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(450)
        })
        collectFocusedCard()
      }

      expect(focusedCardLabels.size).toBeGreaterThanOrEqual(2)
      expect(focusedCardLabels.size).toBeLessThanOrEqual(4)
      expect(updateCurrentMatch).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(250)
      })
      expect(updateCurrentMatch).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('MatchPage hand layout classes by mode', () => {
  test('renders cpu and player side hand art in match lanes', () => {
    const state = makeActiveCpuTurnState()
    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    expect(screen.getByTestId('match-lane-art-cpu')).toBeInTheDocument()
    expect(screen.getByTestId('match-lane-art-player')).toBeInTheDocument()
  })

  test('adds 4x4 layout classes to match panel and both hands', () => {
    const state = makeActivePlayerTurnState4x4()
    const { container } = renderMatchPageWithContext(buildContextValue(state, 'normal'))
    const matchPanel = container.querySelector('.match-panel')

    expect(matchPanel).toHaveClass('match-panel--4x4')
    expect(matchPanel).not.toHaveClass('match-panel--3x3')
    expect(screen.getByLabelText('CPU hand')).toHaveClass('hand-row--two-columns')
    expect(screen.getByLabelText('CPU hand')).not.toHaveClass('hand-row--cpu-3x3')
    expect(screen.getByLabelText('Player hand')).toHaveClass('hand-row--two-columns')
  })

  test('does not add 4x4 hand layout class in 3x3 mode', () => {
    const state = makeActiveCpuTurnState()
    const { container } = renderMatchPageWithContext(buildContextValue(state, 'normal'))
    const matchPanel = container.querySelector('.match-panel')

    expect(matchPanel).toHaveClass('match-panel--3x3')
    expect(matchPanel).not.toHaveClass('match-panel--4x4')
    expect(screen.getByLabelText('CPU hand')).toHaveClass('hand-row--cpu-3x3')
    expect(screen.getByLabelText('CPU hand')).not.toHaveClass('hand-row--two-columns')
    expect(screen.getByLabelText('Player hand')).not.toHaveClass('hand-row--two-columns')
  })

  test('renders lane type strips in active effects mode', () => {
    const state = attachEffectsState(makeActivePlayerTurnState(), {
      enabled: true,
      mode: 'effects',
      usedOnPoseByActor: { player: { feu: true }, cpu: {} },
    })
    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    expect(screen.getByTestId('match-lane-type-strip-player')).toBeInTheDocument()
    expect(screen.getByTestId('match-lane-type-strip-cpu')).toBeInTheDocument()
  })

  test('renders poisoned hand card with debuffed display stats', () => {
    const state = attachEffectsState(makeActivePlayerTurnState(), {
      enabled: true,
      mode: 'effects',
    })
    if (!state.elementState) {
      throw new Error('Expected element state.')
    }
    state.elementState.poisonedHandByActor.player = ['c42']

    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    const poisonedCardDef = cardPool.find((card) => card.id === 'c42')
    if (!poisonedCardDef) {
      throw new Error('Expected c42 in card pool.')
    }

    const poisonedCard = screen.getByTestId('player-card-c42')
    const topStat = poisonedCard.querySelector('.triad-card__stat--top')
    const rightStat = poisonedCard.querySelector('.triad-card__stat--right')
    const bottomStat = poisonedCard.querySelector('.triad-card__stat--bottom')
    const leftStat = poisonedCard.querySelector('.triad-card__stat--left')
    expect(topStat?.textContent).toBe(String(Math.max(1, poisonedCardDef.top - 1)))
    expect(rightStat?.textContent).toBe(String(Math.max(1, poisonedCardDef.right - 1)))
    expect(bottomStat?.textContent).toBe(String(Math.max(1, poisonedCardDef.bottom - 1)))
    expect(leftStat?.textContent).toBe(String(Math.max(1, poisonedCardDef.left - 1)))
    expect(poisonedCard).toHaveClass('is-hand-poisoned')
    expect(topStat).toHaveClass(poisonedCardDef.top > 1 ? 'effect-stat--debuff' : 'effect-stat--neutral')
    expect(rightStat).toHaveClass(poisonedCardDef.right > 1 ? 'effect-stat--debuff' : 'effect-stat--neutral')
    expect(bottomStat).toHaveClass(poisonedCardDef.bottom > 1 ? 'effect-stat--debuff' : 'effect-stat--neutral')
    expect(leftStat).toHaveClass(poisonedCardDef.left > 1 ? 'effect-stat--debuff' : 'effect-stat--neutral')
  })

  test('marks poisoned cpu hand card with poison visual class', () => {
    const state = attachEffectsState(makeActivePlayerTurnState(), {
      enabled: true,
      mode: 'effects',
    })
    if (!state.elementState) {
      throw new Error('Expected element state.')
    }
    state.elementState.poisonedHandByActor.cpu = ['c72']

    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    const poisonedCpuCardDef = cardPool.find((card) => card.id === 'c72')
    if (!poisonedCpuCardDef) {
      throw new Error('Expected c72 in card pool.')
    }
    const cpuHand = screen.getByLabelText('CPU hand')
    const poisonedCpuCard = within(cpuHand).getByLabelText(poisonedCpuCardDef.name)
    expect(poisonedCpuCard).toHaveClass('is-hand-poisoned')
  })
})

describe('MatchPage board abandon action', () => {
  test('does not render board abandon button during active matches', () => {
    const state = makeActivePlayerTurnState()
    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    expect(screen.queryByTestId('abandon-match-button')).not.toBeInTheDocument()
  })

  test('does not render board abandon button when match is already finished', async () => {
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'player', 'player', 'player', 'player', 'cpu'])

    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())
    expect(screen.queryByTestId('abandon-match-button')).not.toBeInTheDocument()
  })
})

describe('MatchPage tower mode', () => {
  test('shows tower HUD metadata in active tower matches', () => {
    const state = makeActivePlayerTurnState4x4()
    const contextValue = buildContextValue(state, 'tower', 8)
    if (!contextValue.currentMatch) {
      throw new Error('Expected current match in context fixture.')
    }
    contextValue.currentMatch.tower = {
      floor: 12,
      checkpointFloor: 10,
      boss: false,
      relics: createEmptyRelics(),
    }

    renderMatchPageWithContext(contextValue)

    expect(screen.getByTestId('match-tower-floor')).toHaveTextContent('Tower Floor 12')
    expect(screen.getByTestId('match-tower-floor')).toHaveTextContent('Checkpoint 10')
    expect(screen.getByTestId('match-tower-boss')).toHaveTextContent('Normal Floor')
    expect(screen.getByTestId('match-tower-relics')).toHaveTextContent('Relics 0')
  })

  test('finish modal hides claimed-card selection and uses tower action labels', async () => {
    const state = makeFinishedState4x4([
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'player',
      'cpu',
    ])
    const contextValue = buildContextValue(state, 'tower', 8)
    if (!contextValue.currentMatch) {
      throw new Error('Expected current match in context fixture.')
    }
    contextValue.currentMatch.tower = {
      floor: 31,
      checkpointFloor: 30,
      boss: false,
      relics: createEmptyRelics(),
    }

    renderMatchPageWithContext(contextValue)

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(screen.getByText('Queue: Tower')).toBeInTheDocument()
    expect(screen.queryByText('Choose 1 opponent card to recover 1 fragment (not a full card)')).not.toBeInTheDocument()
    expect(screen.getByText('Tower mode does not grant card fragments.')).toBeInTheDocument()
    expect(screen.queryByTestId('restart-match-button')).not.toBeInTheDocument()
    expect(screen.getByTestId('finish-match-button')).toHaveTextContent('Continue Ascension')
  })
})

describe('MatchPage keyboard gameplay', () => {
  test('defaults to top card selection on active player turn', () => {
    const state = makeActivePlayerTurnState()
    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    expect(screen.getByTestId('player-card-c42')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('player-card-c43')).toHaveAttribute('aria-pressed', 'false')
  })

  test('Digit2 selects the second card in hand', async () => {
    const user = userEvent.setup()
    const state = makeActivePlayerTurnState()
    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    await user.keyboard('{2}')

    expect(screen.getByTestId('player-card-c43')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('player-card-c42')).toHaveAttribute('aria-pressed', 'false')
  })

  test('arrow navigation targets only legal cells for selected card', async () => {
    const user = userEvent.setup()
    const state = makeActivePlayerTurnStateWithBlockedCells()
    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    await user.keyboard('{1}')
    expect(screen.getByTestId('board-cell-1')).toHaveClass('is-keyboard-target')
    expect(screen.getByTestId('board-cell-2')).not.toHaveClass('is-keyboard-target')

    await user.keyboard('{ArrowDown}')
    expect(screen.getByTestId('board-cell-7')).toHaveClass('is-keyboard-target')
    expect(screen.getByTestId('board-cell-4')).not.toHaveClass('is-keyboard-target')
  })

  test('Enter places selected card on keyboard target cell and updates match state', async () => {
    vi.useFakeTimers()
    try {
      const updateCurrentMatch = vi.fn()
      const state = makeActivePlayerTurnState()
      renderMatchPageWithContext(
        buildContextValue(state, 'normal', 8, {
          updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
        }),
      )

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000)
      })

      expect(updateCurrentMatch).toHaveBeenCalledTimes(1)
      const nextState = updateCurrentMatch.mock.calls[0]?.[0] as MatchState
      expect(nextState.board[1]).toEqual({ owner: 'player', cardId: 'c42' })
      expect(nextState.hands.player).not.toContain('c42')
    } finally {
      vi.useRealTimers()
    }
  })

  test('keyboard controls are inactive during cpu turn', async () => {
    const user = userEvent.setup()
    const updateCurrentMatch = vi.fn()
    const state = makeActiveCpuTurnState()
    renderMatchPageWithContext(
      buildContextValue(state, 'normal', 8, {
        updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
      }),
    )

    await user.keyboard('{1}')
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

    expect(screen.getByTestId('player-card-c42')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByTestId('match-keyboard-help')).not.toBeInTheDocument()
    expect(updateCurrentMatch).not.toHaveBeenCalled()
  })

  test('shows compact keyboard help in active match', () => {
    const state = makeActivePlayerTurnState()
    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    expect(screen.getByTestId('match-keyboard-help-trigger')).toHaveTextContent('?')
    expect(screen.getByText(/Clavier: 1-8 carte/i)).toBeInTheDocument()
  })
})

describe('MatchPage effects visualization', () => {
  test('animates eau cast marker before applying flooded cell state', async () => {
    vi.useFakeTimers()
    try {
      const updateCurrentMatch = vi.fn()
      const state = makeActivePlayerTurnStateWithWaterCastAnimation()
      renderMatchPageWithContext(
        buildContextValue(state, 'normal', 1, {
          updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
        }),
      )

      fireEvent.click(screen.getByTestId('player-card-c03'))
      fireEvent.click(screen.getByTestId('board-cell-8'))
      fireEvent.click(screen.getByTestId('board-cell-4'))

      expect(updateCurrentMatch).not.toHaveBeenCalled()
      expect(screen.getByTestId('board-cell-4')).toHaveClass('fallback-cell--flood-cast')
      expect(screen.getByTestId('board-cell-4-flood-cast-logo')).toHaveAttribute(
        'src',
        expect.stringContaining('/logos-elements/eau.png'),
      )
      expect(screen.queryByTestId('match-vs-overlay')).not.toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(900)
      })

      expect(updateCurrentMatch).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  test('shows placed-card preview while choosing feu target', () => {
    const updateCurrentMatch = vi.fn()
    const state = makeActivePlayerTurnStateWithFireCastAnimation()
    const firePreviewTop = cardPool.find((card) => card.id === 'c02')?.top
    expect(firePreviewTop).toBeDefined()
    renderMatchPageWithContext(
      buildContextValue(state, 'normal', 1, {
        updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
      }),
    )

    fireEvent.click(screen.getByTestId('player-card-c02'))
    fireEvent.click(screen.getByTestId('board-cell-4'))

    expect(updateCurrentMatch).not.toHaveBeenCalled()
    expect(screen.getByTestId('board-cell-4-stat-top')).toHaveTextContent(String(firePreviewTop))
    expect(screen.getByTestId('board-cell-4')).toBeDisabled()
    expect(screen.getByTestId('board-cell-1')).toHaveClass('fallback-cell--fire-target')
    expect(screen.getByTestId('board-cell-1-fire-target-logo')).toHaveAttribute(
      'src',
      expect.stringContaining('/logos-elements/feu.png'),
    )
    expect(screen.getByTestId('match-fire-target-hint')).toHaveTextContent('bruler')
    expect(screen.queryByText('Choose a power target.')).not.toBeInTheDocument()
  })

  test('animates feu cast marker before applying burn state', async () => {
    vi.useFakeTimers()
    try {
      const updateCurrentMatch = vi.fn()
      const state = makeActivePlayerTurnStateWithFireCastAnimation()
      renderMatchPageWithContext(
        buildContextValue(state, 'normal', 1, {
          updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
        }),
      )

      fireEvent.click(screen.getByTestId('player-card-c02'))
      fireEvent.click(screen.getByTestId('board-cell-4'))
      fireEvent.click(screen.getByTestId('board-cell-1'))

      expect(updateCurrentMatch).not.toHaveBeenCalled()
      expect(screen.getByTestId('board-cell-1')).toHaveClass('fallback-cell--fire-cast')
      expect(screen.getByTestId('board-cell-1-fire-cast-logo')).toHaveAttribute(
        'src',
        expect.stringContaining('/logos-elements/feu.png'),
      )

      await act(async () => {
        await vi.advanceTimersByTimeAsync(219)
      })
      expect(updateCurrentMatch).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(updateCurrentMatch).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  test('allows keyboard navigation and Enter confirmation for feu target selection', async () => {
    vi.useFakeTimers()
    try {
      const updateCurrentMatch = vi.fn()
      const state = makeActivePlayerTurnStateWithFireKeyboardTargeting()
      renderMatchPageWithContext(
        buildContextValue(state, 'normal', 1, {
          updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
        }),
      )

      fireEvent.click(screen.getByTestId('player-card-c02'))
      fireEvent.click(screen.getByTestId('board-cell-4'))
      expect(screen.getByTestId('board-cell-1')).toHaveClass('is-keyboard-target')

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }))
      })
      expect(screen.getByTestId('board-cell-7')).toHaveClass('is-keyboard-target')

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))
      })
      expect(screen.getByTestId('board-cell-7')).toHaveClass('fallback-cell--fire-cast')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(220)
      })
      expect(updateCurrentMatch).toHaveBeenCalledTimes(1)
      const resolvedState = updateCurrentMatch.mock.calls[0]?.[0] as MatchState
      expect(resolvedState.lastMove?.powerTarget?.targetCardCell).toBe(7)
    } finally {
      vi.useRealTimers()
    }
  })

  test('clicking a non-target occupied cell does nothing during feu targeting', () => {
    const updateCurrentMatch = vi.fn()
    const state = makeActivePlayerTurnStateWithFireNonTargetOccupiedCell()
    renderMatchPageWithContext(
      buildContextValue(state, 'normal', 1, {
        updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
      }),
    )

    fireEvent.click(screen.getByTestId('player-card-c02'))
    fireEvent.click(screen.getByTestId('board-cell-4'))
    fireEvent.click(screen.getByTestId('board-cell-0'))

    expect(updateCurrentMatch).not.toHaveBeenCalled()
    expect(screen.queryByText('Choose a power target.')).not.toBeInTheDocument()
    expect(screen.getByTestId('board-cell-1')).toHaveClass('fallback-cell--fire-target')
  })

  test('keeps flooded cell visual after eau cast resolves until next card enters it', async () => {
    vi.useFakeTimers()
    try {
      const updateCurrentMatch = vi.fn()
      const state = makeActivePlayerTurnStateWithWaterCastAnimation()
      const view = renderMatchPageWithContext(
        buildContextValue(state, 'normal', 1, {
          updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
        }),
      )

      fireEvent.click(screen.getByTestId('player-card-c03'))
      fireEvent.click(screen.getByTestId('board-cell-8'))
      fireEvent.click(screen.getByTestId('board-cell-4'))

      await act(async () => {
        await vi.advanceTimersByTimeAsync(900)
      })

      expect(updateCurrentMatch).toHaveBeenCalledTimes(1)
      const resolvedState = updateCurrentMatch.mock.calls[0]?.[0] as MatchState
      expect(resolvedState.elementState?.floodedCell).toBe(4)

      view.rerender(
        <MemoryRouter initialEntries={['/match']}>
          <GameContext.Provider
            value={buildContextValue(resolvedState, 'normal', 1, {
              updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
            })}
          >
            <MatchPage />
          </GameContext.Provider>
        </MemoryRouter>,
      )

      expect(screen.getByTestId('board-cell-4')).toHaveClass('fallback-cell--flooded')
    } finally {
      vi.useRealTimers()
    }
  })

  test('shows placed-card preview while choosing eau flood target', () => {
    const updateCurrentMatch = vi.fn()
    const state = makeActivePlayerTurnStateWithWaterCastAnimation()
    renderMatchPageWithContext(
      buildContextValue(state, 'normal', 1, {
        updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
      }),
    )

    fireEvent.click(screen.getByTestId('player-card-c03'))
    fireEvent.click(screen.getByTestId('board-cell-8'))

    expect(updateCurrentMatch).not.toHaveBeenCalled()
    expect(screen.getByTestId('board-cell-8-stat-top')).toHaveTextContent('2')
    expect(screen.getByTestId('board-cell-8')).toBeDisabled()
    expect(screen.getByTestId('board-cell-0')).toHaveClass('fallback-cell--flood-target')
    expect(screen.getByTestId('board-cell-0-flood-target-logo')).toHaveAttribute(
      'src',
      expect.stringContaining('/logos-elements/eau.png'),
    )
    expect(screen.getByTestId('board-cell-0-flood-target-badge')).toHaveTextContent('CIBLE')
    expect(screen.getByTestId('match-flood-target-hint')).toHaveTextContent('inonder')
    expect(screen.queryByText('Choose a power target.')).not.toBeInTheDocument()
  })

  test('animates eau flooded malus then clash before applying resolved state', async () => {
    vi.useFakeTimers()
    try {
      const updateCurrentMatch = vi.fn()
      const state = makeActivePlayerTurnStateWithFloodPenaltyAnimation()
      renderMatchPageWithContext(
        buildContextValue(state, 'normal', 1, {
          updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
        }),
      )

      fireEvent.click(screen.getByTestId('player-card-c43'))
      fireEvent.click(screen.getByTestId('board-cell-4'))

      expect(updateCurrentMatch).not.toHaveBeenCalled()
      expect(screen.getByTestId('board-cell-4')).toHaveClass('fallback-cell--water-penalty')
      expect(screen.getByTestId('board-cell-4-water-penalty-logo')).toHaveAttribute(
        'src',
        expect.stringContaining('/logos-elements/eau.png'),
      )
      expect(screen.getByTestId('board-cell-4-water-penalty-badge')).toHaveTextContent('-2')
      expect(screen.queryByTestId('match-vs-overlay')).not.toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(900)
      })

      expect(updateCurrentMatch).not.toHaveBeenCalled()
      expect(screen.getByTestId('board-cell-4')).toHaveClass('fallback-cell--clash')
      expect(screen.getByTestId('board-cell-5')).toHaveClass('fallback-cell--clash')
      expect(screen.getByTestId('match-vs-overlay')).toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
        await vi.runOnlyPendingTimersAsync()
      })

      expect(updateCurrentMatch).toHaveBeenCalledTimes(1)
      expect(screen.queryByTestId('match-vs-overlay')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  test('shows transient sol marker and keeps active sol indicator after resolution', async () => {
    vi.useFakeTimers()
    try {
      const updateCurrentMatch = vi.fn()
      const state = makeActivePlayerTurnStateWithSolCastAnimation()
      const view = renderMatchPageWithContext(
        buildContextValue(state, 'normal', 1, {
          updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
        }),
      )

      fireEvent.click(screen.getByTestId('player-card-c45'))
      fireEvent.click(screen.getByTestId('board-cell-4'))

      expect(updateCurrentMatch).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId('board-cell-5')).toHaveClass('fallback-cell--ground-debuffed')
      expect(screen.getByTestId('board-cell-5-ground-badge-logo')).toHaveAttribute(
        'src',
        expect.stringContaining('/ui/match/board-effects/Sol.png'),
      )

      const resolvedState = updateCurrentMatch.mock.calls[0]?.[0] as MatchState
      const hasSolStack = (resolvedState.elementState?.boardEffectsByCell[5]?.allStatsMinusOneStacks ?? []).some(
        (stack) => stack.source === 'sol',
      )
      expect(hasSolStack).toBe(true)

      view.rerender(
        <MemoryRouter initialEntries={['/match']}>
          <GameContext.Provider
            value={buildContextValue(resolvedState, 'normal', 1, {
              updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
            })}
          >
            <MatchPage />
          </GameContext.Provider>
        </MemoryRouter>,
      )

      expect(screen.getByTestId('board-cell-5').getAttribute('title') ?? '').toContain('Sol: -1 temporaire')
      expect(screen.getByTestId('board-cell-5')).toHaveClass('fallback-cell--ground-active')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(900)
      })
      expect(screen.getByTestId('board-cell-5')).not.toHaveClass('fallback-cell--ground-debuffed')
    } finally {
      vi.useRealTimers()
    }
  })

  test('animates glace cast marker before applying frozen cell state', async () => {
    vi.useFakeTimers()
    try {
      const updateCurrentMatch = vi.fn()
      const state = makeActivePlayerTurnStateWithGlaceCastAnimation()
      renderMatchPageWithContext(
        buildContextValue(state, 'normal', 1, {
          updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
        }),
      )

      fireEvent.click(screen.getByTestId('player-card-c134'))
      fireEvent.click(screen.getByTestId('board-cell-8'))
      fireEvent.click(screen.getByTestId('board-cell-4'))

      expect(updateCurrentMatch).not.toHaveBeenCalled()
      expect(screen.getByTestId('board-cell-4')).toHaveClass('fallback-cell--freeze-cast')
      expect(screen.getByTestId('board-cell-4-freeze-cast-logo')).toHaveAttribute(
        'src',
        expect.stringContaining('/logos-elements/glace.png'),
      )

      await act(async () => {
        await vi.advanceTimersByTimeAsync(219)
      })

      expect(updateCurrentMatch).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })

      expect(updateCurrentMatch).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  test('shows placed-card preview while choosing glace target', () => {
    const updateCurrentMatch = vi.fn()
    const state = makeActivePlayerTurnStateWithGlaceCastAnimation()
    renderMatchPageWithContext(
      buildContextValue(state, 'normal', 1, {
        updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
      }),
    )

    fireEvent.click(screen.getByTestId('player-card-c134'))
    fireEvent.click(screen.getByTestId('board-cell-8'))

    expect(updateCurrentMatch).not.toHaveBeenCalled()
    expect(screen.getByTestId('board-cell-8-stat-top')).toHaveTextContent('5')
    expect(screen.getByTestId('board-cell-8')).toBeDisabled()
    expect(screen.getByTestId('board-cell-0')).toHaveClass('fallback-cell--freeze-target')
    expect(screen.getByTestId('board-cell-0-freeze-target-logo')).toHaveAttribute(
      'src',
      expect.stringContaining('/logos-elements/glace.png'),
    )
    expect(screen.getByTestId('match-freeze-target-hint')).toHaveTextContent('geler')
    expect(screen.queryByText('Choose a power target.')).not.toBeInTheDocument()
  })

  test('keeps frozen cell visual after glace cast resolves', async () => {
    vi.useFakeTimers()
    try {
      const updateCurrentMatch = vi.fn()
      const state = makeActivePlayerTurnStateWithGlaceCastAnimation()
      const view = renderMatchPageWithContext(
        buildContextValue(state, 'normal', 1, {
          updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
        }),
      )

      fireEvent.click(screen.getByTestId('player-card-c134'))
      fireEvent.click(screen.getByTestId('board-cell-8'))
      fireEvent.click(screen.getByTestId('board-cell-4'))

      await act(async () => {
        await vi.advanceTimersByTimeAsync(220)
      })

      expect(updateCurrentMatch).toHaveBeenCalledTimes(1)
      const resolvedState = updateCurrentMatch.mock.calls[0]?.[0] as MatchState
      expect(resolvedState.elementState?.frozenCellByActor.cpu?.cell).toBe(4)
      expect(resolvedState.elementState?.frozenCellByActor.cpu?.turnsRemaining).toBe(1)

      view.rerender(
        <MemoryRouter initialEntries={['/match']}>
          <GameContext.Provider
            value={buildContextValue(resolvedState, 'normal', 1, {
              updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
            })}
          >
            <MatchPage />
          </GameContext.Provider>
        </MemoryRouter>,
      )

      expect(screen.getByTestId('board-cell-4')).toHaveClass('fallback-cell--frozen')
    } finally {
      vi.useRealTimers()
    }
  })

  test('flashes glace blocked feedback when trying to play on frozen cell', async () => {
    vi.useFakeTimers()
    try {
      const updateCurrentMatch = vi.fn()
      const state = makeActivePlayerTurnStateWithFrozenBlockedCell()
      renderMatchPageWithContext(
        buildContextValue(state, 'normal', 1, {
          updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
        }),
      )

      fireEvent.click(screen.getByTestId('player-card-c43'))
      fireEvent.click(screen.getByTestId('board-cell-4'))

      expect(updateCurrentMatch).not.toHaveBeenCalled()
      expect(screen.getByText('Cell 4 is frozen for player.')).toBeInTheDocument()
      expect(screen.getByTestId('board-cell-4')).toHaveClass('fallback-cell--freeze-blocked')
      expect(screen.getByTestId('board-cell-4-freeze-blocked-badge')).toHaveTextContent('BLOQUEE')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(320)
      })

      expect(screen.getByText('Cell 4 is frozen for player.')).toBeInTheDocument()
      expect(screen.getByTestId('board-cell-4')).not.toHaveClass('fallback-cell--freeze-blocked')
      expect(updateCurrentMatch).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  test('renders active board stats instead of base values in fallback board', () => {
    const state = attachEffectsState(makeActivePlayerTurnState(), {
      boardEffectsByCell: {
        0: {
          permanentDelta: { top: 2, right: 0, bottom: 0, left: 0 },
          burnTicksRemaining: 0,
          allStatsMinusOneStacks: [],
          unflippableUntilEndOfOpponentNextTurn: null,
          swappedHighLowUntilMatchEnd: false,
          rockShieldCharges: 0,
          poisonFirstCombatPending: false,
          insectEntryStacks: 0,
          dragonApplied: false,
        },
      },
    })
    state.board = [{ owner: 'cpu', cardId: 'c71' }, null, null, null, null, null, null, null, null]

    renderMatchPageWithContext(buildContextValue(state, 'normal'))

    expect(screen.getByTestId('board-cell-0-stat-top')).toHaveTextContent('5')
    expect(screen.getByTestId('board-cell-0-stat-top')).toHaveClass('effect-stat--buff')
  })

})
