import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import type { MatchEffectsViewModel } from '../../domain/match/effectsViewModel'
import { getCard } from '../../domain/cards/cardPool'
import type { Actor } from '../../domain/types'
import { PixiBoard, getPixiRenderResolution, type BoardArenaVariant, type BoardSlot } from './PixiBoard'

function makeEmptyBoard(): Array<BoardSlot | null> {
  return Array.from({ length: 9 }, () => null)
}

function renderFallbackBoard(overrides?: {
  board?: Array<BoardSlot | null>
  highlightedCells?: number[]
  transientGroundCells?: number[]
  transientFloodTargetCells?: number[]
  transientFloodCastCells?: number[]
  transientWaterPenaltyCells?: number[]
  transientClashCells?: number[]
  interactive?: boolean
  turnActor?: Actor
  status?: 'active' | 'finished'
  focusedCell?: number | null
  arenaVariant?: BoardArenaVariant
  effectsView?: MatchEffectsViewModel
}) {
  return render(
    <PixiBoard
      board={overrides?.board ?? makeEmptyBoard()}
      highlightedCells={overrides?.highlightedCells ?? []}
      transientGroundCells={overrides?.transientGroundCells ?? []}
      transientFloodTargetCells={overrides?.transientFloodTargetCells ?? []}
      transientFloodCastCells={overrides?.transientFloodCastCells ?? []}
      transientWaterPenaltyCells={overrides?.transientWaterPenaltyCells ?? []}
      transientClashCells={overrides?.transientClashCells ?? []}
      interactive={overrides?.interactive ?? true}
      onCellClick={vi.fn()}
      turnActor={overrides?.turnActor ?? 'player'}
      status={overrides?.status ?? 'active'}
      focusedCell={overrides?.focusedCell ?? null}
      arenaVariant={overrides?.arenaVariant ?? 'v1'}
      effectsView={overrides?.effectsView}
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

  test('renders a 16-cell fallback grid for 4x4 boards', () => {
    const board = Array.from({ length: 16 }, () => null)
    renderFallbackBoard({ board, interactive: false })

    expect(screen.getAllByRole('gridcell')).toHaveLength(16)
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
        3: [{ key: 'cell-frozen', icon: '❄️', label: 'Gelée', tooltip: 'Case gelée.', tone: 'debuff' }],
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

    renderFallbackBoard({ board, interactive: false, effectsView })

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

    renderFallbackBoard({ board, interactive: false, effectsView })

    expect(screen.getByTestId('board-cell-4')).toHaveClass('fallback-cell--poisoned')
    expect(screen.getByTestId('board-cell-4-poison-badge')).toHaveAttribute(
      'src',
      expect.stringContaining('/logos-elements/poison.png'),
    )
    expect(screen.getByTestId('board-cell-4-stat-top')).toHaveTextContent('1')
    expect(screen.getByTestId('board-cell-4-stat-top')).toHaveClass('effect-stat--debuff')
  })
})
