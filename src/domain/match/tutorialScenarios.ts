import { cardPool } from '../cards/cardPool'
import type { CardElementId, CardId, MatchMode, Move, RuleSet } from '../types'
import { getElementEffectText } from './elementEffectsCatalog'
import { ELEMENT_EFFECT_ORDERED_IDS } from './elementEffectsCatalog'

export const BASE_TUTORIAL_SCENARIO_ID = 'intro-basics' as const

export type TutorialScenarioId = typeof BASE_TUTORIAL_SCENARIO_ID | `element-${CardElementId}`

export interface TutorialObjective {
  allowedCells: number[]
  allowedCardIds?: CardId[]
  errorReason?: string
}

interface TutorialStepBase {
  chapterId: string
  chapterLabel: string
  hint: string
  why?: string
}

export interface TutorialCpuStep extends TutorialStepBase {
  actor: 'cpu'
  move: Move & { actor: 'cpu' }
}

export interface TutorialPlayerStep extends TutorialStepBase {
  actor: 'player'
  move: Move & { actor: 'player' }
  why: string
  objective?: TutorialObjective
}

export type TutorialStep = TutorialCpuStep | TutorialPlayerStep

export interface TutorialScenario {
  id: TutorialScenarioId
  mode: MatchMode
  playerDeck: CardId[]
  cpuDeck: CardId[]
  rules: RuleSet
  enableElementPowers: boolean
  strictPowerTargeting: boolean
  title: string
  description: string
  steps: TutorialStep[]
  elementId?: CardElementId
}

const tutorialRules: RuleSet = { open: true, same: false, plus: false }
const tutorialMode: MatchMode = '3x3'
const defaultPlayerFirstPlayerCells = [4, 1, 5, 2, 8] as const
const defaultPlayerFirstCpuCells = [0, 3, 7, 6] as const
const fireCpuFirstPlayerCells = [4, 5, 2, 8] as const
const fireCpuFirstCpuCells = [1, 0, 3, 7, 6] as const
const fallbackCpuDeck: CardId[] = ['c71', 'c72', 'c73', 'c74', 'c75']

function resolveExistingFallbackCpuDeck(): CardId[] {
  const cardIds = new Set(cardPool.map((card) => card.id))
  if (fallbackCpuDeck.every((cardId) => cardIds.has(cardId))) {
    return [...fallbackCpuDeck]
  }
  return cardPool.slice(0, 5).map((card) => card.id)
}

function resolveCardsByElement(elementId: CardElementId): CardId[] {
  return cardPool.filter((card) => card.elementId === elementId).map((card) => card.id)
}

function buildElementDeck(elementId: CardElementId, size: number): CardId[] {
  const source = resolveCardsByElement(elementId)
  if (source.length === 0) {
    throw new Error(`No card found for element "${elementId}".`)
  }
  const deck: CardId[] = []
  for (let index = 0; index < size; index += 1) {
    deck.push(source[index % source.length]!)
  }
  return deck
}

function buildStrictStep(params: {
  actor: 'player' | 'cpu'
  move: Move
  chapterId: string
  chapterLabel: string
  hint: string
  why?: string
}): TutorialStep {
  if (params.actor === 'cpu') {
    return {
      actor: 'cpu',
      move: params.move as Move & { actor: 'cpu' },
      chapterId: params.chapterId,
      chapterLabel: params.chapterLabel,
      hint: params.hint,
      why: params.why,
    }
  }
  return {
    actor: 'player',
    move: params.move as Move & { actor: 'player' },
    chapterId: params.chapterId,
    chapterLabel: params.chapterLabel,
    hint: params.hint,
    why: params.why ?? params.hint,
  }
}

function buildObjectiveStep(params: {
  move: Move & { actor: 'player' }
  chapterId: string
  chapterLabel: string
  hint: string
  why: string
  objective: TutorialObjective
}): TutorialPlayerStep {
  return {
    actor: 'player',
    move: params.move,
    chapterId: params.chapterId,
    chapterLabel: params.chapterLabel,
    hint: params.hint,
    why: params.why,
    objective: {
      allowedCells: [...params.objective.allowedCells],
      allowedCardIds: params.objective.allowedCardIds ? [...params.objective.allowedCardIds] : undefined,
      errorReason: params.objective.errorReason,
    },
  }
}

function buildStrictTutorialSteps(
  playerDeck: CardId[],
  cpuDeck: CardId[],
  hintsByPlayerStep: string[],
  options?: {
    startingActor?: 'player' | 'cpu'
    playerCells?: readonly number[]
    cpuCells?: readonly number[]
  },
): TutorialStep[] {
  const steps: TutorialStep[] = []
  const chapterId = 'strict-demo'
  const chapterLabel = 'Sequence guidee'
  const startingActor = options?.startingActor ?? 'player'
  const playerCells = options?.playerCells ?? defaultPlayerFirstPlayerCells
  const cpuCells = options?.cpuCells ?? defaultPlayerFirstCpuCells
  const turnCount = playerCells.length + cpuCells.length
  let playerIndex = 0
  let cpuIndex = 0

  for (let turn = 0; turn < turnCount; turn += 1) {
    const isPlayerTurn = startingActor === 'player' ? turn % 2 === 0 : turn % 2 === 1
    if (isPlayerTurn) {
      const plannedCell = playerCells[playerIndex]
      if (plannedCell === undefined) {
        throw new Error('Invalid tutorial strict plan: missing player cell.')
      }
      steps.push(
        buildStrictStep({
          actor: 'player',
          move: {
            actor: 'player',
            cardId: playerDeck[playerIndex]!,
            cell: plannedCell,
          },
          chapterId,
          chapterLabel,
          hint: hintsByPlayerStep[playerIndex] ?? 'Pose la carte demandee sur la case surlignee.',
          why: `Sequence guidee: ${hintsByPlayerStep[playerIndex] ?? 'applique le coup demande.'}`,
        }),
      )
      playerIndex += 1
      continue
    }

    const plannedCell = cpuCells[cpuIndex]
    if (plannedCell === undefined) {
      throw new Error('Invalid tutorial strict plan: missing cpu cell.')
    }
    steps.push(
      buildStrictStep({
        actor: 'cpu',
        move: {
          actor: 'cpu',
          cardId: cpuDeck[cpuIndex]!,
          cell: plannedCell,
        },
        chapterId,
        chapterLabel,
        hint: 'Observe le coup du CPU.',
        why: 'Observe la reponse adverse pour comprendre le tempo.',
      }),
    )
    cpuIndex += 1
  }

  return steps
}

function getElementTutorialIntroCopy(elementId: CardElementId, forcedCell: number): { hint: string; why: string } {
  if (elementId === 'normal') {
    return {
      hint: `Avec 5 Normal, les pouvoirs sont coupes et tes cartes Normal gagnent +1. Place ta carte en case ${forcedCell}.`,
      why: 'Mode normal: effet de type OFF, mais tes cartes Normal deviennent plus solides.',
    }
  }
  if (elementId === 'feu') {
    return {
      hint: `Quand tu poses Feu, une carte ennemie adjacente brule pendant 1 tour. Place ta carte en case ${forcedCell}.`,
      why: 'Une carte brulee perd 1 point sur chaque cote pendant 1 tour de son proprietaire.',
    }
  }
  if (elementId === 'eau') {
    return {
      hint: `Quand tu poses Eau, tu noies une case vide. Place ta carte en case ${forcedCell}.`,
      why: 'La prochaine carte non Spectre posee sur cette case perd 3 points sur sa meilleure stat.',
    }
  }
  if (elementId === 'plante') {
    return {
      hint: `Chaque Plante alliee adjacente renforce ta carte Plante. Place ta carte en case ${forcedCell}.`,
      why: 'Chaque voisin Plante allie donne +1 sur chaque cote, jusqu a +2.',
    }
  }
  if (elementId === 'electrik') {
    return {
      hint: `Quand tu poses Electrik, un allie devient intouchable au prochain tour adverse. Place ta carte en case ${forcedCell}.`,
      why: 'Le CPU ne peut pas retourner la carte protegee pendant ce tour.',
    }
  }
  if (elementId === 'glace') {
    return {
      hint: `Quand tu poses Glace, tu gele une case vide. Place ta carte en case ${forcedCell}.`,
      why: 'La prochaine pose adverse sur cette case est bloquee.',
    }
  }
  if (elementId === 'combat') {
    return {
      hint: `Les cartes Combat tapent plus fort quand elles attaquent. Place ta carte en case ${forcedCell}.`,
      why: 'En attaque, la carte gagne +1 sur ses cotes pendant le duel.',
    }
  }
  if (elementId === 'poison') {
    return {
      hint: `Quand tu poses Poison, une carte ennemie dans la main adverse est empoisonnee. Place ta carte en case ${forcedCell}.`,
      why: 'La carte empoisonnee dans la main adverse perd 1 point sur chaque cote quand elle est posee.',
    }
  }
  if (elementId === 'sol') {
    return {
      hint: `Quand tu poses Sol, les ennemis adjacents deja poses sont affaiblis. Place ta carte en case ${forcedCell}.`,
      why: 'Les cartes ennemies adjacentes perdent 1 point sur chaque cote jusqu a leur prochain tour.',
    }
  }
  if (elementId === 'vol') {
    return {
      hint: `Quand tu poses Vol, une carte ennemie deja posee est affaiblie pendant 1 tour. Place ta carte en case ${forcedCell}.`,
      why: 'La cible perd 2 points sur chaque cote pour ce tour.',
    }
  }
  if (elementId === 'psy') {
    return {
      hint: `Quand tu poses Psy, tu perturbes une carte ennemie deja posee. Place ta carte en case ${forcedCell}.`,
      why: 'Sa meilleure stat et sa plus faible stat sont inversees.',
    }
  }
  if (elementId === 'insecte') {
    return {
      hint: `Quand une carte Insecte arrive, elle se renforce selon tes Insecte deja poses. Place ta carte en case ${forcedCell}.`,
      why: 'Chaque Insecte allie deja pose donne +1 sur chaque cote, jusqu a +3.',
    }
  }
  if (elementId === 'roche') {
    return {
      hint: `La premiere carte Roche que tu poses gagne un bouclier. Place ta carte en case ${forcedCell}.`,
      why: 'Le bouclier annule une defaite de duel, une seule fois par joueur.',
    }
  }
  if (elementId === 'spectre') {
    return {
      hint: `Les cartes Spectre ignorent les malus et les restrictions de case. Place ta carte en case ${forcedCell}.`,
      why: 'Leurs stats ne subissent pas les debuffs, elles jouent sur case contrainte et gagnent +1 partout.',
    }
  }
  if (elementId === 'dragon') {
    return {
      hint: `Quand tu poses Dragon, ses stats se reequilibrent. Place ta carte en case ${forcedCell}.`,
      why: 'Deux stats faibles gagnent +1, et la plus forte perd 1.',
    }
  }
  return {
    hint: `Ce type applique un effet special des qu il est joue. Place ta carte en case ${forcedCell}.`,
    why: 'Lis bien les indicateurs de stats pour voir exactement ce qui change.',
  }
}

function buildBaseTutorialScenario(): TutorialScenario {
  const playerDeck: CardId[] = ['c01', 'c03', 'c26', 'c32', 'c17']
  const cpuDeck: CardId[] = ['c50', 'c10', 'c06', 'c07', 'c04']

  return {
    id: BASE_TUTORIAL_SCENARIO_ID,
    mode: tutorialMode,
    playerDeck,
    cpuDeck,
    rules: tutorialRules,
    enableElementPowers: false,
    strictPowerTargeting: false,
    title: 'Tutoriel de base',
    description: 'Apprends les fondamentaux sans pouvoirs de type.',
    steps: [
      buildObjectiveStep({
        move: { actor: 'player', cardId: playerDeck[0]!, cell: 4 },
        chapterId: 'lesson-1',
        chapterLabel: 'Lecon 1/3 - Controle du plateau',
        hint: 'Pose une carte solide au centre (case 5).',
        why: 'But du jeu: finir avec plus de cartes que le CPU. Le centre touche 4 cases, donc c est la meilleure zone pour creer des captures.',
        objective: {
          allowedCells: [4],
          allowedCardIds: ['c01', 'c17', 'c26'],
          errorReason: 'Commence au centre (case 5) avec Bulbizarre, Goupix ou Ferosinge.',
        },
      }),
      buildStrictStep({
        actor: 'cpu',
        move: { actor: 'cpu', cardId: cpuDeck[0]!, cell: 0 },
        chapterId: 'lesson-1',
        chapterLabel: 'Lecon 1/3 - Controle du plateau',
        hint: 'Observe le coup du CPU.',
        why: 'Le CPU se place en coin pour limiter les angles exposes.',
      }),
      buildObjectiveStep({
        move: { actor: 'player', cardId: playerDeck[1]!, cell: 1 },
        chapterId: 'lesson-1',
        chapterLabel: 'Lecon 1/3 - Controle du plateau',
        hint: 'Magicarpe a 1 a droite: pose Carapuce en haut (case 2) pour capturer sa carte.',
        why: 'Une capture retourne la carte ennemie de ton cote. C est comme ca que tu prends l avantage.',
        objective: {
          allowedCells: [1],
          allowedCardIds: ['c03'],
          errorReason: 'Ici joue Carapuce en case 2 pour prendre Magicarpe.',
        },
      }),
      buildStrictStep({
        actor: 'cpu',
        move: { actor: 'cpu', cardId: cpuDeck[1]!, cell: 3 },
        chapterId: 'lesson-2',
        chapterLabel: 'Lecon 2/3 - Contre-attaque et tempo',
        hint: 'Observe la contre-attaque du CPU.',
        why: 'Le CPU punit les bords faibles et recupere du terrain.',
      }),
      buildObjectiveStep({
        move: { actor: 'player', cardId: playerDeck[2]!, cell: 5 },
        chapterId: 'lesson-2',
        chapterLabel: 'Lecon 2/3 - Contre-attaque et tempo',
        hint: 'Pose Ferosinge en case 6 pour couvrir le centre.',
        why: 'Ferosinge a 3 en haut et 2 a gauche: ces valeurs protegent ton milieu et preparent la reprise.',
        objective: {
          allowedCells: [5],
          allowedCardIds: ['c26'],
          errorReason: 'Ici joue Ferosinge en case 6 pour proteger le centre.',
        },
      }),
      buildStrictStep({
        actor: 'cpu',
        move: { actor: 'cpu', cardId: cpuDeck[2]!, cell: 7 },
        chapterId: 'lesson-2',
        chapterLabel: 'Lecon 2/3 - Contre-attaque et tempo',
        hint: 'Observe le coup du CPU.',
        why: 'Le CPU tente de remonter par la ligne basse.',
      }),
      buildObjectiveStep({
        move: { actor: 'player', cardId: playerDeck[3]!, cell: 2 },
        chapterId: 'lesson-3',
        chapterLabel: 'Lecon 3/3 - Fermeture de partie',
        hint: 'Joue Racaillou en case 3 pour verrouiller la ligne du haut.',
        why: 'Racaillou a 3 en bas: cette valeur tient bien la ligne et limite le retour CPU.',
        objective: {
          allowedCells: [2],
          allowedCardIds: ['c32'],
          errorReason: 'Ici joue Racaillou en case 3 pour fermer la ligne du haut.',
        },
      }),
      buildStrictStep({
        actor: 'cpu',
        move: { actor: 'cpu', cardId: cpuDeck[3]!, cell: 6 },
        chapterId: 'lesson-3',
        chapterLabel: 'Lecon 3/3 - Fermeture de partie',
        hint: 'Observe le dernier coup CPU.',
        why: 'Derniere tentative du CPU pour reprendre le score.',
      }),
      buildObjectiveStep({
        move: { actor: 'player', cardId: playerDeck[4]!, cell: 8 },
        chapterId: 'lesson-3',
        chapterLabel: 'Lecon 3/3 - Fermeture de partie',
        hint: 'Termine avec Goupix sur la derniere case libre (case 9).',
        why: 'En fin de partie, chaque case compte. Fermer le plateau protege ton score.',
        objective: {
          allowedCells: [8],
          allowedCardIds: ['c17'],
          errorReason: 'Conclue avec Goupix en case 9 pour verrouiller la fin de partie.',
        },
      }),
    ],
  }
}

export function buildElementTutorialScenarioId(elementId: CardElementId): TutorialScenarioId {
  return `element-${elementId}`
}

function buildElementTutorialScenario(elementId: CardElementId): TutorialScenario {
  const playerDeck = buildElementDeck(elementId, 5)
  const cpuDeck = resolveExistingFallbackCpuDeck()
  const elementEffectText = getElementEffectText(elementId, 'plain')
  const isFireScenario = elementId === 'feu'
  const steps = isFireScenario
    ? buildStrictTutorialSteps(
        playerDeck,
        cpuDeck,
        [
          'Reponds avec une carte Feu au centre pour bruler la carte adverse adjacente.',
          'Continue Feu sur la droite pour garder la pression.',
          'Enchaine Feu en haut droite pour menacer deux cotes.',
          'Ferme avec Feu en bas droite pour verrouiller la fin.',
        ],
        {
          startingActor: 'cpu',
          playerCells: fireCpuFirstPlayerCells,
          cpuCells: fireCpuFirstCpuCells,
        },
      )
    : buildStrictTutorialSteps(playerDeck, cpuDeck, [
        `Pose une carte ${elementId} au centre.`,
        `Continue avec une carte ${elementId} en haut.`,
        `Joue encore ${elementId} sur la droite.`,
        `Enchaine avec ${elementId} sur la ligne du haut.`,
        `Termine le tutoriel ${elementId}.`,
      ])

  const firstPlayerStep = steps.find((step): step is TutorialPlayerStep => step.actor === 'player')
  const introForcedCell = firstPlayerStep ? firstPlayerStep.move.cell + 1 : 5
  const introCopy = getElementTutorialIntroCopy(elementId, introForcedCell)
  const introStep = steps[0]
  if (introStep?.actor === 'player') {
    steps[0] = {
      ...introStep,
      chapterId: 'element-intro',
      chapterLabel: `Lecon 1/2 - Specificite ${elementId}`,
      hint: introCopy.hint,
      why: introCopy.why,
    }
  } else if (introStep?.actor === 'cpu') {
    steps[0] = {
      ...introStep,
      chapterId: 'element-intro',
      chapterLabel: `Lecon 1/2 - Specificite ${elementId}`,
      hint: `Le CPU commence pour te donner une cible. ${introCopy.hint}`,
      why: introCopy.why,
    }
  }

  return {
    id: buildElementTutorialScenarioId(elementId),
    mode: tutorialMode,
    playerDeck,
    cpuDeck,
    rules: tutorialRules,
    enableElementPowers: true,
    strictPowerTargeting: false,
    title: `Tutoriel ${elementId}`,
    description: `Deck force sur le type ${elementId}. Effet: ${elementEffectText}`,
    elementId,
    steps,
  }
}

const baseScenario = buildBaseTutorialScenario()
const elementScenarios = ELEMENT_EFFECT_ORDERED_IDS.map((elementId) => buildElementTutorialScenario(elementId))
const scenarioById = new Map<TutorialScenarioId, TutorialScenario>([baseScenario, ...elementScenarios].map((scenario) => [scenario.id, scenario]))

export function listElementTutorialScenarioIds(): TutorialScenarioId[] {
  return ELEMENT_EFFECT_ORDERED_IDS.map((elementId) => buildElementTutorialScenarioId(elementId))
}

export function resolveTutorialScenario(id: TutorialScenarioId): TutorialScenario {
  const scenario = scenarioById.get(id)
  if (!scenario) {
    throw new Error(`Unknown tutorial scenario: ${id}`)
  }
  return {
    ...scenario,
    playerDeck: [...scenario.playerDeck],
    cpuDeck: [...scenario.cpuDeck],
    rules: { ...scenario.rules },
    steps: scenario.steps.map((step): TutorialStep => {
      if (step.actor === 'cpu') {
        return {
          ...step,
          move: {
            ...step.move,
            powerTarget: step.move.powerTarget ? { ...step.move.powerTarget } : undefined,
          },
        }
      }
      return {
        ...step,
        move: {
          ...step.move,
          powerTarget: step.move.powerTarget ? { ...step.move.powerTarget } : undefined,
        },
        objective: step.objective
          ? {
              allowedCells: [...step.objective.allowedCells],
              allowedCardIds: step.objective.allowedCardIds ? [...step.objective.allowedCardIds] : undefined,
              errorReason: step.objective.errorReason,
            }
          : undefined,
      }
    }),
  }
}
