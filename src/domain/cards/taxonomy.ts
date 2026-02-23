import type { CardCategoryId, CardElementId, CardTypeId } from '../types'

export const cardCategoryIds: CardCategoryId[] = ['sans_coeur', 'simili', 'nescient', 'humain']

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

export const cardTypeIds: CardTypeId[] = ['sans_coeur', 'simili', 'nescient', 'humain']

export const cardCategoryLabelById: Record<CardCategoryId, string> = {
  sans_coeur: 'Obscur',
  simili: 'Psy',
  nescient: 'Combat',
  humain: 'Nature',
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
  sans_coeur: 'Obscur',
  simili: 'Psy',
  nescient: 'Combat',
  humain: 'Nature',
}

export const cardTypeByCategoryId: Record<CardCategoryId, CardTypeId> = {
  sans_coeur: 'sans_coeur',
  simili: 'simili',
  nescient: 'nescient',
  humain: 'humain',
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
