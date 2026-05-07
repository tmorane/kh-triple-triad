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
import type { Rarity } from '../../domain/types'
import { TriadCard } from '../components/TriadCard'

const packOrder: ShopPackId[] = ['common', 'uncommon', 'rare', 'legendary']
const specialPackOrder: SpecialPackId[] = ['sans_coeur_focus', 'simili_focus', 'legendary_focus']
const dropRarityOrder: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const SHOP_MODAL_PAGE_SIZE = 5
const SHOP_MAX_STANDARD_PACK_QUANTITY = 20
const generationFocusBaseRates: Record<Rarity, number> = { common: 60, uncommon: 26, rare: 10, epic: 3, legendary: 1 }
const generationFocusByPack: Record<'sans_coeur_focus' | 'simili_focus', 1 | 2> = {
  sans_coeur_focus: 1,
  simili_focus: 2,
}
const GEN_1_MAX_POKEDEX_NUMBER = 151
const GEN_2_MIN_POKEDEX_NUMBER = 152
const GEN_2_MAX_POKEDEX_NUMBER = 251

function isShopDemoToolsEnabled(): boolean {
  return import.meta.env.VITE_SHOW_DEMO_TOOLS === 'true'
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
    tagline: 'Bases fiables pour tous les decks.',
    artSrc: '/packs/common-pack.svg',
  },
  uncommon: {
    tagline: 'Choix spécialisés avec plus de mordant.',
    artSrc: '/packs/uncommon-pack.svg',
  },
  rare: {
    tagline: 'Menaces fortes pour les tours décisifs.',
    artSrc: '/packs/rare-pack.svg',
  },
  epic: {
    tagline: 'Gros risque, grosse récompense, gros momentum.',
    artSrc: '/packs/epic-pack.svg',
  },
  legendary: {
    tagline: 'Cartes royales de fin de jeu, pression maximale.',
    artSrc: '/packs/legendary-pack.svg',
  },
  sans_coeur_focus: {
    tagline: 'Booster Gen 1: 3 tirages de Kanto (#001-#151), raretés ajustées.',
    artSrc: '/packs/sans-coeur-focus-pack.svg',
  },
  simili_focus: {
    tagline: 'Booster Gen 2: 3 tirages de Johto (#152-#251), raretés ajustées.',
    artSrc: '/packs/simili-focus-pack.svg',
  },
  legendary_focus: {
    tagline: 'Booster ciblé: choisis une légendaire, la pity monte après chaque raté.',
    artSrc: '/packs/legendary-focus-pack.svg',
  },
  shiny_test: {
    tagline: 'Pack debug: 1 shiny garanti.',
    artSrc: '/packs/legendary-pack.svg',
  },
}

const packLabels: Record<DisplayPackId, string> = {
  common: 'Pack commun',
  uncommon: 'Pack peu commun',
  rare: 'Pack rare',
  epic: 'Pack épique',
  legendary: 'Pack légendaire',
  sans_coeur_focus: 'Booster Gen 1',
  simili_focus: 'Booster Gen 2',
  legendary_focus: 'Booster légendaire ciblé',
  shiny_test: 'Pack shiny test',
}

const rarityLabels: Record<Rarity, string> = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
}

function formatPackLabel(packId: DisplayPackId): string {
  return packLabels[packId]
}

function formatRarityLabel(rarity: Rarity): string {
  return rarityLabels[rarity]
}

function isOpenedInventoryPack(result: OpenedRevealResult): result is OpenedPackResult {
  return 'remainingPackCount' in result
}

function isGenerationFocusPack(packId: SpecialPackId): packId is 'sans_coeur_focus' | 'simili_focus' {
  return packId === 'sans_coeur_focus' || packId === 'simili_focus'
}

function getCardDexNumber(cardId: string): number {
  return Number.parseInt(cardId.slice(1), 10)
}

function isCardInGeneration(cardId: string, generation: 1 | 2): boolean {
  const dexNumber = getCardDexNumber(cardId)
  if (generation === 1) {
    return dexNumber >= 1 && dexNumber <= GEN_1_MAX_POKEDEX_NUMBER
  }

  return dexNumber >= GEN_2_MIN_POKEDEX_NUMBER && dexNumber <= GEN_2_MAX_POKEDEX_NUMBER
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
  const showDemoTools = isShopDemoToolsEnabled()
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
      return 'Shiny garanti'
    }

    if (isOpenedInventoryPack(openedPackResult)) {
      return `Restants: x${openedPackResult.remainingPackCount}`
    }

    if (openedPackResult.packId === 'legendary_focus' && openedPackResult.targetLegendaryCardId) {
      return `Cible: ${getCard(openedPackResult.targetLegendaryCardId).name}`
    }

    return 'Ouvert instantanément'
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
        throw new Error('Achat multiple indisponible ici.')
      }

      setPurchaseToast(`${formatPackLabel(receipt.packId)} ajouté à l'inventaire (+${receipt.quantity}).`)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Achat impossible.'
      setError(message)
    }
  }

  const handleBuySpecialPack = (packId: SpecialPackId) => {
    try {
      const request: SpecialPackPurchaseRequest = { packId }
      if (packId === 'legendary_focus') {
        if (!legendaryFocusTargetCardId) {
          throw new Error('Choisis une cible légendaire.')
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
      const message = err instanceof Error ? err.message : 'Achat du pack spécial impossible.'
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
      const message = err instanceof Error ? err.message : 'Impossible d ouvrir ce pack.'
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
      const message = err instanceof Error ? err.message : 'Impossible d ouvrir le pack shiny test.'
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
        <h1>Boutique</h1>
        <p className="small">Achète des packs pour débloquer des cartes et augmenter tes doublons.</p>
      </div>

      <div className="shop-balance" data-testid="shop-gold-value">
        Or: {profile.gold}
      </div>

      {showDemoTools ? (
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
            +1000 or (test)
          </button>
          <button
            type="button"
            className="button shop-test-shiny-pack-button"
            onClick={handleOpenShinyTestPack}
            data-testid="shop-open-shiny-test-pack"
          >
            Pack shiny x1 (test)
          </button>
        </div>
      ) : null}

      <div className="shop-pack-grid" aria-label="Packs de la boutique">
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
                  alt={`Illustration ${formatPackLabel(packId)}`}
                  loading="lazy"
                  decoding="async"
                />
                <span className="shop-pack-stock" data-testid={`shop-pack-stock-${packId}`}>
                  x{ownedPackCount}
                </span>
              </div>
              <p className="small shop-pack-progress">
                Possédées {ownedInRarity}/{cardsInRarity.length}
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
                <span className="shop-pack-quantity__label">Qté</span>
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
                    aria-label={`Réduire la quantité d'achat ${formatPackLabel(packId)}`}
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
                    aria-label={`Augmenter la quantité d'achat ${formatPackLabel(packId)}`}
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
                aria-label={`Acheter ${formatPackLabel(packId)} x${buyQuantity} pour ${totalPrice} or`}
              >
                <span className="shop-price-buy__label">Prix</span>
                <span className="shop-price-buy__value">
                  {totalPrice}
                  <span className="shop-price-buy__unit">G</span>
                </span>
                <span className="shop-price-buy__hint">{affordable ? `Acheter x${buyQuantity}` : 'Pas assez d or'}</span>
              </button>
              <button
                type="button"
                className={`button shop-open-owned-button shop-open-owned-button--${packId}`}
                disabled={ownedPackCount <= 0}
                onClick={() => handleOpenOwnedPack(packId)}
                data-testid={`open-owned-pack-${packId}`}
              >
                {ownedPackCount > 0 ? 'Ouvrir' : 'Aucun pack'}
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
                {isOpen ? 'Fermer aperçu' : 'Voir les cartes'}
              </button>
            </article>
          )
        })}
      </div>

      <section className="shop-special-section" aria-labelledby="shop-special-title">
        <div className="shop-special-head">
          <h2 id="shop-special-title">Packs spéciaux</h2>
          <p className="small">Ouverture instantanée avec boosters de génération ou de cible.</p>
        </div>
        <div className="shop-special-grid">
          {specialPackOrder.map((packId) => {
            const price = getSpecialPackPrice(packId)
            const affordable = profile.gold >= price
            const isLegendaryFocus = packId === 'legendary_focus'
            const canBuy = affordable && (!isLegendaryFocus || legendaryFocusTargetCardId.length > 0)
            const visual = packVisuals[packId]
            const selectedLegendaryCard = legendaryCards.find((card) => card.id === legendaryFocusTargetCardId) ?? null
            const generationFocusPool = isGenerationFocusPack(packId)
              ? cardPool.filter((card) => isCardInGeneration(card.id, generationFocusByPack[packId]))
              : []
            const generationFocusOwnedCount = generationFocusPool.filter((card) => ownedCardIdsSet.has(card.id)).length
            const generationFocusRarities = dropRarityOrder.filter((rarity) =>
              generationFocusPool.some((card) => card.rarity === rarity),
            )

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
                    aria-label={`Acheter et ouvrir ${formatPackLabel(packId)} pour ${price} or`}
                  >
                    <img
                      className="shop-special-pack-art"
                      src={visual.artSrc}
                      alt={`Illustration ${formatPackLabel(packId)}`}
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
                      <span className="shop-special-pack-intel-tag">1 tirage focus + 2 remplissages</span>
                      <span className="shop-special-pack-intel-sub">1% de base, +1% par raté, reset si ça touche.</span>
                    </div>
                    <p className="shop-special-pack-target-label">Légendaire ciblée</p>
                    <div
                      className="shop-special-pack-target-picker"
                      data-testid="shop-special-pack-legendary-target"
                      role="listbox"
                      aria-label="Cibles légendaires"
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
                            {ownedCardIdsSet.has(card.id) ? 'Possédée' : 'Manquante'}
                          </span>
                        </article>
                      ))}
                    </div>
                    <p className="small shop-special-pack-target-note">
                      Slot focus: {selectedLegendaryCard ? selectedLegendaryCard.name : 'Aucune cible'} | Chance actuelle:{' '}
                      {legendaryFocusChancePercent}%
                    </p>
                  </div>
                ) : (
                  <div className="shop-special-pack-intel">
                    <span className="shop-special-pack-intel-tag">Booster Gen · 3 tirages</span>
                    <div className="shop-special-pack-intel-stats">
                      <span>Pool: {generationFocusPool.length}</span>
                      <span>
                        Possédées: {generationFocusOwnedCount}/{generationFocusPool.length}
                      </span>
                    </div>
                    <div className="shop-special-pack-intel-rates">
                      {generationFocusRarities.map((rarity) => (
                        <span key={rarity} className={`shop-special-pack-intel-rate shop-special-pack-intel-rate--${rarity}`}>
                          {formatRarityLabel(rarity)} {generationFocusBaseRates[rarity]}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="shop-price-buy shop-special-pack-buy shop-special-pack-buy--display" aria-hidden="true">
                  <span className="shop-price-buy__label">Prix</span>
                  <span className="shop-price-buy__value">
                    {price}
                    <span className="shop-price-buy__unit">G</span>
                  </span>
                  <span className="shop-price-buy__hint">Clique l'image pour acheter</span>
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
                  <h2 id={`shop-pack-modal-title-${openPackId}`}>Cartes du {formatPackLabel(openPackId)}</h2>
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
                Fermer
              </button>
            </div>
            <div className="shop-pack-modal-sections">
              <div className="shop-pack-modal-rarity-tabs" role="tablist" aria-label="Pages de rareté">
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
                      {activeModalSection.ownedCount}/{activeModalSection.cards.length} possédées | {activeModalSection.dropRate}%
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
                      <p className="small shop-pack-modal-empty">Aucune carte disponible dans cette rareté.</p>
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
                        Précédent
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
                        Suivant
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
                  <h2 id="shop-opened-reveal-title">{formatPackLabel(openedPackResult.packId)} ouvert</h2>
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
                    Ouvrir encore
                  </button>
                ) : null}
                <button
                  type="button"
                  className="button"
                  onClick={() => setOpenedPackResult(null)}
                  data-testid="shop-opened-reveal-close"
                >
                  Fermer
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
          Accueil
        </Link>
      </div>
    </section>
  )
}
