import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from 'react'
import type { Texture } from 'pixi.js'
import { getCard } from '../../domain/cards/cardPool'
import type { Actor, CardElementId, CardId } from '../../domain/types'
import type { DisplayCardStats, EffectIndicator, MatchEffectsViewModel } from '../../domain/match/effectsViewModel'
import type { MoveFlipEvent } from '../../domain/match/types'
import { getCardArtCandidates } from './cardArt'
import { getElementLogoMeta } from './elementLogos'

export interface BoardSlot {
  owner: Actor
  cardId: CardId
}

export type BoardArenaVariant = 'v1' | 'v2'

interface PixiBoardProps {
  board: Array<BoardSlot | null>
  highlightedCells: number[]
  tutorialGuidedCells?: number[]
  transientGroundCells?: number[]
  transientFireTargetCells?: number[]
  transientFireCastCells?: number[]
  transientFloodTargetCells?: number[]
  transientFloodCastCells?: number[]
  transientFreezeTargetCells?: number[]
  transientFreezeCastCells?: number[]
  transientFreezeBlockedCells?: number[]
  transientWaterPenaltyCells?: number[]
  transientClashCells?: number[]
  flipEvents?: MoveFlipEvent[]
  flipEventVersion?: number
  targetableCells?: number[]
  previewPlacementCell?: number | null
  focusedCell?: number | null
  interactive: boolean
  onCellClick(cell: number): void
  turnActor: Actor
  status: 'active' | 'finished'
  arenaVariant?: BoardArenaVariant
  effectsView?: MatchEffectsViewModel
}

const boardSize = 468
const defaultBoardInset = 30
const defaultBoardGap = 10
const neutralBoardInset = 78
const neutralBoardGap = 4
const GROUND_BOARD_EFFECT_TEXTURE_SRC = '/ui/match/board-effects/Sol.png'
const PLANTE_BOARD_EFFECT_TEXTURE_SRC = '/ui/match/board-effects/plante-territory.png'
const WATER_BOARD_EFFECT_TEXTURE_SRC = '/ui/match/board-effects/water.png'
const ICE_BOARD_EFFECT_TEXTURE_SRC = '/ui/match/board-effects/glace.png'

type BoardLayout = {
  inset: number
  gap: number
}

type PlanteTerritoryLinkOrientation = 'horizontal' | 'vertical'

type PlacedCardVisualLayout = {
  plateInset: number
  artInset: number
  artScaleInset: number
  crestInsetFactor: number
}

// eslint-disable-next-line react-refresh/only-export-components
export function resolvePixiBoardClassName(useNeutralBoardArt: boolean): string {
  return useNeutralBoardArt ? 'pixi-board has-neutral-board-art' : 'pixi-board'
}

// eslint-disable-next-line react-refresh/only-export-components
export function resolveBoardLayout(boardDimension: number, useNeutralBoardArt: boolean): BoardLayout {
  if (useNeutralBoardArt && boardDimension === 3) {
    return { inset: neutralBoardInset, gap: neutralBoardGap }
  }

  return { inset: defaultBoardInset, gap: defaultBoardGap }
}

// eslint-disable-next-line react-refresh/only-export-components
export function resolvePlacedCardVisualLayout(useNeutralBoardArt: boolean): PlacedCardVisualLayout {
  if (useNeutralBoardArt) {
    return {
      plateInset: 8,
      artInset: 9,
      artScaleInset: 11,
      crestInsetFactor: 0.22,
    }
  }

  return {
    plateInset: 12,
    artInset: 16,
    artScaleInset: 16,
    crestInsetFactor: 0.26,
  }
}

interface ArenaPalette {
  frameOuterFill: number
  frameOuterEdge: number
  frameInnerFill: number
  frameInnerEdge: number
  turnAuraPlayer: number
  turnAuraCpu: number
  turnAuraFinished: number
  fieldFill: number
  fieldEdge: number
  fieldBand: number
  emblemRing: number
  emblemInnerRing: number
  emblemDivider: number
  emblemCoreFill: number
  emblemCoreEdge: number
  emptyCellFill: number
  emptyCellEdge: number
  emptyCellInnerFill: number
  emptyCellInnerAlpha: number
  playerCellFill: number
  playerCellEdge: number
  cpuCellFill: number
  cpuCellEdge: number
  highlightEdge: number
  keyboardTargetFill: number
  keyboardTargetEdge: number
  highlightOverlayFill: number
  highlightOverlayFillReduced: number
  highlightOverlayStroke: number
  highlightMarkerStroke: number
  highlightMarkerFill: number
  placementFlashFill: number
  placementFlashFillReduced: number
  ownerPlatePlayer: number
  ownerPlateCpu: number
  ownerEdgePlayer: number
  ownerEdgeCpu: number
  artFrameFill: number
  artFrameStroke: number
  fallbackCrestFill: number
  fallbackCrestStroke: number
  artTintFill: number
  statText: number
  statChipFill: number
  statChipStroke: number
  emptyLabelFill: number
  pulseBase: number
  pulseRange: number
}

const ARENA_PALETTES: Record<BoardArenaVariant, ArenaPalette> = {
  v1: {
    frameOuterFill: 0x081b3d,
    frameOuterEdge: 0x73b5e8,
    frameInnerFill: 0x0a274f,
    frameInnerEdge: 0x609ed4,
    turnAuraPlayer: 0x69b8e8,
    turnAuraCpu: 0xd18a95,
    turnAuraFinished: 0xd9bc74,
    fieldFill: 0x0a2850,
    fieldEdge: 0x7eb3df,
    fieldBand: 0x73add8,
    emblemRing: 0xb9d8ed,
    emblemInnerRing: 0xa8cde6,
    emblemDivider: 0xc4ddef,
    emblemCoreFill: 0x0f2d59,
    emblemCoreEdge: 0xd8c186,
    emptyCellFill: 0x29578f,
    emptyCellEdge: 0xa5d8ff,
    emptyCellInnerFill: 0x184271,
    emptyCellInnerAlpha: 0.2,
    playerCellFill: 0x2d7fcc,
    playerCellEdge: 0xbce3ff,
    cpuCellFill: 0xa84766,
    cpuCellEdge: 0xffb8c4,
    highlightEdge: 0xaed9f6,
    keyboardTargetFill: 0xe8f6ff,
    keyboardTargetEdge: 0x9cc8e8,
    highlightOverlayFill: 0x9fcfeb,
    highlightOverlayFillReduced: 0x9fcfeb,
    highlightOverlayStroke: 0xb7dbf2,
    highlightMarkerStroke: 0xc0e0f4,
    highlightMarkerFill: 0x264967,
    placementFlashFill: 0xb4d3e9,
    placementFlashFillReduced: 0xb4d3e9,
    ownerPlatePlayer: 0x2d7bc6,
    ownerPlateCpu: 0xa54563,
    ownerEdgePlayer: 0xc2e7ff,
    ownerEdgeCpu: 0xffc2cd,
    artFrameFill: 0x0a2645,
    artFrameStroke: 0x8bb8d6,
    fallbackCrestFill: 0x103157,
    fallbackCrestStroke: 0xa1d6ff,
    artTintFill: 0x071d3a,
    statText: 0xf5ecda,
    statChipFill: 0x082346,
    statChipStroke: 0xd6bf88,
    emptyLabelFill: 0xdaedff,
    pulseBase: 0.02,
    pulseRange: 0.06,
  },
  v2: {
    frameOuterFill: 0x051733,
    frameOuterEdge: 0x6ab4dc,
    frameInnerFill: 0x082652,
    frameInnerEdge: 0x589dc8,
    turnAuraPlayer: 0x74bedd,
    turnAuraCpu: 0xce8f9f,
    turnAuraFinished: 0xd7bf88,
    fieldFill: 0x08284f,
    fieldEdge: 0x85d7ff,
    fieldBand: 0x69c8ff,
    emblemRing: 0xb8deef,
    emblemInnerRing: 0x9ecfe7,
    emblemDivider: 0xc0dff0,
    emblemCoreFill: 0x0d2f5f,
    emblemCoreEdge: 0xdac690,
    emptyCellFill: 0x234a77,
    emptyCellEdge: 0x93dfff,
    emptyCellInnerFill: 0x14375f,
    emptyCellInnerAlpha: 0.14,
    playerCellFill: 0x328fe0,
    playerCellEdge: 0xc6ecff,
    cpuCellFill: 0xb24469,
    cpuCellEdge: 0xffc7d4,
    highlightEdge: 0x9bcde8,
    keyboardTargetFill: 0xe7f6ff,
    keyboardTargetEdge: 0xaecde0,
    highlightOverlayFill: 0x88bedc,
    highlightOverlayFillReduced: 0x88bedc,
    highlightOverlayStroke: 0xb4d5e8,
    highlightMarkerStroke: 0xbdd9ea,
    highlightMarkerFill: 0x204b6e,
    placementFlashFill: 0xc5ddeb,
    placementFlashFillReduced: 0xc5ddeb,
    ownerPlatePlayer: 0x2f86d7,
    ownerPlateCpu: 0xb2476b,
    ownerEdgePlayer: 0xcbeeff,
    ownerEdgeCpu: 0xffcdd8,
    artFrameFill: 0x0a2749,
    artFrameStroke: 0x88b7d2,
    fallbackCrestFill: 0x0f345f,
    fallbackCrestStroke: 0x9cdfff,
    artTintFill: 0x081f3e,
    statText: 0xf2ecd9,
    statChipFill: 0x092a50,
    statChipStroke: 0xd6c18d,
    emptyLabelFill: 0xe1f4ff,
    pulseBase: 0.02,
    pulseRange: 0.05,
  },
}

// eslint-disable-next-line react-refresh/only-export-components
export function getPixiRenderResolution(devicePixelRatio: number | undefined): number {
  const safeDevicePixelRatio = typeof devicePixelRatio === 'number' && Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1
  return Math.min(2, Math.max(1, safeDevicePixelRatio))
}

function getBoardDimension(cellCount: number): number {
  const dimension = Math.round(Math.sqrt(cellCount))
  return dimension > 0 ? dimension : 1
}

function collectPlanteTerritoryActiveCells(params: {
  board: Array<BoardSlot | null>
  boardCardIndicators?: MatchEffectsViewModel['boardCardIndicators']
}): Set<number> {
  const activeCells = new Set<number>()
  params.board.forEach((slot, index) => {
    if (!slot) {
      return
    }
    const hasPlantePackBuff = params.boardCardIndicators?.[index]?.some((indicator) => indicator.key === 'card-plante-pack') ?? false
    if (hasPlantePackBuff) {
      activeCells.add(index)
    }
  })
  return activeCells
}

function hasPlanteTerritoryLink(params: {
  activeCells: Set<number>
  index: number
  boardDimension: number
  orientation: PlanteTerritoryLinkOrientation
}): boolean {
  if (!params.activeCells.has(params.index)) {
    return false
  }
  const row = Math.floor(params.index / params.boardDimension)
  const col = params.index % params.boardDimension
  if (params.orientation === 'horizontal') {
    if (col >= params.boardDimension - 1) {
      return false
    }
    return params.activeCells.has(params.index + 1)
  }

  if (row >= params.boardDimension - 1) {
    return false
  }
  return params.activeCells.has(params.index + params.boardDimension)
}

function cloneBoardSnapshot(board: Array<BoardSlot | null>): Array<BoardSlot | null> {
  return board.map((slot) => (slot ? { ...slot } : null))
}

function getBoardSignature(board: Array<BoardSlot | null>): string {
  return board.map((slot) => (slot ? `${slot.owner}:${slot.cardId}` : '_')).join('|')
}

function getCardSigil(name: string): string {
  return name
    .split(' ')
    .map((chunk) => chunk.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const cardArtTextureCache = new Map<string, Promise<Texture | null>>()
const viteBaseUrl =
  typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined' && typeof import.meta.env.BASE_URL === 'string'
    ? import.meta.env.BASE_URL
    : '/'
const neutralBoardTextureUrl = `${viteBaseUrl}ui/match/boards/neutral-board.png`
let neutralBoardTexturePromise: Promise<Texture | null> | null = null

type BoardStatChangeLine = {
  key: string
  elementId?: CardElementId
  iconText?: string
  summary: string
  tone: EffectIndicator['tone']
  durationText?: string
}

type HoverAnchor = {
  xPercent: number
  yPercent: number
  placeBelow: boolean
}

async function loadCardArtTexture(cardName: string, loadTexture: (url: string) => Promise<Texture>): Promise<Texture | null> {
  const cachedTexturePromise = cardArtTextureCache.get(cardName)
  if (cachedTexturePromise) {
    return cachedTexturePromise
  }

  const texturePromise = (async () => {
    const artCandidates = getCardArtCandidates(cardName)

    for (const artCandidate of artCandidates) {
      try {
        return await loadTexture(artCandidate)
      } catch {
        // Try next candidate path/extension.
      }
    }

    return null
  })()

  cardArtTextureCache.set(cardName, texturePromise)
  return texturePromise
}

const boardCardTextureLoadOptions = {
  scaleMode: 'linear',
  autoGenerateMipmaps: true,
  maxAnisotropy: 4,
} as const

async function loadNeutralBoardTexture(loadTexture: (url: string) => Promise<Texture>): Promise<Texture | null> {
  if (neutralBoardTexturePromise) {
    return neutralBoardTexturePromise
  }

  neutralBoardTexturePromise = loadTexture(neutralBoardTextureUrl).catch(() => null)
  return neutralBoardTexturePromise
}

function handleFallbackCardArtError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget
  const cardName = image.dataset.cardName
  if (!cardName) {
    image.hidden = true
    const fallbackSigil = image.nextElementSibling
    if (fallbackSigil instanceof HTMLElement) {
      fallbackSigil.hidden = false
    }
    return
  }

  const artCandidates = getCardArtCandidates(cardName)
  const candidateIndex = Number.parseInt(image.dataset.candidateIndex ?? '0', 10)
  const safeCandidateIndex = Number.isFinite(candidateIndex) ? candidateIndex : 0
  const nextCandidateIndex = safeCandidateIndex + 1

  if (nextCandidateIndex < artCandidates.length) {
    image.dataset.candidateIndex = `${nextCandidateIndex}`
    image.src = artCandidates[nextCandidateIndex]
    return
  }

  image.hidden = true
  const fallbackSigil = image.nextElementSibling
  if (fallbackSigil instanceof HTMLElement) {
    fallbackSigil.hidden = false
  }
}

function formatTurnLabel(turns: number): string {
  return `${turns} tour${turns > 1 ? 's' : ''}`
}

function extractTurnCount(text: string): number | null {
  const match = text.match(/(\d+)\s*tour/i)
  if (!match) {
    return null
  }

  const turns = Number.parseInt(match[1], 10)
  if (!Number.isFinite(turns) || turns <= 0) {
    return null
  }

  return turns
}

function extractSignedAmount(...texts: string[]): string | null {
  for (const text of texts) {
    const match = text.match(/([+-]\d+)/)
    if (match) {
      return match[1]
    }
  }
  return null
}

function inferIndicatorDurationText(indicator: EffectIndicator): string | undefined {
  const turnsFromTooltip = extractTurnCount(indicator.tooltip)
  if (turnsFromTooltip) {
    return formatTurnLabel(turnsFromTooltip)
  }

  const turnsFromLabel = extractTurnCount(indicator.label)
  if (turnsFromLabel) {
    return formatTurnLabel(turnsFromLabel)
  }

  const tooltipLower = indicator.tooltip.toLowerCase()
  if (indicator.key.includes('volatile') || tooltipLower.includes('temporaire')) {
    return '1 tour'
  }

  return undefined
}

function mapIndicatorToStatChangeLine(indicator: EffectIndicator): BoardStatChangeLine | null {
  const signedAmount = extractSignedAmount(indicator.valueText ?? '', indicator.label, indicator.tooltip)
  const durationText = inferIndicatorDurationText(indicator)

  switch (indicator.key) {
    case 'card-burn':
    case 'card-volatile':
    case 'card-ground-volatile':
    case 'card-poison-first-combat':
      return {
        key: indicator.key,
        elementId: indicator.key === 'card-burn' ? 'feu' : indicator.key === 'card-volatile' ? 'vol' : indicator.key === 'card-ground-volatile' ? 'sol' : 'poison',
        iconText: indicator.icon,
        summary: '-1 ALL',
        tone: indicator.tone,
        durationText,
      }
    case 'card-plante-pack':
    case 'card-insect-stack':
      return signedAmount
        ? {
            key: indicator.key,
            elementId: indicator.key === 'card-plante-pack' ? 'plante' : 'insecte',
            iconText: indicator.icon,
            summary: `${signedAmount} ALL`,
            tone: indicator.tone,
            durationText,
          }
        : null
    case 'card-dragon-transform':
      return {
        key: indicator.key,
        elementId: 'dragon',
        iconText: indicator.icon,
        summary: '+2 / -1',
        tone: indicator.tone,
      }
    default:
      break
  }

  const tooltipLower = indicator.tooltip.toLowerCase()
  if (tooltipLower.includes('toutes les stats') && signedAmount) {
    return {
      key: indicator.key,
      iconText: indicator.icon,
      summary: `${signedAmount} ALL`,
      tone: indicator.tone,
      durationText,
    }
  }
  if (tooltipLower.includes('plus haute stat') && signedAmount) {
    return {
      key: indicator.key,
      iconText: indicator.icon,
      summary: `${signedAmount} MAX`,
      tone: indicator.tone,
      durationText,
    }
  }

  return null
}

function formatSignedDelta(delta: number): string {
  if (delta > 0) {
    return `+${delta}`
  }
  return `${delta}`
}

function buildNetStatChangeLine(displayStats: DisplayCardStats): BoardStatChangeLine | null {
  const deltas = [displayStats.top.delta, displayStats.right.delta, displayStats.bottom.delta, displayStats.left.delta]
  if (deltas.every((delta) => delta === 0)) {
    return null
  }

  const nonZeroDeltas = deltas.filter((delta) => delta !== 0)
  if (nonZeroDeltas.length > 0 && nonZeroDeltas.every((delta) => delta === nonZeroDeltas[0])) {
    const uniformDelta = nonZeroDeltas[0]
    return {
      key: 'net-all',
      iconText: uniformDelta > 0 ? '▲' : '▼',
      summary: `${formatSignedDelta(uniformDelta)} ALL`,
      tone: uniformDelta > 0 ? 'buff' : 'debuff',
    }
  }

  const directionalSummary = `T${formatSignedDelta(displayStats.top.delta)} R${formatSignedDelta(displayStats.right.delta)} B${formatSignedDelta(
    displayStats.bottom.delta,
  )} L${formatSignedDelta(displayStats.left.delta)}`
  const hasBuff = deltas.some((delta) => delta > 0)
  const hasDebuff = deltas.some((delta) => delta < 0)
  const tone: EffectIndicator['tone'] = hasBuff && hasDebuff ? 'info' : hasBuff ? 'buff' : 'debuff'
  return {
    key: 'net-directional',
    iconText: 'Δ',
    summary: directionalSummary,
    tone,
  }
}

function buildBoardStatChangeLines(params: {
  boardIndicators: EffectIndicator[]
  displayStats?: DisplayCardStats
  isGroundDebuffed: boolean
  isWaterPenalty: boolean
}): BoardStatChangeLine[] {
  const lines: BoardStatChangeLine[] = []
  const seenKeys = new Set<string>()
  const addLine = (line: BoardStatChangeLine | null) => {
    if (!line || seenKeys.has(line.key)) {
      return
    }
    seenKeys.add(line.key)
    lines.push(line)
  }

  for (const indicator of params.boardIndicators) {
    addLine(mapIndicatorToStatChangeLine(indicator))
  }

  if (params.isGroundDebuffed) {
    addLine({
      key: 'transient-ground-debuff',
      elementId: 'sol',
      iconText: 'SOL',
      summary: '-1 ALL',
      tone: 'debuff',
      durationText: '1 tour',
    })
  }

  if (params.isWaterPenalty) {
    addLine({
      key: 'transient-water-penalty',
      elementId: 'eau',
      iconText: 'EAU',
      summary: '-2 MAX',
      tone: 'debuff',
      durationText: '1 tour',
    })
  }

  if (params.displayStats && lines.length === 0) {
    addLine(buildNetStatChangeLine(params.displayStats))
  }

  return lines
}

function resolvePointerCellIndex(params: {
  event: ReactPointerEvent<HTMLDivElement>
  boardDimension: number
  boardCellCount: number
  boardLayout: BoardLayout
  cellSize: number
}): number | null {
  const rect = params.event.currentTarget.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    return null
  }

  const x = ((params.event.clientX - rect.left) / rect.width) * boardSize
  const y = ((params.event.clientY - rect.top) / rect.height) * boardSize
  const relativeX = x - params.boardLayout.inset
  const relativeY = y - params.boardLayout.inset
  if (relativeX < 0 || relativeY < 0) {
    return null
  }

  const stride = params.cellSize + params.boardLayout.gap
  const col = Math.floor(relativeX / stride)
  const row = Math.floor(relativeY / stride)
  if (row < 0 || col < 0 || row >= params.boardDimension || col >= params.boardDimension) {
    return null
  }

  const innerX = relativeX - col * stride
  const innerY = relativeY - row * stride
  if (innerX < 0 || innerY < 0 || innerX >= params.cellSize || innerY >= params.cellSize) {
    return null
  }

  const index = row * params.boardDimension + col
  return index >= 0 && index < params.boardCellCount ? index : null
}

function clampPercent(value: number): number {
  return Math.min(92, Math.max(8, value))
}

export function PixiBoard({
  board,
  highlightedCells,
  tutorialGuidedCells = [],
  transientGroundCells = [],
  transientFireTargetCells = [],
  transientFireCastCells = [],
  transientFloodTargetCells = [],
  transientFloodCastCells = [],
  transientFreezeTargetCells = [],
  transientFreezeCastCells = [],
  transientFreezeBlockedCells = [],
  transientWaterPenaltyCells = [],
  transientClashCells = [],
  flipEvents = [],
  flipEventVersion = 0,
  targetableCells = [],
  previewPlacementCell = null,
  focusedCell = null,
  interactive,
  onCellClick,
  turnActor,
  status,
  arenaVariant = 'v1',
  effectsView,
}: PixiBoardProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const previousBoardRef = useRef<Array<BoardSlot | null> | null>(null)
  const appRef = useRef<unknown | null>(null)
  const tickerCleanupRef = useRef<(() => void) | null>(null)
  const onCellClickRef = useRef(onCellClick)
  const lastAnimatedBoardSignatureRef = useRef<string | null>(null)
  const lastAnimatedFlipEventVersionRef = useRef<number>(-1)
  const [appReadyVersion, setAppReadyVersion] = useState(0)
  const [hoveredCellIndex, setHoveredCellIndex] = useState<number | null>(null)
  const [hoverAnchor, setHoverAnchor] = useState<HoverAnchor | null>(null)
  const mode = typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined' ? import.meta.env.MODE : undefined
  const shouldUseFallback = typeof mode === 'string' ? mode === 'test' : true

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])
  const boardDimension = useMemo(() => getBoardDimension(board.length), [board.length])
  const neutralBoardArtEnabled = boardDimension === 3
  const boardLayout = useMemo(
    () => resolveBoardLayout(boardDimension, neutralBoardArtEnabled),
    [boardDimension, neutralBoardArtEnabled],
  )
  const placedCardVisualLayout = useMemo(
    () => resolvePlacedCardVisualLayout(neutralBoardArtEnabled),
    [neutralBoardArtEnabled],
  )
  const cellSize = useMemo(
    () => (boardSize - boardLayout.inset * 2 - boardLayout.gap * Math.max(0, boardDimension - 1)) / boardDimension,
    [boardDimension, boardLayout.gap, boardLayout.inset],
  )

  const highlightedSet = useMemo(() => new Set(highlightedCells), [highlightedCells])
  const tutorialGuidedSet = useMemo(() => new Set(tutorialGuidedCells), [tutorialGuidedCells])
  const transientGroundSet = useMemo(() => new Set(transientGroundCells), [transientGroundCells])
  const transientFireTargetSet = useMemo(() => new Set(transientFireTargetCells), [transientFireTargetCells])
  const transientFireCastSet = useMemo(() => new Set(transientFireCastCells), [transientFireCastCells])
  const transientFloodTargetSet = useMemo(() => new Set(transientFloodTargetCells), [transientFloodTargetCells])
  const transientFloodCastSet = useMemo(() => new Set(transientFloodCastCells), [transientFloodCastCells])
  const transientFreezeTargetSet = useMemo(() => new Set(transientFreezeTargetCells), [transientFreezeTargetCells])
  const transientFreezeCastSet = useMemo(() => new Set(transientFreezeCastCells), [transientFreezeCastCells])
  const transientFreezeBlockedSet = useMemo(() => new Set(transientFreezeBlockedCells), [transientFreezeBlockedCells])
  const transientWaterPenaltySet = useMemo(() => new Set(transientWaterPenaltyCells), [transientWaterPenaltyCells])
  const transientClashSet = useMemo(() => new Set(transientClashCells), [transientClashCells])
  const targetableSet = useMemo(() => new Set(targetableCells), [targetableCells])
  const planteTerritoryActiveSet = useMemo(
    () =>
      collectPlanteTerritoryActiveCells({
        board,
        boardCardIndicators: effectsView?.boardCardIndicators,
      }),
    [board, effectsView?.boardCardIndicators],
  )
  const flipEventByCell = useMemo(() => {
    const byCell = new Map<number, MoveFlipEvent>()
    for (const event of flipEvents) {
      byCell.set(event.cell, event)
    }
    return byCell
  }, [flipEvents])
  const arenaPalette = useMemo(() => ARENA_PALETTES[arenaVariant], [arenaVariant])
  const planteLogo = useMemo(() => getElementLogoMeta('plante'), [])
  const poisonLogo = useMemo(() => getElementLogoMeta('poison'), [])
  const fireLogo = useMemo(() => getElementLogoMeta('feu'), [])
  const waterLogo = useMemo(() => getElementLogoMeta('eau'), [])
  const iceLogo = useMemo(() => getElementLogoMeta('glace'), [])
  const recentPlacedSet = useMemo(() => {
    const previousBoard = previousBoardRef.current
    if (!previousBoard) {
      return new Set<number>()
    }

    const recentCells = new Set<number>()
    board.forEach((slot, index) => {
      if (slot !== null && previousBoard[index] === null) {
        recentCells.add(index)
      }
    })

    return recentCells
  }, [board])
  const recentFlippedSet = useMemo(() => {
    const previousBoard = previousBoardRef.current
    if (!previousBoard) {
      return new Set<number>()
    }

    const flippedCells = new Set<number>()
    board.forEach((slot, index) => {
      const previousSlot = previousBoard[index]
      if (!slot || !previousSlot) {
        return
      }
      if (slot.cardId !== previousSlot.cardId) {
        return
      }
      if (slot.owner !== previousSlot.owner) {
        flippedCells.add(index)
      }
    })

    return flippedCells
  }, [board])
  const hoveredSlot = hoveredCellIndex !== null ? board[hoveredCellIndex] : null
  const hoveredCardName = hoveredSlot ? getCard(hoveredSlot.cardId).name : null
  const hoveredStatChangeLines = useMemo(() => {
    if (hoveredCellIndex === null || !hoveredSlot) {
      return [] as BoardStatChangeLine[]
    }
    return buildBoardStatChangeLines({
      boardIndicators: effectsView?.boardCardIndicators[hoveredCellIndex] ?? [],
      displayStats: effectsView?.displayStatsByCell[hoveredCellIndex],
      isGroundDebuffed: transientGroundSet.has(hoveredCellIndex),
      isWaterPenalty: transientWaterPenaltySet.has(hoveredCellIndex),
    })
  }, [effectsView, hoveredCellIndex, hoveredSlot, transientGroundSet, transientWaterPenaltySet])

  useEffect(() => {
    previousBoardRef.current = cloneBoardSnapshot(board)
  }, [board])

  useEffect(() => {
    if (hoveredCellIndex === null) {
      return
    }
    if (hoveredCellIndex >= board.length || board[hoveredCellIndex] === null) {
      setHoveredCellIndex(null)
      setHoverAnchor(null)
    }
  }, [board, hoveredCellIndex])

  useEffect(() => {
    onCellClickRef.current = onCellClick
  }, [onCellClick])

  useEffect(() => {
    if (shouldUseFallback) {
      return
    }

    let cancelled = false
    const initialize = async () => {
      const host = hostRef.current
      if (!host) {
        return
      }

      const { Application } = await import('pixi.js')
      const resolution = getPixiRenderResolution(typeof window === 'undefined' ? undefined : window.devicePixelRatio)

      const app = new Application()
      await app.init({
        width: boardSize,
        height: boardSize,
        autoDensity: true,
        resolution,
        antialias: true,
        backgroundAlpha: 0,
      })

      if (cancelled) {
        app.destroy(true)
        return
      }

      host.innerHTML = ''
      host.appendChild(app.canvas)
      app.canvas.style.width = '100%'
      app.canvas.style.height = 'auto'
      app.canvas.style.display = 'block'
      appRef.current = app
      setAppReadyVersion((value) => value + 1)
    }

    void initialize()

    return () => {
      cancelled = true
      if (tickerCleanupRef.current) {
        tickerCleanupRef.current()
        tickerCleanupRef.current = null
      }

      const app = appRef.current as { destroy(force?: boolean): void } | null
      appRef.current = null
      if (app) {
        app.destroy(true)
      }
    }
  }, [shouldUseFallback])

  useEffect(() => {
    if (shouldUseFallback) {
      return
    }

    let cancelled = false
    const render = async () => {
      const app = appRef.current as
        | {
            stage: {
              removeChildren(): Array<{ destroy(): void }>
              addChild(child: unknown): void
              removeChild(child: unknown): void
            }
            ticker: {
              deltaMS: number
              add(fn: () => void): void
              remove(fn: () => void): void
            }
          }
        | null
      if (!app) {
        return
      }

      const { Assets, Container, Graphics, Sprite, Text } = await import('pixi.js')
      if (cancelled) {
        return
      }
      const shouldUseNeutralBoardArt = neutralBoardArtEnabled
      const fireTexture = fireLogo
        ? await Assets.load<Texture>(fireLogo.imageSrc).catch(() => null)
        : null
      const planteTexture = planteLogo
        ? await Assets.load<Texture>(planteLogo.imageSrc).catch(() => null)
        : null
      const waterTexture = waterLogo
        ? await Assets.load<Texture>(waterLogo.imageSrc).catch(() => null)
        : null
      const iceTexture = iceLogo
        ? await Assets.load<Texture>(iceLogo.imageSrc).catch(() => null)
        : null
      const groundBoardEffectTexture = await Assets.load<Texture>(GROUND_BOARD_EFFECT_TEXTURE_SRC).catch(() => null)
      const planteBoardEffectTexture = await Assets.load<Texture>(PLANTE_BOARD_EFFECT_TEXTURE_SRC).catch(() => null)
      const waterBoardEffectTexture = await Assets.load<Texture>(WATER_BOARD_EFFECT_TEXTURE_SRC).catch(() => null)
      const iceBoardEffectTexture = await Assets.load<Texture>(ICE_BOARD_EFFECT_TEXTURE_SRC).catch(() => null)
      const neutralBoardTexture = shouldUseNeutralBoardArt
        ? await loadNeutralBoardTexture((url) => Assets.load<Texture>(url))
        : null
      if (cancelled) {
        return
      }
      const usingNeutralBoardArt = shouldUseNeutralBoardArt && neutralBoardTexture !== null

      if (tickerCleanupRef.current) {
        tickerCleanupRef.current()
        tickerCleanupRef.current = null
      }

      const staleChildren = app.stage.removeChildren()
      staleChildren.forEach((child) => child.destroy())

      let turnAura: InstanceType<typeof Graphics> | null = null
      const auraColor =
        status === 'finished'
          ? arenaPalette.turnAuraFinished
          : turnActor === 'player'
            ? arenaPalette.turnAuraPlayer
            : arenaPalette.turnAuraCpu
      if (usingNeutralBoardArt) {
        const boardSprite = new Sprite(neutralBoardTexture!)
        boardSprite.anchor.set(0.5)
        boardSprite.x = boardSize / 2
        boardSprite.y = boardSize / 2
        boardSprite.width = boardSize - 6
        boardSprite.height = boardSize - 6
        app.stage.addChild(boardSprite)
      } else {
        const frameOuter = new Graphics()
        frameOuter.roundRect(1, 1, boardSize - 2, boardSize - 2, 28)
        frameOuter.fill({ color: arenaPalette.frameOuterFill, alpha: 0.97 })
        frameOuter.stroke({ width: 2, color: arenaPalette.frameOuterEdge, alpha: 0.46 })
        app.stage.addChild(frameOuter)

        const frameInner = new Graphics()
        frameInner.roundRect(14, 14, boardSize - 28, boardSize - 28, 22)
        frameInner.fill({ color: arenaPalette.frameInnerFill, alpha: 0.95 })
        frameInner.stroke({ width: 2, color: arenaPalette.frameInnerEdge, alpha: 0.42 })
        app.stage.addChild(frameInner)

        turnAura = new Graphics()
        turnAura.roundRect(5, 5, boardSize - 10, boardSize - 10, 25)
        turnAura.stroke({ width: 3, color: auraColor, alpha: status === 'active' ? 0.22 : 0.12 })
        app.stage.addChild(turnAura)

        const fieldX = boardLayout.inset - 14
        const fieldY = boardLayout.inset - 14
        const fieldSize = boardSize - fieldX * 2
        const field = new Graphics()
        field.roundRect(fieldX, fieldY, fieldSize, fieldSize, 18)
        field.fill({ color: arenaPalette.fieldFill, alpha: 0.98 })
        field.stroke({ width: 2, color: arenaPalette.fieldEdge, alpha: 0.3 })
        app.stage.addChild(field)

        const fieldBands = new Graphics()
        for (let offset = -fieldSize; offset < fieldSize; offset += 26) {
          fieldBands.moveTo(fieldX + offset, fieldY)
          fieldBands.lineTo(fieldX + fieldSize + offset, fieldY + fieldSize)
        }
        fieldBands.stroke({ width: 1, color: arenaPalette.fieldBand, alpha: 0.02 })
        app.stage.addChild(fieldBands)

        const emblemRadius = Math.max(72, fieldSize * 0.3)
        const emblemHalo = new Graphics()
        emblemHalo.circle(boardSize / 2, boardSize / 2, emblemRadius * 1.16)
        emblemHalo.stroke({ width: 2, color: arenaPalette.emblemRing, alpha: 0.06 })
        app.stage.addChild(emblemHalo)

        const emblemRing = new Graphics()
        emblemRing.circle(boardSize / 2, boardSize / 2, emblemRadius)
        emblemRing.stroke({ width: 5, color: arenaPalette.emblemRing, alpha: 0.14 })
        app.stage.addChild(emblemRing)

        const emblemInnerRing = new Graphics()
        emblemInnerRing.circle(boardSize / 2, boardSize / 2, emblemRadius * 0.68)
        emblemInnerRing.stroke({ width: 3, color: arenaPalette.emblemInnerRing, alpha: 0.12 })
        app.stage.addChild(emblemInnerRing)

        const emblemDivider = new Graphics()
        emblemDivider.moveTo(boardSize / 2 - emblemRadius, boardSize / 2)
        emblemDivider.lineTo(boardSize / 2 + emblemRadius, boardSize / 2)
        emblemDivider.stroke({ width: 5, color: arenaPalette.emblemDivider, alpha: 0.1 })
        app.stage.addChild(emblemDivider)

        const emblemCore = new Graphics()
        emblemCore.circle(boardSize / 2, boardSize / 2, emblemRadius * 0.2)
        emblemCore.fill({ color: arenaPalette.emblemCoreFill, alpha: 0.12 })
        emblemCore.stroke({ width: 3, color: arenaPalette.emblemCoreEdge, alpha: 0.14 })
        app.stage.addChild(emblemCore)

        const emblemCoreButton = new Graphics()
        emblemCoreButton.circle(boardSize / 2, boardSize / 2, emblemRadius * 0.1)
        emblemCoreButton.fill({ color: arenaPalette.emblemRing, alpha: 0.08 })
        emblemCoreButton.stroke({ width: 2, color: arenaPalette.emblemCoreEdge, alpha: 0.12 })
        app.stage.addChild(emblemCoreButton)
      }

      type PixiGraphics = InstanceType<typeof Graphics>
      type PixiContainer = InstanceType<typeof Container>
      const pulseOverlays: PixiGraphics[] = []
      const placementFlashes: Array<{ sprite: PixiGraphics; elapsedMs: number }> = []
      const placementBursts: Array<{ container: PixiContainer; elapsedMs: number }> = []
      const flipFlashes: Array<{ sprite: PixiGraphics; elapsedMs: number; delayMs: number; peakAlpha: number }> = []
      const flipBursts: Array<{
        container: PixiContainer
        elapsedMs: number
        delayMs: number
        axis: MoveFlipEvent['axis']
        baseY: number
      }> = []
      const groundDebuffCellsToRender: Array<{ x: number; y: number; hasCard: boolean }> = []
      const fireTargetCellsToRender: Array<{ x: number; y: number }> = []
      const fireCastCellsToRender: Array<{ x: number; y: number }> = []
      const floodTargetCellsToRender: Array<{ x: number; y: number }> = []
      const floodCastCellsToRender: Array<{ x: number; y: number }> = []
      const freezeTargetCellsToRender: Array<{ x: number; y: number }> = []
      const freezeCastCellsToRender: Array<{ x: number; y: number }> = []
      const freezeBlockedCellsToRender: Array<{ x: number; y: number }> = []
      const waterPenaltyCellsToRender: Array<{ x: number; y: number }> = []
      const clashCellsToRender: Array<{ x: number; y: number }> = []
      const boardSignature = getBoardSignature(board)
      const shouldAnimateRecentPlacements = lastAnimatedBoardSignatureRef.current !== boardSignature
      const shouldAnimateExplicitFlips = flipEvents.length > 0 && lastAnimatedFlipEventVersionRef.current !== flipEventVersion
      const shouldAnimateRecentFlips = !shouldAnimateExplicitFlips && shouldAnimateRecentPlacements

      board.forEach((slot, index) => {
        const row = Math.floor(index / boardDimension)
        const col = index % boardDimension
        const x = boardLayout.inset + col * (cellSize + boardLayout.gap)
        const y = boardLayout.inset + row * (cellSize + boardLayout.gap)

        const cellEffectIndicators = effectsView?.cellIndicators[index] ?? []
        const boardEffectIndicators = effectsView?.boardCardIndicators[index] ?? []
        const displayStats = effectsView?.displayStatsByCell[index]
        const isFloodedCell = cellEffectIndicators.some((indicator) => indicator.key === 'cell-flooded')
        const frozenCellIndicator = cellEffectIndicators.find((indicator) => indicator.key === 'cell-frozen')
        const isFrozenCell = Boolean(frozenCellIndicator)
        const frozenTurnsCounter = frozenCellIndicator?.valueText ?? null
        const isPoisonedBoardCard = boardEffectIndicators.some((indicator) => indicator.key === 'card-poison-first-combat')
        const hasPlantePackBuff = planteTerritoryActiveSet.has(index)
        const hasPersistentGroundDebuff = boardEffectIndicators.some((indicator) => indicator.key === 'card-ground-volatile')
        const isGroundDebuffedCell = transientGroundSet.has(index)
        const isFireTargetCell = transientFireTargetSet.has(index)
        const isFireCastCell = transientFireCastSet.has(index)
        const isFloodTargetCell = transientFloodTargetSet.has(index) && slot === null
        const isFloodCastCell = transientFloodCastSet.has(index)
        const isFreezeTargetCell = transientFreezeTargetSet.has(index) && slot === null
        const isFreezeCastCell = transientFreezeCastSet.has(index)
        const isFreezeBlockedCell = transientFreezeBlockedSet.has(index)
        const isWaterPenaltyCell = transientWaterPenaltySet.has(index)
        const isClashCell = transientClashSet.has(index)
        const isHighlightedEmpty = highlightedSet.has(index) && slot === null
        const isTutorialGuidedEmpty = tutorialGuidedSet.has(index) && slot === null
        const explicitFlipEvent = flipEventByCell.get(index)
        const resolvedFlipEvent: MoveFlipEvent | null =
          explicitFlipEvent ??
          (recentFlippedSet.has(index) && slot
            ? { cell: index, kind: 'flipped', axis: 'horizontal', phase: 'primary' }
            : null)
        const cell = new Graphics()
        const ownerColor =
          slot?.owner === 'player'
            ? arenaPalette.playerCellFill
            : slot?.owner === 'cpu'
              ? arenaPalette.cpuCellFill
              : arenaPalette.emptyCellFill
        const fillColor = ownerColor
        const edgeColor = isHighlightedEmpty
          ? arenaPalette.highlightEdge
          : slot?.owner === 'player'
            ? arenaPalette.playerCellEdge
            : slot?.owner === 'cpu'
              ? arenaPalette.cpuCellEdge
              : arenaPalette.emptyCellEdge
        const cellFillAlpha = usingNeutralBoardArt ? (slot ? 0.24 : 0.1) : 0.8
        const cellEdgeAlpha = usingNeutralBoardArt ? (isHighlightedEmpty ? 0.54 : 0.28) : 0.42
        cell.roundRect(x, y, cellSize, cellSize, 12)
        cell.fill({ color: fillColor, alpha: cellFillAlpha })
        cell.stroke({ width: 2, color: edgeColor, alpha: cellEdgeAlpha })

        const isClickable = interactive && (slot === null || targetableSet.has(index))
        const isKeyboardTarget = focusedCell === index && (slot === null || targetableSet.has(index))
        cell.eventMode = isClickable ? 'static' : 'none'
        if (isClickable) {
          cell.cursor = 'pointer'
          cell.on('pointertap', () => onCellClickRef.current(index))
        }

        app.stage.addChild(cell)

        if (slot && hasPlantePackBuff) {
          const planteLinkOverlap = Math.max(4, cellSize * 0.07)
          const planteLinkThickness = Math.max(9, cellSize * 0.14)
          const planteLinkSpan = boardLayout.gap + planteLinkOverlap * 2

          if (hasPlanteTerritoryLink({ activeCells: planteTerritoryActiveSet, index, boardDimension, orientation: 'horizontal' })) {
            const connectorX = x + cellSize - planteLinkOverlap
            const connectorY = y + cellSize / 2 - planteLinkThickness / 2

            const horizontalConnector = new Graphics()
            horizontalConnector.roundRect(connectorX, connectorY, planteLinkSpan, planteLinkThickness, planteLinkThickness)
            horizontalConnector.fill({ color: 0x2f9350, alpha: 0.34 })
            horizontalConnector.stroke({ width: 1.4, color: 0xb6f4c7, alpha: 0.72 })
            app.stage.addChild(horizontalConnector)

            if (planteBoardEffectTexture) {
              const connectorMask = new Graphics()
              connectorMask.roundRect(connectorX + 1, connectorY + 1, planteLinkSpan - 2, planteLinkThickness - 2, planteLinkThickness)
              connectorMask.fill({ color: 0xffffff })

              const connectorTexture = new Sprite(planteBoardEffectTexture)
              connectorTexture.x = connectorX + 1
              connectorTexture.y = connectorY + 1
              connectorTexture.width = planteLinkSpan - 2
              connectorTexture.height = planteLinkThickness - 2
              connectorTexture.alpha = 0.42
              connectorTexture.mask = connectorMask

              app.stage.addChild(connectorTexture)
              app.stage.addChild(connectorMask)
            }
          }

          if (hasPlanteTerritoryLink({ activeCells: planteTerritoryActiveSet, index, boardDimension, orientation: 'vertical' })) {
            const connectorX = x + cellSize / 2 - planteLinkThickness / 2
            const connectorY = y + cellSize - planteLinkOverlap

            const verticalConnector = new Graphics()
            verticalConnector.roundRect(connectorX, connectorY, planteLinkThickness, planteLinkSpan, planteLinkThickness)
            verticalConnector.fill({ color: 0x2f9350, alpha: 0.34 })
            verticalConnector.stroke({ width: 1.4, color: 0xb6f4c7, alpha: 0.72 })
            app.stage.addChild(verticalConnector)

            if (planteBoardEffectTexture) {
              const connectorMask = new Graphics()
              connectorMask.roundRect(connectorX + 1, connectorY + 1, planteLinkThickness - 2, planteLinkSpan - 2, planteLinkThickness)
              connectorMask.fill({ color: 0xffffff })

              const connectorTexture = new Sprite(planteBoardEffectTexture)
              connectorTexture.x = connectorX + 1
              connectorTexture.y = connectorY + 1
              connectorTexture.width = planteLinkThickness - 2
              connectorTexture.height = planteLinkSpan - 2
              connectorTexture.alpha = 0.42
              connectorTexture.mask = connectorMask

              app.stage.addChild(connectorTexture)
              app.stage.addChild(connectorMask)
            }
          }

          const planteAura = new Graphics()
          planteAura.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 11)
          planteAura.fill({ color: 0x2d8d4f, alpha: 0.16 })
          planteAura.stroke({ width: 2, color: 0x93e6ad, alpha: 0.64 })
          app.stage.addChild(planteAura)

          if (planteBoardEffectTexture) {
            const planteTerritoryMask = new Graphics()
            planteTerritoryMask.roundRect(x + 4, y + 4, cellSize - 8, cellSize - 8, 10)
            planteTerritoryMask.fill({ color: 0xffffff })

            const planteTerritoryTexture = new Sprite(planteBoardEffectTexture)
            planteTerritoryTexture.x = x + 4
            planteTerritoryTexture.y = y + 4
            planteTerritoryTexture.width = cellSize - 8
            planteTerritoryTexture.height = cellSize - 8
            planteTerritoryTexture.alpha = 0.36
            planteTerritoryTexture.mask = planteTerritoryMask

            app.stage.addChild(planteTerritoryTexture)
            app.stage.addChild(planteTerritoryMask)
          }

          const planteInnerGlow = new Graphics()
          planteInnerGlow.roundRect(x + 8, y + 8, cellSize - 16, cellSize - 16, 9)
          planteInnerGlow.stroke({ width: 1.4, color: 0x66ca88, alpha: 0.52 })
          app.stage.addChild(planteInnerGlow)

          if (planteTexture) {
            const leafTopLeft = new Sprite(planteTexture)
            leafTopLeft.anchor.set(0.5)
            leafTopLeft.width = Math.max(14, cellSize * 0.14)
            leafTopLeft.height = Math.max(14, cellSize * 0.14)
            leafTopLeft.x = x + 14
            leafTopLeft.y = y + 14
            leafTopLeft.alpha = 0.7
            app.stage.addChild(leafTopLeft)

            const leafBottomRight = new Sprite(planteTexture)
            leafBottomRight.anchor.set(0.5)
            leafBottomRight.width = Math.max(14, cellSize * 0.14)
            leafBottomRight.height = Math.max(14, cellSize * 0.14)
            leafBottomRight.x = x + cellSize - 14
            leafBottomRight.y = y + cellSize - 14
            leafBottomRight.alpha = 0.7
            app.stage.addChild(leafBottomRight)
          }
        }

        if (hasPersistentGroundDebuff) {
          const persistentGroundOverlay = new Graphics()
          persistentGroundOverlay.roundRect(x + 3, y + 3, cellSize - 6, cellSize - 6, 10)
          persistentGroundOverlay.fill({ color: 0x7a4d21, alpha: slot ? 0.2 : 0.14 })
          persistentGroundOverlay.stroke({ width: 1.6, color: 0xf3cc8a, alpha: 0.62 })
          app.stage.addChild(persistentGroundOverlay)

          if (groundBoardEffectTexture) {
            const persistentGroundTextureMask = new Graphics()
            persistentGroundTextureMask.roundRect(x + 4, y + 4, cellSize - 8, cellSize - 8, 10)
            persistentGroundTextureMask.fill({ color: 0xffffff })

            const persistentGroundTexture = new Sprite(groundBoardEffectTexture)
            persistentGroundTexture.x = x + 4
            persistentGroundTexture.y = y + 4
            persistentGroundTexture.width = cellSize - 8
            persistentGroundTexture.height = cellSize - 8
            persistentGroundTexture.alpha = slot ? 0.24 : 0.18
            persistentGroundTexture.mask = persistentGroundTextureMask

            app.stage.addChild(persistentGroundTexture)
            app.stage.addChild(persistentGroundTextureMask)
          }
        }

        if (isGroundDebuffedCell) {
          groundDebuffCellsToRender.push({ x, y, hasCard: slot !== null })
        }
        if (isFireTargetCell) {
          fireTargetCellsToRender.push({ x, y })
        }
        if (isFireCastCell) {
          fireCastCellsToRender.push({ x, y })
        }
        if (isFloodTargetCell) {
          floodTargetCellsToRender.push({ x, y })
        }
        if (isFreezeTargetCell) {
          freezeTargetCellsToRender.push({ x, y })
        }
        if (isClashCell) {
          clashCellsToRender.push({ x, y })
        }
        if (isFloodCastCell) {
          floodCastCellsToRender.push({ x, y })
        }
        if (isFreezeCastCell) {
          freezeCastCellsToRender.push({ x, y })
        }
        if (isFreezeBlockedCell) {
          freezeBlockedCellsToRender.push({ x, y })
        }
        if (isWaterPenaltyCell) {
          waterPenaltyCellsToRender.push({ x, y })
        }

        if (slot === null) {
          const cellInner = new Graphics()
          const emptyInnerAlpha = usingNeutralBoardArt
            ? Math.min(arenaPalette.emptyCellInnerAlpha, 0.08)
            : arenaPalette.emptyCellInnerAlpha
          cellInner.roundRect(x + 6, y + 6, cellSize - 12, cellSize - 12, 9)
          cellInner.fill({ color: arenaPalette.emptyCellInnerFill, alpha: emptyInnerAlpha })
          app.stage.addChild(cellInner)

          if (isFloodedCell || isFrozenCell) {
            if (isFloodedCell && waterBoardEffectTexture && !isFrozenCell) {
              const floodedTextureMask = new Graphics()
              floodedTextureMask.roundRect(x + 4, y + 4, cellSize - 8, cellSize - 8, 10)
              floodedTextureMask.fill({ color: 0xffffff })

              const floodedTexture = new Sprite(waterBoardEffectTexture)
              floodedTexture.x = x + 4
              floodedTexture.y = y + 4
              floodedTexture.width = cellSize - 8
              floodedTexture.height = cellSize - 8
              floodedTexture.alpha = 0.56
              floodedTexture.mask = floodedTextureMask

              app.stage.addChild(floodedTexture)
              app.stage.addChild(floodedTextureMask)
            }

            if (isFrozenCell) {
              if (iceBoardEffectTexture) {
                const frozenTextureMask = new Graphics()
                frozenTextureMask.roundRect(x + 4, y + 4, cellSize - 8, cellSize - 8, 10)
                frozenTextureMask.fill({ color: 0xffffff })

                const frozenTexture = new Sprite(iceBoardEffectTexture)
                frozenTexture.x = x + 4
                frozenTexture.y = y + 4
                frozenTexture.width = cellSize - 8
                frozenTexture.height = cellSize - 8
                frozenTexture.alpha = 0.62
                frozenTexture.mask = frozenTextureMask

                app.stage.addChild(frozenTexture)
                app.stage.addChild(frozenTextureMask)
              }

              if (iceTexture) {
                const hazardIceLogo = new Sprite(iceTexture)
                hazardIceLogo.anchor.set(0.5)
                hazardIceLogo.width = Math.max(16, cellSize * 0.2)
                hazardIceLogo.height = Math.max(16, cellSize * 0.2)
                hazardIceLogo.x = x + cellSize / 2
                hazardIceLogo.y = y + cellSize / 2
                hazardIceLogo.alpha = 0.95
                app.stage.addChild(hazardIceLogo)
              } else {
                const hazardText = new Text({
                  text: 'GLACE',
                  style: {
                    fill: 0xeefbff,
                    fontSize: 11,
                    fontFamily: 'Rajdhani, sans-serif',
                    fontWeight: '800',
                    letterSpacing: 0.8,
                  },
                })
                hazardText.anchor.set(0.5)
                hazardText.x = x + cellSize / 2
                hazardText.y = y + cellSize / 2
                app.stage.addChild(hazardText)
              }

              if (frozenTurnsCounter) {
                const counterRadius = Math.max(8, cellSize * 0.095)
                const counterX = x + cellSize - counterRadius - 6
                const counterY = y + counterRadius + 6

                const counterChip = new Graphics()
                counterChip.circle(counterX, counterY, counterRadius)
                counterChip.fill({ color: 0x5c88a3, alpha: 0.9 })
                counterChip.stroke({ width: 1.5, color: 0xe6f7ff, alpha: 0.9 })
                app.stage.addChild(counterChip)

                const counterText = new Text({
                  text: frozenTurnsCounter,
                  style: {
                    fill: 0xecfaff,
                    fontSize: Math.max(10, cellSize * 0.12),
                    fontFamily: 'Orbitron, sans-serif',
                    fontWeight: '700',
                    align: 'center',
                  },
                })
                counterText.anchor.set(0.5)
                counterText.x = counterX
                counterText.y = counterY + 0.5
                app.stage.addChild(counterText)
              }
            } else if (waterTexture) {
              const hazardWaterLogo = new Sprite(waterTexture)
              hazardWaterLogo.anchor.set(0.5)
              hazardWaterLogo.width = Math.max(16, cellSize * 0.18)
              hazardWaterLogo.height = Math.max(16, cellSize * 0.18)
              hazardWaterLogo.x = x + cellSize / 2
              hazardWaterLogo.y = y + cellSize / 2
              hazardWaterLogo.alpha = 0.96
              app.stage.addChild(hazardWaterLogo)
            } else {
              const hazardText = new Text({
                text: 'EAU',
                style: {
                  fill: 0xe8f8ff,
                  fontSize: 13,
                  fontFamily: 'Rajdhani, sans-serif',
                  fontWeight: '800',
                  letterSpacing: 1,
                },
              })
              hazardText.anchor.set(0.5)
              hazardText.x = x + cellSize / 2
              hazardText.y = y + cellSize / 2
              app.stage.addChild(hazardText)
            }
          }
        }

        if (isKeyboardTarget) {
          const keyboardTargetGlow = new Graphics()
          keyboardTargetGlow.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 10)
          keyboardTargetGlow.fill({ color: arenaPalette.keyboardTargetFill, alpha: usingNeutralBoardArt ? 0.06 : 0.08 })
          keyboardTargetGlow.stroke({ width: 2, color: arenaPalette.keyboardTargetEdge, alpha: usingNeutralBoardArt ? 0.38 : 0.45 })
          app.stage.addChild(keyboardTargetGlow)
        }

        if (isHighlightedEmpty) {
          const overlay = new Graphics()
          overlay.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 10)
          overlay.fill({
            color: prefersReducedMotion ? arenaPalette.highlightOverlayFillReduced : arenaPalette.highlightOverlayFill,
            alpha: isTutorialGuidedEmpty
              ? prefersReducedMotion
                ? usingNeutralBoardArt
                  ? 0.12
                  : 0.16
                : usingNeutralBoardArt
                  ? 0.12
                  : 0.18
              : prefersReducedMotion
                ? usingNeutralBoardArt
                  ? 0.06
                  : 0.08
                : usingNeutralBoardArt
                  ? 0.04
                  : 0.06,
          })
          overlay.stroke({
            width: isTutorialGuidedEmpty ? 3 : 2,
            color: arenaPalette.highlightOverlayStroke,
            alpha: isTutorialGuidedEmpty ? (usingNeutralBoardArt ? 0.78 : 0.88) : usingNeutralBoardArt ? 0.34 : 0.42,
          })
          app.stage.addChild(overlay)
          pulseOverlays.push(overlay)

          if (arenaVariant === 'v1') {
            const corners = new Graphics()
            const inset = 10
            const arm = Math.max(8, cellSize * 0.13)
            const left = x + inset
            const right = x + cellSize - inset
            const top = y + inset
            const bottom = y + cellSize - inset

            corners.moveTo(left, top + arm)
            corners.lineTo(left, top)
            corners.lineTo(left + arm, top)

            corners.moveTo(right - arm, top)
            corners.lineTo(right, top)
            corners.lineTo(right, top + arm)

            corners.moveTo(left, bottom - arm)
            corners.lineTo(left, bottom)
            corners.lineTo(left + arm, bottom)

            corners.moveTo(right - arm, bottom)
            corners.lineTo(right, bottom)
            corners.lineTo(right, bottom - arm)
            corners.stroke({ width: 2, color: arenaPalette.highlightMarkerStroke, alpha: 0.42 })
            app.stage.addChild(corners)
          } else {
            const marker = new Graphics()
            marker.circle(x + cellSize / 2, y + cellSize / 2, Math.max(7, cellSize * 0.1))
            marker.fill({ color: arenaPalette.highlightMarkerFill, alpha: 0.34 })
            marker.stroke({ width: 2, color: arenaPalette.highlightMarkerStroke, alpha: 0.44 })
            app.stage.addChild(marker)
            pulseOverlays.push(marker)
          }

          if (isTutorialGuidedEmpty) {
            const guidedBadge = new Graphics()
            guidedBadge.roundRect(x + 6, y + 6, Math.max(28, cellSize * 0.3), Math.max(14, cellSize * 0.15), 6)
            guidedBadge.fill({ color: 0x143357, alpha: 0.9 })
            guidedBadge.stroke({ width: 1.6, color: 0xd4ecff, alpha: 0.92 })
            app.stage.addChild(guidedBadge)

            const guidedLabel = new Text({
              text: 'ICI',
              style: {
                fill: 0xf0f8ff,
                fontSize: Math.max(9, cellSize * 0.11),
                fontFamily: 'Rajdhani, sans-serif',
                fontWeight: '800',
                letterSpacing: 0.8,
                align: 'center',
              },
            })
            guidedLabel.anchor.set(0.5)
            guidedLabel.x = x + 6 + Math.max(28, cellSize * 0.3) / 2
            guidedLabel.y = y + 6 + Math.max(14, cellSize * 0.15) / 2 + 0.5
            app.stage.addChild(guidedLabel)
          }
        }

        if (shouldAnimateRecentPlacements && recentPlacedSet.has(index)) {
          const flash = new Graphics()
          flash.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, 11)
          flash.fill({
            color: prefersReducedMotion ? arenaPalette.placementFlashFillReduced : arenaPalette.placementFlashFill,
            alpha: prefersReducedMotion ? 0.12 : 0.24,
          })
          app.stage.addChild(flash)
          placementFlashes.push({ sprite: flash, elapsedMs: 0 })
        }
        if (slot) {
          const card = getCard(slot.cardId)
          const sigil = getCardSigil(card.name)
          const ownerPlate = slot.owner === 'player' ? arenaPalette.ownerPlatePlayer : arenaPalette.ownerPlateCpu
          const ownerEdge = slot.owner === 'player' ? arenaPalette.ownerEdgePlayer : arenaPalette.ownerEdgeCpu
          const plateInset = placedCardVisualLayout.plateInset
          const artInset = placedCardVisualLayout.artInset
          const artScaleInset = placedCardVisualLayout.artScaleInset
          const artWidth = cellSize - artInset * 2
          const artHeight = cellSize - artInset * 2

          const cardContainer = new Container()
          cardContainer.pivot.set(cellSize / 2, cellSize / 2)
          cardContainer.position.set(x + cellSize / 2, y + cellSize / 2)

          const plate = new Graphics()
          plate.roundRect(plateInset, plateInset, cellSize - plateInset * 2, cellSize - plateInset * 2, 14)
          plate.fill({ color: ownerPlate, alpha: 0.72 })
          plate.stroke({ width: 1, color: ownerEdge, alpha: 0.4 })
          cardContainer.addChild(plate)

          const artFrame = new Graphics()
          artFrame.roundRect(artInset, artInset, artWidth, artHeight, 11)
          artFrame.fill({ color: arenaPalette.artFrameFill, alpha: 0.24 })
          artFrame.stroke({ width: 1, color: arenaPalette.artFrameStroke, alpha: 0.28 })
          cardContainer.addChild(artFrame)

          const centerLayer = new Container()
          cardContainer.addChild(centerLayer)

          const fallbackCrest = new Graphics()
          const crestInset = cellSize * placedCardVisualLayout.crestInsetFactor
          const crestSize = cellSize - crestInset * 2
          fallbackCrest.roundRect(crestInset, crestInset, crestSize, crestSize, 12)
          fallbackCrest.fill({ color: arenaPalette.fallbackCrestFill, alpha: 0.42 })
          fallbackCrest.stroke({ width: 1, color: arenaPalette.fallbackCrestStroke, alpha: 0.34 })
          centerLayer.addChild(fallbackCrest)

          const fallbackSigilLabel = new Text({
            text: sigil,
            style: {
              fill: 0xfff1d2,
              fontSize: 26,
              fontWeight: '700',
              fontFamily: 'Cinzel, serif',
              letterSpacing: 1.2,
            },
          })
          fallbackSigilLabel.anchor.set(0.5)
          fallbackSigilLabel.x = cellSize / 2
          fallbackSigilLabel.y = cellSize / 2
          centerLayer.addChild(fallbackSigilLabel)

          void loadCardArtTexture(card.name, (url) =>
            Assets.load<Texture>({
              src: url,
              data: boardCardTextureLoadOptions,
            }),
          )
            .then((cardArtTexture) => {
              if (cancelled || centerLayer.destroyed || !cardArtTexture) {
                return
              }

              const staleCenterChildren = centerLayer.removeChildren()
              staleCenterChildren.forEach((child) => child.destroy())

              const artMask = new Graphics()
              artMask.roundRect(artInset, artInset, artWidth, artHeight, 10)
              artMask.fill({ color: 0xffffff, alpha: 1 })
              centerLayer.addChild(artMask)

              const artSprite = new Sprite(cardArtTexture)
              artSprite.anchor.set(0.5)
              artSprite.x = cellSize / 2
              artSprite.y = cellSize / 2
              const sourceWidth = Math.max(1, cardArtTexture.width)
              const sourceHeight = Math.max(1, cardArtTexture.height)
              const artScaleWidth = cellSize - artScaleInset * 2
              const artScaleHeight = cellSize - artScaleInset * 2
              const containScale = Math.min(artScaleWidth / sourceWidth, artScaleHeight / sourceHeight)
              const artScaleFactor = usingNeutralBoardArt ? 0.9 : 0.94
              artSprite.scale.set(containScale * artScaleFactor)
              cardArtTexture.source.scaleMode = 'linear'
              cardArtTexture.source.maxAnisotropy = 4
              artSprite.mask = artMask
              centerLayer.addChildAt(artSprite, 0)

              const artTint = new Graphics()
              artTint.roundRect(artInset, artInset, artWidth, artHeight, 10)
              artTint.fill({ color: arenaPalette.artTintFill, alpha: 0.04 })
              centerLayer.addChild(artTint)
            })
            .catch(() => {
              // Fallback sigil stays visible if art loading fails.
            })

          if (isPoisonedBoardCard) {
            const poisonOverlay = new Graphics()
            poisonOverlay.roundRect(artInset, artInset, artWidth, artHeight, 10)
            poisonOverlay.fill({ color: 0x8f4cb7, alpha: 0.18 })
            poisonOverlay.stroke({ width: 1, color: 0xd29fff, alpha: 0.46 })
            cardContainer.addChild(poisonOverlay)
          }

          const statStyle = {
            fill: arenaPalette.statText,
            fontSize: 18,
            fontWeight: '700',
            fontFamily: 'Rajdhani, sans-serif',
            letterSpacing: 0.6,
          } as const

          const statChips = [
            {
              value: displayStats?.top.value ?? card.top,
              trend: displayStats?.top.trend ?? 'neutral',
              x: cellSize / 2,
              y: 18,
            },
            {
              value: displayStats?.right.value ?? card.right,
              trend: displayStats?.right.trend ?? 'neutral',
              x: cellSize - 18,
              y: cellSize / 2,
            },
            {
              value: displayStats?.bottom.value ?? card.bottom,
              trend: displayStats?.bottom.trend ?? 'neutral',
              x: cellSize / 2,
              y: cellSize - 18,
            },
            {
              value: displayStats?.left.value ?? card.left,
              trend: displayStats?.left.trend ?? 'neutral',
              x: 18,
              y: cellSize / 2,
            },
          ]

          statChips.forEach((chipSpec) => {
            const chip = new Graphics()
            chip.circle(0, 0, 12.5)
            const trendColor = isPoisonedBoardCard
              ? 0x583173
              : chipSpec.trend === 'buff'
                ? 0x1f5f39
                : chipSpec.trend === 'debuff'
                  ? 0x61333a
                  : arenaPalette.statChipFill
            const trendStroke = isPoisonedBoardCard ? 0xe9bbff : arenaPalette.statChipStroke
            chip.fill({ color: trendColor, alpha: 0.84 })
            chip.stroke({ width: 1, color: trendStroke, alpha: isPoisonedBoardCard ? 0.68 : 0.42 })
            chip.x = chipSpec.x
            chip.y = chipSpec.y
            cardContainer.addChild(chip)

            const chipText = new Text({ text: `${chipSpec.value}`, style: statStyle })
            chipText.anchor.set(0.5)
            chipText.x = chipSpec.x
            chipText.y = chipSpec.y
            cardContainer.addChild(chipText)
          })

          const renderedBoardIndicators = boardEffectIndicators.filter(
            (indicator) => indicator.key !== 'card-poison-first-combat' && indicator.key !== 'card-ground-volatile',
          )
          let rightSideIndicatorOffset = 0

          if (isGroundDebuffedCell) {
            const groundText = new Text({
              text: '🪨',
              style: {
                fill: 0xfff1cc,
                fontSize: 14,
                fontFamily: 'Rajdhani, sans-serif',
                fontWeight: '700',
              },
            })
            groundText.anchor.set(0.5)
            groundText.x = cellSize - 18
            groundText.y = 36
            cardContainer.addChild(groundText)
            rightSideIndicatorOffset = 1
          }

          if (isPoisonedBoardCard) {
            const poisonBadgePlate = new Graphics()
            poisonBadgePlate.circle(0, 0, 11.2)
            poisonBadgePlate.fill({ color: 0x3f1b5a, alpha: 0.9 })
            poisonBadgePlate.stroke({ width: 1, color: 0xe7c3ff, alpha: 0.65 })
            poisonBadgePlate.x = 13
            poisonBadgePlate.y = 13
            cardContainer.addChild(poisonBadgePlate)

            if (poisonLogo) {
              void Assets.load<Texture>(poisonLogo.imageSrc)
                .then((poisonTexture) => {
                  if (cancelled || cardContainer.destroyed) {
                    return
                  }
                  const poisonSprite = new Sprite(poisonTexture)
                  poisonSprite.anchor.set(0.5)
                  poisonSprite.width = 17
                  poisonSprite.height = 17
                  poisonSprite.x = 13
                  poisonSprite.y = 13
                  cardContainer.addChild(poisonSprite)
                })
                .catch(() => {
                  if (cancelled || cardContainer.destroyed) {
                    return
                  }
                  const fallbackPoisonText = new Text({
                    text: '☠',
                    style: {
                      fill: 0xffe9ff,
                      fontSize: 12,
                      fontFamily: 'Rajdhani, sans-serif',
                      fontWeight: '700',
                    },
                  })
                  fallbackPoisonText.anchor.set(0.5)
                  fallbackPoisonText.x = 13
                  fallbackPoisonText.y = 13
                  cardContainer.addChild(fallbackPoisonText)
                })
            }
          }

          renderedBoardIndicators.slice(0, 2).forEach((indicator, indicatorIndex) => {
            const indicatorX = cellSize - 18 - (indicatorIndex + rightSideIndicatorOffset) * 15
            const effectText = new Text({
              text: indicator.icon,
              style: {
                fill: 0xfff4d4,
                fontSize: 15,
                fontFamily: 'Rajdhani, sans-serif',
                fontWeight: '700',
              },
            })
            effectText.anchor.set(0.5)
            effectText.x = indicatorX
            effectText.y = 36
            cardContainer.addChild(effectText)
          })

          const flipEventForAnimation =
            shouldAnimateExplicitFlips && explicitFlipEvent
              ? explicitFlipEvent
              : shouldAnimateRecentFlips && resolvedFlipEvent
                ? resolvedFlipEvent
                : null

          if (shouldAnimateRecentPlacements && recentPlacedSet.has(index) && !prefersReducedMotion) {
            cardContainer.scale.set(0.72)
            cardContainer.alpha = 0.36
            placementBursts.push({ container: cardContainer, elapsedMs: 0 })
          } else if (!prefersReducedMotion && flipEventForAnimation) {
            const flipDelayMs = flipEventForAnimation.phase === 'combo' ? 500 : 200
            const flipFlashColor = slot.owner === 'player' ? arenaPalette.ownerEdgePlayer : arenaPalette.ownerEdgeCpu

            const flipFlash = new Graphics()
            flipFlash.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, 11)
            flipFlash.fill({ color: flipFlashColor, alpha: 0.2 })
            flipFlash.stroke({ width: 3, color: flipFlashColor, alpha: 0.82 })
            flipFlash.alpha = 0
            app.stage.addChild(flipFlash)

            flipFlashes.push({
              sprite: flipFlash,
              elapsedMs: 0,
              delayMs: flipDelayMs,
              peakAlpha: flipEventForAnimation.phase === 'combo' ? 0.44 : 0.56,
            })
            flipBursts.push({
              container: cardContainer,
              elapsedMs: 0,
              delayMs: flipDelayMs,
              axis: flipEventForAnimation.axis,
              baseY: y + cellSize / 2,
            })
          }

          app.stage.addChild(cardContainer)
        }
      })

      groundDebuffCellsToRender.forEach(({ x, y, hasCard }) => {
        const groundOverlay = new Graphics()
        groundOverlay.roundRect(x + 3, y + 3, cellSize - 6, cellSize - 6, 10)
        groundOverlay.fill({ color: 0x8a6026, alpha: hasCard ? 0.22 : 0.12 })
        groundOverlay.stroke({ width: 2, color: 0xf4cb7f, alpha: 0.58 })
        app.stage.addChild(groundOverlay)

        if (groundBoardEffectTexture) {
          const groundTextureMask = new Graphics()
          groundTextureMask.roundRect(x + 4, y + 4, cellSize - 8, cellSize - 8, 10)
          groundTextureMask.fill({ color: 0xffffff })

          const groundTexture = new Sprite(groundBoardEffectTexture)
          groundTexture.x = x + 4
          groundTexture.y = y + 4
          groundTexture.width = cellSize - 8
          groundTexture.height = cellSize - 8
          groundTexture.alpha = hasCard ? 0.34 : 0.24
          groundTexture.mask = groundTextureMask

          app.stage.addChild(groundTexture)
          app.stage.addChild(groundTextureMask)
        }

        const groundBadge = new Graphics()
        const badgeWidth = Math.max(34, cellSize * 0.42)
        const badgeHeight = Math.max(24, cellSize * 0.27)
        const badgeX = x + cellSize / 2 - badgeWidth / 2
        const badgeY = y + cellSize / 2 - badgeHeight / 2 + (hasCard ? 2 : 0)
        groundBadge.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 999)
        groundBadge.fill({ color: 0x5d3913, alpha: 0.88 })
        groundBadge.stroke({ width: 1.4, color: 0xf8d193, alpha: 0.9 })
        app.stage.addChild(groundBadge)

        const debuffText = new Text({
          text: '-1',
          style: {
            fill: 0xfff1cf,
            fontSize: 17,
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: '800',
            letterSpacing: 0.5,
          },
        })
        debuffText.anchor.set(0.5)
        debuffText.x = x + cellSize / 2
        debuffText.y = y + cellSize / 2 - 4 + (hasCard ? 2 : 0)
        app.stage.addChild(debuffText)

        const debuffScopeText = new Text({
          text: 'ALL',
          style: {
            fill: 0xffefcf,
            fontSize: 9.5,
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: '800',
            letterSpacing: 1.2,
          },
        })
        debuffScopeText.anchor.set(0.5)
        debuffScopeText.x = x + cellSize / 2
        debuffScopeText.y = y + cellSize / 2 + 8 + (hasCard ? 2 : 0)
        app.stage.addChild(debuffScopeText)
      })

      fireTargetCellsToRender.forEach(({ x, y }) => {
        const fireTargetOverlay = new Graphics()
        fireTargetOverlay.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 10)
        fireTargetOverlay.fill({ color: 0xa03734, alpha: 0.2 })
        fireTargetOverlay.stroke({ width: 2, color: 0xffc29f, alpha: 0.88 })
        app.stage.addChild(fireTargetOverlay)
        pulseOverlays.push(fireTargetOverlay)

        const fireTargetBadge = new Graphics()
        fireTargetBadge.circle(x + cellSize / 2, y + cellSize / 2 - 5, Math.max(13, cellSize * 0.17))
        fireTargetBadge.fill({ color: 0x8f2d2d, alpha: 0.84 })
        fireTargetBadge.stroke({ width: 1.5, color: 0xffd0a8, alpha: 0.85 })
        app.stage.addChild(fireTargetBadge)

        if (fireTexture) {
          const fireTargetLogo = new Sprite(fireTexture)
          fireTargetLogo.anchor.set(0.5)
          fireTargetLogo.width = Math.max(18, cellSize * 0.2)
          fireTargetLogo.height = Math.max(18, cellSize * 0.2)
          fireTargetLogo.x = x + cellSize / 2
          fireTargetLogo.y = y + cellSize / 2 - 5
          app.stage.addChild(fireTargetLogo)
        } else {
          const fireTargetText = new Text({
            text: 'FEU',
            style: {
              fill: 0xfff0dd,
              fontSize: 11,
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: '800',
              letterSpacing: 0.9,
            },
          })
          fireTargetText.anchor.set(0.5)
          fireTargetText.x = x + cellSize / 2
          fireTargetText.y = y + cellSize / 2 - 5
          app.stage.addChild(fireTargetText)
        }

        const fireTargetLabel = new Text({
          text: 'CIBLE BRULURE',
          style: {
            fill: 0xffecd7,
            fontSize: 8.4,
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: '800',
            letterSpacing: 0.72,
          },
        })
        fireTargetLabel.anchor.set(0.5)
        fireTargetLabel.x = x + cellSize / 2
        fireTargetLabel.y = y + cellSize / 2 + 15
        app.stage.addChild(fireTargetLabel)
      })

      fireCastCellsToRender.forEach(({ x, y }) => {
        const fireCastOverlay = new Graphics()
        fireCastOverlay.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 10)
        fireCastOverlay.fill({ color: 0xac3d32, alpha: 0.24 })
        fireCastOverlay.stroke({ width: 2, color: 0xffd1a7, alpha: 0.84 })
        app.stage.addChild(fireCastOverlay)

        const fireCastBadge = new Graphics()
        fireCastBadge.roundRect(x + cellSize * 0.2, y + cellSize * 0.43, cellSize * 0.6, cellSize * 0.2, 999)
        fireCastBadge.fill({ color: 0x7a2623, alpha: 0.84 })
        fireCastBadge.stroke({ width: 1.4, color: 0xffd2a9, alpha: 0.86 })
        app.stage.addChild(fireCastBadge)

        if (fireTexture) {
          const fireCastLogo = new Sprite(fireTexture)
          fireCastLogo.anchor.set(0.5)
          fireCastLogo.width = Math.max(15, cellSize * 0.17)
          fireCastLogo.height = Math.max(15, cellSize * 0.17)
          fireCastLogo.x = x + cellSize / 2 - 15
          fireCastLogo.y = y + cellSize / 2 + 1
          app.stage.addChild(fireCastLogo)
        }

        const fireCastLabel = new Text({
          text: 'BRULURE',
          style: {
            fill: 0xffebd8,
            fontSize: 10.8,
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: '800',
            letterSpacing: 0.62,
          },
        })
        fireCastLabel.anchor.set(0.5)
        fireCastLabel.x = x + cellSize / 2 + 7
        fireCastLabel.y = y + cellSize / 2 + 1
        app.stage.addChild(fireCastLabel)
      })

      floodTargetCellsToRender.forEach(({ x, y }) => {
        const floodTargetOverlay = new Graphics()
        floodTargetOverlay.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 10)
        floodTargetOverlay.fill({ color: 0x52c8f7, alpha: 0.2 })
        floodTargetOverlay.stroke({ width: 2, color: 0xd7f7ff, alpha: 0.88 })
        app.stage.addChild(floodTargetOverlay)
        pulseOverlays.push(floodTargetOverlay)

        const floodTargetRipple = new Graphics()
        floodTargetRipple.circle(x + cellSize / 2, y + cellSize / 2, Math.max(13, cellSize * 0.18))
        floodTargetRipple.stroke({ width: 2, color: 0xa0e5ff, alpha: 0.6 })
        app.stage.addChild(floodTargetRipple)
        pulseOverlays.push(floodTargetRipple)

        const floodTargetBadge = new Graphics()
        floodTargetBadge.circle(x + cellSize / 2, y + cellSize / 2 - 6, Math.max(13, cellSize * 0.16))
        floodTargetBadge.fill({ color: 0x2a83b6, alpha: 0.8 })
        floodTargetBadge.stroke({ width: 1.5, color: 0xcff4ff, alpha: 0.84 })
        app.stage.addChild(floodTargetBadge)

        if (waterTexture) {
          const floodTargetLogo = new Sprite(waterTexture)
          floodTargetLogo.anchor.set(0.5)
          floodTargetLogo.width = Math.max(18, cellSize * 0.2)
          floodTargetLogo.height = Math.max(18, cellSize * 0.2)
          floodTargetLogo.x = x + cellSize / 2
          floodTargetLogo.y = y + cellSize / 2 - 6
          app.stage.addChild(floodTargetLogo)
        } else {
          const floodTargetText = new Text({
            text: 'EAU',
            style: {
              fill: 0xedfbff,
              fontSize: 12,
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: '800',
              letterSpacing: 1,
            },
          })
          floodTargetText.anchor.set(0.5)
          floodTargetText.x = x + cellSize / 2
          floodTargetText.y = y + cellSize / 2 - 6
          app.stage.addChild(floodTargetText)
        }

        const floodTargetLabel = new Text({
          text: 'CIBLE -2 MAX',
          style: {
            fill: 0xeafaff,
            fontSize: 8.6,
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: '800',
            letterSpacing: 0.75,
          },
        })
        floodTargetLabel.anchor.set(0.5)
        floodTargetLabel.x = x + cellSize / 2
        floodTargetLabel.y = y + cellSize / 2 + 15
        app.stage.addChild(floodTargetLabel)
      })

      floodCastCellsToRender.forEach(({ x, y }) => {
        const floodCastOverlay = new Graphics()
        floodCastOverlay.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 10)
        floodCastOverlay.fill({ color: 0x49b7ef, alpha: 0.2 })
        floodCastOverlay.stroke({ width: 2, color: 0xc5f4ff, alpha: 0.78 })
        app.stage.addChild(floodCastOverlay)

        const floodCastBadge = new Graphics()
        floodCastBadge.circle(x + cellSize / 2, y + cellSize / 2 - 4, Math.max(13, cellSize * 0.17))
        floodCastBadge.fill({ color: 0x2a7ba8, alpha: 0.82 })
        floodCastBadge.stroke({ width: 1.5, color: 0xd6f5ff, alpha: 0.82 })
        app.stage.addChild(floodCastBadge)

        if (waterTexture) {
          const floodCastLogo = new Sprite(waterTexture)
          floodCastLogo.anchor.set(0.5)
          floodCastLogo.width = Math.max(19, cellSize * 0.22)
          floodCastLogo.height = Math.max(19, cellSize * 0.22)
          floodCastLogo.x = x + cellSize / 2
          floodCastLogo.y = y + cellSize / 2 - 4
          app.stage.addChild(floodCastLogo)
        } else {
          const floodCastText = new Text({
            text: 'EAU',
            style: {
              fill: 0xeaf9ff,
              fontSize: 13,
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: '800',
              letterSpacing: 1,
            },
          })
          floodCastText.anchor.set(0.5)
          floodCastText.x = x + cellSize / 2
          floodCastText.y = y + cellSize / 2 - 4
          app.stage.addChild(floodCastText)
        }

        const floodCastLabel = new Text({
          text: 'INONDE -2 MAX',
          style: {
            fill: 0xe7f7ff,
            fontSize: 8.6,
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: '800',
            letterSpacing: 0.75,
          },
        })
        floodCastLabel.anchor.set(0.5)
        floodCastLabel.x = x + cellSize / 2
        floodCastLabel.y = y + cellSize / 2 + 16
        app.stage.addChild(floodCastLabel)
      })

      freezeTargetCellsToRender.forEach(({ x, y }) => {
        const freezeTargetOverlay = new Graphics()
        freezeTargetOverlay.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 10)
        freezeTargetOverlay.fill({ color: 0xc4efff, alpha: 0.1 })
        freezeTargetOverlay.stroke({ width: 2, color: 0xe8fbff, alpha: 0.72 })
        app.stage.addChild(freezeTargetOverlay)
        pulseOverlays.push(freezeTargetOverlay)

        if (iceTexture) {
          const freezeTargetLogo = new Sprite(iceTexture)
          freezeTargetLogo.anchor.set(0.5)
          freezeTargetLogo.width = Math.max(18, cellSize * 0.2)
          freezeTargetLogo.height = Math.max(18, cellSize * 0.2)
          freezeTargetLogo.x = x + cellSize / 2
          freezeTargetLogo.y = y + cellSize / 2
          freezeTargetLogo.alpha = 0.95
          app.stage.addChild(freezeTargetLogo)
        } else {
          const freezeTargetText = new Text({
            text: 'GLACE',
            style: {
              fill: 0xf0fcff,
              fontSize: 10.5,
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: '800',
              letterSpacing: 0.8,
            },
          })
          freezeTargetText.anchor.set(0.5)
          freezeTargetText.x = x + cellSize / 2
          freezeTargetText.y = y + cellSize / 2
          app.stage.addChild(freezeTargetText)
        }
      })

      freezeCastCellsToRender.forEach(({ x, y }) => {
        const freezeCastOverlay = new Graphics()
        freezeCastOverlay.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 10)
        freezeCastOverlay.fill({ color: 0xbdeaff, alpha: 0.15 })
        freezeCastOverlay.stroke({ width: 2.2, color: 0xe6f9ff, alpha: 0.86 })
        app.stage.addChild(freezeCastOverlay)

        const freezeCastAccent = new Graphics()
        freezeCastAccent.circle(x + cellSize / 2, y + cellSize / 2, Math.max(14, cellSize * 0.19))
        freezeCastAccent.stroke({ width: 2, color: 0xc9f4ff, alpha: 0.7 })
        app.stage.addChild(freezeCastAccent)
        pulseOverlays.push(freezeCastAccent)

        if (iceTexture) {
          const freezeCastLogo = new Sprite(iceTexture)
          freezeCastLogo.anchor.set(0.5)
          freezeCastLogo.width = Math.max(19, cellSize * 0.22)
          freezeCastLogo.height = Math.max(19, cellSize * 0.22)
          freezeCastLogo.x = x + cellSize / 2
          freezeCastLogo.y = y + cellSize / 2
          freezeCastLogo.alpha = 0.96
          app.stage.addChild(freezeCastLogo)
        } else {
          const freezeCastText = new Text({
            text: 'GLACE',
            style: {
              fill: 0xf2fdff,
              fontSize: 11.5,
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: '800',
              letterSpacing: 0.85,
            },
          })
          freezeCastText.anchor.set(0.5)
          freezeCastText.x = x + cellSize / 2
          freezeCastText.y = y + cellSize / 2
          app.stage.addChild(freezeCastText)
        }
      })

      freezeBlockedCellsToRender.forEach(({ x, y }) => {
        const freezeBlockedOverlay = new Graphics()
        freezeBlockedOverlay.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 10)
        freezeBlockedOverlay.fill({ color: 0xd6f4ff, alpha: 0.18 })
        freezeBlockedOverlay.stroke({ width: 2.2, color: 0xffffff, alpha: 0.92 })
        app.stage.addChild(freezeBlockedOverlay)
        pulseOverlays.push(freezeBlockedOverlay)

        const freezeBlockedLabel = new Text({
          text: 'BLOQUEE',
          style: {
            fill: 0xeefbff,
            fontSize: 10.5,
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: '800',
            letterSpacing: 0.9,
          },
        })
        freezeBlockedLabel.anchor.set(0.5)
        freezeBlockedLabel.x = x + cellSize / 2
        freezeBlockedLabel.y = y + cellSize / 2 + 16
        app.stage.addChild(freezeBlockedLabel)

        if (iceTexture) {
          const freezeBlockedLogo = new Sprite(iceTexture)
          freezeBlockedLogo.anchor.set(0.5)
          freezeBlockedLogo.width = Math.max(17, cellSize * 0.2)
          freezeBlockedLogo.height = Math.max(17, cellSize * 0.2)
          freezeBlockedLogo.x = x + cellSize / 2
          freezeBlockedLogo.y = y + cellSize / 2 - 4
          freezeBlockedLogo.alpha = 0.96
          app.stage.addChild(freezeBlockedLogo)
        }
      })

      waterPenaltyCellsToRender.forEach(({ x, y }) => {
        const waterPenaltyOverlay = new Graphics()
        waterPenaltyOverlay.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 10)
        waterPenaltyOverlay.fill({ color: 0x2e77a1, alpha: 0.23 })
        waterPenaltyOverlay.stroke({ width: 2, color: 0xbcefff, alpha: 0.82 })
        app.stage.addChild(waterPenaltyOverlay)

        const waterPenaltyBadge = new Graphics()
        waterPenaltyBadge.roundRect(x + cellSize * 0.22, y + cellSize * 0.43, cellSize * 0.56, cellSize * 0.2, 999)
        waterPenaltyBadge.fill({ color: 0x1e5f86, alpha: 0.82 })
        waterPenaltyBadge.stroke({ width: 1.4, color: 0xc8f2ff, alpha: 0.86 })
        app.stage.addChild(waterPenaltyBadge)

        if (waterTexture) {
          const waterPenaltyLogo = new Sprite(waterTexture)
          waterPenaltyLogo.anchor.set(0.5)
          waterPenaltyLogo.width = Math.max(15, cellSize * 0.17)
          waterPenaltyLogo.height = Math.max(15, cellSize * 0.17)
          waterPenaltyLogo.x = x + cellSize / 2 - 11
          waterPenaltyLogo.y = y + cellSize / 2 + 1
          app.stage.addChild(waterPenaltyLogo)

          const waterPenaltyValue = new Text({
            text: '-2 MAX',
            style: {
              fill: 0xeeffff,
              fontSize: 11.5,
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: '800',
              letterSpacing: 0.55,
            },
          })
          waterPenaltyValue.anchor.set(0.5)
          waterPenaltyValue.x = x + cellSize / 2 + 8
          waterPenaltyValue.y = y + cellSize / 2 + 1
          app.stage.addChild(waterPenaltyValue)
        } else {
          const waterPenaltyText = new Text({
            text: 'EAU-2',
            style: {
              fill: 0xeeffff,
              fontSize: 14,
              fontFamily: 'Rajdhani, sans-serif',
              fontWeight: '800',
              letterSpacing: 0.8,
            },
          })
          waterPenaltyText.anchor.set(0.5)
          waterPenaltyText.x = x + cellSize / 2
          waterPenaltyText.y = y + cellSize / 2 + 1
          app.stage.addChild(waterPenaltyText)
        }
      })

      clashCellsToRender.forEach(({ x, y }) => {
        const clashOverlay = new Graphics()
        clashOverlay.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 10)
        clashOverlay.fill({ color: 0xf6b57a, alpha: 0.22 })
        clashOverlay.stroke({ width: 2, color: 0xffe0b3, alpha: 0.86 })
        app.stage.addChild(clashOverlay)

        const clashBurst = new Graphics()
        clashBurst.moveTo(x + cellSize * 0.24, y + cellSize * 0.24)
        clashBurst.lineTo(x + cellSize * 0.76, y + cellSize * 0.76)
        clashBurst.moveTo(x + cellSize * 0.76, y + cellSize * 0.24)
        clashBurst.lineTo(x + cellSize * 0.24, y + cellSize * 0.76)
        clashBurst.stroke({ width: 3, color: 0xffdfad, alpha: 0.72 })
        app.stage.addChild(clashBurst)

        const clashEmoji = new Text({
          text: '💥',
          style: {
            fill: 0xfff4de,
            fontSize: 28,
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: '700',
          },
        })
        clashEmoji.anchor.set(0.5)
        clashEmoji.x = x + cellSize / 2
        clashEmoji.y = y + cellSize / 2 - 6
        app.stage.addChild(clashEmoji)

        const clashLabel = new Text({
          text: 'CHOC',
          style: {
            fill: 0xfff0d0,
            fontSize: 11,
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: '800',
            letterSpacing: 1.1,
          },
        })
        clashLabel.anchor.set(0.5)
        clashLabel.x = x + cellSize / 2
        clashLabel.y = y + cellSize / 2 + 16
        app.stage.addChild(clashLabel)
      })

      let animate: (() => void) | null = null
      if (!prefersReducedMotion) {
        let elapsedMs = 0
        animate = () => {
          elapsedMs += app.ticker.deltaMS
          const auraPulse = status === 'active' ? 0.16 + (Math.sin((elapsedMs / 1600) * Math.PI * 2) + 1) * 0.04 : 0.1
          if (turnAura) {
            turnAura.alpha = auraPulse
          }

          pulseOverlays.forEach((overlay, index) => {
            const wave = (Math.sin((elapsedMs / 1200) * Math.PI * 2 + index * 0.55) + 1) * 0.5
            overlay.alpha = arenaPalette.pulseBase + wave * arenaPalette.pulseRange
          })

          for (let index = placementBursts.length - 1; index >= 0; index -= 1) {
            const burst = placementBursts[index]
            burst.elapsedMs += app.ticker.deltaMS
            const progress = Math.min(1, burst.elapsedMs / 360)
            const eased = 1 - (1 - progress) ** 3
            const overshoot = 1 + Math.sin(progress * Math.PI) * 0.09
            const scale = (0.72 + eased * 0.28) * overshoot

            burst.container.scale.set(scale)
            burst.container.alpha = 0.36 + eased * 0.64

            if (progress >= 1) {
              burst.container.scale.set(1)
              burst.container.alpha = 1
              placementBursts.splice(index, 1)
            }
          }

          for (let index = placementFlashes.length - 1; index >= 0; index -= 1) {
            const flash = placementFlashes[index]
            flash.elapsedMs += app.ticker.deltaMS
            const progress = Math.min(1, flash.elapsedMs / 280)
            flash.sprite.alpha = 0.62 * (1 - progress)
            if (progress >= 1) {
              app.stage.removeChild(flash.sprite)
              flash.sprite.destroy()
              placementFlashes.splice(index, 1)
            }
          }

          for (let index = flipBursts.length - 1; index >= 0; index -= 1) {
            const burst = flipBursts[index]
            burst.elapsedMs += app.ticker.deltaMS
            const localElapsedMs = burst.elapsedMs - burst.delayMs
            if (localElapsedMs < 0) {
              continue
            }
            const progress = Math.min(1, localElapsedMs / 1200)
            const spinTurns = 3
            const fullTurnOscillation = Math.cos(progress * Math.PI * 2 * spinTurns)
            const liftPhase = Math.sin(progress * Math.PI)
            const zoom = 1 + liftPhase * 0.42
            const signedTurn = Math.sign(fullTurnOscillation === 0 ? 1 : fullTurnOscillation)
            const edgeThickness = Math.max(0.08, Math.abs(fullTurnOscillation))
            const axisScale = signedTurn * edgeThickness * zoom
            const landingProgress = progress > 0.8 ? (progress - 0.8) / 0.2 : 0
            const landingWave = progress > 0.8 ? Math.sin(Math.min(1, landingProgress) * Math.PI) : 0
            const squash = 1 - landingWave * 0.12
            const stretch = 1 + landingWave * 0.09
            const scaleX = burst.axis === 'vertical' ? zoom * stretch : axisScale * squash
            const scaleY = burst.axis === 'vertical' ? axisScale * squash : zoom * stretch
            const lift = liftPhase * 34 - landingWave * 8
            const airAlphaBoost = Math.max(0, Math.sin(progress * Math.PI * spinTurns))

            burst.container.scale.set(scaleX, scaleY)
            burst.container.y = burst.baseY - lift
            burst.container.alpha = Math.min(1, 0.78 + liftPhase * 0.18 + airAlphaBoost * 0.08)

            if (progress >= 1) {
              burst.container.scale.set(1)
              burst.container.y = burst.baseY
              burst.container.alpha = 1
              flipBursts.splice(index, 1)
            }
          }

          for (let index = flipFlashes.length - 1; index >= 0; index -= 1) {
            const flash = flipFlashes[index]
            flash.elapsedMs += app.ticker.deltaMS
            const localElapsedMs = flash.elapsedMs - flash.delayMs
            if (localElapsedMs < 0) {
              continue
            }
            const progress = Math.min(1, localElapsedMs / 1200)
            const burst = Math.sin(progress * Math.PI)
            const strobe = Math.max(0, Math.sin(progress * Math.PI * 6))
            flash.sprite.alpha = flash.peakAlpha * burst * (0.72 + strobe * 0.28)
            if (progress >= 1) {
              app.stage.removeChild(flash.sprite)
              flash.sprite.destroy()
              flipFlashes.splice(index, 1)
            }
          }
        }
        app.ticker.add(animate)
      }
      tickerCleanupRef.current = () => {
        if (animate) {
          app.ticker.remove(animate)
        }
      }
      lastAnimatedBoardSignatureRef.current = boardSignature
      if (shouldAnimateExplicitFlips) {
        lastAnimatedFlipEventVersionRef.current = flipEventVersion
      }
    }

    void render()

    return () => {
      cancelled = true
    }
  }, [
    appReadyVersion,
    arenaPalette,
    arenaVariant,
    board,
    boardDimension,
    boardLayout.gap,
    boardLayout.inset,
    cellSize,
    effectsView,
    flipEventVersion,
    flipEvents.length,
    focusedCell,
    flipEventByCell,
    highlightedSet,
    tutorialGuidedSet,
    interactive,
    planteLogo,
    planteTerritoryActiveSet,
    poisonLogo,
    fireLogo,
    iceLogo,
    waterLogo,
    prefersReducedMotion,
    placedCardVisualLayout.artInset,
    placedCardVisualLayout.artScaleInset,
    placedCardVisualLayout.crestInsetFactor,
    placedCardVisualLayout.plateInset,
    recentFlippedSet,
    recentPlacedSet,
    shouldUseFallback,
    status,
    transientClashSet,
    transientFireCastSet,
    transientFireTargetSet,
    transientFreezeBlockedSet,
    transientFreezeCastSet,
    transientFreezeTargetSet,
    transientFloodTargetSet,
    transientFloodCastSet,
    transientGroundSet,
    transientWaterPenaltySet,
    targetableSet,
    turnActor,
    neutralBoardArtEnabled,
  ])

  const clearHoveredCell = () => {
    setHoveredCellIndex(null)
    setHoverAnchor(null)
  }

  const handlePixiPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resolvedCellIndex = resolvePointerCellIndex({
      event,
      boardDimension,
      boardCellCount: board.length,
      boardLayout,
      cellSize,
    })
    if (resolvedCellIndex === null || board[resolvedCellIndex] === null) {
      setHoveredCellIndex(null)
      setHoverAnchor(null)
      return
    }

    const row = Math.floor(resolvedCellIndex / boardDimension)
    const col = resolvedCellIndex % boardDimension
    const centerX = boardLayout.inset + col * (cellSize + boardLayout.gap) + cellSize / 2
    const centerY = boardLayout.inset + row * (cellSize + boardLayout.gap) + cellSize / 2

    setHoveredCellIndex(resolvedCellIndex)
    setHoverAnchor({
      xPercent: clampPercent((centerX / boardSize) * 100),
      yPercent: clampPercent((centerY / boardSize) * 100),
      placeBelow: row === 0,
    })
  }

  const handleFallbackPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const eventTarget = event.target
    if (!(eventTarget instanceof HTMLElement)) {
      setHoveredCellIndex(null)
      setHoverAnchor(null)
      return
    }
    const cellButton = eventTarget.closest<HTMLButtonElement>('button[data-cell-index]')
    if (!cellButton) {
      setHoveredCellIndex(null)
      setHoverAnchor(null)
      return
    }
    const cellIndex = Number.parseInt(cellButton.dataset.cellIndex ?? '', 10)
    if (!Number.isFinite(cellIndex) || cellIndex < 0 || cellIndex >= board.length || board[cellIndex] === null) {
      setHoveredCellIndex(null)
      setHoverAnchor(null)
      return
    }

    const boardRect = event.currentTarget.getBoundingClientRect()
    const cellRect = cellButton.getBoundingClientRect()
    if (boardRect.width > 0 && boardRect.height > 0) {
      const centerX = ((cellRect.left + cellRect.width / 2 - boardRect.left) / boardRect.width) * 100
      const centerY = ((cellRect.top + cellRect.height / 2 - boardRect.top) / boardRect.height) * 100
      const row = Math.floor(cellIndex / boardDimension)
      setHoverAnchor({
        xPercent: clampPercent(centerX),
        yPercent: clampPercent(centerY),
        placeBelow: row === 0,
      })
    }

    setHoveredCellIndex(cellIndex)
  }

  const applyFallbackHoverAnchorFromButton = (button: HTMLButtonElement, cellIndex: number) => {
    const boardElement = button.closest<HTMLDivElement>('.fallback-board')
    if (!boardElement) {
      return
    }

    const boardRect = boardElement.getBoundingClientRect()
    const row = Math.floor(cellIndex / boardDimension)
    const col = cellIndex % boardDimension

    if (boardRect.width <= 0 || boardRect.height <= 0) {
      setHoverAnchor({
        xPercent: clampPercent(((col + 0.5) / boardDimension) * 100),
        yPercent: clampPercent(((row + 0.5) / boardDimension) * 100),
        placeBelow: row === 0,
      })
      return
    }

    const cellRect = button.getBoundingClientRect()
    const centerX = ((cellRect.left + cellRect.width / 2 - boardRect.left) / boardRect.width) * 100
    const centerY = ((cellRect.top + cellRect.height / 2 - boardRect.top) / boardRect.height) * 100

    setHoverAnchor({
      xPercent: clampPercent(centerX),
      yPercent: clampPercent(centerY),
      placeBelow: row === 0,
    })
  }

  const hoverPanel =
    hoveredSlot && hoveredStatChangeLines.length > 0 && hoverAnchor ? (
      <div
        className={`board-cell-hover-stats ${
          hoverAnchor.placeBelow ? 'board-cell-hover-stats--below' : 'board-cell-hover-stats--above'
        }`}
        style={{ left: `${hoverAnchor.xPercent}%`, top: `${hoverAnchor.yPercent}%` }}
        role="status"
        data-testid="board-cell-hover-stats"
      >
        <p className="board-cell-hover-stats__title">{hoveredCardName}</p>
        <ul className="board-cell-hover-stats__list">
          {hoveredStatChangeLines.map((line) => {
            const logoMeta = line.elementId ? getElementLogoMeta(line.elementId) : null
            return (
              <li key={line.key} className={`board-cell-hover-stats__line board-cell-hover-stats__line--${line.tone}`}>
                {logoMeta ? (
                  <img
                    className="board-cell-hover-stats__icon-logo"
                    src={logoMeta.imageSrc}
                    alt=""
                    width={16}
                    height={16}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="board-cell-hover-stats__icon" aria-hidden="true">
                    {line.iconText ?? '•'}
                  </span>
                )}
                <span className="board-cell-hover-stats__summary">{line.summary}</span>
                {line.durationText ? (
                  <span className="board-cell-hover-stats__duration">
                    <span aria-hidden="true">⏳</span>
                    <span>{line.durationText}</span>
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    ) : null

  if (shouldUseFallback) {
    const hasNeutralBoardArt = boardDimension === 3
    const boardClasses = [
      'fallback-board',
      hasNeutralBoardArt ? 'has-neutral-board-art' : '',
      `is-arena-${arenaVariant}`,
      turnActor === 'player' ? 'is-turn-player' : 'is-turn-cpu',
      status === 'finished' ? 'is-finished' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className="pixi-board-shell">
        <div
          className={boardClasses}
          role="grid"
          aria-label="Match board"
          style={{ '--fallback-grid-cols': `${boardDimension}` } as CSSProperties}
          onPointerMove={handleFallbackPointerMove}
          onPointerLeave={clearHoveredCell}
        >
          {board.map((slot, index) => {
          const card = slot ? getCard(slot.cardId) : null
          const artCandidates = card ? getCardArtCandidates(card.name) : []
          const artSrc = artCandidates[0] ?? null
          const displayStats = effectsView?.displayStatsByCell[index]
          const cellIndicators = effectsView?.cellIndicators[index] ?? []
          const boardIndicators = effectsView?.boardCardIndicators[index] ?? []
          const hasPlantePackBuff = boardIndicators.some((indicator) => indicator.key === 'card-plante-pack')
          const hasPlanteLinkRight =
            hasPlantePackBuff && hasPlanteTerritoryLink({ activeCells: planteTerritoryActiveSet, index, boardDimension, orientation: 'horizontal' })
          const hasPlanteLinkDown =
            hasPlantePackBuff && hasPlanteTerritoryLink({ activeCells: planteTerritoryActiveSet, index, boardDimension, orientation: 'vertical' })
          const hasPersistentGroundDebuff = boardIndicators.some((indicator) => indicator.key === 'card-ground-volatile')
          const isPoisonedBoardCard = boardIndicators.some((indicator) => indicator.key === 'card-poison-first-combat')
          const activeIndicators = slot ? boardIndicators : cellIndicators
          const secondaryIndicators = activeIndicators.filter(
            (indicator) => indicator.key !== 'card-poison-first-combat' && indicator.key !== 'card-ground-volatile',
          )
          const isGroundDebuffedCell = transientGroundSet.has(index)
          const isFireTargetCell = transientFireTargetSet.has(index)
          const isFireCastCell = transientFireCastSet.has(index)
          const isFloodTargetCell = transientFloodTargetSet.has(index) && slot === null
          const isFloodCastCell = transientFloodCastSet.has(index)
          const isFreezeTargetCell = transientFreezeTargetSet.has(index) && slot === null
          const isFreezeCastCell = transientFreezeCastSet.has(index)
          const isFreezeBlockedCell = transientFreezeBlockedSet.has(index)
          const isWaterPenaltyCell = transientWaterPenaltySet.has(index)
          const isClashCell = transientClashSet.has(index)
          const isPreviewPlacementCell = previewPlacementCell === index
          const cellTitle = [
            ...activeIndicators.map((indicator) => indicator.tooltip),
            ...(isGroundDebuffedCell ? ['Sol: -1 sur toutes les stats pour ce combat.'] : []),
            ...(isFireTargetCell ? ['Feu: choisissez la carte ennemie a bruler.'] : []),
            ...(isFireCastCell ? ['Feu: brulure appliquee.'] : []),
            ...(isFloodTargetCell ? ['Eau: choisissez la case inondée (-2 sur la stat la plus haute).'] : []),
            ...(isFloodCastCell ? ['Eau: case inondée (-2 sur la stat la plus haute).'] : []),
            ...(isFreezeTargetCell ? ['Glace: choisissez la case gelée.'] : []),
            ...(isFreezeCastCell ? ['Glace: case gelée.'] : []),
            ...(isFreezeBlockedCell ? ['Glace: case bloquée pour ce tour.'] : []),
            ...(isWaterPenaltyCell ? ['Eau: -2 sur la plus haute stat.'] : []),
            ...(isClashCell ? ['Duel en cours.'] : []),
          ].join(' • ')
          const isFloodedCell = cellIndicators.some((indicator) => indicator.key === 'cell-flooded')
          const frozenCellIndicator = cellIndicators.find((indicator) => indicator.key === 'cell-frozen')
          const isFrozenCell = Boolean(frozenCellIndicator)
          const frozenTurnsCounter = frozenCellIndicator?.valueText ?? null
          const explicitFlipEvent = flipEventByCell.get(index)
          const resolvedFlipEvent: MoveFlipEvent | null =
            explicitFlipEvent ??
            (recentFlippedSet.has(index) && slot
              ? { cell: index, kind: 'flipped', axis: 'horizontal', phase: 'primary' }
              : null)
          const flipDirection = resolvedFlipEvent?.axis === 'vertical' ? 'vertical' : resolvedFlipEvent ? 'horizontal' : undefined
          const isClickable = interactive && (slot === null || targetableSet.has(index))
          const classes = [
            'fallback-cell',
            slot?.owner ?? 'empty',
            isFloodedCell ? 'fallback-cell--flooded' : '',
            isFrozenCell ? 'fallback-cell--frozen' : '',
            hasPlantePackBuff ? 'fallback-cell--plante-pack-active' : '',
            hasPlanteLinkRight ? 'fallback-cell--plante-link-right' : '',
            hasPlanteLinkDown ? 'fallback-cell--plante-link-down' : '',
            isPoisonedBoardCard ? 'fallback-cell--poisoned' : '',
            hasPersistentGroundDebuff ? 'fallback-cell--ground-active' : '',
            isGroundDebuffedCell ? 'fallback-cell--ground-debuffed' : '',
            isFireTargetCell ? 'fallback-cell--fire-target' : '',
            isFireCastCell ? 'fallback-cell--fire-cast' : '',
            isFloodTargetCell ? 'fallback-cell--flood-target' : '',
            isFloodCastCell ? 'fallback-cell--flood-cast' : '',
            isFreezeTargetCell ? 'fallback-cell--freeze-target' : '',
            isFreezeCastCell ? 'fallback-cell--freeze-cast' : '',
            isFreezeBlockedCell ? 'fallback-cell--freeze-blocked' : '',
            isWaterPenaltyCell ? 'fallback-cell--water-penalty' : '',
            isClashCell ? 'fallback-cell--clash' : '',
            isPreviewPlacementCell ? 'fallback-cell--ground-preview-placement' : '',
            focusedCell === index && (slot === null || targetableSet.has(index)) ? 'is-keyboard-target' : '',
            highlightedSet.has(index) ? 'highlighted is-highlighted' : '',
            tutorialGuidedSet.has(index) ? 'is-tutorial-guided' : '',
            recentPlacedSet.has(index) ? 'is-recent-placement' : '',
          ]
            .filter(Boolean)
            .join(' ')
          const cellKey = explicitFlipEvent && flipEvents.length > 0 ? `${index}-flip-${flipEventVersion}` : `${index}`

            return (
              <button
                key={cellKey}
                type="button"
                role="gridcell"
                className={classes}
                onClick={() => onCellClick(index)}
                onPointerEnter={(event) => {
                  if (!slot) {
                    clearHoveredCell()
                    return
                  }
                  setHoveredCellIndex(index)
                  applyFallbackHoverAnchorFromButton(event.currentTarget, index)
                }}
                onMouseOver={(event) => {
                  if (!slot) {
                    clearHoveredCell()
                    return
                  }
                  setHoveredCellIndex(index)
                  applyFallbackHoverAnchorFromButton(event.currentTarget, index)
                }}
                onPointerLeave={() => {
                  if (hoveredCellIndex === index) {
                    clearHoveredCell()
                  }
                }}
                onMouseOut={() => {
                  if (hoveredCellIndex === index) {
                    clearHoveredCell()
                  }
                }}
                onFocus={(event) => {
                  if (!slot) {
                    clearHoveredCell()
                    return
                  }
                  setHoveredCellIndex(index)
                  applyFallbackHoverAnchorFromButton(event.currentTarget, index)
                }}
                onBlur={() => {
                  if (hoveredCellIndex === index) {
                    clearHoveredCell()
                  }
                }}
                disabled={!isClickable}
                data-testid={`board-cell-${index}`}
                data-cell-index={index}
                aria-label={`Cell ${index}`}
                title={cellTitle || undefined}
                data-player={slot?.owner === 'player' ? 'blue' : slot?.owner === 'cpu' ? 'red' : undefined}
                data-state={resolvedFlipEvent?.kind}
                data-flip-direction={flipDirection}
              >
              {card ? (
                <>
                  <span
                    className={`fallback-cell__stat fallback-cell__stat--top effect-stat--${displayStats?.top.trend ?? 'neutral'}`}
                    data-testid={`board-cell-${index}-stat-top`}
                  >
                    {displayStats?.top.value ?? card.top}
                  </span>
                  <span
                    className={`fallback-cell__stat fallback-cell__stat--right effect-stat--${displayStats?.right.trend ?? 'neutral'}`}
                    data-testid={`board-cell-${index}-stat-right`}
                  >
                    {displayStats?.right.value ?? card.right}
                  </span>
                  <span
                    className={`fallback-cell__stat fallback-cell__stat--bottom effect-stat--${displayStats?.bottom.trend ?? 'neutral'}`}
                    data-testid={`board-cell-${index}-stat-bottom`}
                  >
                    {displayStats?.bottom.value ?? card.bottom}
                  </span>
                  <span
                    className={`fallback-cell__stat fallback-cell__stat--left effect-stat--${displayStats?.left.trend ?? 'neutral'}`}
                    data-testid={`board-cell-${index}-stat-left`}
                  >
                    {displayStats?.left.value ?? card.left}
                  </span>
                  {artSrc ? (
                    <img
                      className="fallback-cell__art"
                      src={artSrc}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      onError={handleFallbackCardArtError}
                      data-card-name={card.name}
                      data-candidate-index="0"
                      data-testid={`board-cell-${index}-art`}
                    />
                  ) : null}
                  <span className="fallback-cell__center" hidden={Boolean(artSrc)}>
                    {getCardSigil(card.name)}
                  </span>
                </>
              ) : null}
              {isPoisonedBoardCard && poisonLogo ? (
                <img
                  className="fallback-cell__status-badge--poison"
                  src={poisonLogo.imageSrc}
                  alt={poisonLogo.name}
                  width={28}
                  height={28}
                  loading="lazy"
                  decoding="async"
                  data-testid={`board-cell-${index}-poison-badge`}
                />
              ) : null}
              {tutorialGuidedSet.has(index) && slot === null ? (
                <span className="fallback-cell__tutorial-guided-badge" aria-hidden="true" data-testid={`board-cell-${index}-tutorial-guided`}>
                  ICI
                </span>
              ) : null}
              {isGroundDebuffedCell ? (
                <span className="fallback-cell__ground-pop" aria-hidden="true" data-testid={`board-cell-${index}-ground-pop`}>
                  <span className="fallback-cell__ground-pop-value">-1</span>
                  <span className="fallback-cell__ground-pop-label">ALL</span>
                </span>
              ) : null}
              {isFireCastCell ? (
                <span className="fallback-cell__fire-cast-badge" aria-hidden="true" data-testid={`board-cell-${index}-fire-cast-badge`}>
                  {fireLogo ? (
                    <img
                      className="fallback-cell__fire-effect-logo fallback-cell__fire-effect-logo--cast"
                      src={fireLogo.imageSrc}
                      alt=""
                      width={18}
                      height={18}
                      loading="lazy"
                      decoding="async"
                      data-testid={`board-cell-${index}-fire-cast-logo`}
                    />
                  ) : (
                    <span className="fallback-cell__fire-effect-label">FEU</span>
                  )}
                  <span className="fallback-cell__fire-effect-label">BRULURE</span>
                </span>
              ) : null}
              {isFireTargetCell ? (
                <span
                  className="fallback-cell__fire-target-badge"
                  aria-hidden="true"
                  data-testid={`board-cell-${index}-fire-target-badge`}
                >
                  {fireLogo ? (
                    <img
                      className="fallback-cell__fire-effect-logo fallback-cell__fire-effect-logo--target"
                      src={fireLogo.imageSrc}
                      alt=""
                      width={16}
                      height={16}
                      loading="lazy"
                      decoding="async"
                      data-testid={`board-cell-${index}-fire-target-logo`}
                    />
                  ) : (
                    <span className="fallback-cell__fire-effect-label">FEU</span>
                  )}
                  <span className="fallback-cell__fire-effect-label">CIBLE BRULURE</span>
                </span>
              ) : null}
              {isFloodCastCell ? (
                <span className="fallback-cell__flood-cast-badge" aria-hidden="true" data-testid={`board-cell-${index}-flood-cast-badge`}>
                  {waterLogo ? (
                    <img
                      className="fallback-cell__water-effect-logo fallback-cell__water-effect-logo--cast"
                      src={waterLogo.imageSrc}
                      alt=""
                      width={18}
                      height={18}
                      loading="lazy"
                      decoding="async"
                      data-testid={`board-cell-${index}-flood-cast-logo`}
                    />
                  ) : (
                    <span className="fallback-cell__water-effect-label">EAU</span>
                  )}
                  <span className="fallback-cell__water-effect-label">INONDE -2 MAX</span>
                </span>
              ) : null}
              {isFloodTargetCell ? (
                <span
                  className="fallback-cell__flood-target-badge"
                  aria-hidden="true"
                  data-testid={`board-cell-${index}-flood-target-badge`}
                >
                  {waterLogo ? (
                    <img
                      className="fallback-cell__water-effect-logo fallback-cell__water-effect-logo--target"
                      src={waterLogo.imageSrc}
                      alt=""
                      width={16}
                      height={16}
                      loading="lazy"
                      decoding="async"
                      data-testid={`board-cell-${index}-flood-target-logo`}
                    />
                  ) : (
                    <span className="fallback-cell__water-effect-label">EAU</span>
                  )}
                  <span className="fallback-cell__water-effect-label">CIBLE -2 MAX</span>
                </span>
              ) : null}
              {isFreezeCastCell ? (
                <span className="fallback-cell__freeze-cast-badge" aria-hidden="true" data-testid={`board-cell-${index}-freeze-cast-badge`}>
                  {iceLogo ? (
                    <img
                      className="fallback-cell__ice-effect-logo fallback-cell__ice-effect-logo--cast"
                      src={iceLogo.imageSrc}
                      alt=""
                      width={18}
                      height={18}
                      loading="lazy"
                      decoding="async"
                      data-testid={`board-cell-${index}-freeze-cast-logo`}
                    />
                  ) : (
                    <span className="fallback-cell__ice-effect-label">GLACE</span>
                  )}
                </span>
              ) : null}
              {isFreezeTargetCell ? (
                <span
                  className="fallback-cell__freeze-target-badge"
                  aria-hidden="true"
                  data-testid={`board-cell-${index}-freeze-target-badge`}
                >
                  {iceLogo ? (
                    <img
                      className="fallback-cell__ice-effect-logo fallback-cell__ice-effect-logo--target"
                      src={iceLogo.imageSrc}
                      alt=""
                      width={16}
                      height={16}
                      loading="lazy"
                      decoding="async"
                      data-testid={`board-cell-${index}-freeze-target-logo`}
                    />
                  ) : (
                    <span className="fallback-cell__ice-effect-label">GLACE</span>
                  )}
                </span>
              ) : null}
              {isFreezeBlockedCell ? (
                <span
                  className="fallback-cell__freeze-blocked-badge"
                  aria-hidden="true"
                  data-testid={`board-cell-${index}-freeze-blocked-badge`}
                >
                  {iceLogo ? (
                    <img
                      className="fallback-cell__ice-effect-logo fallback-cell__ice-effect-logo--blocked"
                      src={iceLogo.imageSrc}
                      alt=""
                      width={14}
                      height={14}
                      loading="lazy"
                      decoding="async"
                      data-testid={`board-cell-${index}-freeze-blocked-logo`}
                    />
                  ) : null}
                  <span className="fallback-cell__ice-effect-label">BLOQUEE</span>
                </span>
              ) : null}
              {isFrozenCell && frozenTurnsCounter ? (
                <span className="fallback-cell__frozen-counter" aria-hidden="true" data-testid={`board-cell-${index}-frozen-counter`}>
                  {frozenTurnsCounter}
                </span>
              ) : null}
              {isWaterPenaltyCell ? (
                <span
                  className="fallback-cell__water-penalty-badge"
                  aria-hidden="true"
                  data-testid={`board-cell-${index}-water-penalty-badge`}
                >
                  {waterLogo ? (
                    <img
                      className="fallback-cell__water-effect-logo fallback-cell__water-effect-logo--penalty"
                      src={waterLogo.imageSrc}
                      alt=""
                      width={16}
                      height={16}
                      loading="lazy"
                      decoding="async"
                      data-testid={`board-cell-${index}-water-penalty-logo`}
                    />
                  ) : (
                    <span className="fallback-cell__water-effect-label">EAU</span>
                  )}
                  <span className="fallback-cell__water-effect-value">-2 MAX</span>
                </span>
              ) : null}
              {isClashCell ? (
                <span className="fallback-cell__clash-badge" aria-hidden="true" data-testid={`board-cell-${index}-clash-badge`}>
                  💥 CHOC
                </span>
              ) : null}
              {secondaryIndicators.length > 0 || isGroundDebuffedCell ? (
                <span className="fallback-cell__effect-chips" aria-hidden="true">
                  {isGroundDebuffedCell ? (
                    <span className="effect-chip effect-chip--ground" data-testid={`board-cell-${index}-ground-badge`}>
                      <img
                        className="fallback-cell__ground-effect-logo"
                        src={GROUND_BOARD_EFFECT_TEXTURE_SRC}
                        alt=""
                        width={14}
                        height={14}
                        loading="lazy"
                        decoding="async"
                        data-testid={`board-cell-${index}-ground-badge-logo`}
                      />
                      <span>-1 ALL</span>
                    </span>
                  ) : null}
                  {secondaryIndicators
                    .slice(0, 2)
                    .map((indicator) => (
                    <span
                      key={indicator.key}
                      className={`effect-chip effect-chip--${indicator.tone}`}
                    >
                      {indicator.icon}
                    </span>
                    ))}
                </span>
              ) : null}
              </button>
            )
          })}
        </div>
        {hoverPanel}
      </div>
    )
  }

  return (
    <div className="pixi-board-shell">
      <div
        ref={hostRef}
        className={resolvePixiBoardClassName(neutralBoardArtEnabled)}
        onPointerMove={handlePixiPointerMove}
        onPointerLeave={clearHoveredCell}
      />
      {hoverPanel}
    </div>
  )
}
