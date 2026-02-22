export type CardId = string

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type CardCategoryId =
  | 'porteur_de_keyblade'
  | 'antagoniste'
  | 'entite'
  | 'organisation_xiii'
  | 'arme_legendaire'
  | 'mechant_disney'
  | 'sans_coeur'
  | 'simili'
  | 'allie'
  | 'final_fantasy'
  | 'invocation'
  | 'allie_disney'
  | 'nescient'
  | 'reve_mangeur'
  | 'pnj'
  | 'allie_twewy'
  | 'alliee'

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
  | 'neutre'

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

export interface MatchConfig {
  playerDeck: CardId[]
  cpuDeck: CardId[]
  rules: RuleSet
  seed: number
}

export type Actor = 'player' | 'cpu'

export interface Move {
  actor: Actor
  cardId: CardId
  cell: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
}

export interface MatchResult {
  winner: Actor | 'draw'
  playerCount: number
  cpuCount: number
  turns: number
  rules: RuleSet
}

export type RankId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8'

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

export interface DeckSlot {
  id: DeckSlotId
  name: string
  cards: CardId[]
  rules: { same: boolean; plus: boolean }
}

export interface PlayerProfile {
  version: 5
  gold: number
  ownedCardIds: CardId[]
  cardCopiesById: Record<CardId, number>
  packInventoryByRarity: Record<Rarity, number>
  deckSlots: [DeckSlot, DeckSlot, DeckSlot]
  selectedDeckSlotId: DeckSlotId
  stats: { played: number; won: number; streak: number; bestStreak: number }
  achievements: AchievementUnlock[]
  rankRewardsClaimed: RankId[]
  settings: { audioEnabled: false }
}

export type PlayerProfileV5 = PlayerProfile
