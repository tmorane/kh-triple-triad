import type { AchievementId, AchievementUnlock, PlayerProfile } from '../types'

export interface AchievementDefinition {
  id: AchievementId
  title: string
  condition: string
  check(profile: PlayerProfile): boolean
}

function thresholdAtLeast(
  read: (profile: PlayerProfile) => number,
  threshold: number,
): (profile: PlayerProfile) => boolean {
  return (profile) => read(profile) >= threshold
}

export const achievementCatalog: AchievementDefinition[] = [
  { id: 'match_1', title: 'Premier Duel', condition: 'Jouer 1 match', check: thresholdAtLeast((p) => p.achievementProgress.matchesPlayed, 1) },
  { id: 'match_10', title: 'Habitué de l Arène', condition: 'Jouer 10 matchs', check: thresholdAtLeast((p) => p.achievementProgress.matchesPlayed, 10) },
  { id: 'match_30', title: 'Combattant Assidu', condition: 'Jouer 30 matchs', check: thresholdAtLeast((p) => p.achievementProgress.matchesPlayed, 30) },
  { id: 'match_60', title: 'Pilier du Plateau', condition: 'Jouer 60 matchs', check: thresholdAtLeast((p) => p.achievementProgress.matchesPlayed, 60) },
  { id: 'win_1', title: 'Première Victoire', condition: 'Gagner 1 match', check: thresholdAtLeast((p) => p.achievementProgress.matchesWon, 1) },
  { id: 'win_10', title: 'Vainqueur Confirmé', condition: 'Gagner 10 matchs', check: thresholdAtLeast((p) => p.achievementProgress.matchesWon, 10) },
  { id: 'win_30', title: 'Domination Tactique', condition: 'Gagner 30 matchs', check: thresholdAtLeast((p) => p.achievementProgress.matchesWon, 30) },
  { id: 'win_50', title: 'Légende Locale', condition: 'Gagner 50 matchs', check: thresholdAtLeast((p) => p.achievementProgress.matchesWon, 50) },
  { id: 'streak_3', title: 'Série Lancée', condition: 'Atteindre une série de 3 victoires', check: thresholdAtLeast((p) => p.achievementProgress.bestStreak, 3) },
  { id: 'streak_5', title: 'Main Brûlante', condition: 'Atteindre une série de 5 victoires', check: thresholdAtLeast((p) => p.achievementProgress.bestStreak, 5) },
  { id: 'streak_8', title: 'Inarrêtable', condition: 'Atteindre une série de 8 victoires', check: thresholdAtLeast((p) => p.achievementProgress.bestStreak, 8) },
  { id: 'cards_10', title: 'Collectionneur Curieux', condition: 'Acquérir 10 copies de cartes', check: thresholdAtLeast((p) => p.achievementProgress.cardsAcquired, 10) },
  { id: 'cards_25', title: 'Collectionneur Régulier', condition: 'Acquérir 25 copies de cartes', check: thresholdAtLeast((p) => p.achievementProgress.cardsAcquired, 25) },
  { id: 'cards_50', title: 'Collectionneur Expert', condition: 'Acquérir 50 copies de cartes', check: thresholdAtLeast((p) => p.achievementProgress.cardsAcquired, 50) },
  { id: 'cards_100', title: 'Archiviste du Deck', condition: 'Acquérir 100 copies de cartes', check: thresholdAtLeast((p) => p.achievementProgress.cardsAcquired, 100) },
  { id: 'cards_200', title: 'Maître du Pokédex', condition: 'Acquérir 200 copies de cartes', check: thresholdAtLeast((p) => p.achievementProgress.cardsAcquired, 200) },
  { id: 'gold_250', title: 'Bourse Solide', condition: 'Gagner 250 gold au total', check: thresholdAtLeast((p) => p.achievementProgress.goldEarned, 250) },
  { id: 'gold_1000', title: 'Trésorier', condition: 'Gagner 1000 gold au total', check: thresholdAtLeast((p) => p.achievementProgress.goldEarned, 1000) },
  { id: 'gold_2000', title: 'Banquier du Jardin', condition: 'Gagner 2000 gold au total', check: thresholdAtLeast((p) => p.achievementProgress.goldEarned, 2000) },
  { id: 'missions_1', title: 'Mission Accomplie', condition: 'Terminer 1 mission', check: thresholdAtLeast((p) => p.achievementProgress.missionsCompleted, 1) },
  { id: 'missions_2', title: 'Agent Efficace', condition: 'Terminer 2 missions', check: thresholdAtLeast((p) => p.achievementProgress.missionsCompleted, 2) },
  { id: 'missions_3', title: 'Tableau Complet', condition: 'Terminer 3 missions', check: thresholdAtLeast((p) => p.achievementProgress.missionsCompleted, 3) },
  { id: 'tutorial_base_1', title: 'Fondations Posées', condition: 'Terminer le tuto de base', check: thresholdAtLeast((p) => p.achievementProgress.baseTutorialsCompleted, 1) },
  { id: 'tutorial_elements_5', title: 'Élève Appliqué', condition: 'Terminer 5 tutos élémentaires', check: thresholdAtLeast((p) => p.achievementProgress.elementTutorialsCompleted, 5) },
  { id: 'tutorial_elements_15', title: 'Docteur des Types', condition: 'Terminer 15 tutos élémentaires', check: thresholdAtLeast((p) => p.achievementProgress.elementTutorialsCompleted, 15) },
  { id: 'ranked_play_1', title: 'Entrée Classée', condition: 'Jouer 1 match classé', check: thresholdAtLeast((p) => p.achievementProgress.rankedMatchesPlayed, 1) },
  { id: 'ranked_play_10', title: 'Routinier Classé', condition: 'Jouer 10 matchs classés', check: thresholdAtLeast((p) => p.achievementProgress.rankedMatchesPlayed, 10) },
  { id: 'ranked_win_5', title: 'Grimpeur Sérieux', condition: 'Gagner 5 matchs classés', check: thresholdAtLeast((p) => p.achievementProgress.rankedWins, 5) },
  { id: 'ranked_win_20', title: 'Prédateur du Ladder', condition: 'Gagner 20 matchs classés', check: thresholdAtLeast((p) => p.achievementProgress.rankedWins, 20) },
  { id: 'pack_buy_1', title: 'Premières Courses', condition: 'Acheter 1 pack', check: thresholdAtLeast((p) => p.achievementProgress.packsPurchased, 1) },
  { id: 'pack_buy_20', title: 'Client Premium', condition: 'Acheter 20 packs', check: thresholdAtLeast((p) => p.achievementProgress.packsPurchased, 20) },
  { id: 'pack_open_1', title: 'Ouverture Officielle', condition: 'Ouvrir 1 pack', check: thresholdAtLeast((p) => p.achievementProgress.packsOpened, 1) },
  { id: 'pack_open_20', title: 'Déballage Intensif', condition: 'Ouvrir 20 packs', check: thresholdAtLeast((p) => p.achievementProgress.packsOpened, 20) },
  { id: 'special_open_1', title: 'Booster Spécial', condition: 'Ouvrir 1 pack spécial', check: thresholdAtLeast((p) => p.achievementProgress.specialPacksOpened, 1) },
  { id: 'special_open_10', title: 'Collection Spéciale', condition: 'Ouvrir 10 packs spéciaux', check: thresholdAtLeast((p) => p.achievementProgress.specialPacksOpened, 10) },
  { id: 'deck_edit_10', title: 'Architecte de Deck', condition: 'Effectuer 10 modifications de deck', check: thresholdAtLeast((p) => p.achievementProgress.deckEdits, 10) },
  { id: 'deck_edit_40', title: 'Ingénieur de Meta', condition: 'Effectuer 40 modifications de deck', check: thresholdAtLeast((p) => p.achievementProgress.deckEdits, 40) },
  { id: 'shiny_pull_1', title: 'Éclat Chanceux', condition: 'Obtenir 1 carte shiny en ouverture', check: thresholdAtLeast((p) => p.achievementProgress.shinyPulled, 1) },
  { id: 'shiny_craft_1', title: 'Artisan Shiny', condition: 'Crafter 1 carte shiny', check: thresholdAtLeast((p) => p.achievementProgress.shinyCrafted, 1) },
  { id: 'shiny_craft_5', title: 'Forgeron Arc-en-Ciel', condition: 'Crafter 5 cartes shiny', check: thresholdAtLeast((p) => p.achievementProgress.shinyCrafted, 5) },
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
