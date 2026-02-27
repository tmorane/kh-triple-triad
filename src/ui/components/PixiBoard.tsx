import { useEffect, useMemo, useRef, useState, type CSSProperties, type SyntheticEvent } from 'react'
import type { Texture } from 'pixi.js'
import { getCard } from '../../domain/cards/cardPool'
import type { Actor, CardId } from '../../domain/types'
import type { MatchEffectsViewModel } from '../../domain/match/effectsViewModel'
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
  transientGroundCells?: number[]
  transientFloodTargetCells?: number[]
  transientFloodCastCells?: number[]
  transientWaterPenaltyCells?: number[]
  transientClashCells?: number[]
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
const boardInset = 30
const gap = 10

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

export function PixiBoard({
  board,
  highlightedCells,
  transientGroundCells = [],
  transientFloodTargetCells = [],
  transientFloodCastCells = [],
  transientWaterPenaltyCells = [],
  transientClashCells = [],
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
  const [appReadyVersion, setAppReadyVersion] = useState(0)
  const shouldUseFallback = import.meta.env.MODE === 'test'

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])
  const boardDimension = useMemo(() => getBoardDimension(board.length), [board.length])
  const cellSize = useMemo(
    () => (boardSize - boardInset * 2 - gap * Math.max(0, boardDimension - 1)) / boardDimension,
    [boardDimension],
  )

  const highlightedSet = useMemo(() => new Set(highlightedCells), [highlightedCells])
  const transientGroundSet = useMemo(() => new Set(transientGroundCells), [transientGroundCells])
  const transientFloodTargetSet = useMemo(() => new Set(transientFloodTargetCells), [transientFloodTargetCells])
  const transientFloodCastSet = useMemo(() => new Set(transientFloodCastCells), [transientFloodCastCells])
  const transientWaterPenaltySet = useMemo(() => new Set(transientWaterPenaltyCells), [transientWaterPenaltyCells])
  const transientClashSet = useMemo(() => new Set(transientClashCells), [transientClashCells])
  const arenaPalette = useMemo(() => ARENA_PALETTES[arenaVariant], [arenaVariant])
  const poisonLogo = useMemo(() => getElementLogoMeta('poison'), [])
  const waterLogo = useMemo(() => getElementLogoMeta('eau'), [])
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

  useEffect(() => {
    previousBoardRef.current = cloneBoardSnapshot(board)
  }, [board])

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
      const waterTexture = waterLogo
        ? await Assets.load<Texture>(waterLogo.imageSrc).catch(() => null)
        : null
      if (cancelled) {
        return
      }

      if (tickerCleanupRef.current) {
        tickerCleanupRef.current()
        tickerCleanupRef.current = null
      }

      const staleChildren = app.stage.removeChildren()
      staleChildren.forEach((child) => child.destroy())

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

      const turnAura = new Graphics()
      const auraColor =
        status === 'finished'
          ? arenaPalette.turnAuraFinished
          : turnActor === 'player'
            ? arenaPalette.turnAuraPlayer
            : arenaPalette.turnAuraCpu
      turnAura.roundRect(5, 5, boardSize - 10, boardSize - 10, 25)
      turnAura.stroke({ width: 3, color: auraColor, alpha: status === 'active' ? 0.22 : 0.12 })
      app.stage.addChild(turnAura)

      const fieldX = boardInset - 14
      const fieldY = boardInset - 14
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

      type PixiGraphics = InstanceType<typeof Graphics>
      type PixiContainer = InstanceType<typeof Container>
      const pulseOverlays: PixiGraphics[] = []
      const placementFlashes: Array<{ sprite: PixiGraphics; elapsedMs: number }> = []
      const placementBursts: Array<{ container: PixiContainer; elapsedMs: number }> = []
      const groundDebuffCellsToRender: Array<{ x: number; y: number; hasCard: boolean }> = []
      const floodTargetCellsToRender: Array<{ x: number; y: number }> = []
      const floodCastCellsToRender: Array<{ x: number; y: number }> = []
      const waterPenaltyCellsToRender: Array<{ x: number; y: number }> = []
      const clashCellsToRender: Array<{ x: number; y: number }> = []
      const boardSignature = getBoardSignature(board)
      const shouldAnimateRecentPlacements = lastAnimatedBoardSignatureRef.current !== boardSignature

      board.forEach((slot, index) => {
        const row = Math.floor(index / boardDimension)
        const col = index % boardDimension
        const x = boardInset + col * (cellSize + gap)
        const y = boardInset + row * (cellSize + gap)

        const cellEffectIndicators = effectsView?.cellIndicators[index] ?? []
        const boardEffectIndicators = effectsView?.boardCardIndicators[index] ?? []
        const displayStats = effectsView?.displayStatsByCell[index]
        const isFloodedCell = cellEffectIndicators.some((indicator) => indicator.key === 'cell-flooded')
        const isFrozenCell = cellEffectIndicators.some((indicator) => indicator.key === 'cell-frozen')
        const isPoisonedBoardCard = boardEffectIndicators.some((indicator) => indicator.key === 'card-poison-first-combat')
        const isGroundDebuffedCell = transientGroundSet.has(index)
        const isFloodTargetCell = transientFloodTargetSet.has(index) && slot === null
        const isFloodCastCell = transientFloodCastSet.has(index)
        const isWaterPenaltyCell = transientWaterPenaltySet.has(index)
        const isClashCell = transientClashSet.has(index)
        const isHighlightedEmpty = highlightedSet.has(index) && slot === null
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
        cell.roundRect(x, y, cellSize, cellSize, 12)
        cell.fill({ color: fillColor, alpha: 0.8 })
        cell.stroke({ width: 2, color: edgeColor, alpha: 0.42 })

        const isClickable = interactive && slot === null
        const isKeyboardTarget = focusedCell === index && slot === null
        cell.eventMode = isClickable ? 'static' : 'none'
        if (isClickable) {
          cell.cursor = 'pointer'
          cell.on('pointertap', () => onCellClickRef.current(index))
        }

        app.stage.addChild(cell)

        if (isGroundDebuffedCell) {
          groundDebuffCellsToRender.push({ x, y, hasCard: slot !== null })
        }
        if (isFloodTargetCell) {
          floodTargetCellsToRender.push({ x, y })
        }
        if (isClashCell) {
          clashCellsToRender.push({ x, y })
        }
        if (isFloodCastCell) {
          floodCastCellsToRender.push({ x, y })
        }
        if (isWaterPenaltyCell) {
          waterPenaltyCellsToRender.push({ x, y })
        }

        if (slot === null) {
          const cellInner = new Graphics()
          cellInner.roundRect(x + 6, y + 6, cellSize - 12, cellSize - 12, 9)
          cellInner.fill({ color: arenaPalette.emptyCellInnerFill, alpha: arenaPalette.emptyCellInnerAlpha })
          app.stage.addChild(cellInner)

          if (isFloodedCell || isFrozenCell) {
            const hazardOverlay = new Graphics()
            hazardOverlay.roundRect(x + 4, y + 4, cellSize - 8, cellSize - 8, 10)
            hazardOverlay.fill({
              color: isFloodedCell ? 0x7fd9ff : 0xc3ecff,
              alpha: isFloodedCell ? 0.09 : 0.07,
            })
            hazardOverlay.stroke({
              width: 2,
              color: isFloodedCell ? 0x4ac9ff : 0x8ce6ff,
              alpha: 0.46,
            })
            app.stage.addChild(hazardOverlay)

            if (isFrozenCell) {
              const hazardText = new Text({
                text: '❄️',
                style: {
                  fill: 0xe8f8ff,
                  fontSize: 18,
                  fontFamily: 'Rajdhani, sans-serif',
                  fontWeight: '700',
                },
              })
              hazardText.anchor.set(0.5)
              hazardText.x = x + cellSize / 2
              hazardText.y = y + cellSize / 2
              app.stage.addChild(hazardText)
            } else if (waterTexture) {
              const hazardWaterBadge = new Graphics()
              hazardWaterBadge.circle(x + cellSize / 2, y + cellSize / 2, Math.max(13, cellSize * 0.16))
              hazardWaterBadge.fill({ color: 0x2b7ead, alpha: 0.7 })
              hazardWaterBadge.stroke({ width: 1.5, color: 0xcaf2ff, alpha: 0.7 })
              app.stage.addChild(hazardWaterBadge)

              const hazardWaterLogo = new Sprite(waterTexture)
              hazardWaterLogo.anchor.set(0.5)
              hazardWaterLogo.width = Math.max(16, cellSize * 0.18)
              hazardWaterLogo.height = Math.max(16, cellSize * 0.18)
              hazardWaterLogo.x = x + cellSize / 2
              hazardWaterLogo.y = y + cellSize / 2
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
          keyboardTargetGlow.fill({ color: arenaPalette.keyboardTargetFill, alpha: 0.08 })
          keyboardTargetGlow.stroke({ width: 2, color: arenaPalette.keyboardTargetEdge, alpha: 0.45 })
          app.stage.addChild(keyboardTargetGlow)
        }

        if (isHighlightedEmpty) {
          const overlay = new Graphics()
          overlay.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 10)
          overlay.fill({
            color: prefersReducedMotion ? arenaPalette.highlightOverlayFillReduced : arenaPalette.highlightOverlayFill,
            alpha: prefersReducedMotion ? 0.08 : 0.06,
          })
          overlay.stroke({ width: 2, color: arenaPalette.highlightOverlayStroke, alpha: 0.42 })
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
          const artInset = 16
          const artWidth = cellSize - artInset * 2
          const artHeight = cellSize - artInset * 2

          const cardContainer = new Container()
          cardContainer.pivot.set(cellSize / 2, cellSize / 2)
          cardContainer.position.set(x + cellSize / 2, y + cellSize / 2)

          const plate = new Graphics()
          plate.roundRect(12, 12, cellSize - 24, cellSize - 24, 14)
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
          fallbackCrest.roundRect(cellSize * 0.26, cellSize * 0.26, cellSize * 0.48, cellSize * 0.48, 12)
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

          void loadCardArtTexture(card.name, (url) => Assets.load<Texture>(url))
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
              const coverScale = Math.max(artWidth / sourceWidth, artHeight / sourceHeight)
              artSprite.scale.set(coverScale)
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

          const renderedBoardIndicators = boardEffectIndicators.filter((indicator) => indicator.key !== 'card-poison-first-combat')
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
            effectText.x = cellSize - 18 - (indicatorIndex + rightSideIndicatorOffset) * 15
            effectText.y = 36
            cardContainer.addChild(effectText)
          })

          if (shouldAnimateRecentPlacements && recentPlacedSet.has(index) && !prefersReducedMotion) {
            cardContainer.scale.set(0.72)
            cardContainer.alpha = 0.36
            placementBursts.push({ container: cardContainer, elapsedMs: 0 })
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
          turnAura.alpha = auraPulse

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
        }
        app.ticker.add(animate)
      }
      tickerCleanupRef.current = () => {
        if (animate) {
          app.ticker.remove(animate)
        }
      }
      lastAnimatedBoardSignatureRef.current = boardSignature
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
    cellSize,
    effectsView,
    focusedCell,
    highlightedSet,
    interactive,
    poisonLogo,
    waterLogo,
    prefersReducedMotion,
    recentPlacedSet,
    shouldUseFallback,
    status,
    transientClashSet,
    transientFloodTargetSet,
    transientFloodCastSet,
    transientGroundSet,
    transientWaterPenaltySet,
    turnActor,
  ])

  if (shouldUseFallback) {
    const boardClasses = [
      'fallback-board',
      `is-arena-${arenaVariant}`,
      turnActor === 'player' ? 'is-turn-player' : 'is-turn-cpu',
      status === 'finished' ? 'is-finished' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div
        className={boardClasses}
        role="grid"
        aria-label="Match board"
        style={{ '--fallback-grid-cols': `${boardDimension}` } as CSSProperties}
      >
        {board.map((slot, index) => {
          const card = slot ? getCard(slot.cardId) : null
          const artCandidates = card ? getCardArtCandidates(card.name) : []
          const artSrc = artCandidates[0] ?? null
          const displayStats = effectsView?.displayStatsByCell[index]
          const cellIndicators = effectsView?.cellIndicators[index] ?? []
          const boardIndicators = effectsView?.boardCardIndicators[index] ?? []
          const isPoisonedBoardCard = boardIndicators.some((indicator) => indicator.key === 'card-poison-first-combat')
          const activeIndicators = slot ? boardIndicators : cellIndicators
          const secondaryIndicators = activeIndicators.filter((indicator) => indicator.key !== 'card-poison-first-combat')
          const isGroundDebuffedCell = transientGroundSet.has(index)
          const isFloodTargetCell = transientFloodTargetSet.has(index) && slot === null
          const isFloodCastCell = transientFloodCastSet.has(index)
          const isWaterPenaltyCell = transientWaterPenaltySet.has(index)
          const isClashCell = transientClashSet.has(index)
          const isPreviewPlacementCell = previewPlacementCell === index
          const cellTitle = [
            ...activeIndicators.map((indicator) => indicator.tooltip),
            ...(isGroundDebuffedCell ? ['Sol: -1 sur toutes les stats pour ce combat.'] : []),
            ...(isFloodTargetCell ? ['Eau: choisissez la case inondée (-2 sur la stat la plus haute).'] : []),
            ...(isFloodCastCell ? ['Eau: case inondée (-2 sur la stat la plus haute).'] : []),
            ...(isWaterPenaltyCell ? ['Eau: -2 sur la plus haute stat.'] : []),
            ...(isClashCell ? ['Duel en cours.'] : []),
          ].join(' • ')
          const isFloodedCell = cellIndicators.some((indicator) => indicator.key === 'cell-flooded')
          const isFrozenCell = cellIndicators.some((indicator) => indicator.key === 'cell-frozen')
          const isClickable = interactive && slot === null
          const classes = [
            'fallback-cell',
            slot?.owner ?? 'empty',
            isFloodedCell ? 'fallback-cell--flooded' : '',
            isFrozenCell ? 'fallback-cell--frozen' : '',
            isPoisonedBoardCard ? 'fallback-cell--poisoned' : '',
            isGroundDebuffedCell ? 'fallback-cell--ground-debuffed' : '',
            isFloodTargetCell ? 'fallback-cell--flood-target' : '',
            isFloodCastCell ? 'fallback-cell--flood-cast' : '',
            isWaterPenaltyCell ? 'fallback-cell--water-penalty' : '',
            isClashCell ? 'fallback-cell--clash' : '',
            isPreviewPlacementCell ? 'fallback-cell--ground-preview-placement' : '',
            focusedCell === index && slot === null ? 'is-keyboard-target' : '',
            highlightedSet.has(index) ? 'highlighted is-highlighted' : '',
            recentPlacedSet.has(index) ? 'is-recent-placement' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              className={classes}
              onClick={() => onCellClick(index)}
              disabled={!isClickable}
              data-testid={`board-cell-${index}`}
              aria-label={`Cell ${index}`}
              title={cellTitle || undefined}
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
              {isGroundDebuffedCell ? (
                <span className="fallback-cell__ground-pop" aria-hidden="true" data-testid={`board-cell-${index}-ground-pop`}>
                  <span className="fallback-cell__ground-pop-value">-1</span>
                  <span className="fallback-cell__ground-pop-label">ALL</span>
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
                      🪨 -1 ALL
                    </span>
                  ) : null}
                  {secondaryIndicators
                    .slice(0, 2)
                    .map((indicator) => (
                    <span key={indicator.key} className={`effect-chip effect-chip--${indicator.tone}`}>
                      {indicator.icon}
                    </span>
                    ))}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    )
  }

  return <div ref={hostRef} className="pixi-board" />
}
