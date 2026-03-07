import type { TowerProgressState, TowerRunState } from './tower/types'

export type CardId = string

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type CardCategoryId =
  | 'sans_coeur'
  | 'simili'
  | 'nescient'
  | 'humain'

export type CardElementId =
  | 'normal'
  | 'feu'
  | 'eau'
  | 'plante'
  | 'electrik'
  | 'glace'
  | 'combat'
  | 'poison'
  | 'sol'
  | 'vol'
  | 'psy'
  | 'insecte'
  | 'roche'
  | 'spectre'
  | 'dragon'
  | 'tenebres'
  | 'acier'
  | 'fee'

export type CardTypeId = 'sans_coeur' | 'simili' | 'nescient' | 'humain'

export type DeckSlotId = 'slot-1' | 'slot-2' | 'slot-3'

export interface CardDef {
  id: CardId
  name: string
  top: number
  right: number
  bottom: number
  left: number
  rarity: Rarity
  categoryId: CardCategoryId
  elementId: CardElementId
}

export interface RuleSet {
  open: boolean
  same: boolean
  plus: boolean
}

export type MatchQueue = 'normal' | 'ranked' | 'tower' | 'tutorial'
export type MatchMode = '3x3' | '4x4'

export interface MatchConfig {
  playerDeck: CardId[]
  cpuDeck: CardId[]
  mode: MatchMode
  rules: RuleSet
  seed: number
  startingTurn?: Actor
  typeSynergy?: MatchTypeSynergyState
  enableElementPowers?: boolean
  strictPowerTargeting?: boolean
}

export type Actor = 'player' | 'cpu'

export interface Move {
  actor: Actor
  cardId: CardId
  cell: number
  powerTarget?: MovePowerTarget
}

export interface MovePowerTarget {
  targetCell?: number
  targetCardCell?: number
}

export interface MatchResult {
  mode: MatchMode
  winner: Actor | 'draw'
  playerCount: number
  cpuCount: number
  turns: number
  rules: RuleSet
  typeSynergy?: MatchTypeSynergyState
  metrics?: MatchMetrics
}

export interface ActorTypeSynergyState {
  primaryTypeId: CardTypeId | null
  secondaryTypeId: CardTypeId | null
}

export interface MatchTypeSynergyState {
  player: ActorTypeSynergyState
  cpu: ActorTypeSynergyState
}

export interface MatchMetrics {
  playsByActor: Record<Actor, number>
  samePlusTriggersByActor: Record<Actor, number>
  cornerPlaysByActor: Record<Actor, number>
}

export type AchievementId =
  | 'match_1'
  | 'match_10'
  | 'match_30'
  | 'match_60'
  | 'win_1'
  | 'win_10'
  | 'win_30'
  | 'win_50'
  | 'streak_3'
  | 'streak_5'
  | 'streak_8'
  | 'cards_10'
  | 'cards_25'
  | 'cards_50'
  | 'cards_100'
  | 'cards_200'
  | 'gold_250'
  | 'gold_1000'
  | 'gold_2000'
  | 'missions_1'
  | 'missions_2'
  | 'missions_3'
  | 'tutorial_base_1'
  | 'tutorial_elements_5'
  | 'tutorial_elements_15'
  | 'ranked_play_1'
  | 'ranked_play_10'
  | 'ranked_win_5'
  | 'ranked_win_20'
  | 'pack_buy_1'
  | 'pack_buy_20'
  | 'pack_open_1'
  | 'pack_open_20'
  | 'special_open_1'
  | 'special_open_10'
  | 'deck_edit_10'
  | 'deck_edit_40'
  | 'shiny_pull_1'
  | 'shiny_craft_1'
  | 'shiny_craft_5'

export interface AchievementUnlock {
  id: AchievementId
  unlockedAt: string
}

export interface AchievementProgress {
  matchesPlayed: number
  matchesWon: number
  currentStreak: number
  bestStreak: number
  cardsAcquired: number
  goldEarned: number
  packsPurchased: number
  packsOpened: number
  specialPacksOpened: number
  missionsCompleted: number
  baseTutorialsCompleted: number
  elementTutorialsCompleted: number
  rankedMatchesPlayed: number
  rankedWins: number
  deckEdits: number
  shinyPulled: number
  shinyCrafted: number
}

export type MissionId = 'm1_type_specialist' | 'm2_combo_practitioner' | 'm3_corner_tactician'

export type MissionReward =
  | { kind: 'gold'; amount: number }
  | { kind: 'pack'; packId: Rarity; amount: number }
  | { kind: 'card'; strategy: 'prefer_non_owned' }

export interface MissionProgress {
  id: MissionId
  progress: number
  target: number
  completed: boolean
  claimed: boolean
}

export interface DeckSlot {
  id: DeckSlotId
  name: string
  mode: MatchMode
  cards: CardId[]
  cards4x4: CardId[]
  rules: { same: boolean; plus: boolean }
}

export type RankedTierId =
  | 'iron'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'challenger'

export type RankedDivision = 'IV' | 'III' | 'II' | 'I'

export interface RankedState {
  tier: RankedTierId
  division: RankedDivision | null
  lp: number
  wins: number
  losses: number
  draws: number
  matchesPlayed: number
  resultStreak: {
    type: 'none' | 'win' | 'loss'
    count: number
  }
  demotionShieldLosses: number
}

export type RankedByMode = Record<MatchMode, RankedState>

export interface TutorialProgress {
  baseCompleted: boolean
  completedElementById: Partial<Record<CardElementId, true>>
}

export interface SpecialPackPityState {
  legendaryFocusChancePercent: number
}

export interface PlayerProfile {
  version: 12
  playerName: string
  gold: number
  ownedCardIds: CardId[]
  cardCopiesById: Record<CardId, number>
  cardFragmentsById: Record<CardId, number>
  shinyCardCopiesById: Record<CardId, number>
  packInventoryByRarity: Record<Rarity, number>
  deckSlots: [DeckSlot, DeckSlot, DeckSlot]
  selectedDeckSlotId: DeckSlotId
  stats: { played: number; won: number; streak: number; bestStreak: number }
  achievementProgress: AchievementProgress
  achievements: AchievementUnlock[]
  achievementRewardsClaimedById: Partial<Record<AchievementId, true>>
  missions: Record<MissionId, MissionProgress>
  missionRewardsGrantedById: Partial<Record<MissionId, true>>
  specialPackPity?: SpecialPackPityState
  rankedByMode: RankedByMode
  tutorialProgress?: TutorialProgress
  towerProgress?: TowerProgressState
  towerRun?: TowerRunState | null
  settings: { audioEnabled: boolean }
}

export type PlayerProfileV8 = PlayerProfile
