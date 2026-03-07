import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'bun:test'
import type { MatchLaneTypeSlot } from '../../domain/match/effectsViewModel'
import { MatchLaneTypeStrip } from './MatchLaneTypeStrip'

function buildSlots(states: Array<'active' | 'used' | 'disabled'>): MatchLaneTypeSlot[] {
  const base: Array<{ cardId: string; elementId: MatchLaneTypeSlot['elementId']; label: string }> = [
    { cardId: 'c17', elementId: 'feu', label: 'Feu' },
    { cardId: 'c03', elementId: 'eau', label: 'Eau' },
    { cardId: 'c12', elementId: 'electrik', label: 'Electrik' },
    { cardId: 'c01', elementId: 'plante', label: 'Plante' },
    { cardId: 'c11', elementId: 'poison', label: 'Poison' },
  ]

  return states.map((state, index) => ({
    slotIndex: index,
    cardId: base[index]?.cardId ?? `cx${index}`,
    elementId: base[index]?.elementId ?? 'normal',
    state,
    effectText: `Effet ${index + 1}`,
    displayLabel: base[index]?.label ?? 'Normal',
  }))
}

describe('MatchLaneTypeStrip', () => {
  test('renders icon strip on one line and exposes effect text via immediate tooltip', async () => {
    const user = userEvent.setup()
    const slots = buildSlots(['active', 'active', 'active', 'active', 'active'])

    render(<MatchLaneTypeStrip actor="player" slots={slots} mode="effects" />)

    const icons = screen.getAllByTestId(/match-lane-type-strip-icon-player-/)
    expect(icons).toHaveLength(5)
    expect(screen.queryByTestId('match-lane-type-strip-description-player')).not.toBeInTheDocument()

    await user.hover(icons[0]!)
    expect(screen.getByTestId('match-lane-type-strip-tooltip-player')).toHaveTextContent('Feu: Effet 1')

    const strip = screen.getByTestId('match-lane-type-strip-player')
    const iconsRow = strip.querySelector('.match-lane-type-strip__icons') as HTMLElement | null
    expect(iconsRow).toBeInTheDocument()
    expect(iconsRow?.style.getPropertyValue('--lane-slot-count')).toBe('5')
  })

  test('applies used/disabled classes and contextual tooltip text', async () => {
    const user = userEvent.setup()
    const slots = buildSlots(['used', 'disabled', 'active', 'active', 'active'])

    render(<MatchLaneTypeStrip actor="cpu" slots={slots} mode="normal" />)

    const usedIcon = screen.getByTestId('match-lane-type-strip-icon-cpu-0')
    const disabledIcon = screen.getByTestId('match-lane-type-strip-icon-cpu-1')

    expect(usedIcon).toHaveClass('is-used')
    expect(disabledIcon).toHaveClass('is-disabled')

    await user.hover(usedIcon)
    const tooltip = screen.getByTestId('match-lane-type-strip-tooltip-cpu')
    expect(tooltip).toHaveTextContent('Mode normal: effets désactivés.')
    expect(tooltip).toHaveTextContent('Type déjà consommé dans cette partie.')
  })
})
