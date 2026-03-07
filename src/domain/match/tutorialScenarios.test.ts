import { describe, expect, test } from 'bun:test'
import { cardPool } from '../cards/cardPool'
import { ELEMENT_EFFECT_ORDERED_IDS } from './elementEffectsCatalog'
import {
  BASE_TUTORIAL_SCENARIO_ID,
  buildElementTutorialScenarioId,
  listElementTutorialScenarioIds,
  resolveTutorialScenario,
} from './tutorialScenarios'

describe('tutorialScenarios', () => {
  test('resolves base tutorial with pedagogical objective steps and powers disabled', () => {
    const scenario = resolveTutorialScenario(BASE_TUTORIAL_SCENARIO_ID)
    const playerSteps = scenario.steps.filter((step) => step.actor === 'player')
    const objectivePlayerSteps = playerSteps.filter((step) => Boolean(step.objective))

    expect(scenario.id).toBe(BASE_TUTORIAL_SCENARIO_ID)
    expect(scenario.enableElementPowers).toBe(false)
    expect(scenario.playerDeck).toEqual(['c01', 'c03', 'c26', 'c32', 'c17'])
    expect(scenario.cpuDeck).toEqual(['c50', 'c10', 'c06', 'c07', 'c04'])
    expect(scenario.playerDeck).toHaveLength(5)
    expect(scenario.cpuDeck).toHaveLength(5)
    expect(scenario.steps).toHaveLength(9)
    expect(objectivePlayerSteps.length).toBeGreaterThan(0)
    expect(objectivePlayerSteps.every((step) => step.objective!.allowedCells.length > 0)).toBe(true)
    expect(playerSteps.every((step) => step.why.length > 0)).toBe(true)
    expect(objectivePlayerSteps.some((step) => (step.objective?.allowedCardIds?.length ?? 0) > 0)).toBe(true)
  })

  test('provides one element tutorial scenario per ordered element id', () => {
    const scenarioIds = listElementTutorialScenarioIds()
    const expectedIds = ELEMENT_EFFECT_ORDERED_IDS.map((elementId) => buildElementTutorialScenarioId(elementId))

    expect(scenarioIds).toEqual(expectedIds)
  })

  test('builds 5-card element decks and duplicates when element pool is smaller than 5 cards', () => {
    const glaceScenario = resolveTutorialScenario(buildElementTutorialScenarioId('glace'))
    const playerSteps = glaceScenario.steps.filter((step) => step.actor === 'player')
    const glacePoolSize = cardPool.filter((card) => card.elementId === 'glace').length

    expect(glaceScenario.playerDeck).toHaveLength(5)
    expect(new Set(glaceScenario.playerDeck).size).toBe(Math.min(5, glacePoolSize))
    expect(glaceScenario.enableElementPowers).toBe(true)
    expect(playerSteps.every((step) => step.objective === undefined)).toBe(true)
  })

  test('starts each element tutorial with a block explaining the type specificity', () => {
    const scenario = resolveTutorialScenario(buildElementTutorialScenarioId('poison'))
    const firstStep = scenario.steps[0]

    expect(firstStep?.actor).toBe('player')
    if (!firstStep || firstStep.actor !== 'player') {
      return
    }
    expect(firstStep.chapterLabel).toBe('Lecon 1/2 - Specificite poison')
    expect(firstStep.hint).toContain('case 5')
    expect(firstStep.why).toContain('main adverse')
    expect(firstStep.hint).not.toMatch(/Pose 1x|Passif|Entree/)
    expect(firstStep.why).not.toMatch(/Pose 1x|Passif|Entree/)
  })

  test('starts fire tutorial with cpu first so the player can react to an existing target', () => {
    const scenario = resolveTutorialScenario(buildElementTutorialScenarioId('feu'))
    const firstStep = scenario.steps[0]
    const firstPlayerStep = scenario.steps.find((step) => step.actor === 'player')

    expect(firstStep?.actor).toBe('cpu')
    if (!firstStep || firstStep.actor !== 'cpu') {
      return
    }
    expect(firstStep.chapterLabel).toBe('Lecon 1/2 - Specificite feu')
    expect(firstStep.hint).toContain('Le CPU commence')
    expect(firstPlayerStep?.actor).toBe('player')
    if (!firstPlayerStep || firstPlayerStep.actor !== 'player') {
      return
    }
    expect(firstPlayerStep.move.cell).toBe(4)
  })
})
