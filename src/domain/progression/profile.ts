import { createResetStarterCards, isDeckNameValid, starterDeck, starterOwnedCardIds } from '../cards/decks'
import type {
  AchievementUnlock,
  CardId,
  DeckSlot,
  DeckSlotId,
  PlayerProfile,
  RankedDivision,
  RankedTierId,
  Rarity,
} from '../types'
import { evaluateAchievements, isAchievementId } from './achievements'
import { createInitialRankedState } from './ranked'

export const PROFILE_STORAGE_KEY = 'kh-triple-triad-v1-profile'
const DEFAULT_PLAYER_NAME = 'Joueur'
const MAX_PLAYER_NAME_LENGTH = 20

const deckSlotIds: [DeckSlotId, DeckSlotId, DeckSlotId] = ['slot-1', 'slot-2', 'slot-3']
const packInventoryRarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const legacyRankIds = new Set(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'])
const rankedTierIds = new Set<RankedTierId>([
  'iron',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'emerald',
  'diamond',
  'master',
  'grandmaster',
  'challenger',
])
const rankedDivisions = new Set<RankedDivision>(['IV', 'III', 'II', 'I'])
const tiersWithDivisions = new Set<RankedTierId>(['iron', 'bronze', 'silver', 'gold', 'platinum', 'emerald', 'diamond'])

interface LegacyAchievementUnlock {
  id: string
  unlockedAt: string
}

interface PlayerProfileV1Legacy {
  version: 1
  gold: number
  ownedCardIds: CardId[]
  activeDeck: CardId[]
  lastRules: { same: boolean; plus: boolean }
  stats: { played: number; won: number; streak: number; bestStreak: number }
  achievements: LegacyAchievementUnlock[]
  settings: { audioEnabled: false }
}

interface PlayerProfileV2Legacy {
  version: 2
  gold: number
  ownedCardIds: CardId[]
  deckSlots: [DeckSlot, DeckSlot, DeckSlot]
  selectedDeckSlotId: DeckSlotId
  stats: { played: number; won: number; streak: number; bestStreak: number }
  achievements: LegacyAchievementUnlock[]
  settings: { audioEnabled: false }
}

interface PlayerProfileV3Legacy {
  version: 3
  gold: number
  ownedCardIds: CardId[]
  cardCopiesById: Record<CardId, number>
  deckSlots: [DeckSlot, DeckSlot, DeckSlot]
  selectedDeckSlotId: DeckSlotId
  stats: { played: number; won: number; streak: number; bestStreak: number }
  achievements: LegacyAchievementUnlock[]
  settings: { audioEnabled: false }
}

interface PlayerProfileV4Legacy {
  version: 4
  gold: number
  ownedCardIds: CardId[]
  cardCopiesById: Record<CardId, number>
  packInventoryByRarity: Record<Rarity, number>
  deckSlots: [DeckSlot, DeckSlot, DeckSlot]
  selectedDeckSlotId: DeckSlotId
  stats: { played: number; won: number; streak: number; bestStreak: number }
  achievements: LegacyAchievementUnlock[]
  settings: { audioEnabled: false }
}

interface PlayerProfileV4WithoutPacksLegacy {
  version: 4
  gold: number
  ownedCardIds: CardId[]
  cardCopiesById: Record<CardId, number>
  deckSlots: [DeckSlot, DeckSlot, DeckSlot]
  selectedDeckSlotId: DeckSlotId
  stats: { played: number; won: number; streak: number; bestStreak: number }
  achievements: LegacyAchievementUnlock[]
  settings: { audioEnabled: false }
}

interface PlayerProfileV5Legacy {
  version: 5
  gold: number
  ownedCardIds: CardId[]
  cardCopiesById: Record<CardId, number>
  packInventoryByRarity: Record<Rarity, number>
  deckSlots: [DeckSlot, DeckSlot, DeckSlot]
  selectedDeckSlotId: DeckSlotId
  stats: { played: number; won: number; streak: number; bestStreak: number }
  achievements: AchievementUnlock[]
  rankRewardsClaimed: string[]
  settings: { audioEnabled: false }
}

type PlayerProfileV6WithoutPlayerNameLegacy = Omit<PlayerProfile, 'playerName'>

const legacyCollectionAchievementIds = new Set([
  'owned_11',
  'owned_12',
  'owned_13',
  'owned_14',
  'collector_15',
  'owned_16',
  'owned_17',
  'owned_18',
  'owned_19',
  'owned_20',
])

export function isPlayerNameValid(name: string): { valid: boolean; reason?: string } {
  const normalized = name.trim()
  if (normalized.length < 1 || normalized.length > MAX_PLAYER_NAME_LENGTH) {
    return { valid: false, reason: `Player name must be between 1 and ${MAX_PLAYER_NAME_LENGTH} characters.` }
  }

  return { valid: true }
}

export function createDefaultProfile(): PlayerProfile {
  return createProfileFromStarterCards(starterOwnedCardIds, starterDeck)
}

export function createResetProfile(): PlayerProfile {
  const randomizedStarter = createResetStarterCards()
  return createProfileFromStarterCards(randomizedStarter.starterOwnedCardIds, randomizedStarter.starterDeck)
}

function createProfileFromStarterCards(initialOwnedCardIds: CardId[], initialDeck: CardId[]): PlayerProfile {
  const ownedCardIds = [...initialOwnedCardIds]

  return {
    version: 6,
    playerName: DEFAULT_PLAYER_NAME,
    gold: 100,
    ownedCardIds,
    cardCopiesById: createCardCopiesById(ownedCardIds),
    packInventoryByRarity: createEmptyPackInventoryByRarity(),
    deckSlots: [
      createDeckSlot('slot-1', 'Deck 1', initialDeck, { same: false, plus: false }),
      createDeckSlot('slot-2', 'Deck 2', [], { same: false, plus: false }),
      createDeckSlot('slot-3', 'Deck 3', [], { same: false, plus: false }),
    ],
    selectedDeckSlotId: 'slot-1',
    stats: {
      played: 0,
      won: 0,
      streak: 0,
      bestStreak: 0,
    },
    achievements: [],
    ranked: createInitialRankedState(),
    settings: {
      audioEnabled: false,
    },
  }
}

export function loadProfile(): PlayerProfile {
  const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
  if (!raw) {
    const profile = finalizeLoadedProfile(createDefaultProfile()).profile
    saveProfile(profile)
    return profile
  }

  try {
    const parsed = JSON.parse(raw)

    if (isPlayerProfile(parsed)) {
      const finalized = finalizeLoadedProfile(parsed)
      if (finalized.changed) {
        saveProfile(finalized.profile)
      }
      return finalized.profile
    }

    if (isPlayerProfileV6WithoutPlayerNameLegacy(parsed)) {
      const migrated = finalizeLoadedProfile(migrateProfileV6WithoutPlayerNameToV6(parsed)).profile
      saveProfile(migrated)
      return migrated
    }

    if (isPlayerProfileV5Legacy(parsed)) {
      const migrated = finalizeLoadedProfile(migrateProfileV5ToV6(parsed)).profile
      saveProfile(migrated)
      return migrated
    }

    if (isPlayerProfileV4Legacy(parsed)) {
      const migrated = finalizeLoadedProfile(migrateProfileV5ToV6(migrateProfileV4ToV5(parsed))).profile
      saveProfile(migrated)
      return migrated
    }

    if (isPlayerProfileV4WithoutPacksLegacy(parsed)) {
      const migrated = finalizeLoadedProfile(migrateProfileV5ToV6(migrateProfileV4WithoutPacksToV5(parsed))).profile
      saveProfile(migrated)
      return migrated
    }

    if (isPlayerProfileV3Legacy(parsed)) {
      const migrated = finalizeLoadedProfile(migrateProfileV5ToV6(migrateProfileV3ToV5(parsed))).profile
      saveProfile(migrated)
      return migrated
    }

    if (isPlayerProfileV2Legacy(parsed)) {
      const migrated = finalizeLoadedProfile(migrateProfileV5ToV6(migrateProfileV2ToV5(parsed))).profile
      saveProfile(migrated)
      return migrated
    }

    if (isPlayerProfileV1Legacy(parsed)) {
      const migrated = finalizeLoadedProfile(migrateProfileV5ToV6(migrateProfileV1ToV5(parsed))).profile
      saveProfile(migrated)
      return migrated
    }
  } catch {
    // handled by fallback below
  }

  const fallback = finalizeLoadedProfile(createDefaultProfile()).profile
  saveProfile(fallback)
  return fallback
}

export function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
}

function createDeckSlot(
  id: DeckSlotId,
  name: string,
  cards: CardId[],
  rules: { same: boolean; plus: boolean },
): DeckSlot {
  return {
    id,
    name,
    cards: normalizeDeckCards(cards),
    rules: {
      same: rules.same,
      plus: rules.plus,
    },
  }
}

function normalizeDeckCards(cards: CardId[]): CardId[] {
  const uniqueCards: CardId[] = []

  for (const cardId of cards) {
    if (typeof cardId !== 'string') {
      continue
    }

    if (uniqueCards.includes(cardId)) {
      continue
    }

    uniqueCards.push(cardId)
    if (uniqueCards.length >= 5) {
      break
    }
  }

  return uniqueCards
}

function migrateProfileV1ToV2(profile: PlayerProfileV1Legacy): PlayerProfileV2Legacy {
  return {
    version: 2,
    gold: profile.gold,
    ownedCardIds: [...profile.ownedCardIds],
    deckSlots: [
      createDeckSlot('slot-1', 'Deck 1', profile.activeDeck, {
        same: profile.lastRules.same,
        plus: profile.lastRules.plus,
      }),
      createDeckSlot('slot-2', 'Deck 2', [], { same: false, plus: false }),
      createDeckSlot('slot-3', 'Deck 3', [], { same: false, plus: false }),
    ],
    selectedDeckSlotId: 'slot-1',
    stats: { ...profile.stats },
    achievements: [...profile.achievements],
    settings: { ...profile.settings },
  }
}

function migrateProfileV2ToV3(profile: PlayerProfileV2Legacy): PlayerProfileV3Legacy {
  const ownedCardIds = [...profile.ownedCardIds]

  return {
    version: 3,
    gold: profile.gold,
    ownedCardIds,
    cardCopiesById: createCardCopiesById(ownedCardIds),
    deckSlots: profile.deckSlots.map((slot) =>
      createDeckSlot(slot.id, slot.name, slot.cards, { same: slot.rules.same, plus: slot.rules.plus }),
    ) as [DeckSlot, DeckSlot, DeckSlot],
    selectedDeckSlotId: profile.selectedDeckSlotId,
    stats: { ...profile.stats },
    achievements: [...profile.achievements],
    settings: { ...profile.settings },
  }
}

function migrateProfileV1ToV5(profile: PlayerProfileV1Legacy): PlayerProfileV5Legacy {
  return migrateProfileV2ToV5(migrateProfileV1ToV2(profile))
}

function migrateProfileV2ToV5(profile: PlayerProfileV2Legacy): PlayerProfileV5Legacy {
  return migrateProfileV3ToV5(migrateProfileV2ToV3(profile))
}

function migrateProfileV3ToV5(profile: PlayerProfileV3Legacy): PlayerProfileV5Legacy {
  const baseProfile: PlayerProfileV5Legacy = {
    version: 5,
    gold: profile.gold,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    packInventoryByRarity: createEmptyPackInventoryByRarity(),
    deckSlots: profile.deckSlots.map((slot) =>
      createDeckSlot(slot.id, slot.name, slot.cards, { same: slot.rules.same, plus: slot.rules.plus }),
    ) as [DeckSlot, DeckSlot, DeckSlot],
    selectedDeckSlotId: profile.selectedDeckSlotId,
    stats: { ...profile.stats },
    achievements: [],
    rankRewardsClaimed: [],
    settings: { ...profile.settings },
  }

  return {
    ...baseProfile,
    achievements: migrateAchievementsToV4(baseProfile, profile.achievements),
  }
}

function migrateProfileV4ToV5(profile: PlayerProfileV4Legacy): PlayerProfileV5Legacy {
  return {
    version: 5,
    gold: profile.gold,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    packInventoryByRarity: { ...profile.packInventoryByRarity },
    deckSlots: profile.deckSlots.map((slot) =>
      createDeckSlot(slot.id, slot.name, slot.cards, { same: slot.rules.same, plus: slot.rules.plus }),
    ) as [DeckSlot, DeckSlot, DeckSlot],
    selectedDeckSlotId: profile.selectedDeckSlotId,
    stats: { ...profile.stats },
    achievements: profile.achievements.filter((entry) => isAchievementId(entry.id)) as AchievementUnlock[],
    rankRewardsClaimed: [],
    settings: { ...profile.settings },
  }
}

function migrateProfileV4WithoutPacksToV5(profile: PlayerProfileV4WithoutPacksLegacy): PlayerProfileV5Legacy {
  return {
    version: 5,
    gold: profile.gold,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    packInventoryByRarity: createEmptyPackInventoryByRarity(),
    deckSlots: profile.deckSlots.map((slot) =>
      createDeckSlot(slot.id, slot.name, slot.cards, { same: slot.rules.same, plus: slot.rules.plus }),
    ) as [DeckSlot, DeckSlot, DeckSlot],
    selectedDeckSlotId: profile.selectedDeckSlotId,
    stats: { ...profile.stats },
    achievements: profile.achievements.filter((entry) => isAchievementId(entry.id)) as AchievementUnlock[],
    rankRewardsClaimed: [],
    settings: { ...profile.settings },
  }
}

function migrateProfileV5ToV6(profile: PlayerProfileV5Legacy): PlayerProfile {
  return {
    version: 6,
    playerName: DEFAULT_PLAYER_NAME,
    gold: profile.gold,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    packInventoryByRarity: { ...profile.packInventoryByRarity },
    deckSlots: profile.deckSlots.map((slot) =>
      createDeckSlot(slot.id, slot.name, slot.cards, { same: slot.rules.same, plus: slot.rules.plus }),
    ) as [DeckSlot, DeckSlot, DeckSlot],
    selectedDeckSlotId: profile.selectedDeckSlotId,
    stats: { ...profile.stats },
    achievements: profile.achievements.filter((entry) => isAchievementId(entry.id)) as AchievementUnlock[],
    ranked: createInitialRankedState(),
    settings: { ...profile.settings },
  }
}

function migrateProfileV6WithoutPlayerNameToV6(profile: PlayerProfileV6WithoutPlayerNameLegacy): PlayerProfile {
  return {
    ...profile,
    playerName: DEFAULT_PLAYER_NAME,
  }
}

function finalizeLoadedProfile(profile: PlayerProfile): { profile: PlayerProfile; changed: boolean } {
  const synced = syncAchievements(syncPlayerName(profile))

  return {
    profile: synced,
    changed: synced !== profile,
  }
}

function syncPlayerName(profile: PlayerProfile): PlayerProfile {
  const normalized = profile.playerName.trim()
  if (!isPlayerNameValid(normalized).valid) {
    if (profile.playerName === DEFAULT_PLAYER_NAME) {
      return profile
    }

    return {
      ...profile,
      playerName: DEFAULT_PLAYER_NAME,
    }
  }

  if (normalized === profile.playerName) {
    return profile
  }

  return {
    ...profile,
    playerName: normalized,
  }
}

function syncAchievements(profile: PlayerProfile): PlayerProfile {
  const unlocked = evaluateAchievements(profile)
  if (unlocked.length === 0) {
    return profile
  }

  return {
    ...profile,
    achievements: [...profile.achievements, ...unlocked],
  }
}

function migrateAchievementsToV4(profile: PlayerProfileV5Legacy, legacyAchievements: LegacyAchievementUnlock[]): AchievementUnlock[] {
  const preserved = legacyAchievements.filter(
    (entry) => isAchievementId(entry.id) && !legacyCollectionAchievementIds.has(entry.id),
  ) as AchievementUnlock[]

  const withPreservedOnly = migrateProfileV5ToV6({
    ...profile,
    achievements: preserved,
  })

  const collectionUnlocks = evaluateAchievements(withPreservedOnly)
  return [...preserved, ...collectionUnlocks]
}

function createCardCopiesById(ownedCardIds: CardId[]): Record<CardId, number> {
  const cardCopiesById: Record<CardId, number> = {}

  for (const cardId of ownedCardIds) {
    if (typeof cardId !== 'string') {
      continue
    }

    cardCopiesById[cardId] = 1
  }

  return cardCopiesById
}

function createEmptyPackInventoryByRarity(): Record<Rarity, number> {
  return {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  }
}

function isPlayerProfile(value: unknown): value is PlayerProfile {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PlayerProfile>

  return (
    candidate.version === 6 &&
    typeof candidate.playerName === 'string' &&
    isPlayerNameValid(candidate.playerName).valid &&
    typeof candidate.gold === 'number' &&
    Array.isArray(candidate.ownedCardIds) &&
    candidate.ownedCardIds.every((card) => typeof card === 'string') &&
    isCardCopiesById(candidate.cardCopiesById) &&
    isPackInventoryByRarity(candidate.packInventoryByRarity) &&
    doesOwnershipMatchCopies(candidate.ownedCardIds, candidate.cardCopiesById) &&
    isDeckSlots(candidate.deckSlots) &&
    isDeckSlotId(candidate.selectedDeckSlotId) &&
    typeof candidate.stats?.played === 'number' &&
    typeof candidate.stats?.won === 'number' &&
    typeof candidate.stats?.streak === 'number' &&
    typeof candidate.stats?.bestStreak === 'number' &&
    isAchievementUnlocks(candidate.achievements) &&
    isRankedState(candidate.ranked) &&
    candidate.settings?.audioEnabled === false
  )
}

function isPlayerProfileV6WithoutPlayerNameLegacy(value: unknown): value is PlayerProfileV6WithoutPlayerNameLegacy {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PlayerProfileV6WithoutPlayerNameLegacy> & { playerName?: unknown }

  return (
    candidate.version === 6 &&
    candidate.playerName === undefined &&
    typeof candidate.gold === 'number' &&
    Array.isArray(candidate.ownedCardIds) &&
    candidate.ownedCardIds.every((card) => typeof card === 'string') &&
    isCardCopiesById(candidate.cardCopiesById) &&
    isPackInventoryByRarity(candidate.packInventoryByRarity) &&
    doesOwnershipMatchCopies(candidate.ownedCardIds, candidate.cardCopiesById) &&
    isDeckSlots(candidate.deckSlots) &&
    isDeckSlotId(candidate.selectedDeckSlotId) &&
    typeof candidate.stats?.played === 'number' &&
    typeof candidate.stats?.won === 'number' &&
    typeof candidate.stats?.streak === 'number' &&
    typeof candidate.stats?.bestStreak === 'number' &&
    isAchievementUnlocks(candidate.achievements) &&
    isRankedState(candidate.ranked) &&
    candidate.settings?.audioEnabled === false
  )
}

function isPlayerProfileV5Legacy(value: unknown): value is PlayerProfileV5Legacy {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PlayerProfileV5Legacy>

  return (
    candidate.version === 5 &&
    typeof candidate.gold === 'number' &&
    Array.isArray(candidate.ownedCardIds) &&
    candidate.ownedCardIds.every((card) => typeof card === 'string') &&
    isCardCopiesById(candidate.cardCopiesById) &&
    isPackInventoryByRarity(candidate.packInventoryByRarity) &&
    doesOwnershipMatchCopies(candidate.ownedCardIds, candidate.cardCopiesById) &&
    isDeckSlots(candidate.deckSlots) &&
    isDeckSlotId(candidate.selectedDeckSlotId) &&
    typeof candidate.stats?.played === 'number' &&
    typeof candidate.stats?.won === 'number' &&
    typeof candidate.stats?.streak === 'number' &&
    typeof candidate.stats?.bestStreak === 'number' &&
    isAchievementUnlocks(candidate.achievements) &&
    isLegacyRankRewardsClaimed(candidate.rankRewardsClaimed) &&
    candidate.settings?.audioEnabled === false
  )
}

function isPlayerProfileV4Legacy(value: unknown): value is PlayerProfileV4Legacy {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PlayerProfileV4Legacy>

  return (
    candidate.version === 4 &&
    typeof candidate.gold === 'number' &&
    Array.isArray(candidate.ownedCardIds) &&
    candidate.ownedCardIds.every((card) => typeof card === 'string') &&
    isCardCopiesById(candidate.cardCopiesById) &&
    isPackInventoryByRarity(candidate.packInventoryByRarity) &&
    doesOwnershipMatchCopies(candidate.ownedCardIds, candidate.cardCopiesById) &&
    isDeckSlots(candidate.deckSlots) &&
    isDeckSlotId(candidate.selectedDeckSlotId) &&
    typeof candidate.stats?.played === 'number' &&
    typeof candidate.stats?.won === 'number' &&
    typeof candidate.stats?.streak === 'number' &&
    typeof candidate.stats?.bestStreak === 'number' &&
    isLegacyAchievementUnlocks(candidate.achievements) &&
    candidate.settings?.audioEnabled === false
  )
}

function isPlayerProfileV4WithoutPacksLegacy(value: unknown): value is PlayerProfileV4WithoutPacksLegacy {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PlayerProfileV4WithoutPacksLegacy> & { packInventoryByRarity?: unknown }

  return (
    candidate.version === 4 &&
    typeof candidate.gold === 'number' &&
    Array.isArray(candidate.ownedCardIds) &&
    candidate.ownedCardIds.every((card) => typeof card === 'string') &&
    isCardCopiesById(candidate.cardCopiesById) &&
    candidate.packInventoryByRarity === undefined &&
    doesOwnershipMatchCopies(candidate.ownedCardIds, candidate.cardCopiesById) &&
    isDeckSlots(candidate.deckSlots) &&
    isDeckSlotId(candidate.selectedDeckSlotId) &&
    typeof candidate.stats?.played === 'number' &&
    typeof candidate.stats?.won === 'number' &&
    typeof candidate.stats?.streak === 'number' &&
    typeof candidate.stats?.bestStreak === 'number' &&
    isLegacyAchievementUnlocks(candidate.achievements) &&
    candidate.settings?.audioEnabled === false
  )
}

function isPlayerProfileV3Legacy(value: unknown): value is PlayerProfileV3Legacy {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PlayerProfileV3Legacy>

  return (
    candidate.version === 3 &&
    typeof candidate.gold === 'number' &&
    Array.isArray(candidate.ownedCardIds) &&
    candidate.ownedCardIds.every((card) => typeof card === 'string') &&
    isCardCopiesById(candidate.cardCopiesById) &&
    doesOwnershipMatchCopies(candidate.ownedCardIds, candidate.cardCopiesById) &&
    isDeckSlots(candidate.deckSlots) &&
    isDeckSlotId(candidate.selectedDeckSlotId) &&
    typeof candidate.stats?.played === 'number' &&
    typeof candidate.stats?.won === 'number' &&
    typeof candidate.stats?.streak === 'number' &&
    typeof candidate.stats?.bestStreak === 'number' &&
    isLegacyAchievementUnlocks(candidate.achievements) &&
    candidate.settings?.audioEnabled === false
  )
}

function isPlayerProfileV2Legacy(value: unknown): value is PlayerProfileV2Legacy {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PlayerProfileV2Legacy>

  return (
    candidate.version === 2 &&
    typeof candidate.gold === 'number' &&
    Array.isArray(candidate.ownedCardIds) &&
    candidate.ownedCardIds.every((card) => typeof card === 'string') &&
    isDeckSlots(candidate.deckSlots) &&
    isDeckSlotId(candidate.selectedDeckSlotId) &&
    typeof candidate.stats?.played === 'number' &&
    typeof candidate.stats?.won === 'number' &&
    typeof candidate.stats?.streak === 'number' &&
    typeof candidate.stats?.bestStreak === 'number' &&
    isLegacyAchievementUnlocks(candidate.achievements) &&
    candidate.settings?.audioEnabled === false
  )
}

function isPlayerProfileV1Legacy(value: unknown): value is PlayerProfileV1Legacy {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PlayerProfileV1Legacy>

  return (
    candidate.version === 1 &&
    typeof candidate.gold === 'number' &&
    Array.isArray(candidate.ownedCardIds) &&
    candidate.ownedCardIds.every((card) => typeof card === 'string') &&
    Array.isArray(candidate.activeDeck) &&
    candidate.activeDeck.every((card) => typeof card === 'string') &&
    typeof candidate.lastRules?.same === 'boolean' &&
    typeof candidate.lastRules?.plus === 'boolean' &&
    typeof candidate.stats?.played === 'number' &&
    typeof candidate.stats?.won === 'number' &&
    typeof candidate.stats?.streak === 'number' &&
    typeof candidate.stats?.bestStreak === 'number' &&
    isLegacyAchievementUnlocks(candidate.achievements) &&
    candidate.settings?.audioEnabled === false
  )
}

function isAchievementUnlocks(value: unknown): value is AchievementUnlock[] {
  if (!Array.isArray(value)) {
    return false
  }

  return value.every((entry) => isAchievementId(entry.id) && typeof entry.unlockedAt === 'string')
}

function isLegacyAchievementUnlocks(value: unknown): value is LegacyAchievementUnlock[] {
  if (!Array.isArray(value)) {
    return false
  }

  return value.every((entry) => typeof entry.id === 'string' && typeof entry.unlockedAt === 'string')
}

function isLegacyRankRewardsClaimed(value: unknown): value is string[] {
  if (!Array.isArray(value)) {
    return false
  }

  const unique = new Set(value)
  if (unique.size !== value.length) {
    return false
  }

  return value.every((rankId) => legacyRankIds.has(rankId))
}

function isRankedState(value: unknown): value is PlayerProfile['ranked'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as Partial<PlayerProfile['ranked']>

  if (!candidate.tier || !rankedTierIds.has(candidate.tier as RankedTierId)) {
    return false
  }

  const tier = candidate.tier as RankedTierId
  const expectedDivisionState = tiersWithDivisions.has(tier)

  if (expectedDivisionState) {
    if (!candidate.division || !rankedDivisions.has(candidate.division as RankedDivision)) {
      return false
    }
  } else if (candidate.division !== null) {
    return false
  }

  return (
    Number.isInteger(candidate.lp) &&
    Number(candidate.lp) >= 0 &&
    Number(candidate.lp) <= 99 &&
    Number.isInteger(candidate.wins) &&
    Number(candidate.wins) >= 0 &&
    Number.isInteger(candidate.losses) &&
    Number(candidate.losses) >= 0 &&
    Number.isInteger(candidate.draws) &&
    Number(candidate.draws) >= 0 &&
    Number.isInteger(candidate.matchesPlayed) &&
    Number(candidate.matchesPlayed) >= 0 &&
    (candidate.resultStreak?.type === 'none' || candidate.resultStreak?.type === 'win' || candidate.resultStreak?.type === 'loss') &&
    Number.isInteger(candidate.resultStreak?.count) &&
    Number(candidate.resultStreak?.count) >= 0 &&
    Number.isInteger(candidate.demotionShieldLosses) &&
    Number(candidate.demotionShieldLosses) >= 0
  )
}

function isCardCopiesById(value: unknown): value is Record<CardId, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const entries = Object.entries(value)
  return entries.every(([cardId, copies]) => cardId.length > 0 && Number.isInteger(copies) && copies >= 1)
}

function isPackInventoryByRarity(value: unknown): value is Record<Rarity, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return packInventoryRarities.every((rarity) => Number.isInteger(candidate[rarity]) && Number(candidate[rarity]) >= 0)
}

function doesOwnershipMatchCopies(
  ownedCardIds: CardId[] | undefined,
  cardCopiesById: Record<CardId, number> | undefined,
): boolean {
  if (!ownedCardIds || !cardCopiesById) {
    return false
  }

  const ownedSet = new Set(ownedCardIds)
  if (ownedSet.size !== ownedCardIds.length) {
    return false
  }

  const copySet = new Set(Object.keys(cardCopiesById))
  if (copySet.size !== ownedSet.size) {
    return false
  }

  for (const cardId of ownedSet) {
    if (!copySet.has(cardId)) {
      return false
    }
  }

  return true
}

function isDeckSlotId(value: unknown): value is DeckSlotId {
  return value === 'slot-1' || value === 'slot-2' || value === 'slot-3'
}

function isDeckSlots(value: unknown): value is [DeckSlot, DeckSlot, DeckSlot] {
  if (!Array.isArray(value) || value.length !== 3) {
    return false
  }

  for (let index = 0; index < deckSlotIds.length; index += 1) {
    const slot = value[index] as Partial<DeckSlot> | undefined
    if (!slot || typeof slot !== 'object') {
      return false
    }

    if (slot.id !== deckSlotIds[index]) {
      return false
    }

    if (typeof slot.name !== 'string' || slot.name.trim() !== slot.name) {
      return false
    }

    if (!isDeckNameValid(slot.name).valid) {
      return false
    }

    if (!Array.isArray(slot.cards) || slot.cards.some((card) => typeof card !== 'string')) {
      return false
    }

    if (slot.cards.length > 5 || new Set(slot.cards).size !== slot.cards.length) {
      return false
    }

    if (typeof slot.rules?.same !== 'boolean' || typeof slot.rules?.plus !== 'boolean') {
      return false
    }
  }

  return true
}
