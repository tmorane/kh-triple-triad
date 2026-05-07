import { describe, expect, test } from 'bun:test'
import { createDefaultProfile } from './profile'
import {
  deriveFirstRunOnboarding,
  deriveLongTermGoals,
  deriveRecommendedActions,
  getReadyMissionCount,
  getTotalOwnedPacks,
} from './engagementLoop'

describe('engagement loop recommendations', () => {
  test('guides a new player into the base tutorial before normal play', () => {
    const profile = createDefaultProfile()

    const onboarding = deriveFirstRunOnboarding(profile)
    const actions = deriveRecommendedActions(profile, { hasCurrentMatch: false })

    expect(onboarding.visible).toBe(true)
    expect(onboarding.primaryAction.id).toBe('start_tutorial')
    expect(onboarding.steps.map((step) => [step.id, step.status])).toEqual([
      ['base_tutorial', 'current'],
      ['first_match', 'locked'],
      ['first_pack', 'locked'],
    ])
    expect(actions[0]?.id).toBe('start_tutorial')
  })

  test('moves tutorial graduates toward their first real match', () => {
    const profile = createDefaultProfile()
    profile.tutorialProgress = {
      baseCompleted: true,
      completedElementById: {},
    }

    const onboarding = deriveFirstRunOnboarding(profile)
    const actions = deriveRecommendedActions(profile, { hasCurrentMatch: false })

    expect(onboarding.visible).toBe(true)
    expect(onboarding.primaryAction.id).toBe('play_normal')
    expect(onboarding.steps.map((step) => [step.id, step.status])).toEqual([
      ['base_tutorial', 'completed'],
      ['first_match', 'current'],
      ['first_pack', 'locked'],
    ])
    expect(actions[0]?.id).toBe('play_normal')
  })

  test('prioritizes claimable missions and unopened packs after play begins', () => {
    const profile = createDefaultProfile()
    profile.tutorialProgress = {
      baseCompleted: true,
      completedElementById: {},
    }
    profile.stats.played = 3
    profile.packInventoryByRarity.common = 2
    profile.missions.m1_type_specialist.completed = true
    profile.missions.m1_type_specialist.progress = profile.missions.m1_type_specialist.target

    expect(getTotalOwnedPacks(profile)).toBe(2)
    expect(getReadyMissionCount(profile)).toBe(1)

    const onboarding = deriveFirstRunOnboarding(profile)
    const actions = deriveRecommendedActions(profile, { hasCurrentMatch: false, lastMatchQueue: 'normal' })

    expect(onboarding.visible).toBe(false)
    expect(actions.map((action) => action.id).slice(0, 3)).toEqual(['claim_missions', 'open_packs', 'play_normal'])
  })

  test('continues active matches before suggesting any meta-progression action', () => {
    const profile = createDefaultProfile()

    const actions = deriveRecommendedActions(profile, { hasCurrentMatch: true })

    expect(actions[0]).toMatchObject({
      id: 'continue_match',
      to: '/match',
    })
  })

  test('exposes long-term goals that support a long replay loop', () => {
    const profile = createDefaultProfile()

    const goals = deriveLongTermGoals(profile)

    expect(goals.map((goal) => goal.id)).toEqual(['collection', 'ranked', 'tower', 'shiny'])
    expect(goals[0]).toMatchObject({
      title: 'Compléter le Pokédex',
      current: profile.ownedCardIds.length,
    })
    expect(goals[1]?.description).toContain('Classé')
  })
})
