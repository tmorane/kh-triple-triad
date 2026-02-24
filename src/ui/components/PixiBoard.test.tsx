import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { getCard } from '../../domain/cards/cardPool'
import type { Actor } from '../../domain/types'
import { PixiBoard, getPixiRenderResolution, type BoardSlot } from './PixiBoard'

function makeEmptyBoard(): Array<BoardSlot | null> {
  return Array.from({ length: 9 }, () => null)
}

function renderFallbackBoard(overrides?: {
  board?: Array<BoardSlot | null>
  highlightedCells?: number[]
  interactive?: boolean
  turnActor?: Actor
  status?: 'active' | 'finished'
  focusedCell?: number | null
}) {
  return render(
    <PixiBoard
      board={overrides?.board ?? makeEmptyBoard()}
      highlightedCells={overrides?.highlightedCells ?? []}
      interactive={overrides?.interactive ?? true}
      onCellClick={vi.fn()}
      turnActor={overrides?.turnActor ?? 'player'}
      status={overrides?.status ?? 'active'}
      focusedCell={overrides?.focusedCell ?? null}
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

  test('renders a 16-cell fallback grid for 4x4 boards', () => {
    const board = Array.from({ length: 16 }, () => null)
    renderFallbackBoard({ board, interactive: false })

    expect(screen.getAllByRole('gridcell')).toHaveLength(16)
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
})
