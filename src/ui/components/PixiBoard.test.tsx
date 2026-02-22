import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { getCard } from '../../domain/cards/cardPool'
import type { Actor } from '../../domain/types'
import { PixiBoard, type BoardSlot } from './PixiBoard'

function makeEmptyBoard(): Array<BoardSlot | null> {
  return Array.from({ length: 9 }, () => null)
}

function renderFallbackBoard(overrides?: {
  board?: Array<BoardSlot | null>
  highlightedCells?: number[]
  interactive?: boolean
  turnActor?: Actor
  status?: 'active' | 'finished'
}) {
  return render(
    <PixiBoard
      board={overrides?.board ?? makeEmptyBoard()}
      highlightedCells={overrides?.highlightedCells ?? []}
      interactive={overrides?.interactive ?? true}
      onCellClick={vi.fn()}
      turnActor={overrides?.turnActor ?? 'player'}
      status={overrides?.status ?? 'active'}
    />,
  )
}

describe('PixiBoard', () => {
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
})
