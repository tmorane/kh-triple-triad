import { cardPool } from '../cards/cardPool'
import type { AchievementId, AchievementUnlock, PlayerProfile } from '../types'

export interface AchievementDefinition {
  id: AchievementId
  title: string
  condition: string
  check(profile: PlayerProfile): boolean
}

const fullCollectionSize = cardPool.length

function playedAtLeast(matches: number) {
  return (profile: PlayerProfile) => profile.stats.played >= matches
}

function wonAtLeast(wins: number) {
  return (profile: PlayerProfile) => profile.stats.won >= wins
}

function bestStreakAtLeast(streak: number) {
  return (profile: PlayerProfile) => profile.stats.bestStreak >= streak
}

function ownsAtLeastCards(totalCards: number) {
  return (profile: PlayerProfile) => profile.ownedCardIds.length >= totalCards
}

function hasGoldAtLeast(gold: number) {
  return (profile: PlayerProfile) => profile.gold >= gold
}

export const achievementCatalog: AchievementDefinition[] = [
  { id: 'play_1', title: 'First Steps', condition: 'Play 1 match', check: playedAtLeast(1) },
  { id: 'play_3', title: 'Warming Up', condition: 'Play 3 matches', check: playedAtLeast(3) },
  { id: 'play_5', title: 'Field Tested', condition: 'Play 5 matches', check: playedAtLeast(5) },
  { id: 'play_10', title: 'Regular Duelist', condition: 'Play 10 matches', check: playedAtLeast(10) },
  { id: 'play_20', title: 'Seasoned Duelist', condition: 'Play 20 matches', check: playedAtLeast(20) },
  { id: 'play_30', title: 'Arena Regular', condition: 'Play 30 matches', check: playedAtLeast(30) },
  { id: 'play_50', title: 'Battle Veteran', condition: 'Play 50 matches', check: playedAtLeast(50) },
  { id: 'play_75', title: 'Endless Challenger', condition: 'Play 75 matches', check: playedAtLeast(75) },
  { id: 'first_win', title: 'First Victory', condition: 'Win 1 match', check: wonAtLeast(1) },
  { id: 'tactician_margin_3', title: 'Triple Winner', condition: 'Win 3 matches', check: wonAtLeast(3) },
  { id: 'wins_5', title: 'Five on the Board', condition: 'Win 5 matches', check: wonAtLeast(5) },
  { id: 'wins_10', title: 'Double Digits', condition: 'Win 10 matches', check: wonAtLeast(10) },
  { id: 'wins_20', title: 'Victory Route', condition: 'Win 20 matches', check: wonAtLeast(20) },
  { id: 'wins_30', title: 'Crown Contender', condition: 'Win 30 matches', check: wonAtLeast(30) },
  { id: 'wins_45', title: 'Relentless', condition: 'Win 45 matches', check: wonAtLeast(45) },
  { id: 'wins_60', title: 'Grandmaster Path', condition: 'Win 60 matches', check: wonAtLeast(60) },
  { id: 'streak_2', title: 'Back-to-Back', condition: 'Reach best streak 2', check: bestStreakAtLeast(2) },
  { id: 'win_streak_3', title: 'On a Roll', condition: 'Reach best streak 3', check: bestStreakAtLeast(3) },
  { id: 'streak_4', title: 'No Brakes', condition: 'Reach best streak 4', check: bestStreakAtLeast(4) },
  { id: 'streak_5', title: 'Hot Hand', condition: 'Reach best streak 5', check: bestStreakAtLeast(5) },
  { id: 'streak_7', title: 'Unstoppable', condition: 'Reach best streak 7', check: bestStreakAtLeast(7) },
  { id: 'streak_10', title: 'Perfect Rhythm', condition: 'Reach best streak 10', check: bestStreakAtLeast(10) },
  { id: 'owned_15', title: 'Collection 15', condition: 'Own 15 cards', check: ownsAtLeastCards(15) },
  { id: 'owned_30', title: 'Collection 30', condition: 'Own 30 cards', check: ownsAtLeastCards(30) },
  { id: 'owned_45', title: 'Collection 45', condition: 'Own 45 cards', check: ownsAtLeastCards(45) },
  { id: 'owned_60', title: 'Collection 60', condition: 'Own 60 cards', check: ownsAtLeastCards(60) },
  { id: 'owned_75', title: 'Collection 75', condition: 'Own 75 cards', check: ownsAtLeastCards(75) },
  { id: 'owned_90', title: 'Collection 90', condition: 'Own 90 cards', check: ownsAtLeastCards(90) },
  { id: 'owned_105', title: 'Collection 105', condition: 'Own 105 cards', check: ownsAtLeastCards(105) },
  { id: 'owned_120', title: 'Collection 120', condition: 'Own 120 cards', check: ownsAtLeastCards(120) },
  { id: 'owned_135', title: 'Collection 135', condition: 'Own 135 cards', check: ownsAtLeastCards(135) },
  {
    id: 'owned_150',
    title: `Collection ${fullCollectionSize}`,
    condition: `Own all ${fullCollectionSize} cards`,
    check: ownsAtLeastCards(fullCollectionSize),
  },
  { id: 'gold_150', title: 'Purse Up', condition: 'Reach 150 gold', check: hasGoldAtLeast(150) },
  { id: 'gold_200', title: 'Coin Keeper', condition: 'Reach 200 gold', check: hasGoldAtLeast(200) },
  { id: 'gold_300', title: 'Treasure Scout', condition: 'Reach 300 gold', check: hasGoldAtLeast(300) },
  { id: 'gold_450', title: 'Treasury Rising', condition: 'Reach 450 gold', check: hasGoldAtLeast(450) },
  { id: 'gold_600', title: 'Vaulted', condition: 'Reach 600 gold', check: hasGoldAtLeast(600) },
  { id: 'gold_800', title: 'Golden Flow', condition: 'Reach 800 gold', check: hasGoldAtLeast(800) },
  { id: 'gold_1000', title: 'Fortune Holder', condition: 'Reach 1000 gold', check: hasGoldAtLeast(1000) },
  {
    id: 'rule_scholar',
    title: 'Rule Scholar',
    condition: 'Have at least one deck slot with Same + Plus enabled',
    check: (profile) => profile.deckSlots.some((slot) => slot.rules.same && slot.rules.plus),
  },
]

const achievementById = Object.fromEntries(achievementCatalog.map((achievement) => [achievement.id, achievement])) as Record<
  AchievementId,
  AchievementDefinition
>

const achievementIds = new Set(achievementCatalog.map((achievement) => achievement.id))

export function isAchievementId(value: unknown): value is AchievementId {
  return typeof value === 'string' && achievementIds.has(value as AchievementId)
}

export function getAchievementDefinition(id: AchievementId): AchievementDefinition {
  return achievementById[id]
}

export function evaluateAchievements(profile: PlayerProfile): AchievementUnlock[] {
  const unlocked = new Set(profile.achievements.map((entry) => entry.id))
  const unlockedAt = new Date().toISOString()
  const nextUnlocks: AchievementUnlock[] = []

  for (const achievement of achievementCatalog) {
    if (unlocked.has(achievement.id)) {
      continue
    }
    if (!achievement.check(profile)) {
      continue
    }

    unlocked.add(achievement.id)
    nextUnlocks.push({ id: achievement.id, unlockedAt })
  }

  return nextUnlocks
}
