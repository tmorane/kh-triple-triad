import type { TowerProgressState, TowerRunState } from './tower/types'

export type CardId = string

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type CardCategoryId =
  | 'sans_coeur'
  | 'simili'
  | 'nescient'
  | 'humain'

export type CardElementId =
  | 'lumiere'
  | 'tenebres'
  | 'feu'
  | 'glace'
  | 'foudre'
  | 'eau'
  | 'vent'
  | 'terre'
  | 'magie'
  | 'neant'
  | 'lune'
  | 'fleur'
  | 'temps'
  | 'espace'
  | 'illusion'
  | 'soin'
  | 'poison'
  | 'aube'
  | 'neutre'

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
  open: true
  same: boolean
  plus: boolean
}

export type MatchQueue = 'normal' | 'ranked' | 'tower'
export type MatchMode = '3x3' | '4x4'

export interface MatchConfig {
  playerDeck: CardId[]
  cpuDeck: CardId[]
  mode: MatchMode
  rules: RuleSet
  seed: number
  startingTurn?: Actor
  typeSynergy?: MatchTypeSynergyState
}

export type Actor = 'player' | 'cpu'

export interface Move {
  actor: Actor
  cardId: CardId
  cell: number
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
  | 'play_1'
  | 'play_3'
  | 'play_5'
  | 'play_10'
  | 'play_20'
  | 'play_30'
  | 'play_50'
  | 'play_75'
  | 'first_win'
  | 'tactician_margin_3'
  | 'wins_5'
  | 'wins_10'
  | 'wins_20'
  | 'wins_30'
  | 'wins_45'
  | 'wins_60'
  | 'streak_2'
  | 'win_streak_3'
  | 'streak_4'
  | 'streak_5'
  | 'streak_7'
  | 'streak_10'
  | 'owned_15'
  | 'owned_30'
  | 'owned_45'
  | 'owned_60'
  | 'owned_75'
  | 'owned_90'
  | 'owned_105'
  | 'owned_120'
  | 'owned_135'
  | 'owned_150'
  | 'gold_150'
  | 'gold_200'
  | 'gold_300'
  | 'gold_450'
  | 'gold_600'
  | 'gold_800'
  | 'gold_1000'
  | 'rule_scholar'

export interface AchievementUnlock {
  id: AchievementId
  unlockedAt: string
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
  | 'emerald'
  | 'diamond'
  | 'master'
  | 'grandmaster'
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

export interface SpecialPackPityState {
  legendaryFocusChancePercent: number
}

export interface PlayerProfile {
  version: 9
  playerName: string
  gold: number
  ownedCardIds: CardId[]
  cardCopiesById: Record<CardId, number>
  packInventoryByRarity: Record<Rarity, number>
  deckSlots: [DeckSlot, DeckSlot, DeckSlot]
  selectedDeckSlotId: DeckSlotId
  stats: { played: number; won: number; streak: number; bestStreak: number }
  achievements: AchievementUnlock[]
  missions: Record<MissionId, MissionProgress>
  specialPackPity?: SpecialPackPityState
  rankedByMode: RankedByMode
  towerProgress?: TowerProgressState
  towerRun?: TowerRunState | null
  settings: { audioEnabled: boolean }
}

export type PlayerProfileV8 = PlayerProfile
