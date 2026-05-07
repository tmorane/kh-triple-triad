import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { __setCardPoolOverrideForTests } from '../cards/cardPool'
import type { MatchMetrics, MatchTypeSynergyState } from '../types'
import type { MatchState, MoveFlipEvent } from './types'
import { buildCombatCoachMessage } from './combatCoach'

const baseTypeSynergy: MatchTypeSynergyState = {
  player: { primaryTypeId: null, secondaryTypeId: null },
  cpu: { primaryTypeId: null, secondaryTypeId: null },
}

const baseMetrics: MatchMetrics = {
  playsByActor: { player: 0, cpu: 0 },
  samePlusTriggersByActor: { player: 0, cpu: 0 },
  cornerPlaysByActor: { player: 0, cpu: 0 },
}

beforeAll(() => {
  __setCardPoolOverrideForTests([
    {
      id: 'c01',
      name: 'Strong Right',
      top: 1,
      right: 8,
      bottom: 1,
      left: 1,
      rarity: 'common',
      categoryId: 'humain',
      elementId: 'normal',
    },
    {
      id: 'c02',
      name: 'Weak Guard',
      top: 1,
      right: 1,
      bottom: 1,
      left: 2,
      rarity: 'common',
      categoryId: 'humain',
      elementId: 'normal',
    },
    {
      id: 'c03',
      name: 'Water Caller',
      top: 2,
      right: 2,
      bottom: 2,
      left: 2,
      rarity: 'common',
      categoryId: 'humain',
      elementId: 'eau',
    },
  ])
})

afterAll(() => {
  __setCardPoolOverrideForTests(null)
})

function makeState(overrides?: Partial<MatchState>): MatchState {
  return {
    config: {
      playerDeck: ['c01', 'c03'],
      cpuDeck: ['c02'],
      mode: '3x3',
      rules: { open: true, same: false, plus: false },
      seed: 12,
    },
    rules: { open: true, same: false, plus: false },
    typeSynergy: baseTypeSynergy,
    metrics: baseMetrics,
    turn: 'player',
    board: [null, null, { owner: 'cpu', cardId: 'c02' }, null, null, null, null, null, null],
    hands: { player: ['c01', 'c03'], cpu: [] },
    turns: 1,
    status: 'active',
    lastMove: { actor: 'cpu', cardId: 'c02', cell: 2 },
    ...overrides,
  }
}

describe('buildCombatCoachMessage', () => {
  test('keeps finished match guidance short', () => {
    const message = buildCombatCoachMessage({
      state: makeState({
        status: 'finished',
        board: [
          { owner: 'player', cardId: 'c01' },
          { owner: 'player', cardId: 'c01' },
          { owner: 'cpu', cardId: 'c02' },
        ],
        hands: { player: [], cpu: [] },
      }),
      selectedCardId: null,
      focusedCell: null,
      legalMoves: [],
    })

    expect(message.title).toBe('Match termine')
    expect(message.body).toBe('Lis le score, puis continue.')
    expect(message.detail).toBe('Les cartes controlees font le resultat.')
  })

  test('tells the player to choose a card before showing move advice', () => {
    const message = buildCombatCoachMessage({
      state: makeState(),
      selectedCardId: null,
      focusedCell: null,
      legalMoves: [{ actor: 'player', cardId: 'c01', cell: 1 }],
    })

    expect(message.title).toBe('A toi de jouer')
    expect(message.body).toBe('Choisis une carte.')
    expect(message.detail).toBe('Les cases jouables s allument ensuite.')
  })

  test('previews the focused move with a simple capture effect', () => {
    const message = buildCombatCoachMessage({
      state: makeState(),
      selectedCardId: 'c01',
      focusedCell: 1,
      legalMoves: [{ actor: 'player', cardId: 'c01', cell: 1 }],
    })

    expect(message.title).toBe('Pose Strong Right en ↑ haut')
    expect(message.body).toBe('Weak Guard passe chez toi.')
    expect(message.detail).toBe('Weak Guard passe chez toi.')
    expect(message.detail).not.toContain('bat son')
  })

  test('explains a placement with no capture without overloading the player', () => {
    const message = buildCombatCoachMessage({
      state: makeState({
        board: Array.from({ length: 9 }, () => null),
        lastMove: null,
      }),
      selectedCardId: 'c01',
      focusedCell: 4,
      legalMoves: [{ actor: 'player', cardId: 'c01', cell: 4 }],
    })

    expect(message.title).toBe('Pose Strong Right en ○ centre')
    expect(message.body).toBe('Aucune capture.')
    expect(message.detail).toBe('Aucune capture.')
  })

  test('summarizes cpu flips while the player is waiting', () => {
    const flipEvents: MoveFlipEvent[] = [
      { cell: 4, kind: 'flipped', axis: 'horizontal', phase: 'primary' },
      { cell: 7, kind: 'flipped', axis: 'vertical', phase: 'primary' },
    ]

    const message = buildCombatCoachMessage({
      state: makeState({
        turn: 'cpu',
        lastMove: { actor: 'player', cardId: 'c01', cell: 1 },
      }),
      selectedCardId: null,
      focusedCell: null,
      legalMoves: [],
      flipEvents,
    })

    expect(message.title).toBe('Le CPU reflechit')
    expect(message.body).toBe('Ton dernier coup a retourne 2 cartes.')
    expect(message.detail).toBe('Regarde les cartes exposees.')
  })

  test('prioritizes power target guidance over normal placement advice', () => {
    const message = buildCombatCoachMessage({
      state: makeState(),
      selectedCardId: 'c03',
      focusedCell: 4,
      legalMoves: [{ actor: 'player', cardId: 'c03', cell: 4 }],
      powerTargeting: {
        elementId: 'eau',
        targetCells: [5, 8],
      },
    })

    expect(message.title).toBe('Choisis la cible Eau')
    expect(message.body).toBe('La case sera inondee.')
    expect(message.detail).toBe('La case sera inondee.')
    expect(message.detail).not.toContain('Cibles possibles')
    expect(message.detail).not.toContain('→ droite')
  })

  test.each([
    ['glace', 'La case sera gelee.'],
    ['feu', 'La carte brule: -1 partout pendant 1 tour.'],
    ['vol', 'La carte sera affaiblie.'],
    ['psy', 'La carte sera affaiblie.'],
  ] as const)('keeps %s target guidance short', (elementId, detail) => {
    const message = buildCombatCoachMessage({
      state: makeState(),
      selectedCardId: 'c03',
      focusedCell: 4,
      legalMoves: [{ actor: 'player', cardId: 'c03', cell: 4 }],
      powerTargeting: {
        elementId,
        targetCells: [5, 8],
      },
    })

    expect(message.body).toBe(detail)
    expect(message.detail).toBe(detail)
    expect(message.detail).not.toContain('Cibles possibles')
  })

  test('explains pre-placement power targets without listing every target', () => {
    const message = buildCombatCoachMessage({
      state: makeState({
        board: Array.from({ length: 9 }, () => null),
        elementState: {
          enabled: true,
          mode: 'effects',
          strictPowerTargeting: true,
          usedOnPoseByActor: { player: {}, cpu: {} },
          actorTurnCount: { player: 1, cpu: 1 },
          frozenCellByActor: {},
          floodedCell: null,
          poisonedHandByActor: { player: [], cpu: [] },
          boardEffectsByCell: {},
        },
      }),
      selectedCardId: 'c03',
      focusedCell: 0,
      legalMoves: [{ actor: 'player', cardId: 'c03', cell: 0 }],
    })

    expect(message.title).toBe('Pose Water Caller en ↖ haut gauche')
    expect(message.body).toBe('Tu pourras inonder une case.')
    expect(message.detail).toBe('Tu pourras inonder une case.')
    expect(message.detail).not.toContain('cibles possibles')
    expect(message.detail).not.toContain('↗ haut droite')
  })

  test('keeps blocked-card guidance short', () => {
    const message = buildCombatCoachMessage({
      state: makeState(),
      selectedCardId: 'c01',
      focusedCell: null,
      legalMoves: [],
    })

    expect(message.title).toBe('Strong Right bloque')
    expect(message.body).toBe('Aucune case jouable.')
    expect(message.detail).toBe('Choisis une autre carte.')
  })

  test('keeps the cpu recap visible before selected-card advice after a cpu capture', () => {
    const message = buildCombatCoachMessage({
      state: makeState({
        lastMove: { actor: 'cpu', cardId: 'c02', cell: 2 },
      }),
      selectedCardId: 'c01',
      focusedCell: 1,
      legalMoves: [{ actor: 'player', cardId: 'c01', cell: 1 }],
      flipEvents: [{ cell: 4, kind: 'flipped', axis: 'vertical', phase: 'primary' }],
    })

    expect(message.title).toBe('CPU a joue Weak Guard en ↗ haut droite')
    expect(message.body).toBe('CPU retourne 1 carte.')
    expect(message.detail).toBe('Reprends une carte faible adjacente.')
  })

  test('keeps every coach description concise', () => {
    const messages = [
      buildCombatCoachMessage({
        state: makeState({ status: 'finished', hands: { player: [], cpu: [] } }),
        selectedCardId: null,
        focusedCell: null,
        legalMoves: [],
      }),
      buildCombatCoachMessage({
        state: makeState(),
        selectedCardId: null,
        focusedCell: null,
        legalMoves: [{ actor: 'player', cardId: 'c01', cell: 1 }],
      }),
      buildCombatCoachMessage({
        state: makeState(),
        selectedCardId: 'c01',
        focusedCell: 1,
        legalMoves: [{ actor: 'player', cardId: 'c01', cell: 1 }],
      }),
      buildCombatCoachMessage({
        state: makeState(),
        selectedCardId: 'c03',
        focusedCell: 4,
        legalMoves: [{ actor: 'player', cardId: 'c03', cell: 4 }],
        powerTargeting: { elementId: 'eau', targetCells: [5, 8] },
      }),
    ]

    for (const message of messages) {
      expect(message.detail.length).toBeLessThanOrEqual(75)
      expect(message.detail).not.toContain('cibles possibles')
      expect(message.detail).not.toContain('Cibles possibles')
    }
  })
})
