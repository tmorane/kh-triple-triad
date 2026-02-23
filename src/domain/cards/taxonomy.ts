import type { CardCategoryId, CardElementId, CardTypeId } from '../types'

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

export const cardTypeIds: CardTypeId[] = ['sans_coeur', 'simili', 'nescient', 'humain', 'disney', 'boss']

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

export const cardTypeLabelById: Record<CardTypeId, string> = {
  sans_coeur: 'Sans-coeur',
  simili: 'Simili',
  nescient: 'Nescient',
  humain: 'Humain',
  disney: 'Disney',
  boss: 'Boss',
}

export const cardTypeByCategoryId: Record<CardCategoryId, CardTypeId> = {
  porteur_de_keyblade: 'humain',
  antagoniste: 'humain',
  entite: 'boss',
  organisation_xiii: 'simili',
  arme_legendaire: 'humain',
  mechant_disney: 'disney',
  sans_coeur: 'sans_coeur',
  simili: 'simili',
  allie: 'humain',
  final_fantasy: 'humain',
  invocation: 'disney',
  allie_disney: 'disney',
  nescient: 'nescient',
  reve_mangeur: 'nescient',
  pnj: 'humain',
  allie_twewy: 'humain',
  alliee: 'humain',
  disney: 'disney',
  heros: 'humain',
  boss_kh: 'boss',
}

export function getCategoryLabel(categoryId: CardCategoryId): string {
  return cardCategoryLabelById[categoryId]
}

export function getElementLabel(elementId: CardElementId): string {
  return cardElementLabelById[elementId]
}

export function getTypeIdByCategory(categoryId: CardCategoryId): CardTypeId {
  return cardTypeByCategoryId[categoryId]
}

export function getTypeLabel(typeId: CardTypeId): string {
  return cardTypeLabelById[typeId]
}
