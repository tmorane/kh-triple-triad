import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { getCard } from '../../domain/cards/cardPool'
import type { OpenedPackResult, ShopPackId } from '../../domain/progression/shop'
import { playNewCardSound } from '../audio/newCardSound'
import { TriadCard } from '../components/TriadCard'

const packOrder: ShopPackId[] = ['common', 'uncommon', 'rare', 'legendary']
const revealStepDelaysMs = [0, 666, 1333] as const
const revealTotalDurationMs = 2000

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
  legendary: {
    artSrc: '/packs/legendary-pack.svg',
  },
}

function formatPackLabel(packId: ShopPackId): string {
  return `${packId.charAt(0).toUpperCase()}${packId.slice(1)} Pack`
}

export function PacksPage() {
  const { profile, openOwnedPack } = useGame()
  const [openResult, setOpenResult] = useState<OpenedPackResult | null>(null)
  const [revealedCount, setRevealedCount] = useState(0)
  const [isRevealRunning, setIsRevealRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

      const revealKey = `${openResult.packId}:${openResult.remainingPackCount}:${index}:${pull.cardId}`
      if (playedSoundByRevealKeyRef.current.has(revealKey)) {
        continue
      }

      playedSoundByRevealKeyRef.current.add(revealKey)
      playNewCardSound()
    }
  }, [openResult, revealedCount])

  const handleOpenPack = (packId: ShopPackId) => {
    try {
      const result = openOwnedPack(packId)
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
    handleOpenPack(openResult.packId)
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
          const packVisual = packVisuals[packId]

          return (
            <article className={`packs-entry packs-entry--${packId}`} key={packId} data-testid={`packs-entry-${packId}`}>
              <button
                type="button"
                className="packs-entry-open"
                disabled={count <= 0}
                onClick={() => handleOpenPack(packId)}
                data-testid={`open-pack-${packId}`}
                aria-label={count > 0 ? `Open ${formatPackLabel(packId)}` : `${formatPackLabel(packId)} unavailable`}
              >
                <img
                  className="packs-entry-art"
                  src={packVisual.artSrc}
                  alt={`${formatPackLabel(packId)} artwork`}
                  loading="lazy"
                  decoding="async"
                />
              </button>
              <div className="packs-entry-meta">
                <h2>{formatPackLabel(packId)}</h2>
                <p className="small packs-entry-count" data-testid={`packs-count-${packId}`}>
                  x{count}
                </p>
              </div>
              <button
                type="button"
                className="button packs-entry-open-label"
                disabled={count <= 0}
                onClick={() => handleOpenPack(packId)}
              >
                {count > 0 ? 'Open' : 'Empty'}
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
                  <p className="small">Remaining: x{openResult.remainingPackCount}</p>
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
                    Open another
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
                      copies={profile.cardCopiesById[entry.pull.cardId] ?? entry.pull.copiesAfter}
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
        <Link className="button" to="/collection">
          Collection
        </Link>
        <Link className="button" to="/">
          Home
        </Link>
      </div>
    </section>
  )
}
