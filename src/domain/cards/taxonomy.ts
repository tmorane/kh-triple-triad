import type { CardCategoryId, CardElementId, CardTypeId } from '../types'

export const cardCategoryIds: CardCategoryId[] = ['sans_coeur', 'simili', 'nescient', 'humain']

export const cardElementIds: CardElementId[] = [
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
]

export const cardTypeIds: CardTypeId[] = ['sans_coeur', 'simili', 'nescient', 'humain']

export const cardCategoryLabelById: Record<CardCategoryId, string> = {
  sans_coeur: 'Obscur',
  simili: 'Psy',
  nescient: 'Combat',
  humain: 'Nature',
}

export const cardElementLabelById: Record<CardElementId, string> = {
  normal: 'Normal',
  feu: 'Feu',
  eau: 'Eau',
  plante: 'Plante',
  electrik: 'Electrik',
  glace: 'Glace',
  combat: 'Combat',
  poison: 'Poison',
  sol: 'Sol',
  vol: 'Vol',
  psy: 'Psy',
  insecte: 'Insecte',
  roche: 'Roche',
  spectre: 'Spectre',
  dragon: 'Dragon',
  tenebres: 'Tenebres',
  acier: 'Acier',
  fee: 'Fee',
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
