import { useEffect, useMemo, useRef, useState } from 'react'
import { getCard } from '../../domain/cards/cardPool'
import type { Actor, CardId } from '../../domain/types'

export interface BoardSlot {
  owner: Actor
  cardId: CardId
}

interface PixiBoardProps {
  board: Array<BoardSlot | null>
  highlightedCells: number[]
  interactive: boolean
  onCellClick(cell: number): void
  turnActor: Actor
  status: 'active' | 'finished'
}

const boardSize = 468
const boardInset = 30
const gap = 10
const cellSize = (boardSize - boardInset * 2 - gap * 2) / 3

function cloneBoardSnapshot(board: Array<BoardSlot | null>): Array<BoardSlot | null> {
  return board.map((slot) => (slot ? { ...slot } : null))
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

export function PixiBoard({ board, highlightedCells, interactive, onCellClick, turnActor, status }: PixiBoardProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const previousBoardRef = useRef<Array<BoardSlot | null> | null>(null)
  const appRef = useRef<unknown | null>(null)
  const tickerCleanupRef = useRef<(() => void) | null>(null)
  const onCellClickRef = useRef(onCellClick)
  const [appReadyVersion, setAppReadyVersion] = useState(0)
  const shouldUseFallback = import.meta.env.MODE === 'test'

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const highlightedSet = useMemo(() => new Set(highlightedCells), [highlightedCells])
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

      const app = new Application()
      await app.init({
        width: boardSize,
        height: boardSize,
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

      const { Container, Graphics, Text } = await import('pixi.js')
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
      frameOuter.fill({ color: 0x2f2110, alpha: 0.96 })
      frameOuter.stroke({ width: 2, color: 0xf4d08f, alpha: 0.86 })
      app.stage.addChild(frameOuter)

      const frameInner = new Graphics()
      frameInner.roundRect(14, 14, boardSize - 28, boardSize - 28, 22)
      frameInner.fill({ color: 0x162834, alpha: 0.95 })
      frameInner.stroke({ width: 2, color: 0xb78a46, alpha: 0.8 })
      app.stage.addChild(frameInner)

      const turnAura = new Graphics()
      const auraColor = status === 'finished' ? 0xe3be78 : turnActor === 'player' ? 0x3f8ed8 : 0xc5546c
      turnAura.roundRect(5, 5, boardSize - 10, boardSize - 10, 25)
      turnAura.stroke({ width: 4, color: auraColor, alpha: status === 'active' ? 0.68 : 0.28 })
      app.stage.addChild(turnAura)

      const field = new Graphics()
      field.roundRect(boardInset - 14, boardInset - 14, boardSize - (boardInset - 14) * 2, boardSize - (boardInset - 14) * 2, 18)
      field.fill({ color: 0x0f1f28, alpha: 0.98 })
      field.stroke({ width: 2, color: 0xd8b572, alpha: 0.45 })
      app.stage.addChild(field)

      type PixiGraphics = InstanceType<typeof Graphics>
      type PixiContainer = InstanceType<typeof Container>
      const pulseOverlays: PixiGraphics[] = []
      const placementFlashes: Array<{ sprite: PixiGraphics; elapsedMs: number }> = []
      const placementBursts: Array<{ container: PixiContainer; elapsedMs: number }> = []

      board.forEach((slot, index) => {
        const row = Math.floor(index / 3)
        const col = index % 3
        const x = boardInset + col * (cellSize + gap)
        const y = boardInset + row * (cellSize + gap)

        const cell = new Graphics()
        const ownerColor = slot?.owner === 'player' ? 0x1a4767 : slot?.owner === 'cpu' ? 0x693142 : 0x233641
        const fillColor = highlightedSet.has(index) && slot === null ? 0x27553c : ownerColor
        cell.roundRect(x, y, cellSize, cellSize, 12)
        cell.fill({ color: fillColor, alpha: 0.98 })
        cell.stroke({ width: 2, color: 0xf4d79c, alpha: 0.86 })

        const isClickable = interactive && slot === null
        cell.eventMode = isClickable ? 'static' : 'none'
        if (isClickable) {
          cell.cursor = 'pointer'
          cell.on('pointertap', () => onCellClickRef.current(index))
        }

        app.stage.addChild(cell)

        if (highlightedSet.has(index) && slot === null) {
          const overlay = new Graphics()
          overlay.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 10)
          overlay.fill({ color: 0x46c47b, alpha: prefersReducedMotion ? 0.24 : 0.2 })
          overlay.stroke({ width: 1, color: 0x88ffd1, alpha: 0.76 })
          app.stage.addChild(overlay)
          pulseOverlays.push(overlay)
        }

        if (recentPlacedSet.has(index)) {
          const flash = new Graphics()
          flash.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, 11)
          flash.fill({ color: 0xffe4ad, alpha: prefersReducedMotion ? 0.26 : 0.6 })
          app.stage.addChild(flash)
          placementFlashes.push({ sprite: flash, elapsedMs: 0 })
        }

        if (slot) {
          const card = getCard(slot.cardId)
          const sigil = getCardSigil(card.name)
          const ownerPlate = slot.owner === 'player' ? 0x2a5479 : 0x7e3a4f
          const ownerEdge = slot.owner === 'player' ? 0x91c6ff : 0xffb0c1

          const cardContainer = new Container()
          cardContainer.pivot.set(cellSize / 2, cellSize / 2)
          cardContainer.position.set(x + cellSize / 2, y + cellSize / 2)

          const plate = new Graphics()
          plate.roundRect(12, 12, cellSize - 24, cellSize - 24, 14)
          plate.fill({ color: ownerPlate, alpha: 0.95 })
          plate.stroke({ width: 2, color: ownerEdge, alpha: 0.8 })
          cardContainer.addChild(plate)

          const crest = new Graphics()
          crest.roundRect(cellSize * 0.26, cellSize * 0.26, cellSize * 0.48, cellSize * 0.48, 12)
          crest.fill({ color: 0x112330, alpha: 0.56 })
          crest.stroke({ width: 1, color: 0xf7d79d, alpha: 0.56 })
          cardContainer.addChild(crest)

          const sigilLabel = new Text({
            text: sigil,
            style: {
              fill: 0xfff1d2,
              fontSize: 26,
              fontWeight: '700',
              fontFamily: 'Cinzel, serif',
              letterSpacing: 1.2,
            },
          })
          sigilLabel.anchor.set(0.5)
          sigilLabel.x = cellSize / 2
          sigilLabel.y = cellSize / 2
          cardContainer.addChild(sigilLabel)

          const statStyle = {
            fill: 0xffefc7,
            fontSize: 18,
            fontWeight: '700',
            fontFamily: 'Rajdhani, sans-serif',
            letterSpacing: 0.6,
          } as const

          const statChips = [
            { value: card.top, x: cellSize / 2, y: 18 },
            { value: card.right, x: cellSize - 18, y: cellSize / 2 },
            { value: card.bottom, x: cellSize / 2, y: cellSize - 18 },
            { value: card.left, x: 18, y: cellSize / 2 },
          ]

          statChips.forEach((chipSpec) => {
            const chip = new Graphics()
            chip.circle(0, 0, 12.5)
            chip.fill({ color: 0x08151f, alpha: 0.9 })
            chip.stroke({ width: 1, color: 0xf9dbab, alpha: 0.84 })
            chip.x = chipSpec.x
            chip.y = chipSpec.y
            cardContainer.addChild(chip)

            const chipText = new Text({ text: `${chipSpec.value}`, style: statStyle })
            chipText.anchor.set(0.5)
            chipText.x = chipSpec.x
            chipText.y = chipSpec.y
            cardContainer.addChild(chipText)
          })

          if (recentPlacedSet.has(index) && !prefersReducedMotion) {
            cardContainer.scale.set(0.72)
            cardContainer.alpha = 0.36
            placementBursts.push({ container: cardContainer, elapsedMs: 0 })
          }

          app.stage.addChild(cardContainer)
        } else {
          const label = new Text({
            text: `${index + 1}`,
            style: {
              fill: 0xfff6dd,
              fontSize: 16,
              fontWeight: '400',
              fontFamily: 'Rajdhani, sans-serif',
              letterSpacing: 0.2,
            },
          })

          label.anchor.set(0.5)
          label.x = x + cellSize / 2
          label.y = y + cellSize / 2
          app.stage.addChild(label)
        }
      })

      let animate: (() => void) | null = null
      if (!prefersReducedMotion) {
        let elapsedMs = 0
        animate = () => {
          elapsedMs += app.ticker.deltaMS
          const auraPulse = status === 'active' ? 0.5 + (Math.sin((elapsedMs / 1600) * Math.PI * 2) + 1) * 0.12 : 0.24
          turnAura.alpha = auraPulse

          pulseOverlays.forEach((overlay, index) => {
            const wave = (Math.sin((elapsedMs / 1200) * Math.PI * 2 + index * 0.55) + 1) * 0.5
            overlay.alpha = 0.11 + wave * 0.24
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
    }

    void render()

    return () => {
      cancelled = true
    }
  }, [appReadyVersion, board, highlightedSet, interactive, prefersReducedMotion, recentPlacedSet, shouldUseFallback, status, turnActor])

  if (shouldUseFallback) {
    const boardClasses = [
      'fallback-board',
      turnActor === 'player' ? 'is-turn-player' : 'is-turn-cpu',
      status === 'finished' ? 'is-finished' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={boardClasses} role="grid" aria-label="Match board">
        {board.map((slot, index) => {
          const card = slot ? getCard(slot.cardId) : null
          const isClickable = interactive && slot === null
          const classes = [
            'fallback-cell',
            slot?.owner ?? 'empty',
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
            >
              {card ? (
                <>
                  <span className="fallback-cell__stat fallback-cell__stat--top" data-testid={`board-cell-${index}-stat-top`}>
                    {card.top}
                  </span>
                  <span className="fallback-cell__stat fallback-cell__stat--right" data-testid={`board-cell-${index}-stat-right`}>
                    {card.right}
                  </span>
                  <span
                    className="fallback-cell__stat fallback-cell__stat--bottom"
                    data-testid={`board-cell-${index}-stat-bottom`}
                  >
                    {card.bottom}
                  </span>
                  <span className="fallback-cell__stat fallback-cell__stat--left" data-testid={`board-cell-${index}-stat-left`}>
                    {card.left}
                  </span>
                  <span className="fallback-cell__center">{getCardSigil(card.name)}</span>
                </>
              ) : (
                index + 1
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return <div ref={hostRef} className="pixi-board" />
}
