import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { cardPool } from '../../domain/cards/cardPool'
import { compareCardsByPokedexNumber, formatCardPokedexNumber } from '../../domain/cards/pokedex'
import { cardElementIds, getCategoryLabel, getElementLabel } from '../../domain/cards/taxonomy'
import {
  canCraftCardFromFragments,
  getCardFragmentCost,
  getCardFragments,
} from '../../domain/progression/fragments'
import { hasUnlockedAllAchievements } from '../../domain/progression/achievementRewards'
import { getNormalCopies, getShinyCraftCost, getShinyCopies, getTotalCopies, hasShinyCopy } from '../../domain/progression/shiny'
import type { CardDef, CardElementId, CardId, Rarity } from '../../domain/types'
import { TriadCard } from '../components/TriadCard'
import { getElementLogoMeta } from '../components/elementLogos'

type CollectionDiscoveryFilter = 'all' | 'owned' | 'locked' | 'fragment'
type CollectionFinishFilter = 'all' | 'shiny'

const rarityFilterOrder: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const collectionFiltersStorageKey = 'kh-triple-triad.collection-filters.v2'

const discoveryFilterOptions: Array<{ value: CollectionDiscoveryFilter; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'owned', label: 'Capturés' },
  { value: 'locked', label: 'Non capturés' },
  { value: 'fragment', label: 'Fragments' },
]

const finishFilterOptions: Array<{ value: CollectionFinishFilter; label: string }> = [
  { value: 'all', label: 'Toutes' },
  { value: 'shiny', label: 'Shiny' },
]

const rarityLabelById: Record<Rarity, string> = {
  common: 'Commune',
  uncommon: 'Peu commune',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
}

const statusSectionLabelById = {
  owned: 'Capturés',
  locked: 'Non capturés',
} as const

type CollectionStatusSectionId = keyof typeof statusSectionLabelById

const UNKNOWN_LABEL = 'Inconnu'

const POKEDEX_ID_PLACEHOLDER = '????'

const LOCKED_COPIES_PLACEHOLDER = '??'

const LOCKED_ENTRY_HINT = 'Données de carte masquées. Gagne des matchs pour révéler cette entrée.'

const EMPTY_FILTERS_HINT = 'Aucune entrée ne correspond aux filtres actuels.'

const EMPTY_INSPECT_HINT = 'Aucune carte sélectionnée. Ajuste les filtres pour afficher une entrée.'

const FILTER_RESULT_FORMAT = (visibleCount: number, totalCount: number) =>
  `${visibleCount} entrées affichées / ${totalCount} au total`

const CAPTURED_COUNT_FORMAT = (ownedCount: number, totalCount: number) =>
  `Entrées capturées : ${ownedCount}/${totalCount}`

const TOTAL_COPIES_FORMAT = (totalCopies: number) => `Copies totales : ${totalCopies}`

const getStatusSectionCountLabel = (sectionId: CollectionStatusSectionId, count: number) =>
  `${statusSectionLabelById[sectionId]} (${count})`

type PersistedCollectionFilters = {
  selectedRarities: Rarity[]
  selectedTypes: CardElementId[]
  discoveryFilter: CollectionDiscoveryFilter
  finishFilter: CollectionFinishFilter
}

type CollectionSection = {
  id: CollectionStatusSectionId
  cards: CardDef[]
  count: number
}

function createEmptyRarityCardGroups(): Record<Rarity, CardDef[]> {
  return {
    common: [],
    uncommon: [],
    rare: [],
    epic: [],
    legendary: [],
  }
}

const cardsByRarityInPool = createEmptyRarityCardGroups()

for (const card of cardPool) {
  cardsByRarityInPool[card.rarity].push(card)
}

const availableRaritiesInPool = rarityFilterOrder.filter((rarity) => cardsByRarityInPool[rarity].length > 0)
const availableTypesInPool = cardElementIds
const cardsByDexOrder = [...cardPool].sort(compareCardsByPokedexNumber)

function isCollectionDiscoveryFilter(value: unknown): value is CollectionDiscoveryFilter {
  return value === 'all' || value === 'owned' || value === 'locked' || value === 'fragment'
}

function isCollectionFinishFilter(value: unknown): value is CollectionFinishFilter {
  return value === 'all' || value === 'shiny'
}

function isRarity(value: unknown): value is Rarity {
  return typeof value === 'string' && rarityFilterOrder.includes(value as Rarity)
}

function isCardElement(value: unknown): value is CardElementId {
  return typeof value === 'string' && cardElementIds.includes(value as CardElementId)
}

function readPersistedCollectionFilters(
  availableRarities: Rarity[],
  availableTypes: CardElementId[],
): PersistedCollectionFilters | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(collectionFiltersStorageKey)
    if (!rawValue) {
      return null
    }

    const parsedValue: unknown = JSON.parse(rawValue)
    if (!parsedValue || typeof parsedValue !== 'object') {
      return null
    }

    const discoveryCandidate = (parsedValue as { discoveryFilter?: unknown }).discoveryFilter
    const finishCandidate = (parsedValue as { finishFilter?: unknown }).finishFilter
    const rarityCandidates = (parsedValue as { selectedRarities?: unknown }).selectedRarities
    const typeCandidates = (parsedValue as { selectedTypes?: unknown }).selectedTypes
    const selectedRaritySet = new Set(
      Array.isArray(rarityCandidates) ? rarityCandidates.filter((value) => isRarity(value)) : [],
    )
    const selectedTypeSet = new Set(
      Array.isArray(typeCandidates) ? typeCandidates.filter((value) => isCardElement(value)) : [],
    )
    const selectedRarities = availableRarities.filter((rarity) => selectedRaritySet.has(rarity))
    const selectedTypes = availableTypes.filter((typeId) => selectedTypeSet.has(typeId))

    return {
      discoveryFilter: isCollectionDiscoveryFilter(discoveryCandidate) ? discoveryCandidate : 'all',
      finishFilter: isCollectionFinishFilter(finishCandidate) ? finishCandidate : 'all',
      selectedRarities: selectedRarities.length > 0 ? selectedRarities : availableRarities,
      selectedTypes: selectedTypes.length > 0 ? selectedTypes : availableTypes,
    }
  } catch {
    return null
  }
}

function persistCollectionFilters(filters: PersistedCollectionFilters) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(collectionFiltersStorageKey, JSON.stringify(filters))
  } catch {
    // Ignore storage errors (private mode, quota exceeded, etc.)
  }
}

function formatRarityLabel(rarity: Rarity): string {
  return rarityLabelById[rarity]
}

type ViewportSnapshot = {
  scrollY: number
  height: number
  width: number
}

const collectionGridVirtualizationThreshold = 28
const collectionGridOverscanRows = 1
const collectionGridCardsPerPage = 25
const collectionCardAspectRatio = 4.25 / 3
const collectionGridFallbackCardSizePx = 124
const collectionGridFallbackGapPx = 8.8

function getCollectionCardsPerPage(): number {
  if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom')) {
    return Number.MAX_SAFE_INTEGER
  }
  return collectionGridCardsPerPage
}

function useViewportSnapshot(enabled: boolean): ViewportSnapshot {
  const [snapshot, setSnapshot] = useState<ViewportSnapshot>(() => {
    if (typeof window === 'undefined') {
      return { scrollY: 0, height: 0, width: 0 }
    }
    return {
      scrollY: window.scrollY,
      height: window.innerHeight,
      width: window.innerWidth,
    }
  })

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    let frameId = 0
    const updateSnapshot = () => {
      setSnapshot({
        scrollY: window.scrollY,
        height: window.innerHeight,
        width: window.innerWidth,
      })
    }
    const scheduleSnapshotUpdate = () => {
      if (frameId !== 0) {
        return
      }
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        updateSnapshot()
      })
    }

    updateSnapshot()
    window.addEventListener('scroll', scheduleSnapshotUpdate, { passive: true })
    window.addEventListener('resize', scheduleSnapshotUpdate)

    return () => {
      window.removeEventListener('scroll', scheduleSnapshotUpdate)
      window.removeEventListener('resize', scheduleSnapshotUpdate)
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [enabled])

  return snapshot
}

type CollectionStatusSectionProps = {
  section: CollectionSection
  owned: Set<CardId>
  recent: Set<CardId>
  selectedCardId: CardId
  cardCopiesById: Record<CardId, number>
  shinyCardCopiesById: Record<CardId, number>
  selectCardHandlers: Map<CardId, () => void>
  virtualizationEnabled: boolean
  viewport: ViewportSnapshot
  fragmentSilhouette: boolean
}

type VirtualWindow = {
  startIndex: number
  endIndex: number
  topSpacerHeight: number
  bottomSpacerHeight: number
}

function CollectionStatusSection({
  section,
  owned,
  recent,
  selectedCardId,
  cardCopiesById,
  shinyCardCopiesById,
  selectCardHandlers,
  virtualizationEnabled,
  viewport,
  fragmentSilhouette,
}: CollectionStatusSectionProps) {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const cardsPerPage = useMemo(() => getCollectionCardsPerPage(), [])
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(section.cards.length / cardsPerPage))
  const pageStartIndex = (page - 1) * cardsPerPage
  const pageEndIndex = Math.min(section.cards.length, pageStartIndex + cardsPerPage)
  const pagedCards = useMemo(
    () => section.cards.slice(pageStartIndex, pageEndIndex),
    [pageEndIndex, pageStartIndex, section.cards],
  )
  const [gridLayout, setGridLayout] = useState({
    columns: 6,
    rowHeight: collectionGridFallbackCardSizePx * collectionCardAspectRatio + collectionGridFallbackGapPx,
  })
  const useVirtualization = virtualizationEnabled && pagedCards.length >= collectionGridVirtualizationThreshold
  const [virtualWindow, setVirtualWindow] = useState<VirtualWindow>(() => ({
    startIndex: 0,
    endIndex: pagedCards.length,
    topSpacerHeight: 0,
    bottomSpacerHeight: 0,
  }))

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const measureGridLayout = useCallback(() => {
    if (!useVirtualization || typeof window === 'undefined') {
      return
    }

    const gridElement = gridRef.current
    if (!gridElement) {
      return
    }

    const computedStyles = window.getComputedStyle(gridElement)
    const rawCardSize = Number.parseFloat(computedStyles.getPropertyValue('--collection-card-size'))
    const cardSize = Number.isFinite(rawCardSize) && rawCardSize > 0 ? rawCardSize : collectionGridFallbackCardSizePx
    const rawGap = Number.parseFloat(computedStyles.rowGap || computedStyles.gap)
    const gap = Number.isFinite(rawGap) && rawGap >= 0 ? rawGap : collectionGridFallbackGapPx
    const columnCount = Math.max(1, Math.floor((gridElement.clientWidth + gap) / (cardSize + gap)))
    const rowHeight = cardSize * collectionCardAspectRatio + gap

    setGridLayout((current) => {
      if (current.columns === columnCount && Math.abs(current.rowHeight - rowHeight) < 0.5) {
        return current
      }
      return {
        columns: columnCount,
        rowHeight,
      }
    })
  }, [useVirtualization])

  useEffect(() => {
    if (!useVirtualization) {
      return
    }
    measureGridLayout()
  }, [measureGridLayout, useVirtualization, viewport.width])

  useEffect(() => {
    if (!useVirtualization || typeof window === 'undefined' || typeof window.ResizeObserver === 'undefined') {
      return
    }

    const gridElement = gridRef.current
    if (!gridElement) {
      return
    }

    const resizeObserver = new window.ResizeObserver(() => {
      measureGridLayout()
    })
    resizeObserver.observe(gridElement)

    return () => resizeObserver.disconnect()
  }, [measureGridLayout, useVirtualization])

  useEffect(() => {
    const totalCards = pagedCards.length
    if (!useVirtualization || totalCards === 0 || typeof window === 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVirtualWindow((current) => {
        if (
          current.startIndex === 0 &&
          current.endIndex === totalCards &&
          current.topSpacerHeight === 0 &&
          current.bottomSpacerHeight === 0
        ) {
          return current
        }
        return {
          startIndex: 0,
          endIndex: totalCards,
          topSpacerHeight: 0,
          bottomSpacerHeight: 0,
        }
      })
      return
    }

    const gridElement = gridRef.current
    if (!gridElement || viewport.height <= 0) {
      setVirtualWindow((current) => {
        const fallbackEndIndex = Math.min(totalCards, gridLayout.columns * 12)
        if (
          current.startIndex === 0 &&
          current.endIndex === fallbackEndIndex &&
          current.topSpacerHeight === 0 &&
          current.bottomSpacerHeight === 0
        ) {
          return current
        }
        return {
          startIndex: 0,
          endIndex: fallbackEndIndex,
          topSpacerHeight: 0,
          bottomSpacerHeight: 0,
        }
      })
      return
    }

    const gridTop = window.scrollY + gridElement.getBoundingClientRect().top
    const viewportTopInGrid = viewport.scrollY - gridTop
    const viewportBottomInGrid = viewportTopInGrid + viewport.height
    const totalRows = Math.ceil(totalCards / gridLayout.columns)
    const rawStartRow = Math.floor(viewportTopInGrid / gridLayout.rowHeight) - collectionGridOverscanRows
    const rawEndRow = Math.ceil(viewportBottomInGrid / gridLayout.rowHeight) + collectionGridOverscanRows
    const startRow = Math.min(Math.max(0, rawStartRow), Math.max(totalRows - 1, 0))
    const endRow = Math.min(Math.max(startRow, rawEndRow), Math.max(totalRows - 1, 0))
    const startIndex = Math.min(totalCards, startRow * gridLayout.columns)
    const endIndex = Math.min(totalCards, (endRow + 1) * gridLayout.columns)
    const topSpacerHeight = startRow * gridLayout.rowHeight
    const bottomRows = Math.max(0, totalRows - endRow - 1)
    const bottomSpacerHeight = bottomRows * gridLayout.rowHeight

    setVirtualWindow((current) => {
      if (
        current.startIndex === startIndex &&
        current.endIndex === endIndex &&
        Math.abs(current.topSpacerHeight - topSpacerHeight) < 0.5 &&
        Math.abs(current.bottomSpacerHeight - bottomSpacerHeight) < 0.5
      ) {
        return current
      }
      return {
        startIndex,
        endIndex,
        topSpacerHeight,
        bottomSpacerHeight,
      }
    })
  }, [gridLayout.columns, gridLayout.rowHeight, pagedCards.length, useVirtualization, viewport.height, viewport.scrollY])

  const visibleCards = useMemo(
    () => pagedCards.slice(virtualWindow.startIndex, virtualWindow.endIndex),
    [pagedCards, virtualWindow.endIndex, virtualWindow.startIndex],
  )

  return (
    <section
      className="collection-rarity-section"
      data-testid={`collection-status-section-${section.id}`}
    >
      <h3 className="collection-rarity-title" data-testid={`collection-status-title-${section.id}`}>
        {getStatusSectionCountLabel(section.id, section.count)}
      </h3>
      {totalPages > 1 ? (
        <div className="collection-pagination" data-testid={`collection-pagination-${section.id}`}>
          <button
            type="button"
            className="collection-pagination-button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            data-testid={`collection-pagination-prev-${section.id}`}
          >
            Precedent
          </button>
          <span className="collection-pagination-status" data-testid={`collection-pagination-status-${section.id}`}>
            Page {page}/{totalPages}
          </span>
          <button
            type="button"
            className="collection-pagination-button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === totalPages}
            data-testid={`collection-pagination-next-${section.id}`}
          >
            Suivant
          </button>
        </div>
      ) : null}
      <div className="collection-grid" ref={gridRef}>
        {virtualWindow.topSpacerHeight > 0 ? (
          <div
            className="collection-grid-spacer"
            style={{ height: `${virtualWindow.topSpacerHeight}px` }}
            aria-hidden="true"
          />
        ) : null}
        {visibleCards.map((card) => {
          const isOwned = owned.has(card.id)
          const isNew = recent.has(card.id)
          const normalCopies = cardCopiesById[card.id] ?? 0
          const shinyCopies = shinyCardCopiesById[card.id] ?? 0
          return (
            <TriadCard
              key={card.id}
              card={card}
              context="collection-list"
              displayMode={fragmentSilhouette ? 'fragment-silhouette' : 'default'}
              owned={isOwned}
              copies={normalCopies + shinyCopies}
              shiny={shinyCopies > 0}
              selected={selectedCardId === card.id}
              showNew={isNew}
              interactive
              deferArtLoading={false}
              onClick={selectCardHandlers.get(card.id)}
              testId={`collection-card-${card.id}`}
            />
          )
        })}
        {virtualWindow.bottomSpacerHeight > 0 ? (
          <div
            className="collection-grid-spacer"
            style={{ height: `${virtualWindow.bottomSpacerHeight}px` }}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </section>
  )
}

export function CollectionPage() {
  const { profile, lastMatchSummary, craftCardFromFragments, craftShinyCard } = useGame()
  const [virtualizationEnabled] = useState(false)
  const viewport = useViewportSnapshot(virtualizationEnabled)
  const owned = useMemo(() => new Set(profile.ownedCardIds), [profile.ownedCardIds])
  const recent = useMemo(() => new Set(lastMatchSummary?.newlyOwnedCards ?? []), [lastMatchSummary?.newlyOwnedCards])
  const totalCopies = useMemo(
    () => cardPool.reduce((sum, card) => sum + getTotalCopies(profile, card.id), 0),
    [profile],
  )
  const [initialFilters] = useState<PersistedCollectionFilters | null>(() =>
    readPersistedCollectionFilters(availableRaritiesInPool, availableTypesInPool),
  )
  const [selectedCardId, setSelectedCardId] = useState<CardId>(() =>
    cardsByDexOrder.find((card) => owned.has(card.id))?.id ?? cardsByDexOrder[0]?.id ?? 'c01',
  )
  const [selectedRarities, setSelectedRarities] = useState<Rarity[]>(initialFilters?.selectedRarities ?? availableRaritiesInPool)
  const [selectedTypes, setSelectedTypes] = useState<CardElementId[]>(initialFilters?.selectedTypes ?? availableTypesInPool)
  const [discoveryFilter, setDiscoveryFilter] = useState<CollectionDiscoveryFilter>(initialFilters?.discoveryFilter ?? 'all')
  const [finishFilter, setFinishFilter] = useState<CollectionFinishFilter>(initialFilters?.finishFilter ?? 'all')
  const isFragmentFilterActive = discoveryFilter === 'fragment'
  const selectCardHandlers = useMemo(() => {
    const handlers = new Map<CardId, () => void>()
    for (const card of cardsByDexOrder) {
      handlers.set(card.id, () => setSelectedCardId(card.id))
    }
    return handlers
  }, [])
  const selectedRaritySet = useMemo(() => new Set(selectedRarities), [selectedRarities])
  const selectedTypeSet = useMemo(() => new Set(selectedTypes), [selectedTypes])

  const filteredCards = useMemo(
    () => {
      const cards: CardDef[] = []
      const filterOwned = discoveryFilter === 'owned'
      const filterLocked = discoveryFilter === 'locked'
      const filterFragments = discoveryFilter === 'fragment'
      const filterShiny = finishFilter === 'shiny'

      for (const card of cardsByDexOrder) {
        if (!selectedRaritySet.has(card.rarity)) {
          continue
        }

        if (!selectedTypeSet.has(card.elementId)) {
          continue
        }

        const isOwnedCard = owned.has(card.id)
        if (filterOwned && !isOwnedCard) {
          continue
        }
        if (filterLocked && isOwnedCard) {
          continue
        }
        if (filterFragments && getCardFragments(profile, card.id) <= 0) {
          continue
        }
        if (filterShiny && !hasShinyCopy(profile, card.id)) {
          continue
        }

        cards.push(card)
      }

      return cards
    },
    [discoveryFilter, finishFilter, owned, profile, selectedRaritySet, selectedTypeSet],
  )

  const filteredSections = useMemo<CollectionSection[]>(() => {
    const ownedCards: CardDef[] = []
    const lockedCards: CardDef[] = []

    for (const card of filteredCards) {
      if (owned.has(card.id)) {
        ownedCards.push(card)
      } else {
        lockedCards.push(card)
      }
    }

    const sections: CollectionSection[] = []
    if (ownedCards.length > 0) {
      sections.push({
        id: 'owned',
        cards: ownedCards,
        count: ownedCards.length,
      })
    }
    if (lockedCards.length > 0) {
      sections.push({
        id: 'locked',
        cards: lockedCards,
        count: lockedCards.length,
      })
    }

    return sections
  }, [filteredCards, owned])

  useEffect(() => {
    if (filteredCards.length === 0) {
      return
    }

    if (!filteredCards.some((card) => card.id === selectedCardId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCardId(filteredCards[0].id)
    }
  }, [filteredCards, selectedCardId])

  useEffect(() => {
    persistCollectionFilters({
      selectedRarities,
      selectedTypes,
      discoveryFilter,
      finishFilter,
    })
  }, [discoveryFilter, finishFilter, selectedRarities, selectedTypes])

  const selectedCard = filteredCards.find((card) => card.id === selectedCardId) ?? filteredCards[0] ?? null
  const selectedOwned = selectedCard ? owned.has(selectedCard.id) : false
  const selectedNew = selectedCard ? recent.has(selectedCard.id) : false
  const selectedElementLogo = selectedCard ? getElementLogoMeta(selectedCard.elementId) : null
  const selectedNormalCopies = selectedCard ? getNormalCopies(profile, selectedCard.id) : 0
  const selectedShinyCopies = selectedCard ? getShinyCopies(profile, selectedCard.id) : 0
  const selectedCardFragments = selectedCard ? getCardFragments(profile, selectedCard.id) : 0
  const selectedCardFragmentCost = selectedCard ? getCardFragmentCost(selectedCard.id) : 0
  const selectedTotalCopies = selectedNormalCopies + selectedShinyCopies
  const selectedDisplayShiny = selectedCard ? hasShinyCopy(profile, selectedCard.id) : false
  const shinyCraftCost = getShinyCraftCost(profile)
  const chromaCharmActive = hasUnlockedAllAchievements(profile)
  const canCraftSelectedFromFragments =
    selectedCard !== null && canCraftCardFromFragments(profile, selectedCard.id) && Boolean(craftCardFromFragments)
  const canCraftSelected = selectedOwned && selectedNormalCopies >= shinyCraftCost

  const isDefaultFilterState =
    discoveryFilter === 'all' &&
    finishFilter === 'all' &&
    selectedRarities.length === availableRaritiesInPool.length &&
    selectedTypes.length === availableTypesInPool.length

  const toggleRarityFilter = (rarity: Rarity) => {
    setSelectedRarities((current) => {
      if (current.includes(rarity)) {
        if (current.length === 1) {
          return current
        }
        return current.filter((value) => value !== rarity)
      }

      const next = [...current, rarity]
      return availableRaritiesInPool.filter((value) => next.includes(value))
    })
  }

  const toggleTypeFilter = (typeId: CardElementId) => {
    setSelectedTypes((current) => {
      if (current.length === availableTypesInPool.length && current.every((value) => availableTypesInPool.includes(value))) {
        return [typeId]
      }

      if (current.includes(typeId)) {
        if (current.length === 1) {
          return availableTypesInPool
        }
        return current.filter((value) => value !== typeId)
      }

      const next = [...current, typeId]
      return availableTypesInPool.filter((value) => next.includes(value))
    })
  }

  const resetFilters = () => {
    setSelectedRarities(availableRaritiesInPool)
    setSelectedTypes(availableTypesInPool)
    setDiscoveryFilter('all')
    setFinishFilter('all')
  }

  return (
    <section className="panel collection-panel">
      <div className="collection-headline">
        <h1>Pokédex</h1>
        <div>
          <p className="small">{CAPTURED_COUNT_FORMAT(profile.ownedCardIds.length, cardPool.length)}</p>
          <p className="small">{TOTAL_COPIES_FORMAT(totalCopies)}</p>
        </div>
      </div>

      <div className="collection-layout">
        <section className="collection-index">
          <h2>Index Pokédex</h2>
          <div className="collection-filters" aria-label="Filtres Pokédex">
            <div className="collection-filter-row">
              <span className="collection-filter-label">Rareté</span>
              {availableRaritiesInPool.map((rarity) => {
                const isActive = selectedRarities.includes(rarity)
                return (
                  <button
                    key={rarity}
                    type="button"
                    className={`collection-filter-chip ${isActive ? 'is-active' : ''}`}
                    aria-pressed={isActive}
                    onClick={() => toggleRarityFilter(rarity)}
                    data-testid={`collection-filter-rarity-${rarity}`}
                  >
                    {formatRarityLabel(rarity)}
                  </button>
                )
              })}
            </div>

            <div className="collection-filter-row">
              <span className="collection-filter-label">Type</span>
              {availableTypesInPool.map((typeId) => {
                const isActive = selectedTypes.includes(typeId)
                const logo = getElementLogoMeta(typeId)
                return (
                  <button
                    key={typeId}
                    type="button"
                    className={`collection-filter-chip collection-filter-chip--element ${isActive ? 'is-active' : ''}`}
                    aria-pressed={isActive}
                    onClick={() => toggleTypeFilter(typeId)}
                    data-testid={`collection-filter-type-${typeId}`}
                  >
                    <span className="element-chip-content">
                      {logo ? (
                        <img
                          className="element-chip-icon"
                          src={logo.imageSrc}
                          alt={logo.name}
                          width={16}
                          height={16}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                      <span>{getElementLabel(typeId)}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="collection-filter-row">
              <span className="collection-filter-label">Découverte</span>
              <div className="collection-filter-segment" role="group" aria-label="Filtre découverte">
                {discoveryFilterOptions.map((option) => {
                  const isActive = discoveryFilter === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`collection-filter-segment-button ${isActive ? 'is-active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => setDiscoveryFilter(option.value)}
                      data-testid={`collection-filter-discovery-${option.value}`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="collection-filter-row">
              <span className="collection-filter-label">Finition</span>
              <div className="collection-filter-segment" role="group" aria-label="Filtre finition">
                {finishFilterOptions.map((option) => {
                  const isActive = finishFilter === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`collection-filter-segment-button ${isActive ? 'is-active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => setFinishFilter(option.value)}
                      data-testid={`collection-filter-finish-${option.value}`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                className="button collection-filter-reset"
                onClick={resetFilters}
                disabled={isDefaultFilterState}
                data-testid="collection-filter-reset"
              >
                Réinitialiser les filtres
              </button>
            </div>

            <p className="small collection-result-count" data-testid="collection-filter-result-count">
              {FILTER_RESULT_FORMAT(filteredCards.length, cardPool.length)}
            </p>
          </div>

          {filteredCards.length > 0 ? (
            <div className="collection-group-list" aria-label="Entrées Pokédex">
              {filteredSections.map((section) => (
                <CollectionStatusSection
                  key={section.id}
                  section={section}
                  owned={owned}
                  recent={recent}
                  selectedCardId={selectedCardId}
                  cardCopiesById={profile.cardCopiesById}
                  shinyCardCopiesById={profile.shinyCardCopiesById}
                  selectCardHandlers={selectCardHandlers}
                  virtualizationEnabled={virtualizationEnabled}
                  viewport={viewport}
                  fragmentSilhouette={isFragmentFilterActive}
                />
              ))}
            </div>
          ) : (
            <p className="small collection-empty-state" data-testid="collection-empty-state">
              {EMPTY_FILTERS_HINT}
            </p>
          )}
        </section>

        <aside className="collection-inspect" data-testid="collection-inspect">
          <h2>Fiche</h2>
          {selectedCard ? (
            <>
              <TriadCard
                card={selectedCard}
                context="collection-detail"
                displayMode={isFragmentFilterActive ? 'fragment-silhouette' : 'default'}
                owned={selectedOwned}
                copies={selectedTotalCopies}
                shiny={selectedDisplayShiny}
                showNew={selectedNew}
                testId="collection-inspect-card"
              />

              <dl className="collection-meta">
                <div className="collection-meta-row">
                  <dt>Nom</dt>
                  <dd data-testid="collection-selected-name">{selectedOwned ? selectedCard.name : UNKNOWN_LABEL}</dd>
                </div>
                <div className="collection-meta-row">
                  <dt>No.</dt>
                  <dd data-testid="collection-selected-id">
                    {selectedOwned ? formatCardPokedexNumber(selectedCard) : POKEDEX_ID_PLACEHOLDER}
                  </dd>
                </div>
                <div className="collection-meta-row">
                  <dt>Rareté</dt>
                  <dd data-testid="collection-selected-rarity">
                    {selectedOwned ? formatRarityLabel(selectedCard.rarity) : UNKNOWN_LABEL}
                  </dd>
                </div>
                <div className="collection-meta-row">
                  <dt>Catégorie</dt>
                  <dd data-testid="collection-selected-category">
                    {selectedOwned ? getCategoryLabel(selectedCard.categoryId) : 'Inconnu'}
                  </dd>
                </div>
                <div className="collection-meta-row">
                  <dt>Type Pokémon</dt>
                  <dd data-testid="collection-selected-element">
                    {selectedOwned ? (
                      <span className="collection-element-value">
                        {selectedElementLogo ? (
                          <img
                            className="collection-element-icon"
                            src={selectedElementLogo.imageSrc}
                            alt={`Type ${selectedElementLogo.name}`}
                            width={18}
                            height={18}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                        <span>{getElementLabel(selectedCard.elementId)}</span>
                      </span>
                    ) : (
                      'Inconnu'
                    )}
                  </dd>
                </div>
                <div className="collection-meta-row">
                  <dt>Copies</dt>
                  <dd data-testid="collection-selected-copies">
                    {selectedOwned ? selectedTotalCopies : LOCKED_COPIES_PLACEHOLDER}
                  </dd>
                </div>
                <div className="collection-meta-row">
                  <dt>Shiny</dt>
                  <dd data-testid="collection-selected-shiny-copies">{selectedOwned ? `x${selectedShinyCopies}` : LOCKED_COPIES_PLACEHOLDER}</dd>
                </div>
              </dl>

              <div className="collection-shiny-craft" data-testid="collection-fragment-craft">
                <p className="small" data-testid="collection-fragment-craft-progress">
                  Fragments: {selectedCardFragments}/{selectedCardFragmentCost}
                </p>
                <button
                  type="button"
                  className="button collection-shiny-craft-button"
                  onClick={() => craftCardFromFragments?.(selectedCard.id)}
                  disabled={!canCraftSelectedFromFragments}
                  data-testid="collection-fragment-craft-button"
                >
                  Fabriquer 1 carte
                </button>
              </div>

              {selectedOwned ? (
                <div className="collection-shiny-craft" data-testid="collection-shiny-craft">
                  {chromaCharmActive ? (
                    <p className="small" data-testid="collection-chroma-charm-badge">
                      Charm Chroma actif: coût shiny réduit de 50%
                    </p>
                  ) : null}
                  <p className="small" data-testid="collection-shiny-craft-progress">
                    Normales: {selectedNormalCopies}/{shinyCraftCost}
                  </p>
                  <button
                    type="button"
                    className="button collection-shiny-craft-button"
                    onClick={() => craftShinyCard?.(selectedCard.id)}
                    disabled={!canCraftSelected || !craftShinyCard}
                    data-testid="collection-shiny-craft-button"
                  >
                    Forger 1 Shiny
                  </button>
                </div>
              ) : null}

              {!selectedOwned ? (
                <p className="small collection-lock-hint" data-testid="collection-lock-hint">
                  {LOCKED_ENTRY_HINT}
                </p>
              ) : null}
            </>
          ) : (
            <p className="small collection-empty-state" data-testid="collection-inspect-empty">
              {EMPTY_INSPECT_HINT}
            </p>
          )}
        </aside>
      </div>

      <div className="actions">
        <Link className="button button-primary" to="/setup">
          Start Match
        </Link>
        <Link className="button" to="/">
          Home
        </Link>
      </div>
    </section>
  )
}
