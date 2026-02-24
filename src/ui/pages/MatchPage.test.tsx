import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { GameContext } from '../../app/GameContext'
import { cardPool } from '../../domain/cards/cardPool'
import { createMatchRuntime } from '../../domain/match/runtimeEcs'
import type { MatchState } from '../../domain/match/types'
import { createDefaultProfile } from '../../domain/progression/profile'
import { playCriticalVictorySound } from '../audio/criticalVictorySound'
import {
  playCardPlacementSound,
  playCardSelectionSound,
  playCaptureSound,
  playDrawSound,
  playLoseSound,
  playWinSound,
} from '../audio/gameplaySounds'
import { MatchPage } from './MatchPage'

vi.mock('../audio/criticalVictorySound', () => ({
  playCriticalVictorySound: vi.fn(),
}))

vi.mock('../audio/gameplaySounds', () => ({
  playCardSelectionSound: vi.fn(),
  playCardPlacementSound: vi.fn(),
  playCaptureSound: vi.fn(),
  playWinSound: vi.fn(),
  playLoseSound: vi.fn(),
  playDrawSound: vi.fn(),
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
  queue: 'normal' | 'ranked' | 'tower',
  opponentLevel: 1 | 8 = 1,
  overrides: Partial<GameContextValue> = {},
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

beforeEach(() => {
  vi.mocked(playCriticalVictorySound).mockReset()
  vi.mocked(playCardSelectionSound).mockReset()
  vi.mocked(playCardPlacementSound).mockReset()
  vi.mocked(playCaptureSound).mockReset()
  vi.mocked(playWinSound).mockReset()
  vi.mocked(playLoseSound).mockReset()
  vi.mocked(playDrawSound).mockReset()
})

describe('MatchPage ranked preview', () => {
  test('shows ranked LP recap with emblem, delta, and progress for ranked matches', async () => {
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'player', 'player', 'player', 'player', 'player'])

    renderMatchPageWithContext(buildContextValue(state, 'ranked'))

    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(screen.getByText('Queue: Ranked')).toBeInTheDocument()
    expect(screen.getByTestId('match-ranked-recap')).toBeInTheDocument()
    expect(screen.getByTestId('match-ranked-emblem')).toHaveAttribute('src', '/ranks/iron.svg')
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

describe('MatchPage gameplay sounds', () => {
  test('plays selection sound on explicit card click and keyboard digit selection', async () => {
    renderMatchPageWithContext(buildContextValue(makeActivePlayerTurnState(), 'normal'))

    const cardButton = screen.getByTestId('player-card-c42')
    await userEvent.click(cardButton)
    expect(playCardSelectionSound).toHaveBeenCalledTimes(1)

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2' }))
    })
    expect(playCardSelectionSound).toHaveBeenCalledTimes(2)
  })

  test('plays placement + capture sounds on a valid player move that flips cards', async () => {
    const user = userEvent.setup()
    const updateCurrentMatch = vi.fn()
    renderMatchPageWithContext(
      buildContextValue(makeActivePlayerTurnStateWithCapture(), 'normal', 1, {
        updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
      }),
    )

    await user.click(screen.getByTestId('player-card-c110'))
    await user.click(screen.getByTestId('board-cell-1'))

    expect(updateCurrentMatch).toHaveBeenCalledTimes(1)
    expect(playCardPlacementSound).toHaveBeenCalledTimes(1)
    expect(playCaptureSound).toHaveBeenCalledTimes(1)
  })

  test('plays placement + capture sounds on cpu turn moves', async () => {
    vi.useFakeTimers()
    try {
      const updateCurrentMatch = vi.fn()
      renderMatchPageWithContext(
        buildContextValue(makeActiveCpuTurnStateWithCapture(), 'normal', 8, {
          updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
        }),
      )

      await act(async () => {
        await vi.advanceTimersByTimeAsync(900)
      })

      expect(updateCurrentMatch).toHaveBeenCalledTimes(1)
      expect(playCardPlacementSound).toHaveBeenCalledTimes(1)
      expect(playCaptureSound).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  test('does not play gameplay sounds when audio is disabled', async () => {
    const user = userEvent.setup()
    const state = makeActivePlayerTurnStateWithCapture()
    const contextValue = buildContextValue(state, 'normal')
    contextValue.profile.settings.audioEnabled = false

    renderMatchPageWithContext(contextValue)

    await user.click(screen.getByTestId('player-card-c110'))
    await user.click(screen.getByTestId('board-cell-1'))

    expect(playCardSelectionSound).not.toHaveBeenCalled()
    expect(playCardPlacementSound).not.toHaveBeenCalled()
    expect(playCaptureSound).not.toHaveBeenCalled()
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
    expect(playWinSound).not.toHaveBeenCalled()

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
    expect(playWinSound).toHaveBeenCalledTimes(1)
  })

  test('plays lose and draw sounds on matching outcomes', async () => {
    renderMatchPageWithContext(buildContextValue(makeFinishedState(['cpu', 'cpu', 'cpu', 'cpu', 'cpu', 'cpu', 'player', 'player', 'player']), 'normal'))
    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())
    expect(playLoseSound).toHaveBeenCalledTimes(1)

    renderMatchPageWithContext(buildContextValue(makeFinishedState(['player', 'player', 'player', 'player', 'cpu', 'cpu', 'cpu', 'cpu']), 'normal'))
    await waitFor(() => expect(screen.getAllByTestId('match-finish-modal').length).toBeGreaterThan(0))
    expect(playDrawSound).toHaveBeenCalledTimes(1)
  })

  test('does not play result sounds when audio is disabled', async () => {
    const state = makeFinishedState(['player', 'player', 'player', 'player', 'player', 'player', 'player', 'player', 'player'])
    const contextValue = buildContextValue(state, 'normal', 8)
    contextValue.profile.settings.audioEnabled = false

    renderMatchPageWithContext(contextValue)
    await waitFor(() => expect(screen.getByTestId('match-finish-modal')).toBeInTheDocument())

    expect(playCriticalVictorySound).not.toHaveBeenCalled()
    expect(playWinSound).not.toHaveBeenCalled()
    expect(playLoseSound).not.toHaveBeenCalled()
    expect(playDrawSound).not.toHaveBeenCalled()
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

    expect(screen.getByText('Choose 1 opponent card to claim')).toBeInTheDocument()
    expect(screen.getAllByTestId(/^match-claim-card-/)).toHaveLength(5)
    expect(screen.getByTestId('finish-match-button')).toBeDisabled()

    await user.click(screen.getByTestId('match-claim-card-c71'))
    await waitFor(() => expect(screen.getByTestId('finish-match-button')).toBeEnabled())

    await user.click(screen.getByTestId('finish-match-button'))
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
  test('does not replay starter roll after turn 0 and keeps cpu move responsive', async () => {
    vi.useFakeTimers()

    try {
      const updateCurrentMatch = vi.fn()
      const state = makeActiveCpuTurnState()
      renderMatchPageWithContext(
        buildContextValue(state, 'normal', 8, {
          updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
        }),
      )

      await act(async () => {
        await vi.advanceTimersByTimeAsync(900)
      })

      expect(updateCurrentMatch).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('MatchPage hand layout classes by mode', () => {
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
    expect(screen.queryByText('Choose 1 opponent card to claim')).not.toBeInTheDocument()
    expect(screen.getByText('Tower mode does not grant claimed cards.')).toBeInTheDocument()
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
    const user = userEvent.setup()
    const updateCurrentMatch = vi.fn()
    const state = makeActivePlayerTurnState()
    renderMatchPageWithContext(
      buildContextValue(state, 'normal', 8, {
        updateCurrentMatch: updateCurrentMatch as unknown as GameContextValue['updateCurrentMatch'],
      }),
    )

    await user.keyboard('{Enter}')

    expect(updateCurrentMatch).toHaveBeenCalledTimes(1)
    const nextState = updateCurrentMatch.mock.calls[0]?.[0] as MatchState
    expect(nextState.board[1]).toEqual({ owner: 'player', cardId: 'c42' })
    expect(nextState.hands.player).not.toContain('c42')
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

    expect(screen.getByText(/Clavier: 1-8 carte/i)).toBeInTheDocument()
  })
})
