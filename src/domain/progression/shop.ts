import { cardPool } from '../cards/cardPool'
import type { CardCategoryId, CardId, PlayerProfile, Rarity } from '../types'
import type { SeededRng } from '../random/seededRng'
import { evaluateAchievements } from './achievements'
import { rollShinyVariant } from './shiny'

export type ShopPackId = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type SpecialPackId = 'sans_coeur_focus' | 'simili_focus' | 'legendary_focus'

export interface SpecialPackPurchaseRequest {
  packId: SpecialPackId
  targetLegendaryCardId?: CardId
}

export interface ShopCardPull {
  cardId: CardId
  rarity: Rarity
  isNewOwnership: boolean
  copiesAfter: number
  isShiny?: boolean
}

export interface ShopPurchaseReceipt {
  packId: ShopPackId
  goldSpent: number
  goldRemaining: number
  packCountAfter: number
}

export interface OpenedPackResult {
  packId: ShopPackId
  remainingPackCount: number
  pulls: [ShopCardPull, ShopCardPull, ShopCardPull]
}

export interface ShopPurchaseProgressionResult {
  profile: PlayerProfile
  receipt: ShopPurchaseReceipt
}

export interface ShopBulkPurchaseReceipt {
  packId: ShopPackId
  quantity: number
  goldSpent: number
  goldRemaining: number
  packCountAfter: number
}

export interface ShopBulkPurchaseProgressionResult {
  profile: PlayerProfile
  receipt: ShopBulkPurchaseReceipt
}

export interface ShopOpenProgressionResult {
  profile: PlayerProfile
  opened: OpenedPackResult
}

export interface OpenedPackBatchResult {
  packId: ShopPackId
  openedCount: number
  remainingPackCount: number
  pulls: ShopCardPull[]
}

export interface ShopOpenBatchProgressionResult {
  profile: PlayerProfile
  opened: OpenedPackBatchResult
}

export interface SpecialPackReceipt {
  packId: SpecialPackId
  goldSpent: number
  goldRemaining: number
}

export interface OpenedSpecialPackResult {
  packId: SpecialPackId
  targetLegendaryCardId: CardId | null
  pulls: [ShopCardPull, ShopCardPull, ShopCardPull]
}

export interface SpecialPackProgressionResult {
  profile: PlayerProfile
  receipt: SpecialPackReceipt
  opened: OpenedSpecialPackResult
}

export interface OpenedShinyTestPackResult {
  packId: 'shiny_test'
  pulls: [ShopCardPull]
}

export interface ShinyTestPackProgressionResult {
  profile: PlayerProfile
  opened: OpenedShinyTestPackResult
}

const dropRarityOrder: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const legendaryFocusFillerCategories: CardCategoryId[] = ['humain']
const generationFocusByPack: Record<'sans_coeur_focus' | 'simili_focus', 1 | 2> = {
  sans_coeur_focus: 1,
  simili_focus: 2,
}
const GEN_1_MAX_POKEDEX_NUMBER = 151
const GEN_2_MIN_POKEDEX_NUMBER = 152
const GEN_2_MAX_POKEDEX_NUMBER = 251

const PACK_PRICES: Record<ShopPackId, number> = {
  common: 60,
  uncommon: 120,
  rare: 220,
  epic: 300,
  legendary: 360,
}

const SPECIAL_PACK_PRICES: Record<SpecialPackId, number> = {
  sans_coeur_focus: 220,
  simili_focus: 220,
  legendary_focus: 900,
}

type PackDropRates = Readonly<Record<Rarity, number>>

const PACK_DROP_RATES: Readonly<Record<ShopPackId, PackDropRates>> = {
  common: { common: 70, uncommon: 22, rare: 5, epic: 2, legendary: 1 },
  uncommon: { common: 35, uncommon: 40, rare: 15, epic: 7, legendary: 3 },
  rare: { common: 15, uncommon: 25, rare: 35, epic: 20, legendary: 5 },
  epic: { common: 0, uncommon: 0, rare: 0, epic: 100, legendary: 0 },
  legendary: { common: 11, uncommon: 22, rare: 44, epic: 20, legendary: 3 },
}

const SPECIAL_BASE_RATES: PackDropRates = {
  common: 70,
  uncommon: 22,
  rare: 5,
  epic: 2,
  legendary: 1,
}
const LEGENDARY_FOCUS_BASE_DROP_CHANCE_PERCENT = 1
const LEGENDARY_FOCUS_DROP_CHANCE_INCREMENT_PERCENT = 1
const LEGENDARY_FOCUS_MAX_DROP_CHANCE_PERCENT = 100

assertPackDropRates()

export function getPackPrice(packId: ShopPackId): number {
  return PACK_PRICES[packId]
}

export function getSpecialPackPrice(packId: SpecialPackId): number {
  return SPECIAL_PACK_PRICES[packId]
}

export function getPackDropRates(packId: ShopPackId): PackDropRates {
  return PACK_DROP_RATES[packId]
}

export function getLegendaryFocusDropChancePercent(profile: PlayerProfile): number {
  const rawChance = profile.specialPackPity?.legendaryFocusChancePercent
  if (typeof rawChance !== 'number' || !Number.isFinite(rawChance)) {
    return LEGENDARY_FOCUS_BASE_DROP_CHANCE_PERCENT
  }

  const clamped = Math.max(
    LEGENDARY_FOCUS_BASE_DROP_CHANCE_PERCENT,
    Math.min(LEGENDARY_FOCUS_MAX_DROP_CHANCE_PERCENT, rawChance),
  )
  return Math.floor(clamped)
}

export function purchaseShopPack(profile: PlayerProfile, packId: ShopPackId): ShopPurchaseProgressionResult {
  const progression = purchaseShopPacks(profile, packId, 1)
  return {
    profile: progression.profile,
    receipt: {
      packId,
      goldSpent: progression.receipt.goldSpent,
      goldRemaining: progression.receipt.goldRemaining,
      packCountAfter: progression.receipt.packCountAfter,
    },
  }
}

export function openOwnedPack(profile: PlayerProfile, packId: ShopPackId, rng: SeededRng): ShopOpenProgressionResult {
  const progression = openOwnedPacks(profile, packId, 1, rng)
  return {
    profile: progression.profile,
    opened: {
      packId,
      remainingPackCount: progression.opened.remainingPackCount,
      pulls: progression.opened.pulls as [ShopCardPull, ShopCardPull, ShopCardPull],
    },
  }
}

export function openShinyTestPack(profile: PlayerProfile, rng: SeededRng): ShinyTestPackProgressionResult {
  if (cardPool.length === 0) {
    throw new Error('No cards available for shiny test pack.')
  }

  const updatedProfile = cloneProfile(profile)
  const card = cardPool[rng.nextInt(cardPool.length)]
  if (!card) {
    throw new Error('Unable to resolve shiny test pull card.')
  }

  const pull = applyPull(updatedProfile, card.id, card.rarity, true)
  const unlocked = evaluateAchievements(updatedProfile)
  if (unlocked.length > 0) {
    updatedProfile.achievements.push(...unlocked)
  }

  return {
    profile: updatedProfile,
    opened: {
      packId: 'shiny_test',
      pulls: [pull],
    },
  }
}

export function purchaseShopPacks(
  profile: PlayerProfile,
  packId: ShopPackId,
  quantity: number,
): ShopBulkPurchaseProgressionResult {
  const normalizedQuantity = validatePackQuantity(quantity)
  const goldSpent = getPackPrice(packId) * normalizedQuantity
  if (profile.gold < goldSpent) {
    throw new Error('Not enough gold for this pack.')
  }

  const updatedProfile = cloneProfile(profile)
  updatedProfile.gold -= goldSpent
  updatedProfile.packInventoryByRarity[packId] += normalizedQuantity
  updatedProfile.achievementProgress.packsPurchased += normalizedQuantity

  const unlocked = evaluateAchievements(updatedProfile)
  if (unlocked.length > 0) {
    updatedProfile.achievements.push(...unlocked)
  }

  return {
    profile: updatedProfile,
    receipt: {
      packId,
      quantity: normalizedQuantity,
      goldSpent,
      goldRemaining: updatedProfile.gold,
      packCountAfter: updatedProfile.packInventoryByRarity[packId],
    },
  }
}

export function openOwnedPacks(
  profile: PlayerProfile,
  packId: ShopPackId,
  quantity: number,
  rng: SeededRng,
): ShopOpenBatchProgressionResult {
  const normalizedQuantity = validatePackQuantity(quantity)
  const availablePackCount = profile.packInventoryByRarity[packId]
  if (availablePackCount <= 0 && normalizedQuantity === 1) {
    throw new Error('No pack available to open.')
  }
  if (availablePackCount < normalizedQuantity) {
    throw new Error('Not enough packs available to open.')
  }

  const updatedProfile = cloneProfile(profile)
  updatedProfile.packInventoryByRarity[packId] -= normalizedQuantity
  updatedProfile.achievementProgress.packsOpened += normalizedQuantity

  const pulls: ShopCardPull[] = []
  for (let packIndex = 0; packIndex < normalizedQuantity; packIndex += 1) {
    for (let pullIndex = 0; pullIndex < 3; pullIndex += 1) {
      const pulledRarity = chooseWeightedRarity(packId, rng)
      const cardId = chooseWeightedCard(pulledRarity, updatedProfile.cardCopiesById, rng)
      pulls.push(applyPull(updatedProfile, cardId, pulledRarity, rollShinyVariant(rng)))
    }
  }

  const unlocked = evaluateAchievements(updatedProfile)
  if (unlocked.length > 0) {
    updatedProfile.achievements.push(...unlocked)
  }

  return {
    profile: updatedProfile,
    opened: {
      packId,
      openedCount: normalizedQuantity,
      remainingPackCount: updatedProfile.packInventoryByRarity[packId],
      pulls,
    },
  }
}

export function purchaseAndOpenSpecialPack(
  profile: PlayerProfile,
  request: SpecialPackPurchaseRequest,
  rng: SeededRng,
): SpecialPackProgressionResult {
  const goldSpent = getSpecialPackPrice(request.packId)
  if (profile.gold < goldSpent) {
    throw new Error('Not enough gold for this special pack.')
  }

  const updatedProfile = cloneProfile(profile)
  updatedProfile.gold -= goldSpent
  updatedProfile.achievementProgress.specialPacksOpened += 1

  const pulls: ShopCardPull[] = []
  let targetLegendaryCardId: CardId | null = null

  if (request.packId === 'sans_coeur_focus' || request.packId === 'simili_focus') {
    pullFromFocusedGeneration(updatedProfile, generationFocusByPack[request.packId], rng, pulls)
  } else {
    targetLegendaryCardId = validateLegendaryTarget(request.targetLegendaryCardId)

    const fillerPool = legendaryFocusFillerCategories.flatMap((categoryId) => getCardsByCategory(categoryId))
    if (fillerPool.length === 0) {
      throw new Error('No cards are available for legendary focus fillers.')
    }

    const focusDropChancePercent = getLegendaryFocusDropChancePercent(updatedProfile)
    const focusRoll = rng.nextInt(100)
    const didDropFocusedLegendary = focusRoll < focusDropChancePercent

    if (didDropFocusedLegendary) {
      pulls.push(applyPull(updatedProfile, targetLegendaryCardId, 'legendary', rollShinyVariant(rng)))
      updatedProfile.specialPackPity = {
        legendaryFocusChancePercent: LEGENDARY_FOCUS_BASE_DROP_CHANCE_PERCENT,
      }
    } else {
      const missPull = chooseLegendaryFocusMissPull(fillerPool, targetLegendaryCardId, updatedProfile.cardCopiesById, rng)
      pulls.push(applyPull(updatedProfile, missPull.cardId, missPull.rarity, rollShinyVariant(rng)))
      updatedProfile.specialPackPity = {
        legendaryFocusChancePercent: incrementLegendaryFocusDropChancePercent(focusDropChancePercent),
      }
    }

    for (let index = 0; index < 2; index += 1) {
      const rarity = chooseRemappedRarity(fillerPool, rng)
      const cardId = chooseWeightedCardFromPool(fillerPool, rarity, updatedProfile.cardCopiesById, rng)
      pulls.push(applyPull(updatedProfile, cardId, rarity, rollShinyVariant(rng)))
    }
  }

  const unlocked = evaluateAchievements(updatedProfile)
  if (unlocked.length > 0) {
    updatedProfile.achievements.push(...unlocked)
  }

  return {
    profile: updatedProfile,
    receipt: {
      packId: request.packId,
      goldSpent,
      goldRemaining: updatedProfile.gold,
    },
    opened: {
      packId: request.packId,
      targetLegendaryCardId,
      pulls: pulls as [ShopCardPull, ShopCardPull, ShopCardPull],
    },
  }
}

function cloneProfile(profile: PlayerProfile): PlayerProfile {
  return {
    ...profile,
    ownedCardIds: [...profile.ownedCardIds],
    cardCopiesById: { ...profile.cardCopiesById },
    cardFragmentsById: { ...profile.cardFragmentsById },
    shinyCardCopiesById: { ...profile.shinyCardCopiesById },
    packInventoryByRarity: { ...profile.packInventoryByRarity },
    deckSlots: profile.deckSlots.map((slot) => ({
      ...slot,
      cards: [...slot.cards],
      cards4x4: [...slot.cards4x4],
      rules: { ...slot.rules },
    })) as PlayerProfile['deckSlots'],
    stats: { ...profile.stats },
    achievementProgress: { ...profile.achievementProgress },
    achievements: [...profile.achievements],
    missions: {
      m1_type_specialist: { ...profile.missions.m1_type_specialist },
      m2_combo_practitioner: { ...profile.missions.m2_combo_practitioner },
      m3_corner_tactician: { ...profile.missions.m3_corner_tactician },
    },
    missionRewardsGrantedById: { ...profile.missionRewardsGrantedById },
    rankedByMode: {
      '3x3': {
        ...profile.rankedByMode['3x3'],
        resultStreak: { ...profile.rankedByMode['3x3'].resultStreak },
      },
      '4x4': {
        ...profile.rankedByMode['4x4'],
        resultStreak: { ...profile.rankedByMode['4x4'].resultStreak },
      },
    },
    settings: { ...profile.settings },
  }
}

function chooseWeightedRarity(packId: ShopPackId, rng: SeededRng): Rarity {
  const rates = getPackDropRates(packId)
  const totalWeight = dropRarityOrder.reduce((sum, rarity) => sum + rates[rarity], 0)
  let roll = rng.nextInt(totalWeight)

  for (const rarity of dropRarityOrder) {
    roll -= rates[rarity]
    if (roll < 0) {
      return rarity
    }
  }

  return dropRarityOrder[dropRarityOrder.length - 1]!
}

function chooseWeightedCard(rarity: Rarity, cardCopiesById: Record<CardId, number>, rng: SeededRng): CardId {
  const candidates = cardPool.filter((card) => card.rarity === rarity)
  return chooseWeightedCardFromCandidates(candidates, cardCopiesById, rng, `No cards found for rarity: ${rarity}`)
}

function chooseWeightedCardFromPool(
  pool: typeof cardPool,
  rarity: Rarity,
  cardCopiesById: Record<CardId, number>,
  rng: SeededRng,
): CardId {
  const candidates = pool.filter((card) => card.rarity === rarity)
  return chooseWeightedCardFromCandidates(candidates, cardCopiesById, rng, `No cards found for rarity: ${rarity}`)
}

function chooseWeightedCardFromCandidates(
  candidates: Array<{ id: CardId }>,
  cardCopiesById: Record<CardId, number>,
  rng: SeededRng,
  emptyError: string,
): CardId {
  if (candidates.length === 0) {
    throw new Error(emptyError)
  }

  let totalWeight = 0
  const weightedCandidates = candidates.map((card) => {
    const copies = cardCopiesById[card.id] ?? 0
    const weight = copies === 0 ? 3 : 1
    totalWeight += weight
    return { cardId: card.id, weight }
  })

  let roll = rng.nextInt(totalWeight)
  for (const candidate of weightedCandidates) {
    if (roll < candidate.weight) {
      return candidate.cardId
    }
    roll -= candidate.weight
  }

  return weightedCandidates[weightedCandidates.length - 1]!.cardId
}

function pullFromFocusedGeneration(
  profile: PlayerProfile,
  generation: 1 | 2,
  rng: SeededRng,
  pulls: ShopCardPull[],
): void {
  const generationPool = getCardsByGeneration(generation)
  if (generationPool.length === 0) {
    throw new Error(`No cards found for generation: ${generation}`)
  }

  for (let index = 0; index < 3; index += 1) {
    const rarity = chooseRemappedRarity(generationPool, rng)
    const cardId = chooseWeightedCardFromPool(generationPool, rarity, profile.cardCopiesById, rng)
    pulls.push(applyPull(profile, cardId, rarity, rollShinyVariant(rng)))
  }
}

function getCardsByCategory(categoryId: CardCategoryId) {
  return cardPool.filter((card) => card.categoryId === categoryId)
}

function getCardsByGeneration(generation: 1 | 2) {
  return cardPool.filter((card) => isCardInGeneration(card.id, generation))
}

function isCardInGeneration(cardId: CardId, generation: 1 | 2): boolean {
  const pokedexNumber = getCardPokedexNumber(cardId)

  if (generation === 1) {
    return pokedexNumber >= 1 && pokedexNumber <= GEN_1_MAX_POKEDEX_NUMBER
  }

  return pokedexNumber >= GEN_2_MIN_POKEDEX_NUMBER && pokedexNumber <= GEN_2_MAX_POKEDEX_NUMBER
}

function getCardPokedexNumber(cardId: CardId): number {
  const parsed = Number.parseInt(cardId.slice(1), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function chooseRemappedRarity(pool: typeof cardPool, rng: SeededRng): Rarity {
  const availableRarities = dropRarityOrder.filter((rarity) => pool.some((card) => card.rarity === rarity))
  if (availableRarities.length === 0) {
    throw new Error('No rarity is available for this card pool.')
  }

  const totalWeight = availableRarities.reduce((sum, rarity) => sum + SPECIAL_BASE_RATES[rarity], 0)
  let roll = rng.nextInt(totalWeight)

  for (const rarity of availableRarities) {
    roll -= SPECIAL_BASE_RATES[rarity]
    if (roll < 0) {
      return rarity
    }
  }

  return availableRarities[availableRarities.length - 1]!
}

function applyPull(profile: PlayerProfile, cardId: CardId, rarity: Rarity, isShiny: boolean): ShopCardPull {
  const existingNormalCopies = profile.cardCopiesById[cardId] ?? 0
  const existingShinyCopies = profile.shinyCardCopiesById[cardId] ?? 0
  const isNewOwnership = existingNormalCopies === 0 && existingShinyCopies === 0

  const copiesAfter = (isShiny ? existingShinyCopies : existingNormalCopies) + 1
  if (isShiny) {
    profile.shinyCardCopiesById[cardId] = copiesAfter
  } else {
    profile.cardCopiesById[cardId] = copiesAfter
  }

  if (!profile.ownedCardIds.includes(cardId)) {
    profile.ownedCardIds.push(cardId)
  }

  profile.achievementProgress.cardsAcquired += 1
  if (isShiny) {
    profile.achievementProgress.shinyPulled += 1
  }

  return {
    cardId,
    rarity,
    isNewOwnership,
    copiesAfter,
    isShiny,
  }
}

function validateLegendaryTarget(targetLegendaryCardId: CardId | undefined): CardId {
  if (!targetLegendaryCardId) {
    throw new Error('Legendary focus pack requires a target legendary card.')
  }

  const target = cardPool.find((card) => card.id === targetLegendaryCardId)
  if (!target || target.rarity !== 'legendary') {
    throw new Error('Invalid legendary focus target.')
  }

  return targetLegendaryCardId
}

function chooseLegendaryFocusMissPull(
  fillerPool: typeof cardPool,
  targetLegendaryCardId: CardId,
  cardCopiesById: Record<CardId, number>,
  rng: SeededRng,
): { cardId: CardId; rarity: Rarity } {
  const missPool = fillerPool.filter((card) => card.id !== targetLegendaryCardId)
  const effectivePool = missPool.length > 0 ? missPool : fillerPool
  const rarity = chooseRemappedRarity(effectivePool, rng)
  const cardId = chooseWeightedCardFromPool(effectivePool, rarity, cardCopiesById, rng)
  return { cardId, rarity }
}

function incrementLegendaryFocusDropChancePercent(current: number): number {
  return Math.min(
    LEGENDARY_FOCUS_MAX_DROP_CHANCE_PERCENT,
    current + LEGENDARY_FOCUS_DROP_CHANCE_INCREMENT_PERCENT,
  )
}

function validatePackQuantity(quantity: number): number {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Pack quantity must be an integer greater than 0.')
  }
  return quantity
}

function assertPackDropRates(): void {
  for (const packId of Object.keys(PACK_DROP_RATES) as ShopPackId[]) {
    const rates = PACK_DROP_RATES[packId]
    const total = dropRarityOrder.reduce((sum, rarity) => sum + rates[rarity], 0)
    if (total !== 100) {
      throw new Error(`Drop rates for pack "${packId}" must sum to 100 (received ${total}).`)
    }
  }
}
