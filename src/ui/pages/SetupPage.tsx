import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { getCard } from '../../domain/cards/cardPool'
import { getDeckForMode, getSelectedDeckSlot, hasExactlyDeckSizeUniqueCards } from '../../domain/cards/decks'
import { getModeSpec } from '../../domain/match/modeSpec'
import { hasShinyCopy } from '../../domain/progression/shiny'
import {
  getCpuOpponentPreview,
  getCpuOpponentPreviewForLevel,
  MAX_NORMAL_OPPONENT_LEVEL,
  getOpponentLevelForProfile,
  getOpponentLevelInfo,
  getRankedDeckScoreBonusForProfile,
  type OpponentLevel,
} from '../../domain/match/opponents'
import type { MatchMode, MatchQueue, Rarity } from '../../domain/types'
import { TriadCard } from '../components/TriadCard'

type SetupDeckMode = 'manual' | 'auto'
type SetupPresetId = '3x3-normal' | '3x3-ranked'

const viteBaseUrl =
  typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined' && typeof import.meta.env.BASE_URL === 'string'
    ? import.meta.env.BASE_URL
    : '/'
const modeAssetBasePath = `${viteBaseUrl}modes/`

interface SetupPreset {
  id: SetupPresetId
  mode: MatchMode
  queue: MatchQueue
  title: string
  artwork: string
}

const allSetupPresets: SetupPreset[] = [
  {
    id: '3x3-normal',
    mode: '3x3',
    queue: 'normal',
    title: 'NORMAL',
    artwork: `${modeAssetBasePath}mode-3x3-normal-new.webp`,
  },
  {
    id: '3x3-ranked',
    mode: '3x3',
    queue: 'ranked',
    title: 'CLASSÉ',
    artwork: `${modeAssetBasePath}mode-3x3-ranked-new.webp`,
  },
]

const setupPresets = allSetupPresets

const presetById = Object.fromEntries(setupPresets.map((preset) => [preset.id, preset])) as Record<SetupPresetId, SetupPreset>

function toOpponentLevel(value: number): OpponentLevel {
  return Math.max(1, Math.min(MAX_NORMAL_OPPONENT_LEVEL, value)) as OpponentLevel
}

function formatTierLabel(tierId: string): string {
  return tierId.charAt(0).toUpperCase() + tierId.slice(1)
}

function formatRarityMix(weights: Partial<Record<Rarity, number>>): string {
  const activeRarities = Object.entries(weights).filter(([, weight]) => (weight ?? 0) > 0)
  if (activeRarities.length === 0) {
    return 'N/A'
  }

  const total = activeRarities.reduce((sum, [, weight]) => sum + (weight ?? 0), 0)
  if (total <= 0) {
    return 'N/A'
  }

  return activeRarities
    .map(([rarity, weight]) => {
      const ratio = (weight ?? 0) / total
      return `${rarity} ${Math.round(ratio * 100)}%`
    })
    .join(' / ')
}

function formatPresetLabel(preset: SetupPreset): string {
  return `${preset.mode.toUpperCase()} ${preset.queue === 'ranked' ? 'CLASSÉ' : 'NORMAL'}`
}

function getPresetTestId(presetId: SetupPresetId): string {
  return presetId === '3x3-normal' ? 'setup-mode-3x3' : 'setup-mode-3x3-ranked'
}

export function SetupPage() {
  const navigate = useNavigate()
  const { profile, startMatch, selectDeckSlot, setDeckSlotMode } = useGame()
  const selectedSlot = getSelectedDeckSlot(profile)

  const [error, setError] = useState<string | null>(null)
  const [deckMode, setDeckMode] = useState<SetupDeckMode>('manual')
  const [openRuleEnabled, setOpenRuleEnabled] = useState(true)
  const [selectedPresetId, setSelectedPresetId] = useState<SetupPresetId | null>(null)

  const defaultRankedOpponentLevel = getOpponentLevelForProfile(profile, selectedSlot.mode)
  const [selectedNormalOpponentLevel, setSelectedNormalOpponentLevel] = useState<OpponentLevel>(defaultRankedOpponentLevel)

  const selectedPreset = selectedPresetId ? (presetById[selectedPresetId] ?? null) : null
  const selectedMode = selectedPreset?.mode ?? null
  const selectedQueue = selectedPreset?.queue ?? null
  const ownedUniqueCount = new Set(profile.ownedCardIds).size

  const modeSpec = useMemo(() => (selectedMode ? getModeSpec(selectedMode) : null), [selectedMode])
  const selectedDeckPreviewColumns = modeSpec ? (modeSpec.deckSize === 8 ? 4 : modeSpec.deckSize) : 0
  const canUseAutoDeck = modeSpec ? ownedUniqueCount >= modeSpec.deckSize : false
  const effectiveDeckMode: SetupDeckMode =
    !selectedPreset || (deckMode === 'auto' && !canUseAutoDeck) ? 'manual' : deckMode
  const shouldShowManualDeckPreview = effectiveDeckMode === 'manual'
  const autoDeckRequirementMessage =
    modeSpec && selectedMode ? `Le deck auto demande au moins ${modeSpec.deckSize} cartes possédées pour ${selectedMode.toUpperCase()}.` : null
  const selectedDeck = useMemo(() => {
    if (!selectedMode) {
      return []
    }
    return getDeckForMode(selectedSlot, selectedMode)
  }, [selectedMode, selectedSlot])

  const canStart =
    selectedPreset && modeSpec
      ? effectiveDeckMode === 'auto'
        ? canUseAutoDeck
        : hasExactlyDeckSizeUniqueCards(selectedDeck, modeSpec.deckSize)
      : false

  const availableNormalLevels = useMemo(
    () => Array.from({ length: MAX_NORMAL_OPPONENT_LEVEL }, (_, index) => toOpponentLevel(index + 1)),
    [],
  )

  const rankedOpponentLevel = selectedMode ? getOpponentLevelForProfile(profile, selectedMode) : defaultRankedOpponentLevel
  const rankedDeckScoreBonus = selectedMode ? getRankedDeckScoreBonusForProfile(profile, selectedMode) : 0
  const effectiveOpponentLevel = selectedQueue === 'ranked' ? rankedOpponentLevel : selectedNormalOpponentLevel
  const opponentPreview = useMemo(() => {
    if (!selectedPreset || !selectedMode) {
      return null
    }

    return selectedQueue === 'ranked'
      ? getCpuOpponentPreview(profile, selectedDeck, selectedMode)
      : getCpuOpponentPreviewForLevel(selectedNormalOpponentLevel, selectedDeck, selectedMode)
  }, [profile, selectedDeck, selectedMode, selectedNormalOpponentLevel, selectedPreset, selectedQueue])

  const opponentLevelInfo = useMemo(() => {
    if (!selectedMode || !selectedPreset) {
      return null
    }
    return getOpponentLevelInfo(effectiveOpponentLevel, selectedMode)
  }, [effectiveOpponentLevel, selectedMode, selectedPreset])

  const handlePresetSelect = (presetId: SetupPresetId) => {
    const preset = presetById[presetId]
    if (!preset) {
      return
    }
    setError(null)
    setSelectedPresetId(presetId)
    setDeckSlotMode(selectedSlot.id, preset.mode)
  }

  const handleStart = () => {
    if (!selectedPreset || !selectedMode || !modeSpec) {
      setError('Choisis d abord un mode de match.')
      return
    }

    if (!canStart) {
      if (effectiveDeckMode === 'auto' && !canUseAutoDeck && autoDeckRequirementMessage) {
        setError(autoDeckRequirementMessage)
        return
      }
      setError(`Sélectionne exactement ${modeSpec.deckSize} cartes pour commencer.`)
      return
    }

    try {
      const activeQueue = selectedPreset.queue
      const startOptions =
        activeQueue === 'normal'
          ? { useAutoDeck: effectiveDeckMode === 'auto', normalOpponentLevel: selectedNormalOpponentLevel }
          : { useAutoDeck: effectiveDeckMode === 'auto' }

      startMatch(
        activeQueue,
        selectedMode,
        selectedDeck,
        {
          open: openRuleEnabled,
          same: false,
          plus: false,
        },
        startOptions,
      )
      navigate('/match')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible de lancer le match.'
      setError(message)
    }
  }

  return (
    <section className={`panel setup-panel ${!selectedPreset ? 'setup-panel--mode-select' : ''}`}>
      <div className="setup-layout setup-layout--play" data-testid="setup-layout">
        <aside className={`setup-builder ${!selectedPreset ? 'setup-builder--mode-select' : ''}`} data-testid="setup-column-play">
          {!selectedPreset ? (
            <>
              <h2 className="setup-mode-heading" data-testid="setup-mode-heading">
                Choisis ton <span>format de match</span>
              </h2>
              <div className="setup-mode-stage" data-testid="setup-mode-stage">
                <div className="setup-mode-stage-content">
                  <div className="setup-preset-grid" data-testid="setup-preset-grid" aria-label="Modes de jeu">
                    {setupPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`setup-preset-button setup-preset-button--${preset.queue}`}
                        data-testid={getPresetTestId(preset.id)}
                        aria-label={preset.title}
                        onClick={() => handlePresetSelect(preset.id)}
                      >
                        <span className="setup-preset-art-wrap" aria-hidden="true">
                          <img className="setup-preset-art setup-preset-art--inset" src={preset.artwork} alt="" />
                        </span>
                        <span className="setup-preset-overlay" aria-hidden="true" />
                        <span className="setup-preset-copy">
                          <span className="setup-preset-title">{preset.title}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="setup-selected-top-bar">
                <div className="setup-selected-left-stack" data-testid="setup-selected-left-stack">
                  <div className="setup-selected-mode-head" data-testid="setup-selected-mode-head">
                    <p className="small setup-selected-preset" data-testid="setup-selected-preset">
                      {formatPresetLabel(selectedPreset)}
                    </p>
                    <button
                      type="button"
                      className="button"
                      data-testid="setup-change-mode"
                      onClick={() => {
                        setError(null)
                        setSelectedPresetId(null)
                      }}
                    >
                      Changer
                    </button>
                  </div>
                  <div className="setup-slot-grid" aria-label="Emplacements de deck">
                    {profile.deckSlots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        className={`setup-slot-button ${slot.id === selectedSlot.id ? 'is-selected' : ''}`}
                        onClick={() => {
                          setError(null)
                          selectDeckSlot(slot.id)
                          setDeckSlotMode(slot.id, selectedPreset.mode)
                        }}
                        data-testid={`deck-slot-${slot.id}`}
                      >
                        <span className="setup-slot-name">{slot.name}</span>
                        <span className="setup-slot-count">
                          {getDeckForMode(slot, selectedPreset.mode).length}/{getModeSpec(selectedPreset.mode).deckSize} ·{' '}
                          {selectedPreset.mode}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                {opponentPreview && opponentLevelInfo ? (
                  <div className="setup-opponent-top-right" data-testid="setup-opponent-top-right">
                    <div className="setup-new-challenger" data-testid="setup-new-challenger">
                      <p className="setup-new-challenger-title">Nouvel adversaire</p>
                      <p className="setup-new-challenger-meta" data-testid="setup-opponent-level">
                        CPU L{opponentPreview.level} · {formatTierLabel(opponentLevelInfo.tierId)}
                      </p>
                      <div className="setup-new-challenger-details">
                        <p className="setup-new-challenger-line" data-testid="setup-opponent-score-range">
                          Score du deck: {opponentPreview.scoreRange.min}-{opponentPreview.scoreRange.max}
                        </p>
                        {selectedQueue === 'ranked' ? (
                          <p className="setup-new-challenger-line" data-testid="setup-opponent-rank-bonus">
                            Bonus de rang: +{rankedDeckScoreBonus} score
                          </p>
                        ) : null}
                        <p className="setup-new-challenger-line" data-testid="setup-opponent-bonus">
                          Bonus victoire: +{opponentPreview.winGoldBonus}
                        </p>
                        <p className="setup-new-challenger-line" data-testid="setup-opponent-ai">
                          IA: {opponentLevelInfo.aiProfile}
                        </p>
                        <p className="setup-new-challenger-line" data-testid="setup-opponent-rarity">
                          Répartition rareté: {formatRarityMix(opponentLevelInfo.rarityWeights)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <fieldset className="setup-rule-block">
                <legend>Mode de deck</legend>
                <div className="rule-toggle-group setup-deck-mode-group">
                  <label className="setup-rule-toggle setup-rule-toggle--deck-mode">
                    <input
                      type="radio"
                      name="setup-deck-mode"
                      checked={effectiveDeckMode === 'manual'}
                      onChange={() => setDeckMode('manual')}
                      data-testid="setup-deck-mode-manual"
                    />
                    <span>Utiliser mon deck</span>
                  </label>
                  <label className="setup-rule-toggle setup-rule-toggle--deck-mode">
                    <input
                      type="radio"
                      name="setup-deck-mode"
                      checked={effectiveDeckMode === 'auto'}
                      onChange={() => setDeckMode('auto')}
                      data-testid="setup-deck-mode-auto"
                      disabled={!canUseAutoDeck}
                    />
                    <span>Deck auto (aléatoire, adapté, +50% récompenses)</span>
                  </label>
                </div>
              </fieldset>

              <fieldset className="setup-rule-block">
                <legend>Règle de visibilité</legend>
                <div className="rule-toggle-group setup-deck-mode-group">
                  <label className="setup-rule-toggle setup-rule-toggle--deck-mode">
                    <input
                      type="radio"
                      name="setup-open-rule"
                      checked={openRuleEnabled}
                      onChange={() => setOpenRuleEnabled(true)}
                      data-testid="setup-rule-open-visible"
                    />
                    <span>Visible</span>
                  </label>
                  <label className="setup-rule-toggle setup-rule-toggle--deck-mode">
                    <input
                      type="radio"
                      name="setup-open-rule"
                      checked={!openRuleEnabled}
                      onChange={() => setOpenRuleEnabled(false)}
                      data-testid="setup-rule-open-hidden"
                    />
                    <span>Caché</span>
                  </label>
                </div>
              </fieldset>

              {!canUseAutoDeck && autoDeckRequirementMessage ? (
                <p className="small setup-auto-deck-note" data-testid="setup-auto-deck-note">
                  {autoDeckRequirementMessage}
                </p>
              ) : null}

              {selectedQueue === 'ranked' ? (
                <p className="small" data-testid="setup-ranked-note">
                  Le classé utilise seulement la règle de visibilité.
                </p>
              ) : null}
              <div className="setup-launch-bar" data-testid="setup-launch-bar">
                <div className="actions setup-launch-actions">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={handleStart}
                    disabled={!canStart}
                    data-testid="start-match-button"
                  >
                    {selectedQueue === 'ranked' ? `Lancer ${selectedMode} classé` : `Lancer ${selectedMode} normal`}
                  </button>
                </div>
                {error && <p className="error setup-launch-error">{error}</p>}
              </div>

              <section className="setup-opponent-preview" aria-label="Aperçu de l'adversaire">
                {selectedQueue === 'normal' ? (
                  <div className="setup-opponent-selector" aria-label="Niveaux adversaire normal">
                    {availableNormalLevels.map((level) => {
                      const isSelected = selectedNormalOpponentLevel === level
                      return (
                        <button
                          key={level}
                          type="button"
                          className={`setup-opponent-level-chip ${isSelected ? 'is-active' : ''}`}
                          onClick={() => {
                            setError(null)
                            setSelectedNormalOpponentLevel(level)
                          }}
                          aria-pressed={isSelected}
                          data-testid={`setup-opponent-level-option-${level}`}
                        >
                          L{level}
                        </button>
                      )
                    })}
                  </div>
                ) : selectedQueue === 'ranked' ? (
                  <p className="small setup-opponent-ranked-lock" data-testid="setup-opponent-ranked-lock">
                    L'adversaire classé est verrouillé sur ton rang actuel.
                  </p>
                ) : null}
              </section>

              {shouldShowManualDeckPreview ? (
                <>
                  <p className="small setup-deck-count">
                    Deck: {selectedDeck.length}/{modeSpec?.deckSize ?? 0} sélectionnées ({selectedMode})
                  </p>

                  <div
                    className="setup-selected-cards"
                    data-testid="setup-selected-cards"
                    aria-label="Cartes sélectionnées"
                    style={{ '--setup-selected-columns': `${selectedDeckPreviewColumns}` } as CSSProperties}
                  >
                    {Array.from({ length: modeSpec?.deckSize ?? 0 }, (_, index) => {
                      const cardId = selectedDeck[index]
                      if (!cardId) {
                        return (
                          <div
                            className="setup-selected-slot-empty"
                            key={`empty-${index}`}
                            data-testid={`setup-selected-slot-empty-${index}`}
                          >
                            <span>Vide</span>
                          </div>
                        )
                      }

                      const card = getCard(cardId)
                      return (
                        <TriadCard
                          key={`${cardId}-${index}`}
                          card={card}
                          context="setup"
                          shiny={hasShinyCopy(profile, cardId)}
                          className="setup-preview-card"
                          testId={`setup-selected-card-${cardId}`}
                        />
                      )
                    })}
                  </div>
                </>
              ) : null}
            </>
          )}
        </aside>
      </div>
    </section>
  )
}
