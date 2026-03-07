import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'bun:test'
import type { MatchEffectsViewModel } from '../../domain/match/effectsViewModel'
import { getCard } from '../../domain/cards/cardPool'
import type { Actor } from '../../domain/types'
import type { MoveFlipEvent } from '../../domain/match/types'
import {
  PixiBoard,
  getPixiRenderResolution,
  resolveBoardLayout,
  resolvePixiBoardClassName,
  resolvePlacedCardVisualLayout,
  type BoardArenaVariant,
  type BoardSlot,
} from './PixiBoard'

function makeEmptyBoard(): Array<BoardSlot | null> {
  return Array.from({ length: 9 }, () => null)
}

function renderFallbackBoard(overrides?: {
  board?: Array<BoardSlot | null>
  highlightedCells?: number[]
  tutorialGuidedCells?: number[]
  transientGroundCells?: number[]
  transientFireTargetCells?: number[]
  transientFireCastCells?: number[]
  transientFloodTargetCells?: number[]
  transientFloodCastCells?: number[]
  transientFreezeTargetCells?: number[]
  transientFreezeCastCells?: number[]
  transientFreezeBlockedCells?: number[]
  transientWaterPenaltyCells?: number[]
  transientClashCells?: number[]
  targetableCells?: number[]
  interactive?: boolean
  onCellClick?: (cell: number) => void
  turnActor?: Actor
  status?: 'active' | 'finished'
  focusedCell?: number | null
  arenaVariant?: BoardArenaVariant
  effectsView?: MatchEffectsViewModel
  flipEvents?: MoveFlipEvent[]
  flipEventVersion?: number
}) {
  return render(
    <PixiBoard
      board={overrides?.board ?? makeEmptyBoard()}
      highlightedCells={overrides?.highlightedCells ?? []}
      tutorialGuidedCells={overrides?.tutorialGuidedCells ?? []}
      transientGroundCells={overrides?.transientGroundCells ?? []}
      transientFireTargetCells={overrides?.transientFireTargetCells ?? []}
      transientFireCastCells={overrides?.transientFireCastCells ?? []}
      transientFloodTargetCells={overrides?.transientFloodTargetCells ?? []}
      transientFloodCastCells={overrides?.transientFloodCastCells ?? []}
      transientFreezeTargetCells={overrides?.transientFreezeTargetCells ?? []}
      transientFreezeCastCells={overrides?.transientFreezeCastCells ?? []}
      transientFreezeBlockedCells={overrides?.transientFreezeBlockedCells ?? []}
      transientWaterPenaltyCells={overrides?.transientWaterPenaltyCells ?? []}
      transientClashCells={overrides?.transientClashCells ?? []}
      targetableCells={overrides?.targetableCells ?? []}
      interactive={overrides?.interactive ?? true}
      onCellClick={overrides?.onCellClick ?? vi.fn()}
      turnActor={overrides?.turnActor ?? 'player'}
      status={overrides?.status ?? 'active'}
      focusedCell={overrides?.focusedCell ?? null}
      arenaVariant={overrides?.arenaVariant ?? 'v1'}
      effectsView={overrides?.effectsView}
      flipEvents={overrides?.flipEvents ?? []}
      flipEventVersion={overrides?.flipEventVersion ?? 0}
    />,
  )
}

describe('PixiBoard', () => {
  test('clamps pixi render resolution to keep board cards sharp', () => {
    expect(getPixiRenderResolution(undefined)).toBe(1)
    expect(getPixiRenderResolution(0.6)).toBe(1)
    expect(getPixiRenderResolution(1.5)).toBe(1.5)
    expect(getPixiRenderResolution(3)).toBe(2)
  })

  test('uses tighter 3x3 layout when neutral board art is enabled', () => {
    expect(resolveBoardLayout(3, true)).toEqual({ inset: 78, gap: 4 })
    expect(resolveBoardLayout(3, false)).toEqual({ inset: 30, gap: 10 })
    expect(resolveBoardLayout(4, true)).toEqual({ inset: 30, gap: 10 })
  })

  test('uses larger placed-card visual layout on neutral board art', () => {
    expect(resolvePlacedCardVisualLayout(true)).toEqual({
      plateInset: 8,
      artInset: 9,
      artScaleInset: 11,
      crestInsetFactor: 0.22,
    })
    expect(resolvePlacedCardVisualLayout(false)).toEqual({
      plateInset: 12,
      artInset: 16,
      artScaleInset: 16,
      crestInsetFactor: 0.26,
    })
  })

  test('uses transparent pixi host class when neutral board art is enabled', () => {
    expect(resolvePixiBoardClassName(true)).toBe('pixi-board has-neutral-board-art')
    expect(resolvePixiBoardClassName(false)).toBe('pixi-board')
  })

  test('applies turn and status classes in fallback mode', () => {
    const { rerender } = renderFallbackBoard({ turnActor: 'player', status: 'active' })

    const grid = screen.getByRole('grid', { name: 'Match board' })
    expect(grid).toHaveClass('is-turn-player')
    expect(grid).not.toHaveClass('is-turn-cpu')
    expect(grid).not.toHaveClass('is-finished')

    rerender(
      <PixiBoard
        board={makeEmptyBoard()}
        highlightedCells={[]}
        interactive={false}
        onCellClick={vi.fn()}
        turnActor="cpu"
        status="finished"
      />,
    )

    expect(grid).toHaveClass('is-turn-cpu')
    expect(grid).not.toHaveClass('is-turn-player')
    expect(grid).toHaveClass('is-finished')
  })

  test('marks highlighted and recently placed cells in fallback mode', async () => {
    const board = makeEmptyBoard()
    const { rerender } = renderFallbackBoard({ board, highlightedCells: [3], turnActor: 'player', status: 'active' })

    expect(screen.getByTestId('board-cell-3')).toHaveClass('is-highlighted')
    expect(screen.getByTestId('board-cell-3')).not.toHaveClass('is-recent-placement')

    const withPlacedCard = makeEmptyBoard()
    withPlacedCard[3] = { cardId: 'c01', owner: 'player' }

    rerender(
      <PixiBoard
        board={withPlacedCard}
        highlightedCells={[]}
        interactive={false}
        onCellClick={vi.fn()}
        turnActor="cpu"
        status="active"
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('board-cell-3')).toHaveClass('is-recent-placement')
    })
  })

  test('marks tutorial guided cells with a dedicated class and badge in fallback mode', () => {
    renderFallbackBoard({ highlightedCells: [4], tutorialGuidedCells: [4] })

    expect(screen.getByTestId('board-cell-4')).toHaveClass('is-highlighted')
    expect(screen.getByTestId('board-cell-4')).toHaveClass('is-tutorial-guided')
    expect(screen.getByTestId('board-cell-4-tutorial-guided')).toHaveTextContent('ICI')
  })

  test('marks recently flipped cells in fallback mode when owner changes', async () => {
    const initialBoard = makeEmptyBoard()
    initialBoard[4] = { cardId: 'c01', owner: 'cpu' }
    const { rerender } = renderFallbackBoard({ board: initialBoard, turnActor: 'player', status: 'active' })

    expect(screen.getByTestId('board-cell-4')).not.toHaveAttribute('data-state')

    const capturedBoard = makeEmptyBoard()
    capturedBoard[4] = { cardId: 'c01', owner: 'player' }

    rerender(
      <PixiBoard
        board={capturedBoard}
        highlightedCells={[]}
        interactive={false}
        onCellClick={vi.fn()}
        turnActor="cpu"
        status="active"
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('board-cell-4')).toHaveAttribute('data-state', 'flipped')
      expect(screen.getByTestId('board-cell-4')).toHaveAttribute('data-flip-direction', 'horizontal')
      expect(screen.getByTestId('board-cell-4')).not.toHaveClass('is-recent-placement')
    })
  })

  test('applies fallback flip state and direction attributes from flip events', () => {
    const board = makeEmptyBoard()
    board[1] = { cardId: 'c01', owner: 'player' }
    board[4] = { cardId: 'c11', owner: 'cpu' }

    renderFallbackBoard({
      board,
      interactive: false,
      flipEvents: [
        { cell: 1, kind: 'flipped', axis: 'vertical', phase: 'primary' },
        { cell: 4, kind: 'combo', axis: 'horizontal', phase: 'combo' },
      ],
    })

    expect(screen.getByTestId('board-cell-1')).toHaveAttribute('data-state', 'flipped')
    expect(screen.getByTestId('board-cell-1')).toHaveAttribute('data-flip-direction', 'vertical')
    expect(screen.getByTestId('board-cell-4')).toHaveAttribute('data-state', 'combo')
    expect(screen.getByTestId('board-cell-4')).toHaveAttribute('data-flip-direction', 'horizontal')
  })

  test('restarts fallback flip rendering for repeated flips on the same cell across flip event versions', () => {
    const firstBoard = makeEmptyBoard()
    firstBoard[4] = { cardId: 'c01', owner: 'player' }

    const { rerender } = renderFallbackBoard({
      board: firstBoard,
      interactive: false,
      flipEventVersion: 1,
      flipEvents: [{ cell: 4, kind: 'flipped', axis: 'horizontal', phase: 'primary' }],
    })

    const firstFlipNode = screen.getByTestId('board-cell-4')
    expect(firstFlipNode).toHaveAttribute('data-state', 'flipped')

    const secondBoard = makeEmptyBoard()
    secondBoard[4] = { cardId: 'c01', owner: 'cpu' }

    rerender(
      <PixiBoard
        board={secondBoard}
        highlightedCells={[]}
        interactive={false}
        onCellClick={vi.fn()}
        turnActor="player"
        status="active"
        flipEventVersion={2}
        flipEvents={[{ cell: 4, kind: 'flipped', axis: 'horizontal', phase: 'primary' }]}
      />,
    )

    const secondFlipNode = screen.getByTestId('board-cell-4')
    expect(secondFlipNode).not.toBe(firstFlipNode)
    expect(secondFlipNode).toHaveAttribute('data-state', 'flipped')
  })

  test('shows placed card side values in fallback mode', () => {
    const board = makeEmptyBoard()
    board[4] = { cardId: 'c01', owner: 'player' }
    const placedCard = getCard('c01')

    renderFallbackBoard({ board, interactive: false })

    expect(screen.getByTestId('board-cell-4-stat-top')).toHaveTextContent(String(placedCard.top))
    expect(screen.getByTestId('board-cell-4-stat-right')).toHaveTextContent(String(placedCard.right))
    expect(screen.getByTestId('board-cell-4-stat-bottom')).toHaveTextContent(String(placedCard.bottom))
    expect(screen.getByTestId('board-cell-4-stat-left')).toHaveTextContent(String(placedCard.left))
  })

  test('renders placed card splashart in fallback mode', () => {
    const board = makeEmptyBoard()
    board[4] = { cardId: 'c01', owner: 'player' }

    renderFallbackBoard({ board, interactive: false })

    const cardArt = screen.getByTestId('board-cell-4-art')
    expect(cardArt.getAttribute('src')).toContain('/splashart/')
  })

  test('does not render a type logo badge for placed cards in fallback mode', () => {
    const board = makeEmptyBoard()
    board[4] = { cardId: 'c11', owner: 'player' }

    renderFallbackBoard({ board, interactive: false })

    expect(screen.queryByTestId('board-cell-4-element-badge')).not.toBeInTheDocument()
    expect(screen.queryByTestId('board-cell-4-poison-badge')).not.toBeInTheDocument()
  })

  test('renders temporary ground debuff visual marker on impacted board cells', () => {
    const board = makeEmptyBoard()
    board[5] = { cardId: 'c47', owner: 'cpu' }

    renderFallbackBoard({ board, transientGroundCells: [5], interactive: false })

    expect(screen.getByTestId('board-cell-5')).toHaveClass('fallback-cell--ground-debuffed')
    expect(screen.getByTestId('board-cell-5-ground-pop')).toHaveTextContent('-1')
    expect(screen.getByTestId('board-cell-5-ground-pop')).toHaveTextContent('ALL')
    expect(screen.getByTestId('board-cell-5-ground-badge')).toHaveTextContent('-1 ALL')
    expect(screen.getByTestId('board-cell-5-ground-badge-logo')).toHaveAttribute(
      'src',
      expect.stringContaining('/ui/match/board-effects/Sol.png'),
    )
  })

  test('renders active sol board effect on the board cell behind the card', () => {
    const board = makeEmptyBoard()
    board[5] = { cardId: 'c47', owner: 'cpu' }
    const effectsView: MatchEffectsViewModel = {
      mode: 'effects',
      globalIndicators: [],
      cellIndicators: {},
      boardCardIndicators: {
        5: [
          {
            key: 'card-ground-volatile',
            icon: '🪨',
            label: 'Sol -1',
            tooltip: 'Sol: -1 temporaire sur toutes les stats.',
            tone: 'debuff',
          },
        ],
      },
      displayStatsByCell: {},
      handIndicatorsByActor: { player: {}, cpu: {} },
      handDisplayStatsByActor: { player: {}, cpu: {} },
      usedOnPoseByActor: { player: {}, cpu: {} },
      laneTypeSlotsByActor: { player: [], cpu: [] },
    }

    renderFallbackBoard({ board, effectsView, interactive: false })

    expect(screen.getByTestId('board-cell-5')).toHaveClass('fallback-cell--ground-active')
    expect(screen.queryByTestId('board-cell-5-ground-active-backdrop')).not.toBeInTheDocument()
  })

  test('renders plante territory aura on the board cell behind the card when plante pack is active', () => {
    const board = makeEmptyBoard()
    board[4] = { cardId: 'c01', owner: 'player' }
    const effectsView: MatchEffectsViewModel = {
      mode: 'effects',
      globalIndicators: [],
      cellIndicators: {},
      boardCardIndicators: {
        4: [
          {
            key: 'card-plante-pack',
            icon: '🌿',
            label: 'Meute +2',
            tooltip: 'Plante: +2 sur toutes les stats.',
            tone: 'buff',
            valueText: '+2',
          },
        ],
      },
      displayStatsByCell: {},
      handIndicatorsByActor: { player: {}, cpu: {} },
      handDisplayStatsByActor: { player: {}, cpu: {} },
      usedOnPoseByActor: { player: {}, cpu: {} },
      laneTypeSlotsByActor: { player: [], cpu: [] },
    }

    renderFallbackBoard({ board, effectsView, interactive: false })

    expect(screen.getByTestId('board-cell-4')).toHaveClass('fallback-cell--plante-pack-active')
    expect(screen.getByTestId('board-cell-4-art')).toBeInTheDocument()
  })

  test('links adjacent plante territory cells with a green bridge visual', () => {
    const board = makeEmptyBoard()
    board[4] = { cardId: 'c01', owner: 'player' }
    board[5] = { cardId: 'c02', owner: 'player' }
    board[8] = { cardId: 'c03', owner: 'player' }
    const effectsView: MatchEffectsViewModel = {
      mode: 'effects',
      globalIndicators: [],
      cellIndicators: {},
      boardCardIndicators: {
        4: [
          {
            key: 'card-plante-pack',
            icon: '🌿',
            label: 'Meute +2',
            tooltip: 'Plante: +2 sur toutes les stats.',
            tone: 'buff',
            valueText: '+2',
          },
        ],
        5: [
          {
            key: 'card-plante-pack',
            icon: '🌿',
            label: 'Meute +2',
            tooltip: 'Plante: +2 sur toutes les stats.',
            tone: 'buff',
            valueText: '+2',
          },
        ],
        8: [
          {
            key: 'card-plante-pack',
            icon: '🌿',
            label: 'Meute +2',
            tooltip: 'Plante: +2 sur toutes les stats.',
            tone: 'buff',
            valueText: '+2',
          },
        ],
      },
      displayStatsByCell: {},
      handIndicatorsByActor: { player: {}, cpu: {} },
      handDisplayStatsByActor: { player: {}, cpu: {} },
      usedOnPoseByActor: { player: {}, cpu: {} },
      laneTypeSlotsByActor: { player: [], cpu: [] },
    }

    renderFallbackBoard({ board, effectsView, interactive: false })

    expect(screen.getByTestId('board-cell-4')).toHaveClass('fallback-cell--plante-link-right')
    expect(screen.getByTestId('board-cell-4')).not.toHaveClass('fallback-cell--plante-link-down')
    expect(screen.getByTestId('board-cell-5')).toHaveClass('fallback-cell--plante-link-down')
    expect(screen.getByTestId('board-cell-5')).not.toHaveClass('fallback-cell--plante-link-right')
    expect(screen.getByTestId('board-cell-8')).not.toHaveClass('fallback-cell--plante-link-right')
    expect(screen.getByTestId('board-cell-8')).not.toHaveClass('fallback-cell--plante-link-down')
  })

  test('renders temporary clash marker on impacted combat cells', () => {
    const board = makeEmptyBoard()
    board[4] = { cardId: 'c47', owner: 'cpu' }

    renderFallbackBoard({ board, transientClashCells: [4], interactive: false })

    expect(screen.getByTestId('board-cell-4')).toHaveClass('fallback-cell--clash')
    expect(screen.getByTestId('board-cell-4-clash-badge')).toHaveTextContent('CHOC')
  })

  test('renders temporary eau cast and penalty markers in fallback mode', () => {
    const board = makeEmptyBoard()
    board[4] = { cardId: 'c43', owner: 'player' }

    renderFallbackBoard({
      board,
      transientFloodCastCells: [2],
      transientWaterPenaltyCells: [4],
      interactive: false,
    })

    expect(screen.getByTestId('board-cell-2')).toHaveClass('fallback-cell--flood-cast')
    expect(screen.getByTestId('board-cell-2-flood-cast-logo')).toHaveAttribute(
      'src',
      expect.stringContaining('/logos-elements/eau.png'),
    )
    expect(screen.getByTestId('board-cell-4')).toHaveClass('fallback-cell--water-penalty')
    expect(screen.getByTestId('board-cell-4-water-penalty-logo')).toHaveAttribute(
      'src',
      expect.stringContaining('/logos-elements/eau.png'),
    )
    expect(screen.getByTestId('board-cell-4-water-penalty-badge')).toHaveTextContent('-2')
  })

  test('renders temporary feu target and cast markers in fallback mode', () => {
    const board = makeEmptyBoard()
    board[1] = { cardId: 'c71', owner: 'cpu' }

    renderFallbackBoard({
      board,
      transientFireTargetCells: [1],
      transientFireCastCells: [1],
      interactive: false,
    })

    expect(screen.getByTestId('board-cell-1')).toHaveClass('fallback-cell--fire-target')
    expect(screen.getByTestId('board-cell-1')).toHaveClass('fallback-cell--fire-cast')
    expect(screen.getByTestId('board-cell-1-fire-target-logo')).toHaveAttribute(
      'src',
      expect.stringContaining('/logos-elements/feu.png'),
    )
    expect(screen.getByTestId('board-cell-1-fire-cast-logo')).toHaveAttribute(
      'src',
      expect.stringContaining('/logos-elements/feu.png'),
    )
  })

  test('renders temporary eau target marker in fallback mode', () => {
    renderFallbackBoard({
      transientFloodTargetCells: [1],
      interactive: false,
    })

    expect(screen.getByTestId('board-cell-1')).toHaveClass('fallback-cell--flood-target')
    expect(screen.getByTestId('board-cell-1-flood-target-logo')).toHaveAttribute(
      'src',
      expect.stringContaining('/logos-elements/eau.png'),
    )
    expect(screen.getByTestId('board-cell-1-flood-target-badge')).toHaveTextContent('CIBLE')
  })

  test('renders temporary glace target, cast and blocked markers in fallback mode', () => {
    renderFallbackBoard({
      transientFreezeTargetCells: [1],
      transientFreezeCastCells: [2],
      transientFreezeBlockedCells: [4],
      interactive: false,
    })

    expect(screen.getByTestId('board-cell-1')).toHaveClass('fallback-cell--freeze-target')
    expect(screen.getByTestId('board-cell-1-freeze-target-logo')).toHaveAttribute(
      'src',
      expect.stringContaining('/logos-elements/glace.png'),
    )
    expect(screen.getByTestId('board-cell-2')).toHaveClass('fallback-cell--freeze-cast')
    expect(screen.getByTestId('board-cell-2-freeze-cast-logo')).toHaveAttribute(
      'src',
      expect.stringContaining('/logos-elements/glace.png'),
    )
    expect(screen.getByTestId('board-cell-4')).toHaveClass('fallback-cell--freeze-blocked')
    expect(screen.getByTestId('board-cell-4-freeze-blocked-badge')).toHaveTextContent('BLOQUEE')
  })

  test('renders a 16-cell fallback grid for 4x4 boards', () => {
    const board = Array.from({ length: 16 }, () => null)
    renderFallbackBoard({ board, interactive: false })

    expect(screen.getAllByRole('gridcell')).toHaveLength(16)
  })

  test('uses neutral board art class for 3x3 fallback only', () => {
    const { rerender } = renderFallbackBoard({ interactive: false })

    const grid = screen.getByRole('grid', { name: 'Match board' })
    expect(grid).toHaveClass('has-neutral-board-art')

    rerender(
      <PixiBoard
        board={Array.from({ length: 16 }, () => null)}
        highlightedCells={[]}
        interactive={false}
        onCellClick={vi.fn()}
        turnActor="player"
        status="active"
      />,
    )

    expect(grid).not.toHaveClass('has-neutral-board-art')
  })

  test('does not render index numbers in empty fallback cells', () => {
    renderFallbackBoard({ interactive: false })

    const firstCell = screen.getByTestId('board-cell-0')
    expect(firstCell).not.toHaveTextContent(/\d/)
  })

  test('applies keyboard target class on focused fallback cell', () => {
    renderFallbackBoard({ focusedCell: 4, interactive: false })

    expect(screen.getByTestId('board-cell-4')).toHaveClass('is-keyboard-target')
    expect(screen.getByTestId('board-cell-3')).not.toHaveClass('is-keyboard-target')
  })

  test('allows clicking an occupied cell when it is explicitly targetable', () => {
    const board = makeEmptyBoard()
    board[1] = { cardId: 'c71', owner: 'cpu' }
    const onCellClick = vi.fn()

    renderFallbackBoard({
      board,
      targetableCells: [1],
      onCellClick,
      interactive: true,
    })

    screen.getByTestId('board-cell-1').click()
    expect(onCellClick).toHaveBeenCalledWith(1)
  })

  test('does not apply keyboard target class when focused cell is null', () => {
    renderFallbackBoard({ focusedCell: null, interactive: false })

    const highlightedCells = screen.getAllByRole('gridcell').filter((cell) => cell.classList.contains('is-keyboard-target'))
    expect(highlightedCells).toHaveLength(0)
  })

  test('applies arena variant classes in fallback mode', () => {
    const { rerender } = renderFallbackBoard({ arenaVariant: 'v1', interactive: false })

    const grid = screen.getByRole('grid', { name: 'Match board' })
    expect(grid).toHaveClass('is-arena-v1')
    expect(grid).not.toHaveClass('is-arena-v2')

    rerender(
      <PixiBoard
        board={makeEmptyBoard()}
        highlightedCells={[]}
        interactive={false}
        onCellClick={vi.fn()}
        turnActor="player"
        status="active"
        arenaVariant="v2"
      />,
    )

    expect(grid).toHaveClass('is-arena-v2')
    expect(grid).not.toHaveClass('is-arena-v1')
  })

  test('renders hazard classes and chips from effects view in fallback mode', () => {
    const effectsView: MatchEffectsViewModel = {
      mode: 'effects',
      globalIndicators: [],
      cellIndicators: {
        2: [{ key: 'cell-flooded', icon: '🌊', label: 'Inondée', tooltip: 'Case inondée.', tone: 'debuff' }],
        3: [{ key: 'cell-frozen', icon: '❄️', label: 'Gelée 2', tooltip: 'Case gelée.', tone: 'debuff', valueText: '2' }],
      },
      boardCardIndicators: {},
      displayStatsByCell: {},
      handIndicatorsByActor: { player: {}, cpu: {} },
      handDisplayStatsByActor: { player: {}, cpu: {} },
      usedOnPoseByActor: { player: {}, cpu: {} },
      laneTypeSlotsByActor: { player: [], cpu: [] },
    }

    renderFallbackBoard({ effectsView, interactive: false })

    expect(screen.getByTestId('board-cell-2')).toHaveClass('fallback-cell--flooded')
    expect(screen.getByTestId('board-cell-3')).toHaveClass('fallback-cell--frozen')
    expect(screen.getByTestId('board-cell-2')).toHaveTextContent('🌊')
    expect(screen.getByTestId('board-cell-3')).toHaveTextContent('❄️')
    expect(screen.getByTestId('board-cell-3-frozen-counter')).toHaveTextContent('2')
  })

  test('renders active display stats and trend classes from effects view', () => {
    const board = makeEmptyBoard()
    board[4] = { cardId: 'c01', owner: 'player' }
    const effectsView: MatchEffectsViewModel = {
      mode: 'effects',
      globalIndicators: [],
      cellIndicators: {},
      boardCardIndicators: {},
      displayStatsByCell: {
        4: {
          top: { value: 4, delta: 2, trend: 'buff' },
          right: { value: 2, delta: -1, trend: 'debuff' },
          bottom: { value: 2, delta: 0, trend: 'neutral' },
          left: { value: 1, delta: -1, trend: 'debuff' },
        },
      },
      handIndicatorsByActor: { player: {}, cpu: {} },
      handDisplayStatsByActor: { player: {}, cpu: {} },
      usedOnPoseByActor: { player: {}, cpu: {} },
      laneTypeSlotsByActor: { player: [], cpu: [] },
    }

    renderFallbackBoard({ board, interactive: true, targetableCells: [4], effectsView })

    expect(screen.getByTestId('board-cell-4-stat-top')).toHaveTextContent('4')
    expect(screen.getByTestId('board-cell-4-stat-top')).toHaveClass('effect-stat--buff')
    expect(screen.getByTestId('board-cell-4-stat-right')).toHaveClass('effect-stat--debuff')
    expect(screen.getByTestId('board-cell-4-stat-bottom')).toHaveClass('effect-stat--neutral')
  })

  test('renders poison class and logo badge for poisoned board card in fallback mode', () => {
    const board = makeEmptyBoard()
    board[4] = { cardId: 'c11', owner: 'cpu' }
    const effectsView: MatchEffectsViewModel = {
      mode: 'effects',
      globalIndicators: [],
      cellIndicators: {},
      boardCardIndicators: {
        4: [{ key: 'card-poison-first-combat', icon: '☠️', label: 'Poison', tooltip: 'Poison actif.', tone: 'debuff' }],
      },
      displayStatsByCell: {
        4: {
          top: { value: 1, delta: -1, trend: 'debuff' },
          right: { value: 1, delta: -1, trend: 'debuff' },
          bottom: { value: 1, delta: -1, trend: 'debuff' },
          left: { value: 2, delta: -1, trend: 'debuff' },
        },
      },
      handIndicatorsByActor: { player: {}, cpu: {} },
      handDisplayStatsByActor: { player: {}, cpu: {} },
      usedOnPoseByActor: { player: {}, cpu: {} },
      laneTypeSlotsByActor: { player: [], cpu: [] },
    }

    renderFallbackBoard({ board, interactive: true, targetableCells: [4], effectsView })

    expect(screen.getByTestId('board-cell-4')).toHaveClass('fallback-cell--poisoned')
    expect(screen.getByTestId('board-cell-4-poison-badge')).toHaveAttribute(
      'src',
      expect.stringContaining('/logos-elements/poison.png'),
    )
    expect(screen.getByTestId('board-cell-4-stat-top')).toHaveTextContent('1')
    expect(screen.getByTestId('board-cell-4-stat-top')).toHaveClass('effect-stat--debuff')
  })

  test('shows hover details with stat changes and remaining turns for placed cards', () => {
    const board = makeEmptyBoard()
    board[4] = { cardId: 'c11', owner: 'cpu' }
    const effectsView: MatchEffectsViewModel = {
      mode: 'effects',
      globalIndicators: [],
      cellIndicators: {},
      boardCardIndicators: {
        4: [{ key: 'card-burn', icon: '🌊', label: 'Eau malus', tooltip: 'Eau: -1 temporaire sur toutes les stats (1 tour).', tone: 'debuff' }],
      },
      displayStatsByCell: {
        4: {
          top: { value: 1, delta: -1, trend: 'debuff' },
          right: { value: 1, delta: -1, trend: 'debuff' },
          bottom: { value: 1, delta: -1, trend: 'debuff' },
          left: { value: 2, delta: -1, trend: 'debuff' },
        },
      },
      handIndicatorsByActor: { player: {}, cpu: {} },
      handDisplayStatsByActor: { player: {}, cpu: {} },
      usedOnPoseByActor: { player: {}, cpu: {} },
      laneTypeSlotsByActor: { player: [], cpu: [] },
    }

    renderFallbackBoard({ board, interactive: true, targetableCells: [4], effectsView })
    const cell = screen.getByTestId('board-cell-4')

    fireEvent.mouseOver(cell)

    expect(screen.getByTestId('board-cell-hover-stats')).toHaveTextContent('-1 ALL')
    expect(screen.getByTestId('board-cell-hover-stats')).toHaveTextContent('⏳')
    expect(screen.getByTestId('board-cell-hover-stats')).toHaveTextContent('1 tour')

    fireEvent.mouseOut(cell)

    expect(screen.queryByTestId('board-cell-hover-stats')).not.toBeInTheDocument()
  })
})
