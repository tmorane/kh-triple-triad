import { cardPool, getCard } from '../cards/cardPool'
import { createSeededRng } from '../random/seededRng'
import type { CardId, PlayerProfile, RankedTierId, Rarity } from '../types'
import type { CpuAiProfile } from './ai'

export type OpponentLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

interface DeckScoreRange {
  min: number
  max: number
}

interface OpponentLevelConfig {
  level: OpponentLevel
  tierId: RankedTierId
  scoreRange: DeckScoreRange
  rarityWeights: Partial<Record<Rarity, number>>
  aiProfile: CpuAiProfile
  winGoldBonus: number
}

export interface CpuOpponentPreview {
  level: OpponentLevel
  tierId: RankedTierId
  scoreRange: DeckScoreRange
  aiProfile: CpuAiProfile
  baseTargetScore: number
  adaptiveTargetScore: number
  winGoldBonus: number
}

export interface CpuOpponent extends CpuOpponentPreview {
  deck: CardId[]
  deckScore: number
}

interface CandidateDeck {
  deck: CardId[]
  score: number
  distanceToTarget: number
}

const candidateDeckCount = 300
const autoDeckNarrowPassCandidates = 500
const autoDeckBroadPassCandidates = 2000
const autoDeckNarrowPoolSize = 60

export const opponentLevelConfigs: ReadonlyArray<OpponentLevelConfig> = [
  {
    level: 1,
    tierId: 'iron',
    scoreRange: { min: 34, max: 40 },
    rarityWeights: { common: 1 },
    aiProfile: 'novice',
    winGoldBonus: 0,
  },
  {
    level: 2,
    tierId: 'bronze',
    scoreRange: { min: 38, max: 52 },
    rarityWeights: { common: 0.75, uncommon: 0.25 },
    aiProfile: 'novice',
    winGoldBonus: 4,
  },
  {
    level: 3,
    tierId: 'silver',
    scoreRange: { min: 62, max: 78 },
    rarityWeights: { uncommon: 0.7, rare: 0.3 },
    aiProfile: 'standard',
    winGoldBonus: 8,
  },
  {
    level: 4,
    tierId: 'gold',
    scoreRange: { min: 72, max: 90 },
    rarityWeights: { uncommon: 0.45, rare: 0.55 },
    aiProfile: 'standard',
    winGoldBonus: 12,
  },
  {
    level: 5,
    tierId: 'platinum',
    scoreRange: { min: 94, max: 116 },
    rarityWeights: { rare: 0.7, epic: 0.3 },
    aiProfile: 'standard',
    winGoldBonus: 16,
  },
  {
    level: 6,
    tierId: 'emerald',
    scoreRange: { min: 104, max: 128 },
    rarityWeights: { rare: 0.45, epic: 0.55 },
    aiProfile: 'expert',
    winGoldBonus: 20,
  },
  {
    level: 7,
    tierId: 'diamond',
    scoreRange: { min: 132, max: 158 },
    rarityWeights: { epic: 0.65, legendary: 0.35 },
    aiProfile: 'expert',
    winGoldBonus: 24,
  },
  {
    level: 8,
    tierId: 'master',
    scoreRange: { min: 150, max: 178 },
    rarityWeights: { epic: 0.25, legendary: 0.75 },
    aiProfile: 'expert',
    winGoldBonus: 28,
  },
]

const configByTier: Partial<Record<RankedTierId, OpponentLevelConfig>> = Object.fromEntries(
  opponentLevelConfigs.map((entry) => [entry.tierId, entry]),
) as Partial<Record<RankedTierId, OpponentLevelConfig>>

const cardsByRarity: Record<Rarity, CardId[]> = {
  common: cardPool.filter((card) => card.rarity === 'common').map((card) => card.id),
  uncommon: cardPool.filter((card) => card.rarity === 'uncommon').map((card) => card.id),
  rare: cardPool.filter((card) => card.rarity === 'rare').map((card) => card.id),
  epic: cardPool.filter((card) => card.rarity === 'epic').map((card) => card.id),
  legendary: cardPool.filter((card) => card.rarity === 'legendary').map((card) => card.id),
}

export function computeDeckScore(cardIds: CardId[]): number {
  return cardIds.reduce((sum, cardId) => {
    const card = getCard(cardId)
    return sum + card.top + card.right + card.bottom + card.left
  }, 0)
}

export function getOpponentLevelForProfile(profile: PlayerProfile): OpponentLevel {
  return getConfigForTier(profile.ranked.tier).level
}

export function getCpuOpponentPreview(profile: PlayerProfile, playerDeck: CardId[]): CpuOpponentPreview {
  const config = getConfigForTier(profile.ranked.tier)
  const playerDeckScore = computeDeckScore(playerDeck)
  const { min, max } = config.scoreRange
  const baseTargetScore = Math.round((min + max) / 2)
  const adaptiveTargetScore = clamp(Math.round(baseTargetScore + (playerDeckScore - baseTargetScore) * 0.4), min, max)

  return {
    level: config.level,
    tierId: config.tierId,
    scoreRange: { ...config.scoreRange },
    aiProfile: config.aiProfile,
    baseTargetScore,
    adaptiveTargetScore,
    winGoldBonus: config.winGoldBonus,
  }
}

export function buildCpuOpponent(profile: PlayerProfile, playerDeck: CardId[], seed: number): CpuOpponent {
  const preview = getCpuOpponentPreview(profile, playerDeck)
  const config = getConfigForTier(preview.tierId)
  const rng = createSeededRng(seed)

  let bestInRange: CandidateDeck | null = null
  let bestOverall: CandidateDeck | null = null

  for (let index = 0; index < candidateDeckCount; index += 1) {
    const deck = generateCandidateDeck(config.rarityWeights, rng)
    const score = computeDeckScore(deck)
    const distanceToTarget = Math.abs(score - preview.adaptiveTargetScore)
    const candidate: CandidateDeck = { deck, score, distanceToTarget }
    const withinRange = score >= preview.scoreRange.min && score <= preview.scoreRange.max

    if (withinRange) {
      bestInRange = chooseBetterCandidate(bestInRange, candidate)
    }

    bestOverall = chooseBetterCandidate(bestOverall, candidate)
  }

  const chosen = bestInRange ?? bestOverall
  if (!chosen) {
    throw new Error('Unable to build CPU opponent deck.')
  }

  return {
    ...preview,
    deck: [...chosen.deck],
    deckScore: chosen.score,
  }
}

function getConfigForTier(tierId: RankedTierId): OpponentLevelConfig {
  if (tierId === 'grandmaster' || tierId === 'challenger') {
    return opponentLevelConfigs[opponentLevelConfigs.length - 1]!
  }

  const config = configByTier[tierId]
  if (!config) {
    throw new Error(`No opponent config for tier ${tierId}.`)
  }
  return config
}

export function buildAutoPlayerDeck(scoreRange: CpuOpponentPreview['scoreRange'], seed: number): CardId[] {
  const target = Math.round((scoreRange.min + scoreRange.max) / 2)
  const perCardTarget = target / 5
  const allCardIds = cardPool.map((card) => card.id)
  const rankedByPerCardTarget = cardPool
    .map((card) => ({
      cardId: card.id,
      total: card.top + card.right + card.bottom + card.left,
    }))
    .sort((left, right) => {
      const distanceDelta = Math.abs(left.total - perCardTarget) - Math.abs(right.total - perCardTarget)
      if (distanceDelta !== 0) {
        return distanceDelta
      }
      return left.cardId.localeCompare(right.cardId)
    })
    .map((entry) => entry.cardId)

  const narrowPool = rankedByPerCardTarget.slice(0, Math.max(5, autoDeckNarrowPoolSize))
  const narrowPass = findBestDeckForRange(narrowPool, target, scoreRange, seed, autoDeckNarrowPassCandidates)
  if (narrowPass.bestInRange) {
    return [...narrowPass.bestInRange.deck]
  }

  const broadPass = findBestDeckForRange(allCardIds, target, scoreRange, seed + 1, autoDeckBroadPassCandidates)
  const chosen = broadPass.bestInRange ?? broadPass.bestOverall
  if (!chosen) {
    throw new Error('Unable to build automatic player deck.')
  }

  return [...chosen.deck]
}

function generateCandidateDeck(rarityWeights: Partial<Record<Rarity, number>>, rng: ReturnType<typeof createSeededRng>): CardId[] {
  const selected = new Set<CardId>()
  const deck: CardId[] = []

  while (deck.length < 5) {
    const rarity = pickRarity(rarityWeights, selected, rng)
    const available = cardsByRarity[rarity].filter((cardId) => !selected.has(cardId))
    if (available.length === 0) {
      throw new Error(`No available cards for rarity ${rarity}.`)
    }

    const cardId = available[rng.nextInt(available.length)]
    selected.add(cardId)
    deck.push(cardId)
  }

  return [...deck].sort()
}

function findBestDeckForRange(
  candidateCardIds: CardId[],
  targetScore: number,
  scoreRange: CpuOpponentPreview['scoreRange'],
  seed: number,
  attempts: number,
): { bestInRange: CandidateDeck | null; bestOverall: CandidateDeck | null } {
  if (candidateCardIds.length < 5) {
    throw new Error('At least five candidate cards are required to build an automatic deck.')
  }

  const rng = createSeededRng(seed)
  let bestInRange: CandidateDeck | null = null
  let bestOverall: CandidateDeck | null = null

  for (let index = 0; index < attempts; index += 1) {
    const deck = pickRandomDistinct(candidateCardIds, 5, rng)
    const score = computeDeckScore(deck)
    const candidate: CandidateDeck = {
      deck: [...deck].sort(),
      score,
      distanceToTarget: Math.abs(score - targetScore),
    }
    const inRange = candidate.score >= scoreRange.min && candidate.score <= scoreRange.max

    if (inRange) {
      bestInRange = chooseBetterCandidate(bestInRange, candidate)
    }

    bestOverall = chooseBetterCandidate(bestOverall, candidate)
  }

  return { bestInRange, bestOverall }
}

function pickRandomDistinct(cardIds: CardId[], count: number, rng: ReturnType<typeof createSeededRng>): CardId[] {
  if (cardIds.length < count) {
    throw new Error(`Expected at least ${count} card ids.`)
  }

  const remaining = [...cardIds]
  const picked: CardId[] = []
  while (picked.length < count) {
    const index = rng.nextInt(remaining.length)
    const [cardId] = remaining.splice(index, 1)
    picked.push(cardId)
  }

  return picked
}

function pickRarity(
  rarityWeights: Partial<Record<Rarity, number>>,
  selected: Set<CardId>,
  rng: ReturnType<typeof createSeededRng>,
): Rarity {
  const weightedRarities = (Object.entries(rarityWeights) as Array<[Rarity, number | undefined]>)
    .map(([rarity, weight]) => ({ rarity, weight: weight ?? 0 }))
    .filter(({ rarity, weight }) => weight > 0 && cardsByRarity[rarity].some((cardId) => !selected.has(cardId)))

  if (weightedRarities.length === 0) {
    throw new Error('No rarity weights available to build CPU deck.')
  }

  const totalWeight = weightedRarities.reduce((sum, entry) => sum + entry.weight, 0)
  const roll = rng.next() * totalWeight
  let cursor = 0

  for (const entry of weightedRarities) {
    cursor += entry.weight
    if (roll <= cursor) {
      return entry.rarity
    }
  }

  return weightedRarities[weightedRarities.length - 1].rarity
}

function chooseBetterCandidate(current: CandidateDeck | null, next: CandidateDeck): CandidateDeck {
  if (!current) {
    return next
  }
  if (next.distanceToTarget < current.distanceToTarget) {
    return next
  }
  if (next.distanceToTarget > current.distanceToTarget) {
    return current
  }

  return compareDeckLexicographically(next.deck, current.deck) < 0 ? next : current
}

function compareDeckLexicographically(left: CardId[], right: CardId[]): number {
  const leftKey = [...left].sort().join('|')
  const rightKey = [...right].sort().join('|')
  return leftKey.localeCompare(rightKey)
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}
