import { cardPool } from '../cards/cardPool'
import type { MatchQueue, PlayerProfile, Rarity } from '../types'
import { getPackPrice } from './shop'

export type EngagementActionId =
  | 'continue_match'
  | 'start_tutorial'
  | 'play_normal'
  | 'claim_missions'
  | 'open_packs'
  | 'buy_pack'
  | 'edit_deck'
  | 'play_ranked'
  | 'start_tower'
  | 'view_collection'

export interface EngagementAction {
  id: EngagementActionId
  title: string
  description: string
  to: string
}

export type OnboardingStepStatus = 'locked' | 'current' | 'completed'
export type OnboardingStepId = 'base_tutorial' | 'first_match' | 'first_pack'

export interface OnboardingStep {
  id: OnboardingStepId
  title: string
  description: string
  status: OnboardingStepStatus
}

export interface FirstRunOnboarding {
  visible: boolean
  title: string
  description: string
  primaryAction: EngagementAction
  steps: OnboardingStep[]
}

export interface EngagementState {
  hasCurrentMatch: boolean
  lastMatchQueue?: MatchQueue | null
  towerRunActive?: boolean
}

export interface LongTermGoal {
  id: 'collection' | 'ranked' | 'tower' | 'shiny'
  title: string
  description: string
  current: number
  target: number
  to: string
}

const packRarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

export function getTotalOwnedPacks(profile: PlayerProfile): number {
  return packRarities.reduce((sum, rarity) => sum + (profile.packInventoryByRarity[rarity] ?? 0), 0)
}

export function getReadyMissionCount(profile: PlayerProfile): number {
  return Object.values(profile.missions).filter((mission) => mission.completed && !mission.claimed).length
}

export function deriveFirstRunOnboarding(profile: PlayerProfile): FirstRunOnboarding {
  const baseTutorialCompleted = profile.tutorialProgress?.baseCompleted === true
  const firstMatchCompleted = profile.stats.played > 0
  const firstPackCompleted = profile.achievementProgress.packsOpened > 0
  const visible = !baseTutorialCompleted || !firstMatchCompleted
  const primaryAction = !baseTutorialCompleted
    ? actionById.start_tutorial
    : !firstMatchCompleted
      ? actionById.play_normal
      : getTotalOwnedPacks(profile) > 0
        ? actionById.open_packs
        : actionById.play_normal

  return {
    visible,
    title: 'Premiers pas',
    description: 'Une courte route pour comprendre la boucle: apprendre, jouer, récupérer, améliorer.',
    primaryAction,
    steps: [
      {
        id: 'base_tutorial',
        title: 'Comprendre les bases',
        description: 'Pose, capture, score final.',
        status: baseTutorialCompleted ? 'completed' : 'current',
      },
      {
        id: 'first_match',
        title: 'Lancer un vrai match',
        description: 'Gagne de l’or, des fragments et de la progression de mission.',
        status: firstMatchCompleted ? 'completed' : baseTutorialCompleted ? 'current' : 'locked',
      },
      {
        id: 'first_pack',
        title: 'Ouvrir un pack',
        description: 'Transforme tes gains en nouvelles cartes et doublons utiles.',
        status: firstPackCompleted ? 'completed' : firstMatchCompleted && getTotalOwnedPacks(profile) > 0 ? 'current' : 'locked',
      },
    ],
  }
}

export function deriveRecommendedActions(profile: PlayerProfile, state: EngagementState): EngagementAction[] {
  const actions: EngagementAction[] = []
  if (state.hasCurrentMatch) {
    actions.push(actionById.continue_match)
    return actions
  }

  const baseTutorialCompleted = profile.tutorialProgress?.baseCompleted === true
  const readyMissionCount = getReadyMissionCount(profile)
  const totalPacks = getTotalOwnedPacks(profile)

  if (!baseTutorialCompleted) {
    actions.push(actionById.start_tutorial)
  }

  if (readyMissionCount > 0) {
    actions.push(withDescription(actionById.claim_missions, `${readyMissionCount} mission${readyMissionCount === 1 ? '' : 's'} prête${readyMissionCount === 1 ? '' : 's'} à récupérer.`))
  }

  if (totalPacks > 0) {
    actions.push(withDescription(actionById.open_packs, `${totalPacks} pack${totalPacks === 1 ? '' : 's'} en attente.`))
  }

  if (baseTutorialCompleted || profile.stats.played > 0 || actions.length === 0) {
    actions.push(actionById.play_normal)
  }

  if (profile.gold >= getPackPrice('common')) {
    actions.push(actionById.buy_pack)
  }

  actions.push(actionById.edit_deck)

  if (profile.stats.played >= 3) {
    actions.push(actionById.play_ranked)
  }

  if (state.towerRunActive || profile.stats.won >= 5) {
    actions.push(state.towerRunActive ? withDescription(actionById.start_tower, 'Reprends ton run actif et vise le prochain palier.') : actionById.start_tower)
  }

  actions.push(actionById.view_collection)

  return dedupeActions(actions).slice(0, 5)
}

export function deriveLongTermGoals(profile: PlayerProfile): LongTermGoal[] {
  const ownedCards = profile.ownedCardIds.length
  const ranked = profile.rankedByMode['3x3']
  const shinyCopies = Object.values(profile.shinyCardCopiesById).reduce((sum, count) => sum + count, 0)
  const towerProgress = profile.towerProgress

  return [
    {
      id: 'collection',
      title: 'Compléter le Pokédex',
      description: 'Chaque match alimente fragments, packs, doublons et shiny.',
      current: ownedCards,
      target: cardPool.length,
      to: '/pokedex',
    },
    {
      id: 'ranked',
      title: 'Grimper en Classé',
      description: `Classé 3X3: ${ranked.lp}/100 LP avant la prochaine tension de rang.`,
      current: ranked.lp,
      target: 100,
      to: '/ranks',
    },
    {
      id: 'tower',
      title: 'Monter la Tour',
      description: 'Runs longs, reliques, checkpoints et choix de deck entre les étages.',
      current: towerProgress?.highestClearedFloor ?? 0,
      target: 100,
      to: '/setup',
    },
    {
      id: 'shiny',
      title: 'Chasser les shiny',
      description: 'Transforme les doublons et les ouvertures rares en objectifs de collection longue durée.',
      current: shinyCopies,
      target: cardPool.length,
      to: '/pokedex',
    },
  ]
}

const actionById: Record<EngagementActionId, EngagementAction> = {
  continue_match: {
    id: 'continue_match',
    title: 'Continuer le match',
    description: 'Une partie est déjà en cours.',
    to: '/match',
  },
  start_tutorial: {
    id: 'start_tutorial',
    title: 'Faire le tutoriel',
    description: 'Deux minutes pour comprendre captures, score et rythme.',
    to: '/rules',
  },
  play_normal: {
    id: 'play_normal',
    title: 'Lancer un match',
    description: 'Le coeur de la boucle: jouer, gagner, améliorer.',
    to: '/setup',
  },
  claim_missions: {
    id: 'claim_missions',
    title: 'Récupérer les missions',
    description: 'Des récompenses t’attendent.',
    to: '/missions',
  },
  open_packs: {
    id: 'open_packs',
    title: 'Ouvrir les packs',
    description: 'Convertis tes gains en cartes.',
    to: '/packs',
  },
  buy_pack: {
    id: 'buy_pack',
    title: 'Acheter un pack',
    description: 'Assez d’or pour tenter une ouverture.',
    to: '/shop',
  },
  edit_deck: {
    id: 'edit_deck',
    title: 'Améliorer le deck',
    description: 'Ajuste tes types et tes cartes fortes avant la prochaine série.',
    to: '/decks',
  },
  play_ranked: {
    id: 'play_ranked',
    title: 'Tenter le Classé',
    description: 'Quand les matchs normaux deviennent faciles, le rang prend le relais.',
    to: '/setup',
  },
  start_tower: {
    id: 'start_tower',
    title: 'Pousser la Tour',
    description: 'Un run plus long avec reliques, paliers et décisions entre étages.',
    to: '/setup',
  },
  view_collection: {
    id: 'view_collection',
    title: 'Voir la collection',
    description: 'Repère les cartes à fragmenter, crafter ou viser en pack.',
    to: '/pokedex',
  },
}

function withDescription(action: EngagementAction, description: string): EngagementAction {
  return {
    ...action,
    description,
  }
}

function dedupeActions(actions: EngagementAction[]): EngagementAction[] {
  const seen = new Set<EngagementActionId>()
  return actions.filter((action) => {
    if (seen.has(action.id)) {
      return false
    }
    seen.add(action.id)
    return true
  })
}
