import { useEffect, useMemo, useState, type CSSProperties } from 'react'
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
    artwork: `${modeAssetBasePath}mode-3x3-normal-new.png`,
  },
  {
    id: '3x3-ranked',
    mode: '3x3',
    queue: 'ranked',
    title: 'RANKED',
    artwork: `${modeAssetBasePath}mode-3x3-ranked-new.png`,
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
  return `${preset.mode.toUpperCase()} ${preset.queue === 'ranked' ? 'RANKED' : 'NORMAL'}`
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
  const shouldShowManualDeckPreview = deckMode === 'manual'
  const ownedUniqueCount = new Set(profile.ownedCardIds).size

  const modeSpec = useMemo(() => (selectedMode ? getModeSpec(selectedMode) : null), [selectedMode])
  const selectedDeckPreviewColumns = modeSpec ? (modeSpec.deckSize === 8 ? 4 : modeSpec.deckSize) : 0
  const canUseAutoDeck = modeSpec ? ownedUniqueCount >= modeSpec.deckSize : false
  const autoDeckRequirementMessage =
    modeSpec && selectedMode ? `Auto Deck requires at least ${modeSpec.deckSize} owned cards for ${selectedMode.toUpperCase()}.` : null
  const selectedDeck = useMemo(() => {
    if (!selectedMode) {
      return []
    }
    return getDeckForMode(selectedSlot, selectedMode)
  }, [selectedMode, selectedSlot])

  useEffect(() => {
    if (deckMode === 'auto' && !canUseAutoDeck) {
      setDeckMode('manual')
    }
  }, [canUseAutoDeck, deckMode])

  useEffect(() => {
    if (!selectedPreset && deckMode !== 'manual') {
      setDeckMode('manual')
    }
  }, [deckMode, selectedPreset])

  const canStart = selectedPreset && modeSpec ? (deckMode === 'auto' ? canUseAutoDeck : hasExactlyDeckSizeUniqueCards(selectedDeck, modeSpec.deckSize)) : false

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
      setError('Choose a match mode first.')
      return
    }

    if (!canStart) {
      if (deckMode === 'auto' && !canUseAutoDeck && autoDeckRequirementMessage) {
        setError(autoDeckRequirementMessage)
        return
      }
      setError(`Select exactly ${modeSpec.deckSize} cards to start.`)
      return
    }

    try {
      const activeQueue = selectedPreset.queue
      const startOptions = activeQueue === 'normal' ? { useAutoDeck: deckMode === 'auto', normalOpponentLevel: selectedNormalOpponentLevel } : { useAutoDeck: deckMode === 'auto' }

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
      const message = err instanceof Error ? err.message : 'Unable to start match.'
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
                Choose your <span>match format</span>
              </h2>
              <div className="setup-mode-stage" data-testid="setup-mode-stage">
                <div className="setup-mode-stage-content">
                  <div className="setup-preset-grid" data-testid="setup-preset-grid" aria-label="Play mode presets">
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
                      Change
                    </button>
                  </div>
                  <div className="setup-slot-grid" aria-label="Deck slots">
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
                      <p className="setup-new-challenger-title">New Challenger</p>
                      <p className="setup-new-challenger-meta" data-testid="setup-opponent-level">
                        CPU L{opponentPreview.level} · {formatTierLabel(opponentLevelInfo.tierId)}
                      </p>
                      <div className="setup-new-challenger-details">
                        <p className="setup-new-challenger-line" data-testid="setup-opponent-score-range">
                          Deck score range: {opponentPreview.scoreRange.min}-{opponentPreview.scoreRange.max}
                        </p>
                        {selectedQueue === 'ranked' ? (
                          <p className="setup-new-challenger-line" data-testid="setup-opponent-rank-bonus">
                            Rank bonus: +{rankedDeckScoreBonus} score
                          </p>
                        ) : null}
                        <p className="setup-new-challenger-line" data-testid="setup-opponent-bonus">
                          Win bonus: +{opponentPreview.winGoldBonus}
                        </p>
                        <p className="setup-new-challenger-line" data-testid="setup-opponent-ai">
                          AI: {opponentLevelInfo.aiProfile}
                        </p>
                        <p className="setup-new-challenger-line" data-testid="setup-opponent-rarity">
                          Rarity mix: {formatRarityMix(opponentLevelInfo.rarityWeights)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <fieldset className="setup-rule-block">
                <legend>Deck Mode</legend>
                <div className="rule-toggle-group setup-deck-mode-group">
                  <label className="setup-rule-toggle setup-rule-toggle--deck-mode">
                    <input
                      type="radio"
                      name="setup-deck-mode"
                      checked={deckMode === 'manual'}
                      onChange={() => setDeckMode('manual')}
                      data-testid="setup-deck-mode-manual"
                    />
                    <span>Use My Deck</span>
                  </label>
                  <label className="setup-rule-toggle setup-rule-toggle--deck-mode">
                    <input
                      type="radio"
                      name="setup-deck-mode"
                      checked={deckMode === 'auto'}
                      onChange={() => setDeckMode('auto')}
                      data-testid="setup-deck-mode-auto"
                      disabled={!canUseAutoDeck}
                    />
                    <span>Auto Deck (random, in-range, +50% rewards)</span>
                  </label>
                </div>
              </fieldset>

              <fieldset className="setup-rule-block">
                <legend>Open Rule</legend>
                <div className="rule-toggle-group setup-deck-mode-group">
                  <label className="setup-rule-toggle setup-rule-toggle--deck-mode">
                    <input
                      type="radio"
                      name="setup-open-rule"
                      checked={openRuleEnabled}
                      onChange={() => setOpenRuleEnabled(true)}
                      data-testid="setup-rule-open-visible"
                    />
                    <span>Visible (Open)</span>
                  </label>
                  <label className="setup-rule-toggle setup-rule-toggle--deck-mode">
                    <input
                      type="radio"
                      name="setup-open-rule"
                      checked={!openRuleEnabled}
                      onChange={() => setOpenRuleEnabled(false)}
                      data-testid="setup-rule-open-hidden"
                    />
                    <span>Hidden</span>
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
                  Ranked uses visibility rule only (Open or Hidden).
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
                    {selectedQueue === 'ranked' ? `Start ${selectedMode} Ranked` : `Start ${selectedMode} Normal`}
                  </button>
                </div>
                {error && <p className="error setup-launch-error">{error}</p>}
              </div>

              <section className="setup-opponent-preview" aria-label="Opponent preview">
                {selectedQueue === 'normal' ? (
                  <div className="setup-opponent-selector" aria-label="Normal opponent levels">
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
                    Ranked opponent is locked to your current rank.
                  </p>
                ) : null}
              </section>

              {shouldShowManualDeckPreview ? (
                <>
                  <p className="small setup-deck-count">
                    Deck: {selectedDeck.length}/{modeSpec?.deckSize ?? 0} selected ({selectedMode})
                  </p>

                  <div
                    className="setup-selected-cards"
                    data-testid="setup-selected-cards"
                    aria-label="Selected cards"
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
                            <span>Empty</span>
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
