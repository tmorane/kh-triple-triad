import { getElementLabel } from '../../domain/cards/taxonomy'
import type { CardElementId } from '../../domain/types'

const elementLogoBasePath = `${import.meta.env.BASE_URL}logos-elements/`

const elementLogoFilenameById: Partial<Record<CardElementId, string>> = {
  normal: 'normal.png',
  feu: 'feu.png',
  eau: 'eau.png',
  plante: 'plante.png',
  electrik: 'electrik.png',
  glace: 'glace.png',
  combat: 'combat.png',
  poison: 'poison.png',
  sol: 'sol.png',
  vol: 'vol.png',
  psy: 'psy.png',
  insecte: 'insecte.png',
  roche: 'roche.png',
  spectre: 'spectre.png',
  dragon: 'dragon.png',
}

export interface ElementLogoMeta {
  id: CardElementId
  name: string
  imageSrc: string
}

export function getElementLogoMeta(elementId: CardElementId): ElementLogoMeta | null {
  const filename = elementLogoFilenameById[elementId]
  if (!filename) {
    return null
  }

  return {
    id: elementId,
    name: getElementLabel(elementId),
    imageSrc: `${elementLogoBasePath}${filename}`,
  }
}
