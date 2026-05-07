import { useMemo, useState } from 'react'
import { useGame } from '../../app/useGame'
import { TRACKED_GAUGE_POINTS_REQUIRED } from '../../domain/progression/pokedexProgression'
import { hasShinyCopy } from '../../domain/progression/shiny'
import type { CardId } from '../../domain/types'
import { cardPool } from '../../domain/cards/cardPool'
import { TriadCard } from './TriadCard'
import { getCardArtCandidates } from './cardArt'

const trackedCardsById = new Map(cardPool.map((card) => [card.id, card]))
type GenerationFilter = 'all' | 'gen1' | 'gen2'

interface TrackedPokemonOption {
  id: CardId
  name: string
  artSrc: string | null
  generation: GenerationFilter
  card: (typeof cardPool)[number]
}

const trackedPokemonOptions: TrackedPokemonOption[] = cardPool.map((card) => ({
  id: card.id,
  name: card.name,
  artSrc: getCardArtCandidates(card.name)[0] ?? null,
  generation: getGenerationFromCardId(card.id),
  card,
}))

interface TrackedPokemonWidgetProps {
  testIdPrefix: string
  variant?: 'home' | 'topbar'
  className?: string
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function getGenerationFromCardId(cardId: CardId): GenerationFilter {
  const cardNumber = Number.parseInt(cardId.replace(/^[^\d]+/, ''), 10)
  return Number.isFinite(cardNumber) && cardNumber <= 151 ? 'gen1' : 'gen2'
}

export function TrackedPokemonWidget({ testIdPrefix, variant = 'home', className }: TrackedPokemonWidgetProps) {
  const { profile, setTrackedPokemonTarget } = useGame()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [generationFilter, setGenerationFilter] = useState<GenerationFilter>('all')
  const [pendingSelectionId, setPendingSelectionId] = useState<CardId | null>(null)
  const ownedCardIdSet = useMemo(() => new Set(profile.ownedCardIds), [profile.ownedCardIds])

  const trackedState = profile.trackedPokemon
  const targetCardId = trackedState?.targetCardId ?? null
  const targetCard = targetCardId ? trackedCardsById.get(targetCardId) ?? null : null
  const isTargetOwned = targetCardId ? ownedCardIdSet.has(targetCardId) : false
  const isTargetShiny = targetCardId ? hasShinyCopy(profile, targetCardId) : false
  const showTargetAsSilhouette = !!targetCard && !isTargetOwned
  const gaugePoints = Math.max(0, trackedState?.gaugePoints ?? 0)
  const gaugePercent = clampPercent((gaugePoints / TRACKED_GAUGE_POINTS_REQUIRED) * 100)
  const label = targetCard?.name ?? 'Aucun'
  const artSrc = targetCard ? getCardArtCandidates(targetCard.name)[0] ?? null : null
  const normalizedSearchQuery = normalizeText(searchQuery)
  const pendingOption = pendingSelectionId ? trackedPokemonOptions.find((option) => option.id === pendingSelectionId) ?? null : null
  const isPendingOwned = pendingOption ? ownedCardIdSet.has(pendingOption.id) : false
  const isPendingShiny = pendingOption ? hasShinyCopy(profile, pendingOption.id) : false

  const filteredOptions = useMemo(() => {
    return trackedPokemonOptions.filter((option) => {
      if (generationFilter !== 'all' && option.generation !== generationFilter) {
        return false
      }

      if (!normalizedSearchQuery) {
        return true
      }

      return normalizeText(option.name).includes(normalizedSearchQuery) || option.id.includes(normalizedSearchQuery)
    })
  }, [generationFilter, normalizedSearchQuery])

  const handleTargetChange = (cardId: CardId | null) => {
    if (!setTrackedPokemonTarget) {
      return
    }
    const result = setTrackedPokemonTarget(cardId)
    if (result.valid) {
      setIsModalOpen(false)
    }
  }

  const openModal = () => {
    setIsModalOpen(true)
    setSearchQuery('')
    setGenerationFilter('all')
    setPendingSelectionId(trackedState?.targetCardId ?? null)
  }

  return (
    <>
      <section className={`tracked-pokemon-widget tracked-pokemon-widget--${variant} ${className ?? ''}`.trim()}>
        <button
          type="button"
          className="tracked-pokemon-trigger"
          data-testid={`${testIdPrefix}-trigger`}
          aria-haspopup="dialog"
          aria-expanded={isModalOpen}
          onClick={openModal}
        >
          <span
            className={`tracked-pokemon-art-wrap ${showTargetAsSilhouette ? 'is-silhouette' : ''}`.trim()}
            data-testid={`${testIdPrefix}-art-wrap`}
          >
            {artSrc ? (
              <img src={artSrc} alt="" aria-hidden="true" className="tracked-pokemon-art" data-testid={`${testIdPrefix}-art`} />
            ) : (
              <span className="tracked-pokemon-art-placeholder" aria-hidden="true" data-testid={`${testIdPrefix}-art`}>
                ?
              </span>
            )}
          </span>
          <span className="tracked-pokemon-copy">
            <span className="tracked-pokemon-label">Pokémon traqué</span>
            <span className="tracked-pokemon-name-row">
              <strong className="tracked-pokemon-name" data-testid={`${testIdPrefix}-name`}>
                {label}
              </strong>
              {isTargetShiny && isTargetOwned ? (
                <span
                  className="tracked-pokemon-shiny-star"
                  aria-hidden="true"
                  data-testid={`${testIdPrefix}-shiny-star`}
                  title="Version shiny"
                >
                  ★
                </span>
              ) : null}
            </span>
            <span className="tracked-pokemon-gauge">
              <span className="tracked-pokemon-gauge-bar" aria-hidden="true">
                <span style={{ width: `${gaugePercent}%` }} />
              </span>
              <span data-testid={`${testIdPrefix}-gauge`}>
                {gaugePoints}/{TRACKED_GAUGE_POINTS_REQUIRED}
              </span>
            </span>
          </span>
        </button>
      </section>

      {isModalOpen ? (
        <div className="tracked-pokemon-modal-backdrop" role="presentation" onClick={() => setIsModalOpen(false)}>
          <section
            className="tracked-pokemon-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${testIdPrefix}-title`}
            data-testid={`${testIdPrefix}-modal`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tracked-pokemon-modal-head">
              <h2 id={`${testIdPrefix}-title`}>Pokémon traqué</h2>
              <button type="button" className="button" onClick={() => setIsModalOpen(false)}>
                Fermer
              </button>
            </div>

            <div className="tracked-pokemon-controls">
              <input
                type="search"
                className="tracked-pokemon-search"
                placeholder="Rechercher un Pokémon..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                data-testid={`${testIdPrefix}-search-input`}
              />
              <div className="tracked-pokemon-filters" role="group" aria-label="Génération">
                <button
                  type="button"
                  className={`tracked-pokemon-filter ${generationFilter === 'all' ? 'is-active' : ''}`}
                  data-testid={`${testIdPrefix}-filter-all`}
                  onClick={() => setGenerationFilter('all')}
                >
                  Toutes
                </button>
                <button
                  type="button"
                  className={`tracked-pokemon-filter ${generationFilter === 'gen1' ? 'is-active' : ''}`}
                  data-testid={`${testIdPrefix}-filter-gen-1`}
                  onClick={() => setGenerationFilter('gen1')}
                >
                  Gen 1
                </button>
                <button
                  type="button"
                  className={`tracked-pokemon-filter ${generationFilter === 'gen2' ? 'is-active' : ''}`}
                  data-testid={`${testIdPrefix}-filter-gen-2`}
                  onClick={() => setGenerationFilter('gen2')}
                >
                  Gen 2
                </button>
              </div>
            </div>

            <div className="tracked-pokemon-modal-layout">
              <div className="tracked-pokemon-list-pane">
                <button
                  type="button"
                  className={`tracked-pokemon-option tracked-pokemon-option--none ${pendingSelectionId === null ? 'is-selected' : ''}`}
                  data-testid={`${testIdPrefix}-option-none`}
                  onClick={() => setPendingSelectionId(null)}
                >
                  Aucun
                </button>

                <div className="tracked-pokemon-options">
                  {filteredOptions.length === 0 ? (
                    <p className="small" data-testid={`${testIdPrefix}-empty`}>
                      Aucun Pokémon trouvé.
                    </p>
                  ) : (
                    filteredOptions.map((option) => {
                      const isSelected = pendingSelectionId === option.id
                      const isOptionOwned = ownedCardIdSet.has(option.id)
                      const isOptionShiny = hasShinyCopy(profile, option.id)
                      const optionStatusLabel = isOptionShiny ? 'Shiny' : isOptionOwned ? 'Possédé' : 'Manquant'
                      const optionStatusIcon = isOptionShiny ? '★' : isOptionOwned ? '✓' : '◌'
                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`tracked-pokemon-option tracked-pokemon-option--tile ${isSelected ? 'is-selected' : ''}`}
                          data-testid={`${testIdPrefix}-option-${option.id}`}
                          onClick={() => setPendingSelectionId(option.id)}
                        >
                          <span
                            className={`tracked-pokemon-option-art-wrap ${isOptionOwned ? '' : 'is-silhouette'}`.trim()}
                            data-testid={`${testIdPrefix}-option-art-wrap-${option.id}`}
                          >
                            {option.artSrc ? (
                              <img src={option.artSrc} alt="" aria-hidden="true" className="tracked-pokemon-option-art" />
                            ) : (
                              <span aria-hidden="true">?</span>
                            )}
                          </span>
                          <span className="tracked-pokemon-option-copy">
                            <span className="tracked-pokemon-option-title-row">
                              <strong>{option.name}</strong>
                              <span
                                className={`tracked-pokemon-option-state ${isOptionShiny ? 'is-shiny' : isOptionOwned ? 'is-owned' : 'is-missing'}`}
                                data-testid={`${testIdPrefix}-option-state-${option.id}`}
                                title={optionStatusLabel}
                                aria-label={optionStatusLabel}
                              >
                                {optionStatusIcon}
                              </span>
                            </span>
                            <span>
                              {option.id.toUpperCase()} · {optionStatusLabel}
                            </span>
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              <aside
                className="tracked-pokemon-side-panel"
                data-testid={`${testIdPrefix}-option-panel-${pendingOption?.id ?? 'none'}`}
                aria-label="Pokémon traqué sélectionné"
              >
                <p className="tracked-pokemon-side-label">Pokémon traqué</p>
                <h3 className="tracked-pokemon-side-name">{pendingOption?.name ?? 'Aucun'}</h3>
                {pendingOption ? (
                  <TriadCard
                    card={pendingOption.card}
                    context="setup"
                    owned={isPendingOwned}
                    shiny={isPendingShiny}
                    displayMode={isPendingOwned ? 'default' : 'fragment-silhouette'}
                    testId={`${testIdPrefix}-preview-card-${pendingOption.id}`}
                    className="tracked-pokemon-preview-card"
                  />
                ) : (
                  <div className="tracked-pokemon-side-empty">Aucun Pokémon sélectionné</div>
                )}
                <button
                  type="button"
                  className="button button-primary tracked-pokemon-option-select"
                  data-testid={`${testIdPrefix}-option-select-${pendingOption?.id ?? 'none'}`}
                  onClick={() => handleTargetChange(pendingSelectionId)}
                >
                  {pendingOption ? `Confirmer ${pendingOption.name}` : 'Retirer le Pokémon traqué'}
                </button>
              </aside>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
