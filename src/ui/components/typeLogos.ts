import type { CardTypeId } from '../../domain/types'

export type TypeLogoId = 'sans_coeur' | 'simili' | 'nescient' | 'r8'

export interface TypeLogoMeta {
  id: TypeLogoId
  name: string
  imageSrc: string
}

const typeLogoById: Record<TypeLogoId, TypeLogoMeta> = {
  sans_coeur: {
    id: 'sans_coeur',
    name: 'Sans-coeur',
    imageSrc: '/logos-types/sans-coeur.webp',
  },
  simili: {
    id: 'simili',
    name: 'Simili',
    imageSrc: '/logos-types/simili.gif',
  },
  nescient: {
    id: 'nescient',
    name: 'Nescient',
    imageSrc: '/logos-types/nescient.webp',
  },
  r8: {
    id: 'r8',
    name: 'Humain/Disney/Boss',
    imageSrc: '/logos-types/humain.png',
  },
}

export function resolveTypeLogoId(typeId: CardTypeId): TypeLogoId {
  if (typeId === 'sans_coeur' || typeId === 'simili' || typeId === 'nescient') {
    return typeId
  }

  return 'r8'
}

export function getTypeLogoMeta(typeId: CardTypeId): TypeLogoMeta {
  return typeLogoById[resolveTypeLogoId(typeId)]
}
