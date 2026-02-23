import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { getCard } from '../../domain/cards/cardPool'
import { getSelectedDeckSlot, hasExactlyFiveUniqueCards } from '../../domain/cards/decks'
import { cardPool } from '../../domain/cards/cardPool'
import { getCpuOpponentPreview } from '../../domain/match/opponents'
import type { CardDef, CardId, MatchQueue, Rarity } from '../../domain/types'
import { TriadCard } from '../components/TriadCard'

type SetupSortMode = 'selected-first' | 'power-desc' | 'name-asc'
type SetupDeckMode = 'manual' | 'auto'

const rarityFilterOrder: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

const setupSortOptions: Array<{ value: SetupSortMode; label: string }> = [
  { value: 'selected-first', label: 'Selected First' },
  { value: 'power-desc', label: 'Power (High to Low)' },
  { value: 'name-asc', label: 'Name (A-Z)' },
]

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

export function SetupPage() {
  const navigate = useNavigate()
  const { profile, startMatch, selectDeckSlot, renameDeckSlot, toggleDeckSlotCard, setDeckSlotRules } = useGame()
  const selectedSlot = getSelectedDeckSlot(profile)

  const [deckNameDraft, setDeckNameDraft] = useState(selectedSlot.name)
  const [nameError, setNameError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
  const [sortMode, setSortMode] = useState<SetupSortMode>('selected-first')
  const [deckMode, setDeckMode] = useState<SetupDeckMode>('manual')

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

  const canStart = deckMode === 'auto' ? true : hasExactlyFiveUniqueCards(selectedSlot.cards)
  const opponentPreview = useMemo(
    () => getCpuOpponentPreview(profile, selectedSlot.cards),
    [profile, selectedSlot.cards],
  )

  const selectedCardSet = useMemo(() => new Set(selectedSlot.cards), [selectedSlot.cards])
  const selectedRaritySet = useMemo(() => new Set(selectedRarities), [selectedRarities])

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredCards = useMemo(
    () =>
      ownedCards.filter((card) => {
        if (!selectedRaritySet.has(card.rarity)) {
          return false
        }

        if (!normalizedSearch) {
          return true
        }

        const nameMatches = card.name.toLowerCase().includes(normalizedSearch)
        const idMatches = card.id.toLowerCase().includes(normalizedSearch)
        return nameMatches || idMatches
      }),
    [normalizedSearch, ownedCards, selectedRaritySet],
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

  const isDefaultFilterState =
    normalizedSearch.length === 0 &&
    sortMode === 'selected-first' &&
    selectedRarities.length === availableRarities.length &&
    availableRarities.every((rarity) => selectedRaritySet.has(rarity))

  const handleDeckNameChange = (name: string) => {
    setDeckNameDraft(name)
    const result = renameDeckSlot(selectedSlot.id, name)
    if (!result.valid) {
      setNameError(result.reason ?? 'Invalid deck name.')
      return
    }
    setNameError(null)
  }

  const handleStart = (queue: MatchQueue) => {
    if (!canStart) {
      setError('Select exactly 5 cards to start.')
      return
    }

    try {
      startMatch(queue, selectedSlot.cards, {
        open: true,
        same: selectedSlot.rules.same,
        plus: selectedSlot.rules.plus,
      }, { useAutoDeck: deckMode === 'auto' })
      navigate('/match')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start match.'
      setError(message)
    }
  }

  const handleCardToggle = (cardId: CardId) => {
    const isSelected = selectedCardSet.has(cardId)
    if (!isSelected && selectedSlot.cards.length >= 5) {
      setError('Deck already has 5 cards. Remove one first.')
      return
    }

    setError(null)
    toggleDeckSlotCard(selectedSlot.id, cardId)
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

  const handleResetFilters = () => {
    setSearchTerm('')
    setSelectedRarities(availableRarities)
    setSortMode('selected-first')
  }

  return (
    <section className="panel setup-panel">
      <div className="setup-layout" data-testid="setup-layout">
        <aside className="setup-builder" data-testid="setup-column-builder">
          <h1>Match Setup</h1>

          <div className="setup-slot-grid" aria-label="Deck slots">
            {profile.deckSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                className={`setup-slot-button ${slot.id === selectedSlot.id ? 'is-selected' : ''}`}
                onClick={() => {
                  setError(null)
                  setNameError(null)
                  setDeckNameDraft(slot.name)
                  selectDeckSlot(slot.id)
                }}
                data-testid={`deck-slot-${slot.id}`}
              >
                <span className="setup-slot-name">{slot.name}</span>
                <span className="setup-slot-count">{slot.cards.length}/5</span>
              </button>
            ))}
          </div>

          <div className="setup-deck-name-field">
            <label htmlFor="setup-deck-name-input">Deck Name</label>
            <input
              id="setup-deck-name-input"
              type="text"
              value={deckNameDraft}
              onChange={(event) => handleDeckNameChange(event.target.value)}
              data-testid="deck-name-input"
            />
          </div>

          {nameError && (
            <p className="error" role="alert">
              {nameError}
            </p>
          )}

          <fieldset className="setup-rule-block">
            <legend>Rules</legend>
            <div className="rule-toggle-group">
              <label className="setup-rule-toggle">
                <input
                  type="checkbox"
                  checked={selectedSlot.rules.same}
                  onChange={(event) => {
                    setError(null)
                    setDeckSlotRules(selectedSlot.id, {
                      same: event.target.checked,
                      plus: selectedSlot.rules.plus,
                    })
                  }}
                />
                <span>Enable Same</span>
              </label>
              <label className="setup-rule-toggle">
                <input
                  type="checkbox"
                  checked={selectedSlot.rules.plus}
                  onChange={(event) => {
                    setError(null)
                    setDeckSlotRules(selectedSlot.id, {
                      same: selectedSlot.rules.same,
                      plus: event.target.checked,
                    })
                  }}
                />
                <span>Enable Plus</span>
              </label>
            </div>
          </fieldset>

          <fieldset className="setup-rule-block">
            <legend>Deck Mode</legend>
            <div className="rule-toggle-group">
              <label className="setup-rule-toggle">
                <input
                  type="radio"
                  name="setup-deck-mode"
                  checked={deckMode === 'manual'}
                  onChange={() => setDeckMode('manual')}
                  data-testid="setup-deck-mode-manual"
                />
                <span>Use My Deck</span>
              </label>
              <label className="setup-rule-toggle">
                <input
                  type="radio"
                  name="setup-deck-mode"
                  checked={deckMode === 'auto'}
                  onChange={() => setDeckMode('auto')}
                  data-testid="setup-deck-mode-auto"
                />
                <span>Auto Deck (random, in-range, +50% rewards)</span>
              </label>
            </div>
          </fieldset>

          <p className="small" data-testid="setup-ranked-note">
            Ranked uses Open only (Same/Plus disabled).
          </p>

          <section className="setup-opponent-preview" aria-label="Opponent preview">
            <h2>Next Opponent</h2>
            <p className="small" data-testid="setup-opponent-level">
              CPU L{opponentPreview.level} ({opponentPreview.aiProfile})
            </p>
            <p className="small" data-testid="setup-opponent-score-range">
              Deck score range: {opponentPreview.scoreRange.min}-{opponentPreview.scoreRange.max}
            </p>
            <p className="small" data-testid="setup-opponent-bonus">
              Win bonus: +{opponentPreview.winGoldBonus}
            </p>
          </section>

          <p className="small setup-deck-count">Deck: {selectedSlot.cards.length}/5 selected</p>

          <div className="setup-selected-cards" data-testid="setup-selected-cards" aria-label="Selected cards">
            {Array.from({ length: 5 }, (_, index) => {
              const cardId = selectedSlot.cards[index]
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
                  selected
                  interactive
                  onClick={() => handleCardToggle(cardId)}
                  className="setup-preview-card"
                  testId={`setup-selected-card-${cardId}`}
                />
              )
            })}
          </div>

          {error && <p className="error">{error}</p>}

          <div className="actions">
            <button
              type="button"
              className="button button-primary"
              onClick={() => handleStart('normal')}
              disabled={!canStart}
              data-testid="start-match-button"
            >
              Start Normal
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={() => handleStart('ranked')}
              disabled={!canStart}
              data-testid="start-ranked-match-button"
            >
              Start Ranked
            </button>
            <Link className="button" to="/">
              Home
            </Link>
          </div>
        </aside>

        <section className="setup-collection" data-testid="setup-column-collection">
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

            <div className="setup-filter-row setup-filter-row--sort">
              <label className="setup-filter-label" htmlFor="setup-sort-select-input">
                Sort
              </label>
              <select
                id="setup-sort-select-input"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SetupSortMode)}
                data-testid="setup-sort-select"
              >
                {setupSortOptions.map((option) => (
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
          </div>

          <div className="setup-card-grid" aria-label="Deck selection">
            {visibleCards.map((card) => {
              const selected = selectedCardSet.has(card.id)
              return (
                <TriadCard
                  key={card.id}
                  card={card}
                  context="setup"
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
