import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { getCard } from '../../domain/cards/cardPool'
import type { OpenedPackBatchResult, OpenedPackResult, ShopPackId } from '../../domain/progression/shop'
import { getTotalCopies, hasShinyCopy } from '../../domain/progression/shiny'
import { playNewCardSound } from '../audio/newCardSound'
import { TriadCard } from '../components/TriadCard'

const packOrder: ShopPackId[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const revealStepDelaysMs = [0, 666, 1333] as const
const revealTotalDurationMs = 2000
const PACKS_MAX_OPEN_QUANTITY = 20
type OpenedRevealResult = OpenedPackResult | OpenedPackBatchResult

interface PackVisual {
  artSrc: string
}

const packVisuals: Record<ShopPackId, PackVisual> = {
  common: {
    artSrc: '/packs/common-pack.svg',
  },
  uncommon: {
    artSrc: '/packs/uncommon-pack.svg',
  },
  rare: {
    artSrc: '/packs/rare-pack.svg',
  },
  epic: {
    artSrc: '/packs/epic-pack.svg',
  },
  legendary: {
    artSrc: '/packs/legendary-pack.svg',
  },
}

function formatPackLabel(packId: ShopPackId): string {
  return `${packId.charAt(0).toUpperCase()}${packId.slice(1)} Pack`
}

function sanitizeOpenQuantity(value: number): number {
  if (!Number.isFinite(value)) {
    return 1
  }
  return Math.max(1, Math.min(PACKS_MAX_OPEN_QUANTITY, Math.floor(value)))
}

function isOpenedPackBatch(result: OpenedRevealResult): result is OpenedPackBatchResult {
  return 'openedCount' in result
}

function getOpenedPackCount(result: OpenedRevealResult): number {
  return isOpenedPackBatch(result) ? result.openedCount : 1
}

export function PacksPage() {
  const { profile, openOwnedPack, openOwnedPacks } = useGame()
  const [openResult, setOpenResult] = useState<OpenedRevealResult | null>(null)
  const [revealedCount, setRevealedCount] = useState(0)
  const [isRevealRunning, setIsRevealRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openQuantityByPack, setOpenQuantityByPack] = useState<Record<ShopPackId, number>>({
    common: 1,
    uncommon: 1,
    rare: 1,
    epic: 1,
    legendary: 1,
  })
  const revealTimeoutIdsRef = useRef<number[]>([])
  const playedSoundByRevealKeyRef = useRef(new Set<string>())

  const revealEntries = useMemo(() => {
    if (!openResult) {
      return []
    }

    return openResult.pulls.map((pull) => ({
      pull,
      card: getCard(pull.cardId),
    }))
  }, [openResult])

  const revealVisual = openResult ? packVisuals[openResult.packId] : null

  const clearRevealTimers = () => {
    for (const timeoutId of revealTimeoutIdsRef.current) {
      window.clearTimeout(timeoutId)
    }
    revealTimeoutIdsRef.current = []
  }

  useEffect(() => {
    if (!openResult) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenResult(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openResult])

  useEffect(() => {
    clearRevealTimers()
    playedSoundByRevealKeyRef.current.clear()

    if (!openResult) {
      setRevealedCount(0)
      setIsRevealRunning(false)
      return
    }

    if (openResult.pulls.length > revealStepDelaysMs.length) {
      setRevealedCount(openResult.pulls.length)
      setIsRevealRunning(false)
      return
    }

    setRevealedCount(0)
    setIsRevealRunning(true)

    for (let index = 0; index < revealStepDelaysMs.length; index += 1) {
      const timeoutId = window.setTimeout(() => {
        setRevealedCount(index + 1)
      }, revealStepDelaysMs[index])
      revealTimeoutIdsRef.current.push(timeoutId)
    }

    const completionTimeoutId = window.setTimeout(() => {
      setIsRevealRunning(false)
    }, revealTotalDurationMs)
    revealTimeoutIdsRef.current.push(completionTimeoutId)

    return () => {
      clearRevealTimers()
    }
  }, [openResult])

  useEffect(() => {
    if (!openResult || revealedCount <= 0) {
      return
    }

    for (let index = 0; index < revealedCount; index += 1) {
      const pull = openResult.pulls[index]
      if (!pull || !pull.isNewOwnership) {
        continue
      }

      const revealKey = `${openResult.packId}:${openResult.remainingPackCount}:${getOpenedPackCount(openResult)}:${index}:${pull.cardId}`
      if (playedSoundByRevealKeyRef.current.has(revealKey)) {
        continue
      }

      playedSoundByRevealKeyRef.current.add(revealKey)
      playNewCardSound()
    }
  }, [openResult, revealedCount])

  const handleOpenPack = (packId: ShopPackId, quantity = 1) => {
    const normalizedQuantity = sanitizeOpenQuantity(quantity)
    try {
      const result = normalizedQuantity > 1 ? openOwnedPacks?.(packId, normalizedQuantity) : openOwnedPack(packId)
      if (!result) {
        throw new Error('Bulk open is unavailable in this context.')
      }
      setOpenResult(result)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to open this pack.'
      setError(message)
    }
  }

  const handleOpenAnotherPack = () => {
    if (!openResult || openResult.remainingPackCount <= 0) {
      return
    }
    const reopenQuantity = Math.min(getOpenedPackCount(openResult), openResult.remainingPackCount)
    handleOpenPack(openResult.packId, reopenQuantity)
  }

  return (
    <section className="panel packs-panel">
      <div className="packs-headline">
        <h1>Packs</h1>
        <p className="small">Click a pack image to open it.</p>
      </div>

      <div className="packs-grid">
        {packOrder.map((packId) => {
          const count = profile.packInventoryByRarity[packId]
          const maxOpenQuantity = Math.max(1, Math.min(PACKS_MAX_OPEN_QUANTITY, count))
          const selectedOpenQuantity = Math.min(sanitizeOpenQuantity(openQuantityByPack[packId] ?? 1), maxOpenQuantity)
          const packVisual = packVisuals[packId]

          return (
            <article className={`packs-entry packs-entry--${packId}`} key={packId} data-testid={`packs-entry-${packId}`}>
              <button
                type="button"
                className="packs-entry-open"
                disabled={count <= 0}
                onClick={() => handleOpenPack(packId, selectedOpenQuantity)}
                data-testid={`open-pack-${packId}`}
                aria-label={count > 0 ? `Open ${formatPackLabel(packId)} x${selectedOpenQuantity}` : `${formatPackLabel(packId)} unavailable`}
              >
                <img
                  className="packs-entry-art"
                  src={packVisual.artSrc}
                  alt={`${formatPackLabel(packId)} artwork`}
                  loading="lazy"
                  decoding="async"
                />
              </button>
              <p className="small packs-entry-count" data-testid={`packs-count-${packId}`}>
                x{count}
              </p>
              <div className="packs-entry-quantity" data-testid={`packs-open-quantity-${packId}`}>
                <span className="packs-entry-quantity__label">Qty</span>
                <div className="packs-entry-quantity__controls">
                  <button
                    type="button"
                    className="packs-entry-quantity__step"
                    onClick={() =>
                      setOpenQuantityByPack((current) => ({
                        ...current,
                        [packId]: sanitizeOpenQuantity((current[packId] ?? 1) - 1),
                      }))
                    }
                    disabled={selectedOpenQuantity <= 1}
                    aria-label={`Decrease ${formatPackLabel(packId)} open quantity`}
                    data-testid={`packs-open-quantity-decrement-${packId}`}
                  >
                    -
                  </button>
                  <span className="packs-entry-quantity__value" data-testid={`packs-open-quantity-value-${packId}`}>
                    {selectedOpenQuantity}
                  </span>
                  <button
                    type="button"
                    className="packs-entry-quantity__step"
                    onClick={() =>
                      setOpenQuantityByPack((current) => ({
                        ...current,
                        [packId]: sanitizeOpenQuantity((current[packId] ?? 1) + 1),
                      }))
                    }
                    disabled={selectedOpenQuantity >= maxOpenQuantity}
                    aria-label={`Increase ${formatPackLabel(packId)} open quantity`}
                    data-testid={`packs-open-quantity-increment-${packId}`}
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="button packs-entry-open-batch"
                disabled={count <= 0}
                onClick={() => handleOpenPack(packId, selectedOpenQuantity)}
                data-testid={`open-pack-quantity-${packId}`}
              >
                Open x{selectedOpenQuantity}
              </button>
            </article>
          )
        })}
      </div>

      {openResult ? (
        <div className="packs-reveal-backdrop" role="presentation" onClick={() => setOpenResult(null)}>
          <section
            className={`packs-reveal-modal packs-reveal-modal--${openResult.packId}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="packs-reveal-title"
            data-testid="packs-reveal-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="packs-reveal-head">
              <div className="packs-reveal-headline">
                <img className="packs-reveal-art" src={revealVisual?.artSrc} alt="" aria-hidden="true" />
                <div>
                  <h2 id="packs-reveal-title">{formatPackLabel(openResult.packId)} Opened</h2>
                  <p className="small">
                    Opened x{getOpenedPackCount(openResult)} | Remaining: x{openResult.remainingPackCount}
                  </p>
                </div>
              </div>
              <div className="packs-reveal-actions">
                {!isRevealRunning && openResult.remainingPackCount > 0 ? (
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={handleOpenAnotherPack}
                    data-testid="packs-reveal-open-another"
                  >
                    Open x{Math.min(getOpenedPackCount(openResult), openResult.remainingPackCount)} again
                  </button>
                ) : null}
                <button
                  type="button"
                  className="button"
                  onClick={() => setOpenResult(null)}
                  data-testid="packs-reveal-close"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="packs-reveal-grid">
              {revealEntries.map((entry, index) => (
                <article
                  className={`packs-reveal-card ${index < revealedCount ? 'is-revealed' : 'is-masked'}`}
                  key={`${entry.pull.cardId}-${index}`}
                  data-testid={`packs-reveal-card-${index}`}
                >
                  {index < revealedCount ? (
                    <TriadCard
                      card={entry.card}
                      context="collection-detail"
                      owned
                      copies={getTotalCopies(profile, entry.pull.cardId) || entry.pull.copiesAfter}
                      shiny={hasShinyCopy(profile, entry.pull.cardId)}
                      showNew={entry.pull.isNewOwnership}
                      newBadgeVariant="reveal"
                      className="is-reveal-enter"
                      testId={`packs-reveal-triad-${index}`}
                    />
                  ) : (
                    <div
                      className={`packs-reveal-placeholder packs-reveal-placeholder--${openResult.packId}`}
                      data-testid={`packs-reveal-placeholder-${index}`}
                      aria-hidden="true"
                    >
                      <span className="packs-reveal-placeholder__glyph">{index + 1}</span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {error ? (
        <p className="error" role="alert" data-testid="packs-error">
          {error}
        </p>
      ) : null}

      <div className="actions">
        <Link className="button button-primary" to="/shop">
          Shop
        </Link>
        <Link className="button" to="/pokedex">
          Pokédex
        </Link>
        <Link className="button" to="/">
          Home
        </Link>
      </div>
    </section>
  )
}
