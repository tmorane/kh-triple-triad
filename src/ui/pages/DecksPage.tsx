import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { PRIMARY_MATCH_MODE, VISIBLE_MATCH_MODES } from '../../app/matchUiConfig'
import { getCard } from '../../domain/cards/cardPool'
import { getDeckForMode, getSelectedDeckSlot } from '../../domain/cards/decks'
import { cardElementIds, getElementLabel } from '../../domain/cards/taxonomy'
import { cardPool } from '../../domain/cards/cardPool'
import { getElementEffectText } from '../../domain/match/elementEffectsCatalog'
import { getModeSpec } from '../../domain/match/modeSpec'
import { hasShinyCopy } from '../../domain/progression/shiny'
import type { CardDef, CardElementId, CardId, MatchMode, Rarity } from '../../domain/types'
import { useGame } from '../../app/useGame'
import { TriadCard } from '../components/TriadCard'
import { getElementLogoMeta } from '../components/elementLogos'

type DecksSortMode = 'selected-first' | 'power-desc' | 'name-asc'

const rarityFilterOrder: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

const decksSortOptions: Array<{ value: DecksSortMode; label: string }> = [
  { value: 'power-desc', label: 'Power (High to Low)' },
  { value: 'selected-first', label: 'Selected First' },
  { value: 'name-asc', label: 'Name (A-Z)' },
]

const DECKS_CARDS_PER_PAGE = 12

function getCardPower(card: CardDef): number {
  return card.top + card.right + card.bottom + card.left
}

function compareByName(left: CardDef, right: CardDef): number {
  const byName = left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' })
  if (byName !== 0) {
    return byName
  }
  return left.id.localeCompare(right.id)
}

function compareByPower(left: CardDef, right: CardDef): number {
  const byPower = getCardPower(right) - getCardPower(left)
  if (byPower !== 0) {
    return byPower
  }
  return compareByName(left, right)
}

function formatDeckElementCount(count: number): string {
  return `${count} carte${count === 1 ? '' : 's'} dans le deck`
}

function buildElementInfoLabel(elementId: CardElementId, count: number): string {
  const status = count > 0 ? 'actif' : 'inactif'
  return `${getElementLabel(elementId)}. ${formatDeckElementCount(count)}. ${status}. ${getElementEffectText(elementId, 'plain')}`
}

const deckModeLabelByMode: Record<MatchMode, string> = {
  '3x3': '3x3 (5 cards)',
  '4x4': '4x4 (8 cards)',
}

export function DecksPage() {
  const { profile, selectDeckSlot, renameDeckSlot, toggleDeckSlotCard } = useGame()
  const selectedSlot = getSelectedDeckSlot(profile)

  const [error, setError] = useState<string | null>(null)
  const [deckNameError, setDeckNameError] = useState<string | null>(null)
  const [deckNameDraft, setDeckNameDraft] = useState(selectedSlot.name)
  const [editMode, setEditMode] = useState<MatchMode>(PRIMARY_MATCH_MODE)

  const ownedCards = useMemo(
    () => cardPool.filter((card) => profile.ownedCardIds.includes(card.id)),
    [profile.ownedCardIds],
  )

  const availableRarities = useMemo(
    () => rarityFilterOrder.filter((rarity) => ownedCards.some((card) => card.rarity === rarity)),
    [ownedCards],
  )

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRarities, setSelectedRarities] = useState<Rarity[]>(availableRarities)
  const [selectedElements, setSelectedElements] = useState<CardElementId[]>(cardElementIds)
  const [hoveredElementId, setHoveredElementId] = useState<CardElementId | null>(null)
  const [sortMode, setSortMode] = useState<DecksSortMode>('power-desc')
  const [currentPage, setCurrentPage] = useState(1)

  const modeSpec = useMemo(() => getModeSpec(editMode), [editMode])
  const selectedDeckPreviewColumns = modeSpec.deckSize === 8 ? 4 : modeSpec.deckSize
  const selectedDeck = useMemo(() => getDeckForMode(selectedSlot, editMode), [editMode, selectedSlot])
  const selectedDeckElementCounts = useMemo(() => {
    const counts = Object.fromEntries(cardElementIds.map((elementId) => [elementId, 0])) as Record<CardElementId, number>
    for (const cardId of selectedDeck) {
      const elementId = getCard(cardId).elementId
      counts[elementId] += 1
    }
    return counts
  }, [selectedDeck])
  const selectedDeckElementSet = useMemo(
    () => new Set(selectedDeck.map((cardId) => getCard(cardId).elementId)),
    [selectedDeck],
  )
  const activeDeckElementIds = useMemo(
    () => cardElementIds.filter((elementId) => selectedDeckElementSet.has(elementId)),
    [selectedDeckElementSet],
  )
  const inactiveDeckElementIds = useMemo(
    () => cardElementIds.filter((elementId) => !selectedDeckElementSet.has(elementId)),
    [selectedDeckElementSet],
  )
  const hoveredElementCount = hoveredElementId ? selectedDeckElementCounts[hoveredElementId] : 0

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeckNameDraft(selectedSlot.name)
    setDeckNameError(null)
  }, [selectedSlot.id, selectedSlot.name])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedRarities((current) => {
      const filtered = current.filter((rarity) => availableRarities.includes(rarity))
      if (filtered.length > 0) {
        return filtered
      }
      return availableRarities
    })
  }, [availableRarities])

  const selectedCardSet = useMemo(() => new Set(selectedDeck), [selectedDeck])
  const selectedRaritySet = useMemo(() => new Set(selectedRarities), [selectedRarities])
  const selectedElementSet = useMemo(() => new Set(selectedElements), [selectedElements])

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredCards = useMemo(
    () =>
      ownedCards.filter((card) => {
        if (selectedCardSet.has(card.id)) {
          return false
        }

        if (!selectedRaritySet.has(card.rarity)) {
          return false
        }

        if (!selectedElementSet.has(card.elementId)) {
          return false
        }

        if (!normalizedSearch) {
          return true
        }

        const nameMatches = card.name.toLowerCase().includes(normalizedSearch)
        const idMatches = card.id.toLowerCase().includes(normalizedSearch)
        return nameMatches || idMatches
      }),
    [normalizedSearch, ownedCards, selectedCardSet, selectedElementSet, selectedRaritySet],
  )

  const visibleCards = useMemo(() => {
    const sorted = [...filteredCards]

    if (sortMode === 'selected-first') {
      sorted.sort((left, right) => {
        const leftSelected = selectedCardSet.has(left.id)
        const rightSelected = selectedCardSet.has(right.id)
        if (leftSelected !== rightSelected) {
          return leftSelected ? -1 : 1
        }
        return compareByPower(left, right)
      })
      return sorted
    }

    if (sortMode === 'power-desc') {
      sorted.sort(compareByPower)
      return sorted
    }

    sorted.sort(compareByName)
    return sorted
  }, [filteredCards, selectedCardSet, sortMode])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(visibleCards.length / DECKS_CARDS_PER_PAGE)), [visibleCards.length])

  const paginatedCards = useMemo(() => {
    const startIndex = (currentPage - 1) * DECKS_CARDS_PER_PAGE
    return visibleCards.slice(startIndex, startIndex + DECKS_CARDS_PER_PAGE)
  }, [currentPage, visibleCards])

  const isDefaultFilterState =
    normalizedSearch.length === 0 &&
    sortMode === 'power-desc' &&
    selectedRarities.length === availableRarities.length &&
    availableRarities.every((rarity) => selectedRaritySet.has(rarity)) &&
    selectedElements.length === cardElementIds.length &&
    cardElementIds.every((elementId) => selectedElementSet.has(elementId))

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1)
  }, [editMode, normalizedSearch, selectedElements, selectedRarities, selectedSlot.id, sortMode])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage((page) => (page > totalPages ? totalPages : page))
  }, [totalPages])

  const handleCardToggle = (cardId: CardId) => {
    const isSelected = selectedCardSet.has(cardId)
    if (!isSelected && selectedDeck.length >= modeSpec.deckSize) {
      setError(`Deck already has ${modeSpec.deckSize} cards. Remove one first.`)
      return
    }

    setError(null)
    toggleDeckSlotCard(selectedSlot.id, cardId, editMode)
  }

  const handleRarityToggle = (rarity: Rarity) => {
    setSelectedRarities((current) => {
      if (current.includes(rarity)) {
        if (current.length === 1) {
          return current
        }
        return current.filter((value) => value !== rarity)
      }

      const next = [...current, rarity]
      return rarityFilterOrder.filter((value) => availableRarities.includes(value) && next.includes(value))
    })
  }

  const handleElementToggle = (elementId: CardElementId) => {
    setSelectedElements((current) => {
      if (current.length === cardElementIds.length && current.every((value) => cardElementIds.includes(value))) {
        return [elementId]
      }

      if (current.includes(elementId)) {
        if (current.length === 1) {
          return cardElementIds
        }
        return current.filter((value) => value !== elementId)
      }

      const next = [...current, elementId]
      return cardElementIds.filter((value) => next.includes(value))
    })
  }

  const handleResetFilters = () => {
    setSearchTerm('')
    setSelectedRarities(availableRarities)
    setSelectedElements(cardElementIds)
    setSortMode('power-desc')
  }

  const handleDeckNameCommit = () => {
    const result = renameDeckSlot(selectedSlot.id, deckNameDraft)
    if (!result.valid) {
      setDeckNameError(result.reason ?? 'Invalid deck name.')
      return
    }

    setDeckNameError(null)
    setDeckNameDraft(deckNameDraft.trim())
  }

  return (
    <section className="panel setup-panel">
      <div className="setup-layout" data-testid="decks-layout">
        <aside className="setup-builder" data-testid="decks-column-builder">
          <h1>Decks</h1>
          <p className="small">Build your decks here. Match options now live on Play.</p>

          <div className="setup-slot-grid" aria-label="Deck slots">
            {profile.deckSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                className={`setup-slot-button ${slot.id === selectedSlot.id ? 'is-selected' : ''}`}
                onClick={() => {
                  setError(null)
                  setDeckNameError(null)
                  selectDeckSlot(slot.id)
                }}
                data-testid={`deck-slot-${slot.id}`}
              >
                <span className="setup-slot-name">{slot.name}</span>
                <span className="setup-slot-count">
                  {getDeckForMode(slot, editMode).length}/{modeSpec.deckSize}
                </span>
              </button>
            ))}
          </div>

          <div className="setup-deck-name-field">
            <label htmlFor="deck-name-input">Deck Name</label>
            <input
              id="deck-name-input"
              type="text"
              value={deckNameDraft}
              onChange={(event) => {
                setDeckNameError(null)
                setDeckNameDraft(event.target.value)
              }}
              onBlur={handleDeckNameCommit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleDeckNameCommit()
                }
              }}
              data-testid="deck-name-input"
            />
            {deckNameError ? <p className="error">{deckNameError}</p> : null}
          </div>

          <fieldset className="setup-rule-block">
            <legend>Deck Format</legend>
            <div className="rule-toggle-group setup-deck-mode-group">
              {VISIBLE_MATCH_MODES.map((mode) => (
                <label className="setup-rule-toggle setup-rule-toggle--deck-mode" key={mode}>
                  <input
                    type="radio"
                    name="decks-edit-mode"
                    checked={editMode === mode}
                    onChange={() => {
                      setError(null)
                      setEditMode(mode)
                    }}
                    data-testid={`setup-mode-${mode}`}
                  />
                  <span>{deckModeLabelByMode[mode]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <p className="small setup-deck-count">
            Deck: {selectedDeck.length}/{modeSpec.deckSize} selected
          </p>
          <div className="decks-element-activity" data-testid="decks-element-activity" aria-label="Deck element activity">
            <div className="decks-element-activity-row decks-element-activity-row--active" data-testid="decks-element-activity-active">
              {activeDeckElementIds.map((elementId) => {
                const logo = getElementLogoMeta(elementId)
                const elementCount = selectedDeckElementCounts[elementId]
                return (
                  <span
                    key={elementId}
                    className="decks-element-activity-chip is-active"
                    data-testid={`decks-element-activity-${elementId}`}
                    title={buildElementInfoLabel(elementId, elementCount)}
                    aria-label={buildElementInfoLabel(elementId, elementCount)}
                    tabIndex={0}
                    onMouseEnter={() => setHoveredElementId(elementId)}
                    onMouseLeave={() => setHoveredElementId((currentElementId) => (currentElementId === elementId ? null : currentElementId))}
                    onFocus={() => setHoveredElementId(elementId)}
                    onBlur={() => setHoveredElementId((currentElementId) => (currentElementId === elementId ? null : currentElementId))}
                  >
                    {logo ? (
                      <img
                        className="decks-element-activity-icon"
                        src={logo.imageSrc}
                        alt=""
                        width={16}
                        height={16}
                        loading="lazy"
                        decoding="async"
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>
                )
              })}
            </div>
            <div className="decks-element-activity-row decks-element-activity-row--inactive" data-testid="decks-element-activity-inactive">
              {inactiveDeckElementIds.map((elementId) => {
                const logo = getElementLogoMeta(elementId)
                const elementCount = selectedDeckElementCounts[elementId]
                return (
                  <span
                    key={elementId}
                    className="decks-element-activity-chip is-inactive"
                    data-testid={`decks-element-activity-${elementId}`}
                    title={buildElementInfoLabel(elementId, elementCount)}
                    aria-label={buildElementInfoLabel(elementId, elementCount)}
                    tabIndex={0}
                    onMouseEnter={() => setHoveredElementId(elementId)}
                    onMouseLeave={() => setHoveredElementId((currentElementId) => (currentElementId === elementId ? null : currentElementId))}
                    onFocus={() => setHoveredElementId(elementId)}
                    onBlur={() => setHoveredElementId((currentElementId) => (currentElementId === elementId ? null : currentElementId))}
                  >
                    {logo ? (
                      <img
                        className="decks-element-activity-icon"
                        src={logo.imageSrc}
                        alt=""
                        width={16}
                        height={16}
                        loading="lazy"
                        decoding="async"
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>
                )
              })}
            </div>
            <div className={`decks-element-activity-info ${hoveredElementId ? 'is-visible' : ''}`} data-testid="decks-element-activity-info">
              {hoveredElementId ? (
                <>
                  <p className="decks-element-activity-info-title">{getElementLabel(hoveredElementId)}</p>
                  <p
                    className={`decks-element-activity-info-meta ${hoveredElementCount > 0 ? 'is-active' : 'is-inactive'}`}
                    data-testid="decks-element-activity-info-meta"
                  >
                    {formatDeckElementCount(hoveredElementCount)} ·{' '}
                    {hoveredElementCount > 0 ? 'Actif dans ce deck' : 'Inactif dans ce deck'}
                  </p>
                  <p className="decks-element-activity-info-effect">{getElementEffectText(hoveredElementId)}</p>
                </>
              ) : (
                <p className="decks-element-activity-info-placeholder">
                  Survole un type pour voir son effet et son statut dans le deck.
                </p>
              )}
            </div>
          </div>

          <div
            className="setup-selected-cards"
            data-testid="setup-selected-cards"
            aria-label="Selected cards"
            style={{ '--setup-selected-columns': `${selectedDeckPreviewColumns}` } as CSSProperties}
          >
            {Array.from({ length: modeSpec.deckSize }, (_, index) => {
              const cardId = selectedDeck[index]
              if (!cardId) {
                return (
                  <div className="setup-selected-slot-empty" key={`empty-${index}`} data-testid={`setup-selected-slot-empty-${index}`}>
                    <span>Empty</span>
                  </div>
                )
              }

              const card = getCard(cardId)
              return (
                <TriadCard
                  key={cardId}
                  card={card}
                  context="setup"
                  shiny={hasShinyCopy(profile, cardId)}
                  selected
                  interactive
                  onClick={() => handleCardToggle(cardId)}
                  className="setup-preview-card"
                  testId={`setup-selected-card-${cardId}`}
                />
              )
            })}
          </div>

          {error ? <p className="error">{error}</p> : null}
        </aside>

        <section className="setup-collection" data-testid="decks-column-collection">
          <div className="setup-filter-bar" aria-label="Setup filters">
            <div className="setup-filter-row">
              <label className="setup-filter-label" htmlFor="setup-filter-search-input">
                Search
              </label>
              <input
                id="setup-filter-search-input"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name or ID"
                data-testid="setup-filter-search"
              />
            </div>

            <div className="setup-filter-row">
              <span className="setup-filter-label">Rarity</span>
              <div className="setup-rarity-filters" role="group" aria-label="Setup rarity filters">
                {availableRarities.map((rarity) => {
                  const isActive = selectedRaritySet.has(rarity)
                  return (
                    <button
                      key={rarity}
                      type="button"
                      className={`setup-rarity-chip ${isActive ? 'is-active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => handleRarityToggle(rarity)}
                      data-testid={`setup-filter-rarity-${rarity}`}
                    >
                      {rarity}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="setup-filter-row">
              <span className="setup-filter-label">Type</span>
              <div className="setup-rarity-filters" role="group" aria-label="Setup type filters">
                {cardElementIds.map((elementId) => {
                  const isActive = selectedElementSet.has(elementId)
                  const logo = getElementLogoMeta(elementId)
                  return (
                    <button
                      key={elementId}
                      type="button"
                      className={`setup-rarity-chip setup-rarity-chip--element ${isActive ? 'is-active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => handleElementToggle(elementId)}
                      data-testid={`setup-filter-type-${elementId}`}
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
                        <span className="element-chip-label">{getElementLabel(elementId)}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="setup-filter-row setup-filter-row--sort">
              <label className="setup-filter-label" htmlFor="setup-sort-select-input">
                Sort
              </label>
              <select
                id="setup-sort-select-input"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as DecksSortMode)}
                data-testid="setup-sort-select"
              >
                {decksSortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="button"
                onClick={handleResetFilters}
                disabled={isDefaultFilterState}
                data-testid="setup-filter-reset"
              >
                Reset
              </button>
            </div>

            <p className="small setup-result-count" data-testid="setup-result-count">
              {visibleCards.length} cards shown / {ownedCards.length} owned
            </p>

            <div className="setup-pagination" data-testid="setup-pagination">
              <button
                type="button"
                className="button setup-pagination-button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                data-testid="setup-pagination-prev"
              >
                Previous
              </button>
              <p className="small setup-pagination-page" data-testid="setup-pagination-page">
                Page {currentPage}/{totalPages}
              </p>
              <button
                type="button"
                className="button setup-pagination-button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                data-testid="setup-pagination-next"
              >
                Next
              </button>
            </div>
          </div>

          <div className="setup-card-grid" aria-label="Deck selection">
            {paginatedCards.map((card) => {
              const selected = selectedCardSet.has(card.id)
              return (
                <TriadCard
                  key={card.id}
                  card={card}
                  context="setup"
                  shiny={hasShinyCopy(profile, card.id)}
                  selected={selected}
                  interactive
                  onClick={() => handleCardToggle(card.id)}
                  testId={`setup-card-${card.id}`}
                />
              )
            })}
          </div>
        </section>
      </div>
    </section>
  )
}
