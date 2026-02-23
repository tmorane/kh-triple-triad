import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { getPackPrice, type ShopPackId } from '../../domain/progression/shop'
import { cardPool } from '../../domain/cards/cardPool'
import { TriadCard } from '../components/TriadCard'

const packOrder: ShopPackId[] = ['common', 'uncommon', 'rare', 'legendary']

interface PackVisual {
  tagline: string
  artSrc: string
}

const packVisuals: Record<ShopPackId, PackVisual> = {
  common: {
    tagline: 'Reliable foundations for every deck.',
    artSrc: '/packs/common-pack.svg',
  },
  uncommon: {
    tagline: 'Specialized picks with sharper angles.',
    artSrc: '/packs/uncommon-pack.svg',
  },
  rare: {
    tagline: 'High-impact threats for decisive turns.',
    artSrc: '/packs/rare-pack.svg',
  },
  epic: {
    tagline: 'High-risk, high-reward momentum swings.',
    artSrc: '/packs/epic-pack.svg',
  },
  legendary: {
    tagline: 'Endgame royalty with unmatched pressure.',
    artSrc: '/packs/legendary-pack.svg',
  },
}

function formatPackLabel(packId: ShopPackId): string {
  return `${packId.charAt(0).toUpperCase()}${packId.slice(1)} Pack`
}

export function ShopPage() {
  const { profile, purchaseShopPack, addTestGold } = useGame()
  const [purchaseToast, setPurchaseToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openPackId, setOpenPackId] = useState<ShopPackId | null>(null)
  const ownedCardIdsSet = useMemo(() => new Set(profile.ownedCardIds), [profile.ownedCardIds])
  const modalCards = useMemo(
    () => (openPackId ? cardPool.filter((card) => card.rarity === openPackId) : []),
    [openPackId],
  )
  const ownedModalCards = useMemo(
    () => modalCards.filter((card) => ownedCardIdsSet.has(card.id)),
    [modalCards, ownedCardIdsSet],
  )
  const missingModalCards = useMemo(
    () => modalCards.filter((card) => !ownedCardIdsSet.has(card.id)),
    [modalCards, ownedCardIdsSet],
  )
  const openPackVisual = openPackId ? packVisuals[openPackId] : null

  useEffect(() => {
    if (!openPackId) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenPackId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openPackId])

  const handleBuyPack = (packId: ShopPackId) => {
    try {
      const receipt = purchaseShopPack(packId)
      setPurchaseToast(`${formatPackLabel(receipt.packId)} added to inventory (+1).`)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to complete purchase.'
      setError(message)
    }
  }

  useEffect(() => {
    if (!purchaseToast) {
      return
    }

    const timer = window.setTimeout(() => {
      setPurchaseToast(null)
    }, 2500)

    return () => window.clearTimeout(timer)
  }, [purchaseToast])

  return (
    <section className="panel shop-panel">
      <div className="shop-headline">
        <h1>Shop</h1>
        <p className="small">Buy packs to unlock cards and increase duplicate copy counts.</p>
      </div>

      <div className="shop-balance" data-testid="shop-gold-value">
        Gold: {profile.gold}
      </div>

      <div className="shop-tools">
        <button
          type="button"
          className="button shop-test-gold-button"
          onClick={() => {
            addTestGold(1000)
            setError(null)
          }}
          data-testid="shop-add-test-gold"
        >
          +1000 Gold (Test)
        </button>
      </div>

      <div className="shop-pack-grid" aria-label="Shop packs">
        {packOrder.map((packId) => {
          const price = getPackPrice(packId)
          const affordable = profile.gold >= price
          const cardsInRarity = cardPool.filter((card) => card.rarity === packId)
          const ownedInRarity = cardsInRarity.filter((card) => profile.ownedCardIds.includes(card.id)).length
          const isOpen = openPackId === packId
          const packVisual = packVisuals[packId]

          return (
            <article className={`shop-pack-card shop-pack-card--${packId}`} key={packId} data-testid={`shop-pack-${packId}`}>
              <div className="shop-pack-art-wrap">
                <img
                  className="shop-pack-art"
                  src={packVisual.artSrc}
                  alt={`${formatPackLabel(packId)} artwork`}
                  loading="lazy"
                  decoding="async"
                />
                <span className="shop-pack-stock" data-testid={`shop-pack-stock-${packId}`}>
                  x{profile.packInventoryByRarity[packId]}
                </span>
              </div>
              <p className="small shop-pack-progress">
                Owned {ownedInRarity}/{cardsInRarity.length}
              </p>
              <button
                type="button"
                className={`shop-price-buy shop-price-buy--${packId}`}
                disabled={!affordable}
                onClick={() => handleBuyPack(packId)}
                data-testid={`buy-pack-${packId}`}
                aria-label={`Buy ${formatPackLabel(packId)} for ${price} gold`}
              >
                <span className="shop-price-buy__label">Price</span>
                <span className="shop-price-buy__value">
                  {price}
                  <span className="shop-price-buy__unit">G</span>
                </span>
                <span className="shop-price-buy__hint">{affordable ? 'Tap to buy this pack' : 'Not enough gold'}</span>
              </button>
              <button
                type="button"
                className={`button shop-view-button shop-view-button--${packId}`}
                onClick={() => setOpenPackId(isOpen ? null : packId)}
                data-testid={`toggle-pack-cards-${packId}`}
              >
                {isOpen ? 'Close preview' : 'View cards'}
              </button>
            </article>
          )
        })}
      </div>

      {openPackId ? (
        <div className="shop-pack-modal-backdrop" role="presentation" onClick={() => setOpenPackId(null)}>
          <section
            className={`shop-pack-modal shop-pack-modal--${openPackId}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`shop-pack-modal-title-${openPackId}`}
            data-testid={`shop-pack-modal-${openPackId}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shop-pack-modal-head">
              <div className="shop-pack-modal-headline">
                <img
                  className="shop-pack-modal-art"
                  src={openPackVisual?.artSrc}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <h2 id={`shop-pack-modal-title-${openPackId}`}>{formatPackLabel(openPackId)} Cards</h2>
                  <p className="small">{openPackVisual?.tagline}</p>
                </div>
              </div>
              <button
                type="button"
                className="button"
                onClick={() => setOpenPackId(null)}
                data-testid="shop-pack-modal-close"
              >
                Close
              </button>
            </div>
            <div className="shop-pack-modal-sections">
              {missingModalCards.length > 0 ? (
                <section className="shop-pack-modal-section" aria-labelledby={`shop-pack-modal-missing-title-${openPackId}`}>
                  <div className="shop-pack-modal-section-head">
                    <h3 id={`shop-pack-modal-missing-title-${openPackId}`}>Not owned</h3>
                    <p className="small">{missingModalCards.length}</p>
                  </div>
                  <div className="shop-pack-modal-grid">
                    {missingModalCards.map((card) => (
                      <TriadCard
                        key={card.id}
                        card={card}
                        context="collection-list"
                        owned={false}
                        copies={0}
                        testId={`shop-pack-modal-card-${openPackId}-${card.id}`}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="shop-pack-modal-section" aria-labelledby={`shop-pack-modal-owned-title-${openPackId}`}>
                <div className="shop-pack-modal-section-head">
                  <h3 id={`shop-pack-modal-owned-title-${openPackId}`}>Owned</h3>
                  <p className="small">
                    {ownedModalCards.length}/{modalCards.length}
                  </p>
                </div>
                <div className="shop-pack-modal-grid">
                  {ownedModalCards.length > 0 ? (
                    ownedModalCards.map((card) => (
                      <TriadCard
                        key={card.id}
                        card={card}
                        context="collection-list"
                        owned
                        copies={profile.cardCopiesById[card.id] ?? 0}
                        testId={`shop-pack-modal-card-${openPackId}-${card.id}`}
                      />
                    ))
                  ) : (
                    <p className="small shop-pack-modal-empty">No owned cards in this rarity yet.</p>
                  )}
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}

      {error ? (
        <p className="error" role="alert" data-testid="shop-error">
          {error}
        </p>
      ) : null}

      {purchaseToast ? (
        <p className="shop-purchase-toast" role="status" data-testid="shop-purchase-toast">
          {purchaseToast}
        </p>
      ) : null}

      <div className="actions">
        <Link className="button button-primary" to="/packs">
          Packs
        </Link>
        <Link className="button button-primary" to="/collection">
          Collection
        </Link>
        <Link className="button" to="/">
          Home
        </Link>
      </div>
    </section>
  )
}
