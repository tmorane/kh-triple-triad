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
  normal: '⛔ Mode normal: effets type OFF, Same/Plus OFF.',
  feu: '🔥 Pose 1x: brûle un ennemi adjacent (2 tours, -1 toutes stats/tour).',
  eau: '🌊 Pose 1x: inonde 1 case vide (prochaine non-Spectre: -2 meilleure stat).',
  plante: '🌿 Passif: +1 toutes stats par allié adjacent (max +2).',
  electrik: '⚡ Pose 1x: un allié devient intouchable pendant le prochain tour adverse.',
  glace: '❄️ Pose 1x: gèle 1 case vide (prochaine pose adverse bloquée).',
  combat: '⚔️ Passif: +2 quand la carte attaque.',
  poison: '☠️ Pose 1x: empoisonne 1 carte en main adverse (-1 toutes stats quand posée).',
  sol: '🪨 Pose 1x: adjacentes -1 meilleure stat (combat en cours).',
  vol: '🕊️ Pose 1x: une carte ennemie posée prend -1 toutes stats (1 tour).',
  psy: '🔄 Pose 1x: une carte ennemie posée inverse meilleure/pire stat.',
  insecte: '🐞 Entrée: +1 toutes stats par Insecte allié déjà posé (max +2).',
  roche: '🛡️ Entrée: 1 bouclier (annule la 1re défaite en duel).',
  spectre: '👻 Passif: ignore les malus et restrictions de case.',
  dragon: '🐉 Pose 1x: +1 sur 2 stats faibles, -1 sur la stat la plus forte.',
}

const plainEffectTextByElementId: Readonly<Record<(typeof ELEMENT_EFFECT_ORDERED_IDS)[number], string>> = {
  normal: 'Mode normal: effets type OFF, Same/Plus OFF.',
  feu: 'Pose 1x: brûle un ennemi adjacent (2 tours, -1 toutes stats/tour).',
  eau: 'Pose 1x: inonde 1 case vide (prochaine non-Spectre: -2 meilleure stat).',
  plante: 'Passif: +1 toutes stats par allié adjacent (max +2).',
  electrik: 'Pose 1x: un allié devient intouchable pendant le prochain tour adverse.',
  glace: 'Pose 1x: gèle 1 case vide (prochaine pose adverse bloquée).',
  combat: 'Passif: +2 quand la carte attaque.',
  poison: 'Pose 1x: empoisonne 1 carte en main adverse (-1 toutes stats quand posée).',
  sol: 'Pose 1x: adjacentes -1 meilleure stat (combat en cours).',
  vol: 'Pose 1x: une carte ennemie posée prend -1 toutes stats (1 tour).',
  psy: 'Pose 1x: une carte ennemie posée inverse meilleure/pire stat.',
  insecte: 'Entrée: +1 toutes stats par Insecte allié déjà posé (max +2).',
  roche: 'Entrée: 1 bouclier (annule la 1re défaite en duel).',
  spectre: 'Passif: ignore les malus et restrictions de case.',
  dragon: 'Pose 1x: +1 sur 2 stats faibles, -1 sur la stat la plus forte.',
}

export function getElementEffectText(elementId: CardElementId, variant: 'visual' | 'plain' = 'visual'): string {
  const catalog = variant === 'plain' ? plainEffectTextByElementId : effectTextByElementId
  if (elementId in catalog) {
    return catalog[elementId as (typeof ELEMENT_EFFECT_ORDERED_IDS)[number]]
  }
  return variant === 'visual' ? '⚠️ Effet non catalogué.' : 'Effet non catalogue pour ce type.'
}
