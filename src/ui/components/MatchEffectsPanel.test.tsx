import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'bun:test'
import type { EffectFeedEntry } from '../../domain/match/effectFeed'
import type { MatchEffectsViewModel } from '../../domain/match/effectsViewModel'
import { MatchEffectsPanel } from './MatchEffectsPanel'

function buildEffectsView(mode: 'normal' | 'effects'): MatchEffectsViewModel {
  return {
    mode,
    globalIndicators:
      mode === 'normal'
        ? [
            {
              key: 'mode-normal',
              icon: '○',
              label: 'NORMAL +1',
              tooltip: 'Mode normal: cartes Normal +1 partout, pouvoirs de type désactivés.',
              tone: 'buff',
            },
          ]
        : [{ key: 'mode-effects', icon: '✨', label: 'Mode effets', tooltip: 'Les pouvoirs de type sont actifs.', tone: 'buff' }],
    cellIndicators:
      mode === 'normal'
        ? {}
        : {
            4: [{ key: 'cell-flooded', icon: '🌊', label: 'EAU', tooltip: 'Case inondée.', tone: 'debuff' }],
          },
    boardCardIndicators: {
      2:
        mode === 'normal'
          ? [{ key: 'card-normal-mode-bonus', icon: '○', label: '+1', tooltip: 'Normal: +1 partout en mode normal.', tone: 'buff' }]
          : [{ key: 'card-burn', icon: '🔥', label: '-1 2T', tooltip: 'Brûlure active.', tone: 'debuff' }],
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
  test('renders normal mode bonus without effect feed noise', () => {
    render(<MatchEffectsPanel effectsView={buildEffectsView('normal')} effectFeed={[]} />)

    expect(screen.getByTestId('match-effects-panel-mode')).toHaveTextContent('EFFETS OFF')
    expect(screen.getByText('Mode normal: les cartes Normal affichent +1 partout.')).toBeInTheDocument()
    expect(screen.getByTestId('match-effects-panel-active')).toHaveTextContent('+1 C3')
    expect(screen.queryByTestId('match-effects-panel-hazards')).not.toBeInTheDocument()
    expect(screen.queryByTestId('match-effects-panel-feed')).not.toBeInTheDocument()
  })

  test('renders compact hazards, active effects and three feed entries in effects mode', () => {
    const feed: EffectFeedEntry[] = [
      { id: '1', text: 'Eau: case 5 inondée.', tone: 'debuff' },
      { id: '2', text: 'Feu: Salamèche -1 partout 2T.', tone: 'debuff' },
      { id: '3', text: 'Roche: bouclier de Racaillou consommé.', tone: 'info' },
      { id: '4', text: 'Cette ligne reste cachée.', tone: 'info' },
    ]
    const effectsView = buildEffectsView('effects')
    effectsView.boardCardIndicators[4] = [
      { key: 'card-rock-shield', icon: '🪨', label: 'SHIELD 1', tooltip: '🛡️ Annule 1 défaite en duel.', tone: 'buff', valueText: '1' },
    ]

    render(<MatchEffectsPanel effectsView={effectsView} effectFeed={feed} />)

    expect(screen.getByTestId('match-effects-panel-mode')).toHaveTextContent('EFFETS ON')
    expect(screen.getByText('Lis le plateau: vert = buff, rouge = nerf, T = durée.')).toBeInTheDocument()
    expect(screen.getByTestId('match-effects-panel-hazards')).toHaveTextContent('EAU C5')
    expect(screen.getByTestId('match-effects-panel-active')).toHaveTextContent('-1 2T C3')
    expect(screen.getByTestId('match-effects-panel-active')).toHaveTextContent('SHIELD 1 C5')
    expect(screen.getByTestId('match-effects-panel-used')).toHaveTextContent('Joueur • Feu')
    expect(screen.getByTestId('match-effects-panel-feed')).toHaveTextContent('Eau: case 5 inondée')
    expect(screen.getByTestId('match-effects-panel-feed')).toHaveTextContent('Feu: Salamèche -1 partout')
    expect(screen.getByTestId('match-effects-panel-feed')).toHaveTextContent('Roche: bouclier de Racaillou consommé')
    expect(screen.getByTestId('match-effects-panel-feed')).not.toHaveTextContent('Cette ligne reste cachée')
  })
})
