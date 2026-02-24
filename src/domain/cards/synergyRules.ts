import { cardTypeIds } from './taxonomy'
import type { CardTypeId } from '../types'

export interface SynergyRuleSpec {
  typeId: CardTypeId
  label: string
  primaryThreshold: number
  secondaryThreshold: number | null
  primaryEffect: string
  secondaryEffect: string | null
  legendDescription: string
}

const sharedSecondaryEffect = 'Victoire: +5 or et +1 progression mission.'

const synergyRuleByTypeId: Record<CardTypeId, SynergyRuleSpec> = {
  sans_coeur: {
    typeId: 'sans_coeur',
    label: 'Obscur',
    primaryThreshold: 3,
    secondaryThreshold: 2,
    primaryEffect: '1er coup: +1 sur les 4 cotes.',
    secondaryEffect: sharedSecondaryEffect,
    legendDescription: 'Obscur (3+) : +1 on all 4 sides on first move.',
  },
  simili: {
    typeId: 'simili',
    label: 'Psy',
    primaryThreshold: 3,
    secondaryThreshold: 2,
    primaryEffect: 'Pose en coin: +1 sur les cotes actifs du coin.',
    secondaryEffect: sharedSecondaryEffect,
    legendDescription: 'Psy (3+) : +1 on active corner sides.',
  },
  nescient: {
    typeId: 'nescient',
    label: 'Combat',
    primaryThreshold: 3,
    secondaryThreshold: 2,
    primaryEffect: 'Same/Plus: +3 or par declenchement (max +12/match).',
    secondaryEffect: sharedSecondaryEffect,
    legendDescription: 'Combat (3+) : +3 gold per Same/Plus trigger (cap +12/match).',
  },
  humain: {
    typeId: 'humain',
    label: 'Nature',
    primaryThreshold: 3,
    secondaryThreshold: null,
    primaryEffect: 'Victoire avec +2 points d ecart: +10 or.',
    secondaryEffect: null,
    legendDescription: 'Nature (3+) : +10 gold on 2+ point win.',
  },
}

export const synergyRuleSpecs: SynergyRuleSpec[] = cardTypeIds.map((typeId) => synergyRuleByTypeId[typeId])

export function getSynergyRuleSpec(typeId: CardTypeId): SynergyRuleSpec {
  return synergyRuleByTypeId[typeId]
}

