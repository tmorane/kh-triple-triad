import { createResetStarterCards, isDeckNameValid, starterDeck, starterOwnedCardIds } from '../cards/decks'
import type {
  AchievementUnlock,
  CardId,
  DeckSlot,
  DeckSlotId,
  PlayerProfile,
  RankId,
  Rarity,
} from '../types'
import { evaluateAchievements, isAchievementId } from './achievements'
import { applyRankRewards } from './ranks'

export const PROFILE_STORAGE_KEY = 'kh-triple-triad-v1-profile'

const deckSlotIds: [DeckSlotId, DeckSlotId, DeckSlotId] = ['slot-1', 'slot-2', 'slot-3']
const packInventoryRarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const rankIds: RankId[] = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8']

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
    version: 5,
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
    rankRewardsClaimed: [],
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

    if (isPlayerProfileV4Legacy(parsed)) {
      const migrated = finalizeLoadedProfile(migrateProfileV4ToV5(parsed)).profile
      saveProfile(migrated)
      return migrated
    }

    if (isPlayerProfileV4WithoutPacksLegacy(parsed)) {
      const migrated = finalizeLoadedProfile(migrateProfileV4WithoutPacksToV5(parsed)).profile
      saveProfile(migrated)
      return migrated
    }

    if (isPlayerProfileV3Legacy(parsed)) {
      const migrated = finalizeLoadedProfile(migrateProfileV3ToV5(parsed)).profile
      saveProfile(migrated)
      return migrated
    }

    if (isPlayerProfileV2Legacy(parsed)) {
      const migrated = finalizeLoadedProfile(migrateProfileV2ToV5(parsed)).profile
      saveProfile(migrated)
      return migrated
    }

    if (isPlayerProfileV1Legacy(parsed)) {
      const migrated = finalizeLoadedProfile(migrateProfileV1ToV5(parsed)).profile
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

function migrateProfileV1ToV5(profile: PlayerProfileV1Legacy): PlayerProfile {
  return migrateProfileV2ToV5(migrateProfileV1ToV2(profile))
}

function migrateProfileV2ToV5(profile: PlayerProfileV2Legacy): PlayerProfile {
  return migrateProfileV3ToV5(migrateProfileV2ToV3(profile))
}

function migrateProfileV3ToV5(profile: PlayerProfileV3Legacy): PlayerProfile {
  const baseProfile: PlayerProfile = {
    version: 5,
    gold: profile.gold,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    packInventoryByRarity: createEmptyPackInventoryByRarity(),
    deckSlots: profile.deckSlots.map((slot) =>
      createDeckSlot(slot.id, slot.name, slot.cards, { same: slot.rules.same, plus: slot.rules.plus }),
    ) as PlayerProfile['deckSlots'],
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

function migrateProfileV4ToV5(profile: PlayerProfileV4Legacy): PlayerProfile {
  return {
    version: 5,
    gold: profile.gold,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    packInventoryByRarity: { ...profile.packInventoryByRarity },
    deckSlots: profile.deckSlots.map((slot) =>
      createDeckSlot(slot.id, slot.name, slot.cards, { same: slot.rules.same, plus: slot.rules.plus }),
    ) as PlayerProfile['deckSlots'],
    selectedDeckSlotId: profile.selectedDeckSlotId,
    stats: { ...profile.stats },
    achievements: profile.achievements.filter((entry) => isAchievementId(entry.id)) as AchievementUnlock[],
    rankRewardsClaimed: [],
    settings: { ...profile.settings },
  }
}

function migrateProfileV4WithoutPacksToV5(profile: PlayerProfileV4WithoutPacksLegacy): PlayerProfile {
  return {
    version: 5,
    gold: profile.gold,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    packInventoryByRarity: createEmptyPackInventoryByRarity(),
    deckSlots: profile.deckSlots.map((slot) =>
      createDeckSlot(slot.id, slot.name, slot.cards, { same: slot.rules.same, plus: slot.rules.plus }),
    ) as PlayerProfile['deckSlots'],
    selectedDeckSlotId: profile.selectedDeckSlotId,
    stats: { ...profile.stats },
    achievements: profile.achievements.filter((entry) => isAchievementId(entry.id)) as AchievementUnlock[],
    rankRewardsClaimed: [],
    settings: { ...profile.settings },
  }
}

function finalizeLoadedProfile(profile: PlayerProfile): { profile: PlayerProfile; changed: boolean } {
  const synced = syncAchievements(profile)
  const rewardsApplied = applyRankRewards(synced)

  return {
    profile: rewardsApplied.profile,
    changed: synced !== profile || rewardsApplied.granted.length > 0,
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

function migrateAchievementsToV4(profile: PlayerProfile, legacyAchievements: LegacyAchievementUnlock[]): AchievementUnlock[] {
  const preserved = legacyAchievements.filter(
    (entry) => isAchievementId(entry.id) && !legacyCollectionAchievementIds.has(entry.id),
  ) as AchievementUnlock[]

  const withPreservedOnly: PlayerProfile = {
    ...profile,
    achievements: preserved,
  }

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
    isRankRewardsClaimed(candidate.rankRewardsClaimed) &&
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

  const candidate = value as Partial<PlayerProfileV4WithoutPacksLegacy>

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

function isRankRewardsClaimed(value: unknown): value is RankId[] {
  if (!Array.isArray(value)) {
    return false
  }

  const unique = new Set(value)
  if (unique.size !== value.length) {
    return false
  }

  return value.every((rankId) => rankIds.includes(rankId as RankId))
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
