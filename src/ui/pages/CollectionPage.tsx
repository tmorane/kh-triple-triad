import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { cardPool } from '../../domain/cards/cardPool'
import { getCategoryLabel, getElementLabel } from '../../domain/cards/taxonomy'
import type { CardDef, CardId, Rarity } from '../../domain/types'
import { TriadCard } from '../components/TriadCard'

type CollectionDiscoveryFilter = 'all' | 'owned' | 'locked'

const rarityFilterOrder: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const collectionFiltersStorageKey = 'kh-triple-triad.collection-filters.v1'

const discoveryFilterOptions: Array<{ value: CollectionDiscoveryFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'owned', label: 'Owned' },
  { value: 'locked', label: 'Locked' },
]

const raritySectionLabels: Record<Rarity, string> = {
  common: 'Communes',
  uncommon: 'Peu communes',
  rare: 'Rares',
  epic: 'Epiques',
  legendary: 'Legendaires',
}

type PersistedCollectionFilters = {
  selectedRarities: Rarity[]
  discoveryFilter: CollectionDiscoveryFilter
}

function isCollectionDiscoveryFilter(value: unknown): value is CollectionDiscoveryFilter {
  return value === 'all' || value === 'owned' || value === 'locked'
}

function isRarity(value: unknown): value is Rarity {
  return typeof value === 'string' && rarityFilterOrder.includes(value as Rarity)
}

function readPersistedCollectionFilters(availableRarities: Rarity[]): PersistedCollectionFilters | null {
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
    const rarityCandidates = (parsedValue as { selectedRarities?: unknown }).selectedRarities
    const selectedRaritySet = new Set(
      Array.isArray(rarityCandidates) ? rarityCandidates.filter((value) => isRarity(value)) : [],
    )
    const selectedRarities = availableRarities.filter((rarity) => selectedRaritySet.has(rarity))

    return {
      discoveryFilter: isCollectionDiscoveryFilter(discoveryCandidate) ? discoveryCandidate : 'all',
      selectedRarities: selectedRarities.length > 0 ? selectedRarities : availableRarities,
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

function formatRarityLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function CollectionPage() {
  const { profile, lastMatchSummary } = useGame()
  const owned = useMemo(() => new Set(profile.ownedCardIds), [profile.ownedCardIds])
  const recent = useMemo(() => new Set(lastMatchSummary?.newlyOwnedCards ?? []), [lastMatchSummary?.newlyOwnedCards])
  const availableRarities = useMemo(
    () => rarityFilterOrder.filter((rarity) => cardPool.some((card) => card.rarity === rarity)),
    [],
  )
  const [initialFilters] = useState<PersistedCollectionFilters | null>(() => readPersistedCollectionFilters(availableRarities))
  const totalCopies = Object.values(profile.cardCopiesById).reduce((sum, copies) => sum + copies, 0)
  const defaultSelectedCardId = cardPool.find((card) => owned.has(card.id))?.id ?? cardPool[0]?.id ?? 'c01'
  const [selectedCardId, setSelectedCardId] = useState<CardId>(defaultSelectedCardId)
  const [selectedRarities, setSelectedRarities] = useState<Rarity[]>(initialFilters?.selectedRarities ?? availableRarities)
  const [discoveryFilter, setDiscoveryFilter] = useState<CollectionDiscoveryFilter>(initialFilters?.discoveryFilter ?? 'all')

  const filteredCards = useMemo(
    () =>
      cardPool.filter((card) => {
        if (!selectedRarities.includes(card.rarity)) {
          return false
        }

        const isOwned = owned.has(card.id)
        if (discoveryFilter === 'owned') {
          return isOwned
        }
        if (discoveryFilter === 'locked') {
          return !isOwned
        }
        return true
      }),
    [discoveryFilter, owned, selectedRarities],
  )

  const cardsByRarity = useMemo(() => {
    const groups: Record<Rarity, CardDef[]> = {
      common: [],
      uncommon: [],
      rare: [],
      epic: [],
      legendary: [],
    }

    for (const card of cardPool) {
      groups[card.rarity].push(card)
    }

    return groups
  }, [])

  const filteredSections = useMemo(
    () =>
      availableRarities
        .map((rarity) => {
          const cards = filteredCards.filter((card) => card.rarity === rarity)
          const total = cardsByRarity[rarity].length
          const ownedCount = cardsByRarity[rarity].filter((card) => owned.has(card.id)).length

          return {
            rarity,
            cards,
            total,
            ownedCount,
          }
        })
        .filter((section) => section.cards.length > 0),
    [availableRarities, cardsByRarity, filteredCards, owned],
  )

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
      discoveryFilter,
    })
  }, [discoveryFilter, selectedRarities])

  const selectedCard = filteredCards.find((card) => card.id === selectedCardId) ?? filteredCards[0] ?? null
  const selectedOwned = selectedCard ? owned.has(selectedCard.id) : false
  const selectedNew = selectedCard ? recent.has(selectedCard.id) : false

  const isDefaultFilterState = discoveryFilter === 'all' && selectedRarities.length === availableRarities.length

  const toggleRarityFilter = (rarity: Rarity) => {
    setSelectedRarities((current) => {
      if (current.includes(rarity)) {
        if (current.length === 1) {
          return current
        }
        return current.filter((value) => value !== rarity)
      }

      const next = [...current, rarity]
      return availableRarities.filter((value) => next.includes(value))
    })
  }

  const resetFilters = () => {
    setSelectedRarities(availableRarities)
    setDiscoveryFilter('all')
  }

  return (
    <section className="panel collection-panel">
      <div className="collection-headline">
        <h1>Collection</h1>
        <div>
          <p className="small">
            Owned cards: {profile.ownedCardIds.length}/{cardPool.length}
          </p>
          <p className="small">Total copies: {totalCopies}</p>
        </div>
      </div>

      <div className="collection-layout">
        <section className="collection-index">
          <h2>Card Index</h2>
          <div className="collection-filters" aria-label="Collection filters">
            <div className="collection-filter-row">
              <span className="collection-filter-label">Rarity</span>
              {availableRarities.map((rarity) => {
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
              <span className="collection-filter-label">Discovery</span>
              <div className="collection-filter-segment" role="group" aria-label="Discovery filter">
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
              <button
                type="button"
                className="button collection-filter-reset"
                onClick={resetFilters}
                disabled={isDefaultFilterState}
                data-testid="collection-filter-reset"
              >
                Reset filters
              </button>
            </div>

            <p className="small collection-result-count" data-testid="collection-filter-result-count">
              {filteredCards.length} cards shown / {cardPool.length} total
            </p>
          </div>

          {filteredCards.length > 0 ? (
            <div className="collection-group-list" aria-label="Card index">
              {filteredSections.map((section) => (
                <section
                  className="collection-rarity-section"
                  key={section.rarity}
                  data-testid={`collection-rarity-section-${section.rarity}`}
                >
                  <h3 className="collection-rarity-title" data-testid={`collection-rarity-title-${section.rarity}`}>
                    {raritySectionLabels[section.rarity]} ({section.ownedCount}/{section.total})
                  </h3>
                  <div className="collection-grid">
                    {section.cards.map((card) => {
                      const isOwned = owned.has(card.id)
                      const isNew = recent.has(card.id)
                      return (
                        <TriadCard
                          key={card.id}
                          card={card}
                          context="collection-list"
                          owned={isOwned}
                          copies={profile.cardCopiesById[card.id] ?? 0}
                          selected={selectedCardId === card.id}
                          showNew={isNew}
                          interactive
                          onClick={() => setSelectedCardId(card.id)}
                          testId={`collection-card-${card.id}`}
                        />
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="small collection-empty-state" data-testid="collection-empty-state">
              No cards match the current filters.
            </p>
          )}
        </section>

        <aside className="collection-inspect" data-testid="collection-inspect">
          <h2>Inspect</h2>
          {selectedCard ? (
            <>
              <TriadCard
                card={selectedCard}
                context="collection-detail"
                owned={selectedOwned}
                copies={profile.cardCopiesById[selectedCard.id] ?? 0}
                showNew={selectedNew}
                testId="collection-inspect-card"
              />

              <dl className="collection-meta">
                <div className="collection-meta-row">
                  <dt>Name</dt>
                  <dd data-testid="collection-selected-name">{selectedOwned ? selectedCard.name : 'Unknown'}</dd>
                </div>
                <div className="collection-meta-row">
                  <dt>ID</dt>
                  <dd data-testid="collection-selected-id">{selectedOwned ? selectedCard.id.toUpperCase() : '????'}</dd>
                </div>
                <div className="collection-meta-row">
                  <dt>Rarity</dt>
                  <dd data-testid="collection-selected-rarity">
                    {selectedOwned ? formatRarityLabel(selectedCard.rarity) : 'Unknown'}
                  </dd>
                </div>
                <div className="collection-meta-row">
                  <dt>Catégorie</dt>
                  <dd data-testid="collection-selected-category">
                    {selectedOwned ? getCategoryLabel(selectedCard.categoryId) : 'Inconnu'}
                  </dd>
                </div>
                <div className="collection-meta-row">
                  <dt>Élément</dt>
                  <dd data-testid="collection-selected-element">
                    {selectedOwned ? getElementLabel(selectedCard.elementId) : 'Inconnu'}
                  </dd>
                </div>
                <div className="collection-meta-row">
                  <dt>Copies</dt>
                  <dd data-testid="collection-selected-copies">
                    {selectedOwned ? profile.cardCopiesById[selectedCard.id] ?? 1 : '??'}
                  </dd>
                </div>
              </dl>

              {!selectedOwned ? (
                <p className="small collection-lock-hint" data-testid="collection-lock-hint">
                  Hidden card data. Win matches to reveal this entry.
                </p>
              ) : null}
            </>
          ) : (
            <p className="small collection-empty-state" data-testid="collection-inspect-empty">
              No card selected. Adjust filters to see matching cards.
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
