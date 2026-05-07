import { describe, expect, test } from 'bun:test'
import { resolveCombatPhase } from './combatPhase'

describe('resolveCombatPhase', () => {
  test('prioritizes power targeting over normal placement', () => {
    expect(
      resolveCombatPhase({
        status: 'active',
        turn: 'player',
        powerTargeting: true,
        duelActive: false,
        resultActive: false,
        starterRevealComplete: true,
      }),
    ).toBe('power')
  })

  test('shows duel before result while comparison overlay is active', () => {
    expect(
      resolveCombatPhase({
        status: 'active',
        turn: 'player',
        powerTargeting: false,
        duelActive: true,
        resultActive: true,
        starterRevealComplete: true,
      }),
    ).toBe('duel')
  })

  test('shows result while flip animation remains visible', () => {
    expect(
      resolveCombatPhase({
        status: 'active',
        turn: 'player',
        powerTargeting: false,
        duelActive: false,
        resultActive: true,
        starterRevealComplete: true,
      }),
    ).toBe('result')
  })

  test('shows cpu while the opponent owns the turn or starter reveal is pending', () => {
    expect(
      resolveCombatPhase({
        status: 'active',
        turn: 'cpu',
        powerTargeting: false,
        duelActive: false,
        resultActive: false,
        starterRevealComplete: true,
      }),
    ).toBe('cpu')

    expect(
      resolveCombatPhase({
        status: 'active',
        turn: 'player',
        powerTargeting: false,
        duelActive: false,
        resultActive: false,
        starterRevealComplete: false,
      }),
    ).toBe('cpu')
  })

  test('falls back to placement during an active player turn', () => {
    expect(
      resolveCombatPhase({
        status: 'active',
        turn: 'player',
        powerTargeting: false,
        duelActive: false,
        resultActive: false,
        starterRevealComplete: true,
      }),
    ).toBe('pose')
  })

  test('finished match stays on result', () => {
    expect(
      resolveCombatPhase({
        status: 'finished',
        turn: 'player',
        powerTargeting: false,
        duelActive: false,
        resultActive: false,
        starterRevealComplete: true,
      }),
    ).toBe('result')
  })
})
