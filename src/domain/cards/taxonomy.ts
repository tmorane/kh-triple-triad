import type { CardCategoryId, CardElementId } from '../types'

export const cardCategoryIds: CardCategoryId[] = [
  'porteur_de_keyblade',
  'antagoniste',
  'entite',
  'organisation_xiii',
  'arme_legendaire',
  'mechant_disney',
  'sans_coeur',
  'simili',
  'allie',
  'final_fantasy',
  'invocation',
  'allie_disney',
  'nescient',
  'reve_mangeur',
  'pnj',
  'allie_twewy',
  'alliee',
  'disney',
  'heros',
  'boss_kh',
]

export const cardElementIds: CardElementId[] = [
  'lumiere',
  'tenebres',
  'feu',
  'glace',
  'foudre',
  'eau',
  'vent',
  'terre',
  'magie',
  'neant',
  'lune',
  'fleur',
  'temps',
  'espace',
  'illusion',
  'soin',
  'poison',
  'aube',
  'neutre',
]

export const cardCategoryLabelById: Record<CardCategoryId, string> = {
  porteur_de_keyblade: 'Porteur de Keyblade',
  antagoniste: 'Antagoniste',
  entite: 'Entité',
  organisation_xiii: 'Organisation XIII',
  arme_legendaire: 'Arme Légendaire',
  mechant_disney: 'Méchant Disney',
  sans_coeur: 'Sans-cœur',
  simili: 'Simili',
  allie: 'Allié',
  final_fantasy: 'Final Fantasy',
  invocation: 'Invocation',
  allie_disney: 'Allié Disney',
  nescient: 'Nescient',
  reve_mangeur: 'Rêve-Mangeur',
  pnj: 'PNJ',
  allie_twewy: 'Allié TWEWY',
  alliee: 'Alliée',
  disney: 'Disney',
  heros: 'Héros',
  boss_kh: 'Boss KH',
}

export const cardElementLabelById: Record<CardElementId, string> = {
  lumiere: 'Lumière',
  tenebres: 'Ténèbres',
  feu: 'Feu',
  glace: 'Glace',
  foudre: 'Foudre',
  eau: 'Eau',
  vent: 'Vent',
  terre: 'Terre',
  magie: 'Magie',
  neant: 'Néant',
  lune: 'Lune',
  fleur: 'Fleur',
  temps: 'Temps',
  espace: 'Espace',
  illusion: 'Illusion',
  soin: 'Soin',
  poison: 'Poison',
  aube: 'Aube',
  neutre: '—',
}

export function getCategoryLabel(categoryId: CardCategoryId): string {
  return cardCategoryLabelById[categoryId]
}

export function getElementLabel(elementId: CardElementId): string {
  return cardElementLabelById[elementId]
}
