import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import type { EffectFeedEntry } from '../../domain/match/effectFeed'
import type { MatchEffectsViewModel } from '../../domain/match/effectsViewModel'
import { MatchEffectsPanel } from './MatchEffectsPanel'

function buildEffectsView(mode: 'normal' | 'effects'): MatchEffectsViewModel {
  return {
    mode,
    globalIndicators:
      mode === 'normal'
        ? [{ key: 'mode-normal', icon: '⛔', label: 'Mode normal', tooltip: 'Mode normal: effets désactivés.', tone: 'info' }]
        : [{ key: 'mode-effects', icon: '✨', label: 'Mode effets', tooltip: 'Les pouvoirs de type sont actifs.', tone: 'buff' }],
    cellIndicators: {
      4: [{ key: 'cell-flooded', icon: '🌊', label: 'Inondée', tooltip: 'Case inondée.', tone: 'debuff' }],
    },
    boardCardIndicators: {
      2: [{ key: 'card-burn', icon: '🔥', label: 'Brûlure 2', tooltip: 'Brûlure active.', tone: 'debuff' }],
    },
    displayStatsByCell: {},
    handIndicatorsByActor: { player: {}, cpu: {} },
    handDisplayStatsByActor: { player: {}, cpu: {} },
    usedOnPoseByActor: {
      player: { feu: true },
      cpu: {},
    },
    laneTypeSlotsByActor: { player: [], cpu: [] },
  }
}

describe('MatchEffectsPanel', () => {
  test('renders reduced view in normal mode', () => {
    render(<MatchEffectsPanel effectsView={buildEffectsView('normal')} effectFeed={[]} />)

    expect(screen.getByTestId('match-effects-panel-mode')).toHaveTextContent('Mode normal')
    expect(screen.queryByTestId('match-effects-panel-feed')).not.toBeInTheDocument()
  })

  test('renders hazards, active effects and feed in effects mode', () => {
    const feed: EffectFeedEntry[] = [
      { id: '1', text: '🌊 Case 5 inondée.', tone: 'debuff' },
      { id: '2', text: '🔥 Salamèche brûle.', tone: 'debuff' },
    ]

    render(<MatchEffectsPanel effectsView={buildEffectsView('effects')} effectFeed={feed} />)

    expect(screen.getByTestId('match-effects-panel-mode')).toHaveTextContent('Mode effets')
    expect(screen.getByTestId('match-effects-panel-hazards')).toHaveTextContent('Inondée')
    expect(screen.getByTestId('match-effects-panel-active')).toHaveTextContent('Brûlure 2')
    expect(screen.getByTestId('match-effects-panel-used')).toHaveTextContent('feu')
    expect(screen.getByTestId('match-effects-panel-feed')).toHaveTextContent('Case 5 inondée')
    expect(screen.getByTestId('match-effects-panel-feed')).toHaveTextContent('Salamèche brûle')
  })
})
