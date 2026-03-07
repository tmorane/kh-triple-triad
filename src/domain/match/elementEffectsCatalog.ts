import type { CardElementId } from '../types'

export const ELEMENT_EFFECT_ORDERED_IDS = [
  'normal',
  'feu',
  'eau',
  'plante',
  'electrik',
  'glace',
  'combat',
  'poison',
  'sol',
  'vol',
  'psy',
  'insecte',
  'roche',
  'spectre',
  'dragon',
] as const satisfies ReadonlyArray<CardElementId>

const effectTextByElementId: Readonly<Record<(typeof ELEMENT_EFFECT_ORDERED_IDS)[number], string>> = {
  normal: '⛔ Mode normal: effets OFF + cartes Normal: +1 toutes stats.',
  feu: '🔥 Pose 1x: brûle un ennemi adjacent (1 tour, -1 toutes stats).',
  eau: '🌊 Pose 1x: inonde 1 case vide (prochaine non-Spectre: -3 meilleure stat).',
  plante: '🌿 Passif: +1 toutes stats par Plante alliée adjacente (max +2).',
  electrik: '⚡ Pose 1x: un allié devient intouchable pendant le prochain tour adverse.',
  glace: '❄️ Pose 1x: gèle 1 case vide (prochaine pose adverse bloquée).',
  combat: '⚔️ Passif: +1 quand la carte attaque.',
  poison: '☠️ Pose 1x: empoisonne 1 carte en main adverse (-1 toutes stats quand posée).',
  sol: '🪨 Pose 1x: ennemies adjacentes occupées -1 toutes stats (jusqu à leur prochain tour).',
  vol: '🕊️ Pose: une carte ennemie posée prend -2 toutes stats (1 tour).',
  psy: '🔄 Pose 1x: une carte ennemie posée inverse meilleure/pire stat.',
  insecte: '🐞 Entrée: +1 toutes stats par Insecte allié déjà posé (max +3).',
  roche: '🛡️ Entrée 1x/joueur: 1 bouclier (annule 1 défaite en duel).',
  spectre: '👻 Passif: ignore malus + restrictions, et gagne +1 toutes stats.',
  dragon: '🐉 Pose 1x: +1 sur 2 stats faibles, -1 sur la stat la plus forte.',
}

const plainEffectTextByElementId: Readonly<Record<(typeof ELEMENT_EFFECT_ORDERED_IDS)[number], string>> = {
  normal: 'Mode normal: effets OFF + cartes Normal: +1 toutes stats.',
  feu: 'Pose 1x: brûle un ennemi adjacent (1 tour, -1 toutes stats).',
  eau: 'Pose 1x: inonde 1 case vide (prochaine non-Spectre: -3 meilleure stat).',
  plante: 'Passif: +1 toutes stats par Plante alliée adjacente (max +2).',
  electrik: 'Pose 1x: un allié devient intouchable pendant le prochain tour adverse.',
  glace: 'Pose 1x: gèle 1 case vide (prochaine pose adverse bloquée).',
  combat: 'Passif: +1 quand la carte attaque.',
  poison: 'Pose 1x: empoisonne 1 carte en main adverse (-1 toutes stats quand posée).',
  sol: 'Pose 1x: ennemies adjacentes occupées -1 toutes stats (jusqu à leur prochain tour).',
  vol: 'Pose: une carte ennemie posée prend -2 toutes stats (1 tour).',
  psy: 'Pose 1x: une carte ennemie posée inverse meilleure/pire stat.',
  insecte: 'Entrée: +1 toutes stats par Insecte allié déjà posé (max +3).',
  roche: 'Entrée 1x/joueur: 1 bouclier (annule 1 défaite en duel).',
  spectre: 'Passif: ignore malus + restrictions, et gagne +1 toutes stats.',
  dragon: 'Pose 1x: +1 sur 2 stats faibles, -1 sur la stat la plus forte.',
}

export function getElementEffectText(elementId: CardElementId, variant: 'visual' | 'plain' = 'visual'): string {
  const catalog = variant === 'plain' ? plainEffectTextByElementId : effectTextByElementId
  if (elementId in catalog) {
    return catalog[elementId as (typeof ELEMENT_EFFECT_ORDERED_IDS)[number]]
  }
  return variant === 'visual' ? '⚠️ Effet non catalogué.' : 'Effet non catalogue pour ce type.'
}
