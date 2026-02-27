import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import {
  getLegendaryFocusDropChancePercent,
  getPackDropRates,
  getPackPrice,
  getSpecialPackPrice,
  type OpenedPackResult,
  type OpenedShinyTestPackResult,
  type OpenedSpecialPackResult,
  type ShopPackId,
  type SpecialPackId,
  type SpecialPackPurchaseRequest,
} from '../../domain/progression/shop'
import { cardPool, getCard } from '../../domain/cards/cardPool'
import { getTotalCopies, hasShinyCopy } from '../../domain/progression/shiny'
import type { CardCategoryId, Rarity } from '../../domain/types'
import { TriadCard } from '../components/TriadCard'

const packOrder: ShopPackId[] = ['common', 'uncommon', 'rare', 'legendary']
const specialPackOrder: SpecialPackId[] = ['sans_coeur_focus', 'simili_focus', 'legendary_focus']
const dropRarityOrder: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const SHOP_MODAL_PAGE_SIZE = 5
const SHOP_MAX_STANDARD_PACK_QUANTITY = 20
const typeFocusBaseRates: Record<Rarity, number> = { common: 70, uncommon: 22, rare: 5, epic: 2, legendary: 1 }
const typeFocusCategoryByPack: Record<'sans_coeur_focus' | 'simili_focus', CardCategoryId> = {
  sans_coeur_focus: 'sans_coeur',
  simili_focus: 'simili',
}

type AnyShopPackId = ShopPackId | SpecialPackId
type DisplayPackId = AnyShopPackId | 'shiny_test'
type OpenedRevealResult = OpenedPackResult | OpenedSpecialPackResult | OpenedShinyTestPackResult

interface PackVisual {
  tagline: string
  artSrc: string
}

const packVisuals: Record<DisplayPackId, PackVisual> = {
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
  sans_coeur_focus: {
    tagline: 'Theme Booster: 3 pulls from the Obscur pool with tuned rarity odds.',
    artSrc: '/packs/sans-coeur-focus-pack.svg',
  },
  simili_focus: {
    tagline: 'Theme Booster: 3 pulls from the Psy pool with tuned rarity odds.',
    artSrc: '/packs/simili-focus-pack.svg',
  },
  legendary_focus: {
    tagline: 'Target Booster: pick a legendary target, pity ramps after each miss.',
    artSrc: '/packs/legendary-focus-pack.svg',
  },
  shiny_test: {
    tagline: 'Debug pack: 1 guaranteed shiny pull.',
    artSrc: '/packs/legendary-pack.svg',
  },
}

const packLabels: Record<DisplayPackId, string> = {
  common: 'Common Pack',
  uncommon: 'Uncommon Pack',
  rare: 'Rare Pack',
  epic: 'Epic Pack',
  legendary: 'Legendary Pack',
  sans_coeur_focus: 'Obscur Theme Booster',
  simili_focus: 'Psy Theme Booster',
  legendary_focus: 'Legendary Target Booster',
  shiny_test: 'Shiny Test Pack',
}

function formatPackLabel(packId: DisplayPackId): string {
  return packLabels[packId]
}

function formatRarityLabel(rarity: Rarity): string {
  return `${rarity.charAt(0).toUpperCase()}${rarity.slice(1)}`
}

function isOpenedInventoryPack(result: OpenedRevealResult): result is OpenedPackResult {
  return 'remainingPackCount' in result
}

function isTypeFocusPack(packId: SpecialPackId): packId is 'sans_coeur_focus' | 'simili_focus' {
  return packId === 'sans_coeur_focus' || packId === 'simili_focus'
}

function sanitizePackQuantity(value: number): number {
  if (!Number.isFinite(value)) {
    return 1
  }
  return Math.max(1, Math.min(SHOP_MAX_STANDARD_PACK_QUANTITY, Math.floor(value)))
}

export function ShopPage() {
  const { profile, purchaseShopPack, purchaseShopPacks, openOwnedPack, openShinyTestPack, buySpecialPack, addTestGold } =
    useGame()
  const [purchaseToast, setPurchaseToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openPackId, setOpenPackId] = useState<ShopPackId | null>(null)
  const [openPackRarity, setOpenPackRarity] = useState<Rarity | null>(null)
  const [openPackPage, setOpenPackPage] = useState(0)
  const [openedPackResult, setOpenedPackResult] = useState<OpenedRevealResult | null>(null)
  const [legendaryFocusTargetCardId, setLegendaryFocusTargetCardId] = useState('')
  const [buyQuantityByPack, setBuyQuantityByPack] = useState<Record<ShopPackId, number>>({
    common: 1,
    uncommon: 1,
    rare: 1,
    epic: 1,
    legendary: 1,
  })
  const ownedCardIdsSet = useMemo(() => new Set(profile.ownedCardIds), [profile.ownedCardIds])
  const legendaryFocusChancePercent = getLegendaryFocusDropChancePercent(profile)
  const legendaryCards = useMemo(() => cardPool.filter((card) => card.rarity === 'legendary'), [])
  const defaultLegendaryFocusTargetCardId = useMemo(
    () => legendaryCards.find((card) => !ownedCardIdsSet.has(card.id))?.id ?? legendaryCards[0]?.id ?? '',
    [legendaryCards, ownedCardIdsSet],
  )
  const modalSections = useMemo(() => {
    if (!openPackId) {
      return []
    }

    const dropRates = getPackDropRates(openPackId)

    return dropRarityOrder
      .filter((rarity) => dropRates[rarity] > 0)
      .map((rarity) => {
        const cards = cardPool.filter((card) => card.rarity === rarity)
        const ownedCount = cards.filter((card) => ownedCardIdsSet.has(card.id)).length
        return {
          rarity,
          cards,
          ownedCount,
          dropRate: dropRates[rarity],
        }
      })
  }, [openPackId, ownedCardIdsSet])
  const activeModalSection = useMemo(() => {
    if (modalSections.length === 0) {
      return null
    }

    if (!openPackRarity) {
      return modalSections[0]
    }

    return modalSections.find((section) => section.rarity === openPackRarity) ?? modalSections[0]
  }, [modalSections, openPackRarity])
  const openPackPageCount = activeModalSection ? Math.max(1, Math.ceil(activeModalSection.cards.length / SHOP_MODAL_PAGE_SIZE)) : 1
  const openPackPageIndex = Math.min(openPackPage, openPackPageCount - 1)
  const activeModalCards = activeModalSection
    ? activeModalSection.cards.slice(
        openPackPageIndex * SHOP_MODAL_PAGE_SIZE,
        (openPackPageIndex + 1) * SHOP_MODAL_PAGE_SIZE,
      )
    : []
  const openedRevealEntries = useMemo(
    () =>
      openedPackResult
        ? openedPackResult.pulls.map((pull) => ({
            pull,
            card: getCard(pull.cardId),
          }))
        : [],
    [openedPackResult],
  )
  const openPackVisual = openPackId ? packVisuals[openPackId] : null
  const openedPackVisual = openedPackResult ? packVisuals[openedPackResult.packId] : null
  const openedPackSubtitle = useMemo(() => {
    if (!openedPackResult) {
      return ''
    }

    if (openedPackResult.packId === 'shiny_test') {
      return 'Guaranteed shiny pull'
    }

    if (isOpenedInventoryPack(openedPackResult)) {
      return `Remaining: x${openedPackResult.remainingPackCount}`
    }

    if (openedPackResult.packId === 'legendary_focus' && openedPackResult.targetLegendaryCardId) {
      return `Target: ${getCard(openedPackResult.targetLegendaryCardId).name}`
    }

    return 'Opened instantly'
  }, [openedPackResult])

  useEffect(() => {
    if (legendaryCards.length === 0) {
      if (legendaryFocusTargetCardId !== '') {
        setLegendaryFocusTargetCardId('')
      }
      return
    }

    const isCurrentTargetValid = legendaryCards.some((card) => card.id === legendaryFocusTargetCardId)
    if (!isCurrentTargetValid) {
      setLegendaryFocusTargetCardId(defaultLegendaryFocusTargetCardId)
    }
  }, [defaultLegendaryFocusTargetCardId, legendaryCards, legendaryFocusTargetCardId])

  useEffect(() => {
    if (!openPackId && !openedPackResult) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenPackId(null)
        setOpenPackRarity(null)
        setOpenPackPage(0)
        setOpenedPackResult(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openPackId, openedPackResult])

  const handleBuyPack = (packId: ShopPackId, quantity: number) => {
    const normalizedQuantity = sanitizePackQuantity(quantity)
    try {
      const receipt =
        normalizedQuantity > 1
          ? purchaseShopPacks?.(packId, normalizedQuantity)
          : {
              ...purchaseShopPack(packId),
              quantity: 1,
            }

      if (!receipt) {
        throw new Error('Bulk purchase is unavailable in this context.')
      }

      setPurchaseToast(`${formatPackLabel(receipt.packId)} added to inventory (+${receipt.quantity}).`)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to complete purchase.'
      setError(message)
    }
  }

  const handleBuySpecialPack = (packId: SpecialPackId) => {
    try {
      const request: SpecialPackPurchaseRequest = { packId }
      if (packId === 'legendary_focus') {
        if (!legendaryFocusTargetCardId) {
          throw new Error('Please select a legendary focus target.')
        }
        request.targetLegendaryCardId = legendaryFocusTargetCardId
      }

      const result = buySpecialPack(request)
      setOpenedPackResult(result)
      setOpenPackId(null)
      setOpenPackRarity(null)
      setOpenPackPage(0)
      setPurchaseToast(null)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to complete special pack purchase.'
      setError(message)
    }
  }

  const handleOpenOwnedPack = (packId: ShopPackId) => {
    try {
      const result = openOwnedPack(packId)
      setOpenedPackResult(result)
      setOpenPackId(null)
      setOpenPackRarity(null)
      setOpenPackPage(0)
      setPurchaseToast(null)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to open this pack.'
      setError(message)
    }
  }

  const handleOpenAnotherOwnedPack = () => {
    if (!openedPackResult || !isOpenedInventoryPack(openedPackResult) || openedPackResult.remainingPackCount <= 0) {
      return
    }
    handleOpenOwnedPack(openedPackResult.packId)
  }

  const handleOpenShinyTestPack = () => {
    try {
      if (!openShinyTestPack) {
        throw new Error('Shiny test pack is unavailable in this context.')
      }

      const result = openShinyTestPack()
      setOpenedPackResult(result)
      setOpenPackId(null)
      setOpenPackRarity(null)
      setOpenPackPage(0)
      setPurchaseToast(null)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to open shiny test pack.'
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
        <button
          type="button"
          className="button shop-test-shiny-pack-button"
          onClick={handleOpenShinyTestPack}
          data-testid="shop-open-shiny-test-pack"
        >
          Shiny Pack x1 (Test)
        </button>
      </div>

      <div className="shop-pack-grid" aria-label="Shop packs">
        {packOrder.map((packId) => {
          const price = getPackPrice(packId)
          const dropRates = getPackDropRates(packId)
          const cardsInRarity = cardPool.filter((card) => card.rarity === packId)
          const ownedInRarity = cardsInRarity.filter((card) => profile.ownedCardIds.includes(card.id)).length
          const ownedPackCount = profile.packInventoryByRarity[packId]
          const buyQuantity = sanitizePackQuantity(buyQuantityByPack[packId] ?? 1)
          const totalPrice = price * buyQuantity
          const isOpen = openPackId === packId
          const packVisual = packVisuals[packId]
          const affordable = profile.gold >= totalPrice

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
                  x{ownedPackCount}
                </span>
              </div>
              <p className="small shop-pack-progress">
                Owned {ownedInRarity}/{cardsInRarity.length}
              </p>
              <div className="shop-pack-rates" data-testid={`shop-pack-rates-${packId}`}>
                {dropRarityOrder.map((rarity) => (
                  <span
                    key={rarity}
                    className={`shop-pack-rate shop-pack-rate--${rarity}`}
                    data-testid={`shop-pack-rate-${packId}-${rarity}`}
                  >
                    {formatRarityLabel(rarity)} {dropRates[rarity]}%
                  </span>
                ))}
              </div>
              <div className="shop-pack-quantity" data-testid={`buy-pack-quantity-${packId}`}>
                <span className="shop-pack-quantity__label">Qty</span>
                <div className="shop-pack-quantity__controls">
                  <button
                    type="button"
                    className="shop-pack-quantity__step"
                    onClick={() =>
                      setBuyQuantityByPack((current) => ({
                        ...current,
                        [packId]: sanitizePackQuantity((current[packId] ?? 1) - 1),
                      }))
                    }
                    disabled={buyQuantity <= 1}
                    aria-label={`Decrease ${formatPackLabel(packId)} purchase quantity`}
                    data-testid={`buy-pack-quantity-decrement-${packId}`}
                  >
                    -
                  </button>
                  <span className="shop-pack-quantity__value" data-testid={`buy-pack-quantity-value-${packId}`}>
                    {buyQuantity}
                  </span>
                  <button
                    type="button"
                    className="shop-pack-quantity__step"
                    onClick={() =>
                      setBuyQuantityByPack((current) => ({
                        ...current,
                        [packId]: sanitizePackQuantity((current[packId] ?? 1) + 1),
                      }))
                    }
                    disabled={buyQuantity >= SHOP_MAX_STANDARD_PACK_QUANTITY}
                    aria-label={`Increase ${formatPackLabel(packId)} purchase quantity`}
                    data-testid={`buy-pack-quantity-increment-${packId}`}
                  >
                    +
                  </button>
                </div>
              </div>
              <button
                type="button"
                className={`shop-price-buy shop-price-buy--${packId}`}
                disabled={!affordable}
                onClick={() => handleBuyPack(packId, buyQuantity)}
                data-testid={`buy-pack-${packId}`}
                aria-label={`Buy ${formatPackLabel(packId)} x${buyQuantity} for ${totalPrice} gold`}
              >
                <span className="shop-price-buy__label">Price</span>
                <span className="shop-price-buy__value">
                  {totalPrice}
                  <span className="shop-price-buy__unit">G</span>
                </span>
                <span className="shop-price-buy__hint">{affordable ? `Buy x${buyQuantity}` : 'Not enough gold'}</span>
              </button>
              <button
                type="button"
                className={`button shop-open-owned-button shop-open-owned-button--${packId}`}
                disabled={ownedPackCount <= 0}
                onClick={() => handleOpenOwnedPack(packId)}
                data-testid={`open-owned-pack-${packId}`}
              >
                {ownedPackCount > 0 ? 'Open now' : 'No pack to open'}
              </button>
              <button
                type="button"
                className={`button shop-view-button shop-view-button--${packId}`}
                onClick={() => {
                  if (isOpen) {
                    setOpenPackId(null)
                    setOpenPackRarity(null)
                    setOpenPackPage(0)
                    return
                  }

                  const firstRarity = dropRarityOrder.find((rarity) => dropRates[rarity] > 0) ?? null
                  setOpenPackId(packId)
                  setOpenPackRarity(firstRarity)
                  setOpenPackPage(0)
                }}
                data-testid={`toggle-pack-cards-${packId}`}
              >
                {isOpen ? 'Close preview' : 'View cards'}
              </button>
            </article>
          )
        })}
      </div>

      <section className="shop-special-section" aria-labelledby="shop-special-title">
        <div className="shop-special-head">
          <h2 id="shop-special-title">Special Packs</h2>
          <p className="small">Instant opening with TCG-style theme/target boosters.</p>
        </div>
        <div className="shop-special-grid">
          {specialPackOrder.map((packId) => {
            const price = getSpecialPackPrice(packId)
            const affordable = profile.gold >= price
            const isLegendaryFocus = packId === 'legendary_focus'
            const canBuy = affordable && (!isLegendaryFocus || legendaryFocusTargetCardId.length > 0)
            const visual = packVisuals[packId]
            const selectedLegendaryCard = legendaryCards.find((card) => card.id === legendaryFocusTargetCardId) ?? null
            const typeFocusPool = isTypeFocusPack(packId)
              ? cardPool.filter((card) => card.categoryId === typeFocusCategoryByPack[packId])
              : []
            const typeFocusOwnedCount = typeFocusPool.filter((card) => ownedCardIdsSet.has(card.id)).length
            const typeFocusRarities = dropRarityOrder.filter((rarity) => typeFocusPool.some((card) => card.rarity === rarity))

            return (
              <article
                key={packId}
                className={`shop-special-pack-card shop-special-pack-card--${packId}`}
                data-testid={`shop-special-pack-${packId}`}
              >
                <div className="shop-special-pack-head">
                  <button
                    type="button"
                    className="shop-special-pack-art-buy"
                    disabled={!canBuy}
                    onClick={() => handleBuySpecialPack(packId)}
                    data-testid={`buy-open-special-pack-${packId}`}
                    aria-label={`Buy and open ${formatPackLabel(packId)} for ${price} gold`}
                  >
                    <img
                      className="shop-special-pack-art"
                      src={visual.artSrc}
                      alt={`${formatPackLabel(packId)} artwork`}
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                  <div>
                    <h3>{formatPackLabel(packId)}</h3>
                    <p className="small">{visual.tagline}</p>
                  </div>
                </div>

                {isLegendaryFocus ? (
                  <div className="shop-special-pack-target-wrap">
                    <div className="shop-special-pack-intel shop-special-pack-intel--legendary">
                      <span className="shop-special-pack-intel-tag">1 Focus Roll + 2 Fillers</span>
                      <span className="shop-special-pack-intel-sub">1% base, +1% per miss, reset on hit.</span>
                    </div>
                    <p className="shop-special-pack-target-label">Target Legendary</p>
                    <div
                      className="shop-special-pack-target-picker"
                      data-testid="shop-special-pack-legendary-target"
                      role="listbox"
                      aria-label="Legendary focus targets"
                    >
                      {legendaryCards.map((card) => (
                        <article
                          key={card.id}
                          className={`shop-special-pack-target-option ${
                            legendaryFocusTargetCardId === card.id ? 'is-selected' : ''
                          }`}
                          role="option"
                          aria-selected={legendaryFocusTargetCardId === card.id}
                        >
                          <TriadCard
                            card={card}
                            context="collection-list"
                            owned
                            copies={getTotalCopies(profile, card.id)}
                            shiny={hasShinyCopy(profile, card.id)}
                            interactive
                            selected={legendaryFocusTargetCardId === card.id}
                            onClick={() => setLegendaryFocusTargetCardId(card.id)}
                            className="shop-special-pack-target-card"
                            testId={`shop-special-pack-legendary-option-${card.id}`}
                          />
                          <span className="shop-special-pack-target-option-name">{card.name}</span>
                          <span
                            className={`shop-special-pack-target-option-state ${
                              ownedCardIdsSet.has(card.id) ? 'is-owned' : 'is-missing'
                            }`}
                          >
                            {ownedCardIdsSet.has(card.id) ? 'Owned' : 'Missing'}
                          </span>
                        </article>
                      ))}
                    </div>
                    <p className="small shop-special-pack-target-note">
                      Focus slot: {selectedLegendaryCard ? selectedLegendaryCard.name : 'No target selected'} | Current chance:{' '}
                      {legendaryFocusChancePercent}%
                    </p>
                  </div>
                ) : (
                  <div className="shop-special-pack-intel">
                      <span className="shop-special-pack-intel-tag">Theme Booster · 3 Pulls</span>
                    <div className="shop-special-pack-intel-stats">
                      <span>Pool: {typeFocusPool.length}</span>
                      <span>
                        Owned: {typeFocusOwnedCount}/{typeFocusPool.length}
                      </span>
                    </div>
                    <div className="shop-special-pack-intel-rates">
                      {typeFocusRarities.map((rarity) => (
                        <span key={rarity} className={`shop-special-pack-intel-rate shop-special-pack-intel-rate--${rarity}`}>
                          {formatRarityLabel(rarity)} {typeFocusBaseRates[rarity]}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="shop-price-buy shop-special-pack-buy shop-special-pack-buy--display" aria-hidden="true">
                  <span className="shop-price-buy__label">Price</span>
                  <span className="shop-price-buy__value">
                    {price}
                    <span className="shop-price-buy__unit">G</span>
                  </span>
                  <span className="shop-price-buy__hint">Click artwork to buy</span>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {openPackId ? (
        <div
          className="shop-pack-modal-backdrop"
          role="presentation"
          onClick={() => {
            setOpenPackId(null)
            setOpenPackRarity(null)
            setOpenPackPage(0)
          }}
        >
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
                onClick={() => {
                  setOpenPackId(null)
                  setOpenPackRarity(null)
                  setOpenPackPage(0)
                }}
                data-testid="shop-pack-modal-close"
              >
                Close
              </button>
            </div>
            <div className="shop-pack-modal-sections">
              <div className="shop-pack-modal-rarity-tabs" role="tablist" aria-label="Rarity pages">
                {modalSections.map((section) => {
                  const isActive = activeModalSection?.rarity === section.rarity
                  return (
                    <button
                      key={section.rarity}
                      type="button"
                      className={`shop-pack-modal-rarity-tab ${isActive ? 'is-active' : ''}`}
                      aria-pressed={isActive}
                      data-testid={`shop-pack-modal-rarity-tab-${section.rarity}`}
                      onClick={() => {
                        setOpenPackRarity(section.rarity)
                        setOpenPackPage(0)
                      }}
                    >
                      <span>{formatRarityLabel(section.rarity)}</span>
                      <span className="shop-pack-modal-rarity-tab-meta">{section.dropRate}%</span>
                    </button>
                  )
                })}
              </div>
              {activeModalSection ? (
                <section
                  className="shop-pack-modal-section"
                  aria-labelledby={`shop-pack-modal-rarity-title-${openPackId}-${activeModalSection.rarity}`}
                  key={activeModalSection.rarity}
                >
                  <div className="shop-pack-modal-section-head">
                    <h3 id={`shop-pack-modal-rarity-title-${openPackId}-${activeModalSection.rarity}`}>
                      {formatRarityLabel(activeModalSection.rarity)}
                    </h3>
                    <p className="small">
                      {activeModalSection.ownedCount}/{activeModalSection.cards.length} owned | {activeModalSection.dropRate}%
                    </p>
                  </div>
                  <div className="shop-pack-modal-grid">
                    {activeModalCards.length > 0 ? (
                      activeModalCards.map((card) => {
                        const owned = ownedCardIdsSet.has(card.id)
                        return (
                          <TriadCard
                            key={card.id}
                            card={card}
                            context="collection-list"
                            owned={owned}
                            copies={owned ? getTotalCopies(profile, card.id) : 0}
                            shiny={owned && hasShinyCopy(profile, card.id)}
                            testId={`shop-pack-modal-card-${openPackId}-${card.id}`}
                          />
                        )
                      })
                    ) : (
                      <p className="small shop-pack-modal-empty">No cards available in this rarity.</p>
                    )}
                  </div>
                  {activeModalSection.cards.length > SHOP_MODAL_PAGE_SIZE ? (
                    <div className="shop-pack-modal-pagination">
                      <button
                        type="button"
                        className="button shop-pack-modal-page-button"
                        data-testid="shop-pack-modal-page-prev"
                        disabled={openPackPageIndex <= 0}
                        onClick={() => setOpenPackPage((page) => Math.max(0, page - 1))}
                      >
                        Previous
                      </button>
                      <p className="small" data-testid="shop-pack-modal-page-indicator">
                        Page {openPackPageIndex + 1} / {openPackPageCount}
                      </p>
                      <button
                        type="button"
                        className="button shop-pack-modal-page-button"
                        data-testid="shop-pack-modal-page-next"
                        disabled={openPackPageIndex >= openPackPageCount - 1}
                        onClick={() => setOpenPackPage((page) => Math.min(openPackPageCount - 1, page + 1))}
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {openedPackResult ? (
        <div className="packs-reveal-backdrop" role="presentation" onClick={() => setOpenedPackResult(null)}>
          <section
            className={`packs-reveal-modal packs-reveal-modal--${openedPackResult.packId}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-opened-reveal-title"
            data-testid="shop-opened-reveal-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="packs-reveal-head">
              <div className="packs-reveal-headline">
                <img className="packs-reveal-art" src={openedPackVisual?.artSrc} alt="" aria-hidden="true" />
                <div>
                  <h2 id="shop-opened-reveal-title">{formatPackLabel(openedPackResult.packId)} Opened</h2>
                  <p className="small">{openedPackSubtitle}</p>
                </div>
              </div>
              <div className="packs-reveal-actions">
                {isOpenedInventoryPack(openedPackResult) && openedPackResult.remainingPackCount > 0 ? (
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={handleOpenAnotherOwnedPack}
                    data-testid="shop-opened-reveal-open-another"
                  >
                    Open another
                  </button>
                ) : null}
                <button
                  type="button"
                  className="button"
                  onClick={() => setOpenedPackResult(null)}
                  data-testid="shop-opened-reveal-close"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="packs-reveal-grid">
              {openedRevealEntries.map((entry, index) => (
                <article className="packs-reveal-card is-revealed" key={`${entry.pull.cardId}-${index}`}>
                  <TriadCard
                    card={entry.card}
                    context="collection-detail"
                    owned
                    copies={getTotalCopies(profile, entry.pull.cardId) || entry.pull.copiesAfter}
                    shiny={Boolean(entry.pull.isShiny) || hasShinyCopy(profile, entry.pull.cardId)}
                    showNew={entry.pull.isNewOwnership}
                    newBadgeVariant="reveal"
                    testId={`shop-opened-reveal-triad-${index}`}
                  />
                </article>
              ))}
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
        <Link className="button button-primary" to="/pokedex">
          Pokédex
        </Link>
        <Link className="button" to="/">
          Home
        </Link>
      </div>
    </section>
  )
}
