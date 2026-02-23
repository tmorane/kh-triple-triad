import type { CardTypeId } from '../../domain/types'

export type TypeLogoId = 'sans_coeur' | 'simili' | 'nescient' | 'humain'

export interface TypeLogoMeta {
  id: TypeLogoId
  name: string
  imageSrc: string
}

const typeLogoById: Record<TypeLogoId, TypeLogoMeta> = {
  sans_coeur: {
    id: 'sans_coeur',
    name: 'Obscur',
    imageSrc: '/logos-types/obscur.png',
  },
  simili: {
    id: 'simili',
    name: 'Psy',
    imageSrc: '/logos-types/psy.png',
  },
  nescient: {
    id: 'nescient',
    name: 'Combat',
    imageSrc: '/logos-types/combat.png',
  },
  humain: {
    id: 'humain',
    name: 'Nature',
    imageSrc: '/logos-types/nature.png',
  },
}

export function resolveTypeLogoId(typeId: CardTypeId): TypeLogoId {
  return typeId
}

export function getTypeLogoMeta(typeId: CardTypeId): TypeLogoMeta {
  return typeLogoById[resolveTypeLogoId(typeId)]
}
