import { createResetStarterCards, isDeckNameValid, starterDeck, starterOwnedCardIds } from '../cards/decks'
import { ELEMENT_EFFECT_ORDERED_IDS } from '../match/elementEffectsCatalog'
import type {
  AchievementProgress,
  AchievementUnlock,
  CardElementId,
  CardId,
  DeckSlot,
  DeckSlotId,
  MatchMode,
  MissionId,
  PlayerProfile,
  RankedDivision,
  RankedState,
  RankedTierId,
  Rarity,
} from '../types'
import { evaluateAchievements, isAchievementId } from './achievements'
import { createInitialMissionsProgress } from './missions'
import { createInitialRankedState } from './ranked'

export const PROFILE_STORAGE_KEY = 'kh-triple-triad-v1-profile'
const STORED_PROFILES_STORAGE_KEY = 'kh-triple-triad-v1-profiles'
const STORED_PROFILES_VERSION = 1
const DEFAULT_PLAYER_NAME = 'Joueur'
const MAX_PLAYER_NAME_LENGTH = 20

const deckSlotIds: [DeckSlotId, DeckSlotId, DeckSlotId] = ['slot-1', 'slot-2', 'slot-3']
const DECK_SIZE_3X3 = 5
const DECK_SIZE_4X4 = 8
const DEFAULT_DECK_SLOT_MODE: MatchMode = '4x4'
const LEGENDARY_FOCUS_PITY_BASE_CHANCE_PERCENT = 1
const LEGENDARY_FOCUS_PITY_MAX_CHANCE_PERCENT = 100
const packInventoryRarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const missionIds: MissionId[] = ['m1_type_specialist', 'm2_combo_practitioner', 'm3_corner_tactician']
const tutorialElementIds = new Set<string>(ELEMENT_EFFECT_ORDERED_IDS)
const legacyRankIds = new Set(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'])
const rankedTierIds = new Set<RankedTierId>([
  'iron',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'challenger',
])
const rankedDivisions = new Set<RankedDivision>(['IV', 'III', 'II', 'I'])
const tiersWithDivisions = new Set<RankedTierId>(['iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond'])

interface LegacyAchievementUnlock {
  id: string
  unlockedAt: string
}

interface LegacyDeckSlot {
  id: DeckSlotId
  name: string
  mode?: MatchMode
  cards: CardId[]
  cards4x4?: CardId[]
  rules: { same: boolean; plus: boolean }
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
  deckSlots: [LegacyDeckSlot, LegacyDeckSlot, LegacyDeckSlot]
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
  deckSlots: [LegacyDeckSlot, LegacyDeckSlot, LegacyDeckSlot]
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
  deckSlots: [LegacyDeckSlot, LegacyDeckSlot, LegacyDeckSlot]
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
  deckSlots: [LegacyDeckSlot, LegacyDeckSlot, LegacyDeckSlot]
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
  deckSlots: [LegacyDeckSlot, LegacyDeckSlot, LegacyDeckSlot]
  selectedDeckSlotId: DeckSlotId
  stats: { played: number; won: number; streak: number; bestStreak: number }
  achievements: AchievementUnlock[]
  rankRewardsClaimed: string[]
  settings: { audioEnabled: false }
}

interface PlayerProfileV6Legacy {
  version: 6
  playerName: string
  gold: number
  ownedCardIds: CardId[]
  cardCopiesById: Record<CardId, number>
  packInventoryByRarity: Record<Rarity, number>
  deckSlots: [DeckSlot, DeckSlot, DeckSlot]
  selectedDeckSlotId: DeckSlotId
  stats: { played: number; won: number; streak: number; bestStreak: number }
  achievements: AchievementUnlock[]
  ranked: RankedState
  settings: { audioEnabled: false }
}

interface PlayerProfileV6WithoutCards4x4Legacy extends Omit<PlayerProfileV6Legacy, 'deckSlots'> {
  deckSlots: [LegacyDeckSlot, LegacyDeckSlot, LegacyDeckSlot]
}

type PlayerProfileV6WithoutPlayerNameLegacy = Omit<PlayerProfileV6WithoutCards4x4Legacy, 'playerName'>

interface PlayerProfileV7Legacy
  extends Omit<
    PlayerProfile,
    | 'version'
    | 'rankedByMode'
    | 'cardFragmentsById'
    | 'shinyCardCopiesById'
    | 'achievementProgress'
    | 'missionRewardsGrantedById'
    | 'achievementRewardsClaimedById'
  > {
  version: 7
  ranked: RankedState
}

interface PlayerProfileV8Legacy
  extends Omit<
    PlayerProfile,
    | 'version'
    | 'settings'
    | 'cardFragmentsById'
    | 'shinyCardCopiesById'
    | 'achievementProgress'
    | 'missionRewardsGrantedById'
    | 'achievementRewardsClaimedById'
  > {
  version: 8
  settings: { audioEnabled: false }
}

interface PlayerProfileV9Legacy
  extends Omit<
    PlayerProfile,
    'version' | 'cardFragmentsById' | 'shinyCardCopiesById' | 'achievementProgress' | 'missionRewardsGrantedById' | 'achievementRewardsClaimedById'
  > {
  version: 9
}

interface PlayerProfileV10Legacy
  extends Omit<PlayerProfile, 'version' | 'cardFragmentsById' | 'achievementProgress' | 'missionRewardsGrantedById' | 'achievementRewardsClaimedById'> {
  version: 10
}

interface PlayerProfileV11Legacy extends Omit<PlayerProfile, 'version' | 'achievementRewardsClaimedById'> {
  version: 11
}

interface StoredProfileEntryV1 {
  id: string
  createdAt: string
  updatedAt: string
  profile: PlayerProfile
}

interface StoredProfilesV1 {
  version: 1
  activeProfileId: string
  profiles: StoredProfileEntryV1[]
}

export interface StoredProfileSummary {
  id: string
  playerName: string
  gold: number
  played: number
  wins: number
  isActive: boolean
}

export interface StoredProfileLadderEntry {
  id: string
  playerName: string
  ownedCardsCount: number
  rankedByMode: {
    '3x3': Pick<RankedState, 'tier' | 'division' | 'lp'>
    '4x4': Pick<RankedState, 'tier' | 'division' | 'lp'>
  }
  updatedAt: string
}

export interface StoredProfilesSnapshot {
  activeProfileId: string
  profiles: StoredProfileSummary[]
}

export interface StoredProfileMutationResult {
  valid: boolean
  reason?: string
  profile?: PlayerProfile
  profiles?: StoredProfilesSnapshot
}

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
  const initialRanked = createInitialRankedState()

  return {
    version: 12,
    playerName: DEFAULT_PLAYER_NAME,
    gold: 100,
    ownedCardIds,
    cardCopiesById: createCardCopiesById(ownedCardIds),
    cardFragmentsById: createEmptyCardFragmentsById(),
    shinyCardCopiesById: createEmptyShinyCardCopiesById(),
    packInventoryByRarity: createEmptyPackInventoryByRarity(),
    deckSlots: [
      createDeckSlot('slot-1', 'Deck 1', initialDeck, { same: false, plus: false }, ownedCardIds),
      createDeckSlot('slot-2', 'Deck 2', [], { same: false, plus: false }, ownedCardIds),
      createDeckSlot('slot-3', 'Deck 3', [], { same: false, plus: false }, ownedCardIds),
    ],
    selectedDeckSlotId: 'slot-1',
    stats: {
      played: 0,
      won: 0,
      streak: 0,
      bestStreak: 0,
    },
    achievementProgress: createDefaultAchievementProgress(),
    achievements: [],
    achievementRewardsClaimedById: {},
    missions: createInitialMissionsProgress(),
    missionRewardsGrantedById: {},
    specialPackPity: {
      legendaryFocusChancePercent: LEGENDARY_FOCUS_PITY_BASE_CHANCE_PERCENT,
    },
    rankedByMode: {
      '3x3': { ...initialRanked, resultStreak: { ...initialRanked.resultStreak } },
      '4x4': { ...initialRanked, resultStreak: { ...initialRanked.resultStreak } },
    },
    tutorialProgress: createDefaultTutorialProgress(),
    settings: {
      audioEnabled: true,
    },
  }
}

export function loadProfile(): PlayerProfile {
  const storedProfiles = getOrCreateStoredProfiles()
  const activeEntry = getActiveStoredProfileEntry(storedProfiles)
  if (!activeEntry) {
    const fallback = finalizeLoadedProfile(createDefaultProfile()).profile
    const recoveredStore: StoredProfilesV1 = {
      version: STORED_PROFILES_VERSION,
      activeProfileId: createStoredProfileId(),
      profiles: [],
    }
    recoveredStore.profiles.push({
      id: recoveredStore.activeProfileId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profile: fallback,
    })
    persistStoredProfiles(recoveredStore)
    syncLegacyProfile(fallback)
    return fallback
  }

  syncLegacyProfile(activeEntry.profile)
  return activeEntry.profile
}

export function saveProfile(profile: PlayerProfile): void {
  const storedProfiles = getOrCreateStoredProfiles()
  const activeEntry = getActiveStoredProfileEntry(storedProfiles)
  const finalized = finalizeLoadedProfile(profile).profile
  const now = new Date().toISOString()

  if (activeEntry) {
    activeEntry.profile = finalized
    activeEntry.updatedAt = now
  } else {
    const id = createStoredProfileId(new Set(storedProfiles.profiles.map((entry) => entry.id)))
    storedProfiles.activeProfileId = id
    storedProfiles.profiles.push({
      id,
      createdAt: now,
      updatedAt: now,
      profile: finalized,
    })
  }

  persistStoredProfiles(storedProfiles)
  syncLegacyProfile(finalized)
}

export function listStoredProfiles(): StoredProfilesSnapshot {
  const storedProfiles = getOrCreateStoredProfiles()
  return mapStoredProfilesSnapshot(storedProfiles)
}

export function listStoredProfilesForLadder(): StoredProfileLadderEntry[] {
  const storedProfiles = getOrCreateStoredProfiles()
  return storedProfiles.profiles.map((entry) => ({
    id: entry.id,
    playerName: entry.profile.playerName,
    ownedCardsCount: entry.profile.ownedCardIds.length,
    rankedByMode: {
      '3x3': {
        tier: entry.profile.rankedByMode['3x3'].tier,
        division: entry.profile.rankedByMode['3x3'].division,
        lp: entry.profile.rankedByMode['3x3'].lp,
      },
      '4x4': {
        tier: entry.profile.rankedByMode['4x4'].tier,
        division: entry.profile.rankedByMode['4x4'].division,
        lp: entry.profile.rankedByMode['4x4'].lp,
      },
    },
    updatedAt: entry.updatedAt,
  }))
}

export function createStoredProfile(playerName: string): StoredProfileMutationResult {
  const validation = isPlayerNameValid(playerName)
  if (!validation.valid) {
    return validation
  }

  const storedProfiles = getOrCreateStoredProfiles()
  const nextProfile = createDefaultProfile()
  nextProfile.playerName = playerName.trim()

  const now = new Date().toISOString()
  const nextId = createStoredProfileId(new Set(storedProfiles.profiles.map((entry) => entry.id)))
  const nextEntry: StoredProfileEntryV1 = {
    id: nextId,
    createdAt: now,
    updatedAt: now,
    profile: nextProfile,
  }

  storedProfiles.profiles.push(nextEntry)
  storedProfiles.activeProfileId = nextId

  persistStoredProfiles(storedProfiles)
  syncLegacyProfile(nextProfile)

  return {
    valid: true,
    profile: nextProfile,
    profiles: mapStoredProfilesSnapshot(storedProfiles),
  }
}

export function switchStoredProfile(profileId: string): PlayerProfile {
  const storedProfiles = getOrCreateStoredProfiles()
  const nextActive = storedProfiles.profiles.find((profile) => profile.id === profileId)
  if (!nextActive) {
    throw new Error(`Profile "${profileId}" does not exist.`)
  }

  storedProfiles.activeProfileId = profileId
  nextActive.updatedAt = new Date().toISOString()

  persistStoredProfiles(storedProfiles)
  syncLegacyProfile(nextActive.profile)

  return nextActive.profile
}

export function deleteStoredProfile(profileId: string): StoredProfileMutationResult {
  const storedProfiles = getOrCreateStoredProfiles()
  if (storedProfiles.profiles.length <= 1) {
    return {
      valid: false,
      reason: 'You must keep at least one profile.',
      profiles: mapStoredProfilesSnapshot(storedProfiles),
    }
  }

  const index = storedProfiles.profiles.findIndex((profile) => profile.id === profileId)
  if (index < 0) {
    return {
      valid: false,
      reason: 'Profile not found.',
      profiles: mapStoredProfilesSnapshot(storedProfiles),
    }
  }

  storedProfiles.profiles.splice(index, 1)
  if (!storedProfiles.profiles.some((profile) => profile.id === storedProfiles.activeProfileId)) {
    storedProfiles.activeProfileId = storedProfiles.profiles[0]?.id ?? ''
  }

  const activeEntry = getActiveStoredProfileEntry(storedProfiles)
  if (!activeEntry) {
    return {
      valid: false,
      reason: 'Unable to keep an active profile.',
    }
  }

  activeEntry.updatedAt = new Date().toISOString()
  persistStoredProfiles(storedProfiles)
  syncLegacyProfile(activeEntry.profile)

  return {
    valid: true,
    profile: activeEntry.profile,
    profiles: mapStoredProfilesSnapshot(storedProfiles),
  }
}

export function parseStoredProfileSnapshot(value: unknown): PlayerProfile | null {
  const candidate = parseProfileCandidate(value)
  if (!candidate) {
    return null
  }

  return finalizeLoadedProfile(candidate).profile
}

function mapStoredProfilesSnapshot(storedProfiles: StoredProfilesV1): StoredProfilesSnapshot {
  return {
    activeProfileId: storedProfiles.activeProfileId,
    profiles: storedProfiles.profiles.map((entry) => ({
      id: entry.id,
      playerName: entry.profile.playerName,
      gold: entry.profile.gold,
      played: entry.profile.stats.played,
      wins: entry.profile.stats.won,
      isActive: entry.id === storedProfiles.activeProfileId,
    })),
  }
}

function getOrCreateStoredProfiles(): StoredProfilesV1 {
  const parsed = loadStoredProfilesFromStorage()
  if (parsed) {
    return parsed
  }

  const now = new Date().toISOString()
  const legacyProfile = loadLegacyProfileFromStorage()
  const id = createStoredProfileId()
  const nextStore: StoredProfilesV1 = {
    version: STORED_PROFILES_VERSION,
    activeProfileId: id,
    profiles: [
      {
        id,
        createdAt: now,
        updatedAt: now,
        profile: legacyProfile,
      },
    ],
  }

  persistStoredProfiles(nextStore)
  syncLegacyProfile(legacyProfile)

  return nextStore
}

function loadStoredProfilesFromStorage(): StoredProfilesV1 | null {
  const raw = localStorage.getItem(STORED_PROFILES_STORAGE_KEY)
  if (!raw) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!isRecord(parsed)) {
    return null
  }

  if (!Array.isArray(parsed.profiles)) {
    return null
  }

  const knownIds = new Set<string>()
  const now = new Date().toISOString()
  let changed = parsed.version !== STORED_PROFILES_VERSION
  const profiles: StoredProfileEntryV1[] = []

  for (const entry of parsed.profiles) {
    if (!isRecord(entry) || typeof entry.id !== 'string') {
      changed = true
      continue
    }

    const migrated = parseProfileCandidate(entry.profile)
    if (!migrated) {
      changed = true
      continue
    }

    const finalized = finalizeLoadedProfile(migrated)
    if (finalized.changed) {
      changed = true
    }

    let id = entry.id.trim()
    if (!id || knownIds.has(id)) {
      id = createStoredProfileId(knownIds)
      changed = true
    }
    knownIds.add(id)

    const createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : now
    const updatedAt = typeof entry.updatedAt === 'string' ? entry.updatedAt : createdAt
    if (createdAt !== entry.createdAt || updatedAt !== entry.updatedAt) {
      changed = true
    }

    profiles.push({
      id,
      createdAt,
      updatedAt,
      profile: finalized.profile,
    })
  }

  if (profiles.length === 0) {
    return null
  }

  let activeProfileId = typeof parsed.activeProfileId === 'string' ? parsed.activeProfileId : profiles[0].id
  if (!profiles.some((entry) => entry.id === activeProfileId)) {
    activeProfileId = profiles[0].id
    changed = true
  }

  const normalized: StoredProfilesV1 = {
    version: STORED_PROFILES_VERSION,
    activeProfileId,
    profiles,
  }

  if (changed) {
    persistStoredProfiles(normalized)
  }

  return normalized
}

function loadLegacyProfileFromStorage(): PlayerProfile {
  const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
  if (!raw) {
    return finalizeLoadedProfile(createDefaultProfile()).profile
  }

  try {
    const parsed = JSON.parse(raw)
    const migrated = parseProfileCandidate(parsed)
    if (migrated) {
      return finalizeLoadedProfile(migrated).profile
    }
  } catch {
    // handled by fallback below
  }

  return finalizeLoadedProfile(createDefaultProfile()).profile
}

function parseProfileCandidate(value: unknown): PlayerProfile | null {
  const normalizedCandidate = normalizeLegacyRemovedTierCandidate(value)

  if (isPlayerProfile(normalizedCandidate)) {
    return normalizedCandidate
  }

  if (isPlayerProfileV11Legacy(normalizedCandidate)) {
    return migrateProfileV11ToV12(normalizedCandidate)
  }

  if (isPlayerProfileV10Legacy(normalizedCandidate)) {
    return migrateProfileV11ToV12(migrateProfileV10ToV11(normalizedCandidate))
  }

  if (isPlayerProfileV9Legacy(normalizedCandidate)) {
    return migrateProfileV11ToV12(migrateProfileV10ToV11(migrateProfileV9ToV10(normalizedCandidate)))
  }

  if (isPlayerProfileV8Legacy(normalizedCandidate)) {
    return migrateProfileV11ToV12(migrateProfileV10ToV11(migrateProfileV9ToV10(migrateProfileV8ToV9(normalizedCandidate))))
  }

  if (isPlayerProfileV7Legacy(normalizedCandidate)) {
    return migrateProfileV11ToV12(
      migrateProfileV10ToV11(migrateProfileV9ToV10(migrateProfileV8ToV9(migrateProfileV7ToV8(normalizedCandidate)))),
    )
  }

  if (isPlayerProfileV6WithoutCards4x4Legacy(normalizedCandidate)) {
    return migrateProfileV11ToV12(
      migrateProfileV10ToV11(
        migrateProfileV9ToV10(
          migrateProfileV8ToV9(migrateProfileV7ToV8(migrateProfileV6WithoutCards4x4ToV7(normalizedCandidate))),
        ),
      ),
    )
  }

  if (isPlayerProfileV6WithoutPlayerNameLegacy(normalizedCandidate)) {
    return migrateProfileV11ToV12(
      migrateProfileV10ToV11(
        migrateProfileV9ToV10(
          migrateProfileV8ToV9(migrateProfileV7ToV8(migrateProfileV6WithoutPlayerNameToV7(normalizedCandidate))),
        ),
      ),
    )
  }

  if (isPlayerProfileV6Legacy(normalizedCandidate)) {
    return migrateProfileV11ToV12(
      migrateProfileV10ToV11(
        migrateProfileV9ToV10(migrateProfileV8ToV9(migrateProfileV7ToV8(migrateProfileV6ToV7(normalizedCandidate)))),
      ),
    )
  }

  if (isPlayerProfileV5Legacy(normalizedCandidate)) {
    return migrateProfileV11ToV12(
      migrateProfileV10ToV11(
        migrateProfileV9ToV10(migrateProfileV8ToV9(migrateProfileV7ToV8(migrateProfileV5ToV7(normalizedCandidate)))),
      ),
    )
  }

  if (isPlayerProfileV4Legacy(normalizedCandidate)) {
    return migrateProfileV11ToV12(
      migrateProfileV10ToV11(
        migrateProfileV9ToV10(
          migrateProfileV8ToV9(migrateProfileV7ToV8(migrateProfileV5ToV7(migrateProfileV4ToV5(normalizedCandidate)))),
        ),
      ),
    )
  }

  if (isPlayerProfileV4WithoutPacksLegacy(normalizedCandidate)) {
    return migrateProfileV11ToV12(
      migrateProfileV10ToV11(
        migrateProfileV9ToV10(
          migrateProfileV8ToV9(
            migrateProfileV7ToV8(migrateProfileV5ToV7(migrateProfileV4WithoutPacksToV5(normalizedCandidate))),
          ),
        ),
      ),
    )
  }

  if (isPlayerProfileV3Legacy(normalizedCandidate)) {
    return migrateProfileV11ToV12(
      migrateProfileV10ToV11(
        migrateProfileV9ToV10(
          migrateProfileV8ToV9(migrateProfileV7ToV8(migrateProfileV5ToV7(migrateProfileV3ToV5(normalizedCandidate)))),
        ),
      ),
    )
  }

  if (isPlayerProfileV2Legacy(normalizedCandidate)) {
    return migrateProfileV11ToV12(
      migrateProfileV10ToV11(
        migrateProfileV9ToV10(
          migrateProfileV8ToV9(migrateProfileV7ToV8(migrateProfileV5ToV7(migrateProfileV2ToV5(normalizedCandidate)))),
        ),
      ),
    )
  }

  if (isPlayerProfileV1Legacy(normalizedCandidate)) {
    return migrateProfileV11ToV12(
      migrateProfileV10ToV11(
        migrateProfileV9ToV10(
          migrateProfileV8ToV9(migrateProfileV7ToV8(migrateProfileV5ToV7(migrateProfileV1ToV5(normalizedCandidate)))),
        ),
      ),
    )
  }

  return null
}

function normalizeLegacyRemovedTierCandidate(value: unknown): unknown {
  if (!isRecord(value)) {
    return value
  }

  let changed = false
  const nextCandidate: Record<string, unknown> = { ...value }

  const normalizedRanked = normalizeLegacyRemovedTierInRankedState(value.ranked)
  if (normalizedRanked !== value.ranked) {
    nextCandidate.ranked = normalizedRanked
    changed = true
  }

  if (isRecord(value.rankedByMode)) {
    const normalized3x3 = normalizeLegacyRemovedTierInRankedState(value.rankedByMode['3x3'])
    const normalized4x4 = normalizeLegacyRemovedTierInRankedState(value.rankedByMode['4x4'])

    if (normalized3x3 !== value.rankedByMode['3x3'] || normalized4x4 !== value.rankedByMode['4x4']) {
      nextCandidate.rankedByMode = {
        ...value.rankedByMode,
        '3x3': normalized3x3,
        '4x4': normalized4x4,
      }
      changed = true
    }
  }

  return changed ? nextCandidate : value
}

function normalizeLegacyRemovedTierInRankedState(value: unknown): unknown {
  if (!isRecord(value)) {
    return value
  }

  const tier = value.tier
  if (tier === 'emerald') {
    return {
      ...value,
      tier: 'diamond',
    }
  }

  if (tier === 'master' || tier === 'grandmaster') {
    return {
      ...value,
      tier: 'challenger',
      division: null,
    }
  }

  return value
}

function getActiveStoredProfileEntry(storedProfiles: StoredProfilesV1): StoredProfileEntryV1 | null {
  return storedProfiles.profiles.find((entry) => entry.id === storedProfiles.activeProfileId) ?? null
}

function persistStoredProfiles(storedProfiles: StoredProfilesV1): void {
  localStorage.setItem(STORED_PROFILES_STORAGE_KEY, JSON.stringify(storedProfiles))
}

function syncLegacyProfile(profile: PlayerProfile): void {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
}

function createStoredProfileId(existingIds: Set<string> = new Set()): string {
  for (let index = 0; index < 10; index += 1) {
    const candidate =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `profile-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}-${index}`
    if (!existingIds.has(candidate)) {
      return candidate
    }
  }

  return `profile-${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function createDeckSlot(
  id: DeckSlotId,
  name: string,
  cards: CardId[],
  rules: { same: boolean; plus: boolean },
  ownedCardIds: CardId[],
  cards4x4?: CardId[],
  mode: unknown = DEFAULT_DECK_SLOT_MODE,
): DeckSlot {
  const cards3x3 = normalizeDeckCards(cards, DECK_SIZE_3X3)

  return {
    id,
    name,
    mode: normalizeDeckSlotMode(mode),
    cards: cards3x3,
    cards4x4:
      cards4x4 === undefined
        ? normalizeDeckCards(fillDeckFromOwned(cards3x3, ownedCardIds, DECK_SIZE_4X4), DECK_SIZE_4X4)
        : normalizeDeckCards(cards4x4, DECK_SIZE_4X4),
    rules: {
      same: rules.same,
      plus: rules.plus,
    },
  }
}

function normalizeDeckCards(cards: CardId[], maxSize: number): CardId[] {
  const uniqueCards: CardId[] = []

  for (const cardId of cards) {
    if (typeof cardId !== 'string') {
      continue
    }

    if (uniqueCards.includes(cardId)) {
      continue
    }

    uniqueCards.push(cardId)
    if (uniqueCards.length >= maxSize) {
      break
    }
  }

  return uniqueCards
}

function fillDeckFromOwned(seedCards: CardId[], ownedCardIds: CardId[], maxSize: number): CardId[] {
  const deck = normalizeDeckCards(seedCards, maxSize)
  for (const ownedCardId of ownedCardIds) {
    if (deck.length >= maxSize) {
      break
    }
    if (!deck.includes(ownedCardId)) {
      deck.push(ownedCardId)
    }
  }
  return deck
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
      }, profile.ownedCardIds),
      createDeckSlot('slot-2', 'Deck 2', [], { same: false, plus: false }, profile.ownedCardIds),
      createDeckSlot('slot-3', 'Deck 3', [], { same: false, plus: false }, profile.ownedCardIds),
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
      createDeckSlot(slot.id, slot.name, slot.cards, { same: slot.rules.same, plus: slot.rules.plus }, profile.ownedCardIds),
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
      createDeckSlot(slot.id, slot.name, slot.cards, { same: slot.rules.same, plus: slot.rules.plus }, profile.ownedCardIds),
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
      createDeckSlot(
        slot.id,
        slot.name,
        slot.cards,
        { same: slot.rules.same, plus: slot.rules.plus },
        profile.ownedCardIds,
        slot.cards4x4,
        slot.mode,
      ),
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
      createDeckSlot(slot.id, slot.name, slot.cards, { same: slot.rules.same, plus: slot.rules.plus }, profile.ownedCardIds),
    ) as [DeckSlot, DeckSlot, DeckSlot],
    selectedDeckSlotId: profile.selectedDeckSlotId,
    stats: { ...profile.stats },
    achievements: profile.achievements.filter((entry) => isAchievementId(entry.id)) as AchievementUnlock[],
    rankRewardsClaimed: [],
    settings: { ...profile.settings },
  }
}

function migrateProfileV5ToV7(profile: PlayerProfileV5Legacy): PlayerProfileV7Legacy {
  return migrateProfileV6ToV7({
    version: 6,
    playerName: DEFAULT_PLAYER_NAME,
    gold: profile.gold,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    packInventoryByRarity: { ...profile.packInventoryByRarity },
    deckSlots: migrateLegacyDeckSlotsToCurrent(profile.deckSlots, profile.ownedCardIds),
    selectedDeckSlotId: profile.selectedDeckSlotId,
    stats: { ...profile.stats },
    achievements: profile.achievements.filter((entry) => isAchievementId(entry.id)) as AchievementUnlock[],
    ranked: createInitialRankedState(),
    settings: { ...profile.settings },
  })
}

function migrateProfileV6ToV7(profile: PlayerProfileV6Legacy): PlayerProfileV7Legacy {
  return {
    ...profile,
    version: 7,
    missions: createInitialMissionsProgress(),
    specialPackPity: {
      legendaryFocusChancePercent: LEGENDARY_FOCUS_PITY_BASE_CHANCE_PERCENT,
    },
  }
}

function migrateProfileV6WithoutCards4x4ToV7(profile: PlayerProfileV6WithoutCards4x4Legacy): PlayerProfileV7Legacy {
  return migrateProfileV6ToV7({
    ...profile,
    deckSlots: migrateLegacyDeckSlotsToCurrent(profile.deckSlots, profile.ownedCardIds),
  })
}

function migrateProfileV6WithoutPlayerNameToV7(profile: PlayerProfileV6WithoutPlayerNameLegacy): PlayerProfileV7Legacy {
  return migrateProfileV6WithoutCards4x4ToV7({
    ...profile,
    playerName: DEFAULT_PLAYER_NAME,
  })
}

function migrateProfileV7ToV8(profile: PlayerProfileV7Legacy): PlayerProfileV8Legacy {
  const ranked3x3 = cloneRankedState(profile.ranked)
  const ranked4x4 = cloneRankedState(profile.ranked)

  return {
    ...profile,
    version: 8,
    rankedByMode: {
      '3x3': ranked3x3,
      '4x4': ranked4x4,
    },
    settings: {
      audioEnabled: false,
    },
  }
}

function migrateProfileV8ToV9(profile: PlayerProfileV8Legacy): PlayerProfileV9Legacy {
  return {
    ...profile,
    version: 9,
    settings: {
      audioEnabled: true,
    },
  }
}

function migrateProfileV9ToV10(profile: PlayerProfileV9Legacy): PlayerProfileV10Legacy {
  return {
    ...profile,
    version: 10,
    shinyCardCopiesById: createEmptyShinyCardCopiesById(),
  }
}

function migrateProfileV10ToV11(profile: PlayerProfileV10Legacy): PlayerProfileV11Legacy {
  const legacyRewardsGranted: Partial<Record<MissionId, true>> = {}
  for (const missionId of missionIds) {
    if (profile.missions[missionId]?.claimed) {
      legacyRewardsGranted[missionId] = true
    }
  }

  return {
    ...profile,
    version: 11,
    cardFragmentsById: createEmptyCardFragmentsById(),
    achievements: [],
    achievementProgress: createDefaultAchievementProgress(),
    missions: createInitialMissionsProgress(),
    missionRewardsGrantedById: legacyRewardsGranted,
    tutorialProgress: createDefaultTutorialProgress(),
  }
}

function migrateProfileV11ToV12(profile: PlayerProfileV11Legacy): PlayerProfile {
  return {
    ...profile,
    version: 12,
    achievementRewardsClaimedById: {},
  }
}

function migrateLegacyDeckSlotsToCurrent(
  deckSlots: [LegacyDeckSlot, LegacyDeckSlot, LegacyDeckSlot],
  ownedCardIds: CardId[],
): [DeckSlot, DeckSlot, DeckSlot] {
  return deckSlots.map((slot) =>
    createDeckSlot(
      slot.id,
      slot.name,
      slot.cards,
      { same: slot.rules.same, plus: slot.rules.plus },
      ownedCardIds,
      slot.cards4x4,
      slot.mode,
    ),
  ) as [DeckSlot, DeckSlot, DeckSlot]
}

function finalizeLoadedProfile(profile: PlayerProfile): { profile: PlayerProfile; changed: boolean } {
  const synced = syncAchievements(
    syncSpecialPackPity(
      syncTutorialProgress(
        syncMissions(
          syncMissionRewardsGrantedById(
            syncAchievementRewardsClaimedById(syncAchievementProgress(syncCardFragmentsById(syncDeckSlots(syncPlayerName(profile))))),
          ),
        ),
      ),
    ),
  )

  return {
    profile: synced,
    changed: synced !== profile,
  }
}

function syncAchievementProgress(profile: PlayerProfile): PlayerProfile {
  if (isAchievementProgress(profile.achievementProgress)) {
    return profile
  }

  return {
    ...profile,
    achievementProgress: createDefaultAchievementProgress(),
  }
}

function syncCardFragmentsById(profile: PlayerProfile): PlayerProfile {
  const current = profile.cardFragmentsById
  if (isCardFragmentsById(current)) {
    return profile
  }

  const next: Record<CardId, number> = {}
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    for (const [cardId, fragments] of Object.entries(current)) {
      if (cardId.length === 0) {
        continue
      }
      if (!Number.isInteger(fragments) || Number(fragments) < 1) {
        continue
      }
      next[cardId] = Number(fragments)
    }
  }

  return {
    ...profile,
    cardFragmentsById: next,
  }
}

function syncMissionRewardsGrantedById(profile: PlayerProfile): PlayerProfile {
  const current = profile.missionRewardsGrantedById
  if (isMissionRewardsGrantedById(current)) {
    return profile
  }

  const next: Partial<Record<MissionId, true>> = {}
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    for (const missionId of missionIds) {
      if ((current as Partial<Record<MissionId, unknown>>)[missionId] === true) {
        next[missionId] = true
      }
    }
  }

  return {
    ...profile,
    missionRewardsGrantedById: next,
  }
}

function syncAchievementRewardsClaimedById(profile: PlayerProfile): PlayerProfile {
  const current = profile.achievementRewardsClaimedById
  if (isAchievementRewardsClaimedById(current)) {
    return profile
  }

  const next: Partial<Record<AchievementUnlock['id'], true>> = {}
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    for (const [achievementId, value] of Object.entries(current)) {
      if (!isAchievementId(achievementId)) {
        continue
      }
      if (value !== true) {
        continue
      }
      next[achievementId] = true
    }
  }

  return {
    ...profile,
    achievementRewardsClaimedById: next,
  }
}

function createDefaultTutorialProgress(): NonNullable<PlayerProfile['tutorialProgress']> {
  return {
    baseCompleted: false,
    completedElementById: {},
  }
}

function syncTutorialProgress(profile: PlayerProfile): PlayerProfile {
  const expected = createDefaultTutorialProgress()
  const current = profile.tutorialProgress
  if (!current) {
    return {
      ...profile,
      tutorialProgress: expected,
    }
  }

  const nextCompleted: Partial<Record<CardElementId, true>> = {}
  for (const elementId of ELEMENT_EFFECT_ORDERED_IDS) {
    if (current.completedElementById[elementId]) {
      nextCompleted[elementId] = true
    }
  }

  const next = {
    baseCompleted: current.baseCompleted === true,
    completedElementById: nextCompleted,
  }

  const currentCompletedKeys = Object.keys(current.completedElementById)
  const nextCompletedKeys = Object.keys(next.completedElementById)
  const unchanged =
    current.baseCompleted === next.baseCompleted &&
    currentCompletedKeys.length === nextCompletedKeys.length &&
    currentCompletedKeys.every((key) => next.completedElementById[key as CardElementId] === true)
  if (unchanged) {
    return profile
  }

  return {
    ...profile,
    tutorialProgress: next,
  }
}

function syncSpecialPackPity(profile: PlayerProfile): PlayerProfile {
  const normalizedChance = normalizeLegendaryFocusPityChancePercent(profile.specialPackPity?.legendaryFocusChancePercent)
  if (profile.specialPackPity?.legendaryFocusChancePercent === normalizedChance) {
    return profile
  }

  return {
    ...profile,
    specialPackPity: {
      legendaryFocusChancePercent: normalizedChance,
    },
  }
}

function normalizeLegendaryFocusPityChancePercent(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return LEGENDARY_FOCUS_PITY_BASE_CHANCE_PERCENT
  }

  const clamped = Math.max(LEGENDARY_FOCUS_PITY_BASE_CHANCE_PERCENT, Math.min(LEGENDARY_FOCUS_PITY_MAX_CHANCE_PERCENT, value))
  return Math.floor(clamped)
}

function syncDeckSlots(profile: PlayerProfile): PlayerProfile {
  let changed = false

  const nextDeckSlots = profile.deckSlots.map((slot) => {
    const cards = normalizeDeckCards(slot.cards, DECK_SIZE_3X3)
    const slotWithOptionalFields = slot as DeckSlot & { cards4x4?: CardId[]; mode?: unknown }
    const hasCards4x4 = Array.isArray(slotWithOptionalFields.cards4x4)
    const cards4x4 = hasCards4x4
      ? normalizeDeckCards(slotWithOptionalFields.cards4x4, DECK_SIZE_4X4)
      : normalizeDeckCards(fillDeckFromOwned(cards, profile.ownedCardIds, DECK_SIZE_4X4), DECK_SIZE_4X4)
    const mode = normalizeDeckSlotMode(slotWithOptionalFields.mode)

    if (
      !areCardArraysEqual(slot.cards, cards) ||
      !areCardArraysEqual(slotWithOptionalFields.cards4x4 ?? [], cards4x4) ||
      slot.mode !== mode
    ) {
      changed = true
    }

    return {
      ...slot,
      mode,
      cards,
      cards4x4,
    }
  }) as PlayerProfile['deckSlots']

  if (!changed) {
    return profile
  }

  return {
    ...profile,
    deckSlots: nextDeckSlots,
  }
}

function areCardArraysEqual(left: CardId[], right: CardId[]): boolean {
  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false
    }
  }

  return true
}

function normalizeDeckSlotMode(mode: unknown): MatchMode {
  return mode === '3x3' || mode === '4x4' ? mode : DEFAULT_DECK_SLOT_MODE
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

function syncMissions(profile: PlayerProfile): PlayerProfile {
  if (!isMissionProgressMap(profile.missions)) {
    return {
      ...profile,
      missions: createInitialMissionsProgress(),
    }
  }

  const nextMissions = createInitialMissionsProgress()
  let changed = false

  for (const missionId of missionIds) {
    const current = profile.missions[missionId]
    const target = nextMissions[missionId].target
    const progress = Math.max(0, Math.min(target, Math.floor(current.progress)))
    const completed = progress >= target
    const claimed = completed ? current.claimed : false

    nextMissions[missionId] = {
      id: missionId,
      progress,
      target,
      completed,
      claimed,
    }

    if (
      current.id !== missionId ||
      current.progress !== progress ||
      current.target !== target ||
      current.completed !== completed ||
      current.claimed !== claimed
    ) {
      changed = true
    }
  }

  if (!changed) {
    return profile
  }

  return {
    ...profile,
    missions: nextMissions,
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
  void profile
  void legacyAchievements
  return []
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

function createEmptyShinyCardCopiesById(): Record<CardId, number> {
  return {}
}

function createEmptyCardFragmentsById(): Record<CardId, number> {
  return {}
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

export function createDefaultAchievementProgress(): AchievementProgress {
  return {
    matchesPlayed: 0,
    matchesWon: 0,
    currentStreak: 0,
    bestStreak: 0,
    cardsAcquired: 0,
    goldEarned: 0,
    packsPurchased: 0,
    packsOpened: 0,
    specialPacksOpened: 0,
    missionsCompleted: 0,
    baseTutorialsCompleted: 0,
    elementTutorialsCompleted: 0,
    rankedMatchesPlayed: 0,
    rankedWins: 0,
    deckEdits: 0,
    shinyPulled: 0,
    shinyCrafted: 0,
  }
}

function isPlayerProfile(value: unknown): value is PlayerProfile {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PlayerProfile>

  return (
    candidate.version === 12 &&
    typeof candidate.playerName === 'string' &&
    isPlayerNameValid(candidate.playerName).valid &&
    typeof candidate.gold === 'number' &&
    Array.isArray(candidate.ownedCardIds) &&
    candidate.ownedCardIds.every((card) => typeof card === 'string') &&
    isCardCopiesById(candidate.cardCopiesById) &&
    (candidate.cardFragmentsById === undefined || isCardFragmentsById(candidate.cardFragmentsById)) &&
    isCardCopiesById(candidate.shinyCardCopiesById) &&
    isPackInventoryByRarity(candidate.packInventoryByRarity) &&
    doesOwnershipMatchCopies(candidate.ownedCardIds, candidate.cardCopiesById, candidate.shinyCardCopiesById) &&
    isDeckSlotsLegacy(candidate.deckSlots) &&
    isDeckSlotId(candidate.selectedDeckSlotId) &&
    typeof candidate.stats?.played === 'number' &&
    typeof candidate.stats?.won === 'number' &&
    typeof candidate.stats?.streak === 'number' &&
    typeof candidate.stats?.bestStreak === 'number' &&
    isAchievementProgress(candidate.achievementProgress) &&
    isAchievementUnlocks(candidate.achievements) &&
    (candidate.achievementRewardsClaimedById === undefined ||
      (candidate.achievementRewardsClaimedById !== null &&
        typeof candidate.achievementRewardsClaimedById === 'object' &&
        !Array.isArray(candidate.achievementRewardsClaimedById))) &&
    isMissionProgressMap(candidate.missions) &&
    isMissionRewardsGrantedById(candidate.missionRewardsGrantedById) &&
    isRankedByMode(candidate.rankedByMode) &&
    (candidate.tutorialProgress === undefined || isTutorialProgress(candidate.tutorialProgress)) &&
    typeof candidate.settings?.audioEnabled === 'boolean'
  )
}

function isPlayerProfileV10Legacy(value: unknown): value is PlayerProfileV10Legacy {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PlayerProfileV10Legacy>

  return (
    candidate.version === 10 &&
    typeof candidate.playerName === 'string' &&
    isPlayerNameValid(candidate.playerName).valid &&
    typeof candidate.gold === 'number' &&
    Array.isArray(candidate.ownedCardIds) &&
    candidate.ownedCardIds.every((card) => typeof card === 'string') &&
    isCardCopiesById(candidate.cardCopiesById) &&
    isCardCopiesById(candidate.shinyCardCopiesById) &&
    isPackInventoryByRarity(candidate.packInventoryByRarity) &&
    doesOwnershipMatchCopies(candidate.ownedCardIds, candidate.cardCopiesById, candidate.shinyCardCopiesById) &&
    isDeckSlotsLegacy(candidate.deckSlots) &&
    isDeckSlotId(candidate.selectedDeckSlotId) &&
    typeof candidate.stats?.played === 'number' &&
    typeof candidate.stats?.won === 'number' &&
    typeof candidate.stats?.streak === 'number' &&
    typeof candidate.stats?.bestStreak === 'number' &&
    isAchievementUnlocks(candidate.achievements) &&
    isMissionProgressMap(candidate.missions) &&
    isRankedByMode(candidate.rankedByMode) &&
    (candidate.tutorialProgress === undefined || isTutorialProgress(candidate.tutorialProgress)) &&
    typeof candidate.settings?.audioEnabled === 'boolean'
  )
}

function isPlayerProfileV11Legacy(value: unknown): value is PlayerProfileV11Legacy {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PlayerProfileV11Legacy>

  return (
    candidate.version === 11 &&
    typeof candidate.playerName === 'string' &&
    isPlayerNameValid(candidate.playerName).valid &&
    typeof candidate.gold === 'number' &&
    Array.isArray(candidate.ownedCardIds) &&
    candidate.ownedCardIds.every((card) => typeof card === 'string') &&
    isCardCopiesById(candidate.cardCopiesById) &&
    (candidate.cardFragmentsById === undefined || isCardFragmentsById(candidate.cardFragmentsById)) &&
    isCardCopiesById(candidate.shinyCardCopiesById) &&
    isPackInventoryByRarity(candidate.packInventoryByRarity) &&
    doesOwnershipMatchCopies(candidate.ownedCardIds, candidate.cardCopiesById, candidate.shinyCardCopiesById) &&
    isDeckSlotsLegacy(candidate.deckSlots) &&
    isDeckSlotId(candidate.selectedDeckSlotId) &&
    typeof candidate.stats?.played === 'number' &&
    typeof candidate.stats?.won === 'number' &&
    typeof candidate.stats?.streak === 'number' &&
    typeof candidate.stats?.bestStreak === 'number' &&
    isAchievementProgress(candidate.achievementProgress) &&
    isAchievementUnlocks(candidate.achievements) &&
    isMissionProgressMap(candidate.missions) &&
    isMissionRewardsGrantedById(candidate.missionRewardsGrantedById) &&
    isRankedByMode(candidate.rankedByMode) &&
    (candidate.tutorialProgress === undefined || isTutorialProgress(candidate.tutorialProgress)) &&
    typeof candidate.settings?.audioEnabled === 'boolean'
  )
}

function isTutorialProgress(value: unknown): value is NonNullable<PlayerProfile['tutorialProgress']> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const candidate = value as Partial<NonNullable<PlayerProfile['tutorialProgress']>>
  if (typeof candidate.baseCompleted !== 'boolean') {
    return false
  }
  if (!candidate.completedElementById || typeof candidate.completedElementById !== 'object' || Array.isArray(candidate.completedElementById)) {
    return false
  }
  return Object.entries(candidate.completedElementById).every(([elementId, done]) => {
    return tutorialElementIds.has(elementId) && done === true
  })
}

function isPlayerProfileV9Legacy(value: unknown): value is PlayerProfileV9Legacy {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PlayerProfileV9Legacy>

  return (
    candidate.version === 9 &&
    typeof candidate.playerName === 'string' &&
    isPlayerNameValid(candidate.playerName).valid &&
    typeof candidate.gold === 'number' &&
    Array.isArray(candidate.ownedCardIds) &&
    candidate.ownedCardIds.every((card) => typeof card === 'string') &&
    isCardCopiesById(candidate.cardCopiesById) &&
    isPackInventoryByRarity(candidate.packInventoryByRarity) &&
    doesOwnershipMatchCopies(candidate.ownedCardIds, candidate.cardCopiesById) &&
    isDeckSlotsLegacy(candidate.deckSlots) &&
    isDeckSlotId(candidate.selectedDeckSlotId) &&
    typeof candidate.stats?.played === 'number' &&
    typeof candidate.stats?.won === 'number' &&
    typeof candidate.stats?.streak === 'number' &&
    typeof candidate.stats?.bestStreak === 'number' &&
    isAchievementUnlocks(candidate.achievements) &&
    isMissionProgressMap(candidate.missions) &&
    isRankedByMode(candidate.rankedByMode) &&
    typeof candidate.settings?.audioEnabled === 'boolean'
  )
}

function isPlayerProfileV8Legacy(value: unknown): value is PlayerProfileV8Legacy {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PlayerProfileV8Legacy>

  return (
    candidate.version === 8 &&
    typeof candidate.playerName === 'string' &&
    isPlayerNameValid(candidate.playerName).valid &&
    typeof candidate.gold === 'number' &&
    Array.isArray(candidate.ownedCardIds) &&
    candidate.ownedCardIds.every((card) => typeof card === 'string') &&
    isCardCopiesById(candidate.cardCopiesById) &&
    isPackInventoryByRarity(candidate.packInventoryByRarity) &&
    doesOwnershipMatchCopies(candidate.ownedCardIds, candidate.cardCopiesById) &&
    isDeckSlotsLegacy(candidate.deckSlots) &&
    isDeckSlotId(candidate.selectedDeckSlotId) &&
    typeof candidate.stats?.played === 'number' &&
    typeof candidate.stats?.won === 'number' &&
    typeof candidate.stats?.streak === 'number' &&
    typeof candidate.stats?.bestStreak === 'number' &&
    isAchievementUnlocks(candidate.achievements) &&
    isMissionProgressMap(candidate.missions) &&
    isRankedByMode(candidate.rankedByMode) &&
    candidate.settings?.audioEnabled === false
  )
}

function isPlayerProfileV7Legacy(value: unknown): value is PlayerProfileV7Legacy {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PlayerProfileV7Legacy>

  return (
    candidate.version === 7 &&
    typeof candidate.playerName === 'string' &&
    isPlayerNameValid(candidate.playerName).valid &&
    typeof candidate.gold === 'number' &&
    Array.isArray(candidate.ownedCardIds) &&
    candidate.ownedCardIds.every((card) => typeof card === 'string') &&
    isCardCopiesById(candidate.cardCopiesById) &&
    isPackInventoryByRarity(candidate.packInventoryByRarity) &&
    doesOwnershipMatchCopies(candidate.ownedCardIds, candidate.cardCopiesById) &&
    isDeckSlotsLegacy(candidate.deckSlots) &&
    isDeckSlotId(candidate.selectedDeckSlotId) &&
    typeof candidate.stats?.played === 'number' &&
    typeof candidate.stats?.won === 'number' &&
    typeof candidate.stats?.streak === 'number' &&
    typeof candidate.stats?.bestStreak === 'number' &&
    isAchievementUnlocks(candidate.achievements) &&
    isMissionProgressMap(candidate.missions) &&
    isRankedState(candidate.ranked) &&
    candidate.settings?.audioEnabled === false
  )
}

function isPlayerProfileV6Legacy(value: unknown): value is PlayerProfileV6Legacy {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PlayerProfileV6Legacy> & { missions?: unknown }

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
    candidate.missions === undefined &&
    isRankedState(candidate.ranked) &&
    candidate.settings?.audioEnabled === false
  )
}

function isPlayerProfileV6WithoutCards4x4Legacy(value: unknown): value is PlayerProfileV6WithoutCards4x4Legacy {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PlayerProfileV6WithoutCards4x4Legacy>

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
    isDeckSlotsLegacy(candidate.deckSlots) &&
    !isDeckSlots(candidate.deckSlots) &&
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
    isDeckSlotsLegacy(candidate.deckSlots) &&
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
    isDeckSlotsLegacy(candidate.deckSlots) &&
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
    isDeckSlotsLegacy(candidate.deckSlots) &&
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
    isDeckSlotsLegacy(candidate.deckSlots) &&
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
    isDeckSlotsLegacy(candidate.deckSlots) &&
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
    isDeckSlotsLegacy(candidate.deckSlots) &&
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

function isRankedByMode(value: unknown): value is PlayerProfile['rankedByMode'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as Partial<PlayerProfile['rankedByMode']>
  return isRankedState(candidate['3x3']) && isRankedState(candidate['4x4'])
}

function isRankedState(value: unknown): value is RankedState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as Partial<RankedState>

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

function cloneRankedState(state: RankedState): RankedState {
  return {
    ...state,
    resultStreak: { ...state.resultStreak },
  }
}

function isCardCopiesById(value: unknown): value is Record<CardId, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const entries = Object.entries(value)
  return entries.every(([cardId, copies]) => cardId.length > 0 && Number.isInteger(copies) && copies >= 1)
}

function isCardFragmentsById(value: unknown): value is Record<CardId, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const entries = Object.entries(value)
  return entries.every(([cardId, fragments]) => cardId.length > 0 && Number.isInteger(fragments) && fragments >= 1)
}

function isPackInventoryByRarity(value: unknown): value is Record<Rarity, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return packInventoryRarities.every((rarity) => Number.isInteger(candidate[rarity]) && Number(candidate[rarity]) >= 0)
}

function isMissionProgressMap(value: unknown): value is PlayerProfile['missions'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return missionIds.every((missionId) => {
    const mission = candidate[missionId]
    if (!mission || typeof mission !== 'object' || Array.isArray(mission)) {
      return false
    }

    const entry = mission as Partial<PlayerProfile['missions'][MissionId]>
    if (entry.id !== missionId) {
      return false
    }
    if (!Number.isInteger(entry.progress) || Number(entry.progress) < 0) {
      return false
    }
    if (!Number.isInteger(entry.target) || Number(entry.target) <= 0) {
      return false
    }
    if (typeof entry.completed !== 'boolean' || typeof entry.claimed !== 'boolean') {
      return false
    }

    return true
  })
}

function doesOwnershipMatchCopies(
  ownedCardIds: CardId[] | undefined,
  cardCopiesById: Record<CardId, number> | undefined,
  shinyCardCopiesById: Record<CardId, number> | undefined = {},
): boolean {
  if (!ownedCardIds || !cardCopiesById) {
    return false
  }
  if (!shinyCardCopiesById) {
    return false
  }

  const ownedSet = new Set(ownedCardIds)
  if (ownedSet.size !== ownedCardIds.length) {
    return false
  }

  const copySet = new Set([...Object.keys(cardCopiesById), ...Object.keys(shinyCardCopiesById)])
  if (copySet.size !== ownedSet.size) {
    return false
  }

  for (const cardId of ownedSet) {
    if (!copySet.has(cardId)) {
      return false
    }
  }

  for (const cardId of copySet) {
    if (!ownedSet.has(cardId)) {
      return false
    }
  }

  return true
}

function isMissionRewardsGrantedById(value: unknown): value is PlayerProfile['missionRewardsGrantedById'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as Partial<Record<MissionId, unknown>>
  return missionIds.every((missionId) => {
    const entry = candidate[missionId]
    return entry === undefined || entry === true
  })
}

function isAchievementRewardsClaimedById(value: unknown): value is PlayerProfile['achievementRewardsClaimedById'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  return Object.entries(value).every(([achievementId, claimed]) => isAchievementId(achievementId) && claimed === true)
}

function isAchievementProgress(value: unknown): value is AchievementProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as Partial<AchievementProgress>

  return (
    typeof candidate.matchesPlayed === 'number' &&
    typeof candidate.matchesWon === 'number' &&
    typeof candidate.currentStreak === 'number' &&
    typeof candidate.bestStreak === 'number' &&
    typeof candidate.cardsAcquired === 'number' &&
    typeof candidate.goldEarned === 'number' &&
    typeof candidate.packsPurchased === 'number' &&
    typeof candidate.packsOpened === 'number' &&
    typeof candidate.specialPacksOpened === 'number' &&
    typeof candidate.missionsCompleted === 'number' &&
    typeof candidate.baseTutorialsCompleted === 'number' &&
    typeof candidate.elementTutorialsCompleted === 'number' &&
    typeof candidate.rankedMatchesPlayed === 'number' &&
    typeof candidate.rankedWins === 'number' &&
    typeof candidate.deckEdits === 'number' &&
    typeof candidate.shinyPulled === 'number' &&
    typeof candidate.shinyCrafted === 'number'
  )
}

function isDeckSlotId(value: unknown): value is DeckSlotId {
  return value === 'slot-1' || value === 'slot-2' || value === 'slot-3'
}

function isDeckSlotsLegacy(value: unknown): value is [LegacyDeckSlot, LegacyDeckSlot, LegacyDeckSlot] {
  if (!Array.isArray(value) || value.length !== 3) {
    return false
  }

  for (let index = 0; index < deckSlotIds.length; index += 1) {
    const slot = value[index] as Partial<LegacyDeckSlot> | undefined
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

    if (slot.cards.length > DECK_SIZE_3X3 || new Set(slot.cards).size !== slot.cards.length) {
      return false
    }

    if (slot.cards4x4 !== undefined) {
      if (!Array.isArray(slot.cards4x4) || slot.cards4x4.some((card) => typeof card !== 'string')) {
        return false
      }
      if (slot.cards4x4.length > DECK_SIZE_4X4 || new Set(slot.cards4x4).size !== slot.cards4x4.length) {
        return false
      }
    }

    if (slot.mode !== undefined && slot.mode !== '3x3' && slot.mode !== '4x4') {
      return false
    }

    if (typeof slot.rules?.same !== 'boolean' || typeof slot.rules?.plus !== 'boolean') {
      return false
    }
  }

  return true
}

function isDeckSlots(value: unknown): value is [DeckSlot, DeckSlot, DeckSlot] {
  if (!isDeckSlotsLegacy(value)) {
    return false
  }

  return value.every(
    (slot) =>
      Array.isArray(slot.cards4x4) &&
      slot.cards4x4.length <= DECK_SIZE_4X4 &&
      (slot.mode === '3x3' || slot.mode === '4x4'),
  )
}
