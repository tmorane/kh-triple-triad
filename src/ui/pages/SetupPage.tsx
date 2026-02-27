import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { IS_4X4_UI_ENABLED, IS_TOWER_UI_ENABLED } from '../../app/matchUiConfig'
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
import { resolveTowerFloorSpec } from '../../domain/tower/floorPlan'
import type { MatchMode, MatchQueue, Rarity } from '../../domain/types'
import { TriadCard } from '../components/TriadCard'

type SetupDeckMode = 'manual' | 'auto'
type SetupPresetId = '3x3-normal' | '4x4-normal' | '3x3-ranked' | '4x4-ranked' | 'tower-4x4'

const modeAssetBasePath = `${import.meta.env.BASE_URL}modes/`

interface SetupPreset {
  id: SetupPresetId
  mode: MatchMode
  queue: MatchQueue
  title: string
  subtitle: string
  artwork: string
}

const allSetupPresets: SetupPreset[] = [
  {
    id: '3x3-normal',
    mode: '3x3',
    queue: 'normal',
    title: '3X3',
    subtitle: 'Normal',
    artwork: `${modeAssetBasePath}mode-3x3-normal.svg`,
  },
  {
    id: '4x4-normal',
    mode: '4x4',
    queue: 'normal',
    title: '4X4',
    subtitle: 'Normal',
    artwork: `${modeAssetBasePath}mode-4x4-normal.svg`,
  },
  {
    id: '3x3-ranked',
    mode: '3x3',
    queue: 'ranked',
    title: '3X3',
    subtitle: 'Ranked',
    artwork: `${modeAssetBasePath}mode-3x3-ranked.svg`,
  },
  {
    id: '4x4-ranked',
    mode: '4x4',
    queue: 'ranked',
    title: '4X4',
    subtitle: 'Ranked',
    artwork: `${modeAssetBasePath}mode-4x4-ranked.svg`,
  },
  {
    id: 'tower-4x4',
    mode: '4x4',
    queue: 'tower',
    title: 'Tower',
    subtitle: '4X4',
    artwork: `${modeAssetBasePath}mode-4x4-normal.svg`,
  },
]

const setupPresets = allSetupPresets.filter((preset) => {
  if (preset.mode === '4x4' && !IS_4X4_UI_ENABLED) {
    return false
  }
  if (preset.queue === 'tower' && !IS_TOWER_UI_ENABLED) {
    return false
  }
  return true
})

const presetById = Object.fromEntries(setupPresets.map((preset) => [preset.id, preset])) as Partial<Record<SetupPresetId, SetupPreset>>

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
  if (preset.queue === 'tower') {
    return '4X4 TOWER'
  }
  return `${preset.mode.toUpperCase()} ${preset.queue === 'ranked' ? 'RANKED' : 'NORMAL'}`
}

function getPresetTestId(presetId: SetupPresetId): string {
  if (presetId === '3x3-normal') {
    return 'setup-mode-3x3'
  }
  if (presetId === '4x4-normal') {
    return 'setup-mode-4x4'
  }
  if (presetId === '3x3-ranked') {
    return 'setup-mode-3x3-ranked'
  }
  if (presetId === 'tower-4x4') {
    return 'setup-mode-tower'
  }
  return 'setup-mode-4x4-ranked'
}

export function SetupPage() {
  const navigate = useNavigate()
  const { profile, startMatch, startTowerRun, resumeTowerRun, towerRun, towerProgress, selectDeckSlot, setDeckSlotMode } = useGame()
  const selectedSlot = getSelectedDeckSlot(profile)

  const [error, setError] = useState<string | null>(null)
  const [deckMode, setDeckMode] = useState<SetupDeckMode>('manual')
  const [selectedPresetId, setSelectedPresetId] = useState<SetupPresetId | null>(null)

  const defaultRankedOpponentLevel = getOpponentLevelForProfile(profile, selectedSlot.mode)
  const [selectedNormalOpponentLevel, setSelectedNormalOpponentLevel] = useState<OpponentLevel>(defaultRankedOpponentLevel)

  const selectedPreset = selectedPresetId ? (presetById[selectedPresetId] ?? null) : null
  const selectedMode = selectedPreset?.mode ?? null
  const selectedQueue = selectedPreset?.queue ?? null
  const isTowerPreset = selectedQueue === 'tower'
  const shouldShowManualDeckPreview = deckMode === 'manual'
  const ownedUniqueCount = new Set(profile.ownedCardIds).size
  const safeTowerProgress = towerProgress ?? { bestFloor: 0, checkpointFloor: 0, highestClearedFloor: 0, clearedFloor100: false }
  const towerStartFloor = towerRun ? towerRun.floor : Math.min(100, safeTowerProgress.checkpointFloor + 1)
  const towerFloorSpec = useMemo(() => resolveTowerFloorSpec(towerStartFloor), [towerStartFloor])

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
    if (isTowerPreset && deckMode !== 'manual') {
      setDeckMode('manual')
    }
  }, [deckMode, isTowerPreset])

  const canStart =
    selectedPreset && modeSpec
      ? isTowerPreset
        ? towerRun
          ? towerRun.pendingRewards.length === 0
          : hasExactlyDeckSizeUniqueCards(selectedDeck, modeSpec.deckSize)
        : deckMode === 'auto'
          ? canUseAutoDeck
          : hasExactlyDeckSizeUniqueCards(selectedDeck, modeSpec.deckSize)
      : false

  const availableNormalLevels = useMemo(
    () => Array.from({ length: MAX_NORMAL_OPPONENT_LEVEL }, (_, index) => toOpponentLevel(index + 1)),
    [],
  )

  const rankedOpponentLevel = selectedMode ? getOpponentLevelForProfile(profile, selectedMode) : defaultRankedOpponentLevel
  const rankedDeckScoreBonus = selectedMode ? getRankedDeckScoreBonusForProfile(profile, selectedMode) : 0
  const effectiveOpponentLevel =
    selectedQueue === 'tower'
      ? (towerFloorSpec.opponentLevel as OpponentLevel)
      : selectedQueue === 'ranked'
        ? rankedOpponentLevel
        : selectedNormalOpponentLevel
  const opponentPreview = useMemo(() => {
    if (!selectedPreset || !selectedMode) {
      return null
    }
    if (selectedQueue === 'tower') {
      return getCpuOpponentPreviewForLevel(towerFloorSpec.opponentLevel as OpponentLevel, towerRun?.deck ?? selectedDeck, '4x4', {
        scoreBonus: towerFloorSpec.scoreBonus,
      })
    }

    return selectedQueue === 'ranked'
      ? getCpuOpponentPreview(profile, selectedDeck, selectedMode)
      : getCpuOpponentPreviewForLevel(selectedNormalOpponentLevel, selectedDeck, selectedMode)
  }, [selectedDeck, selectedMode, selectedNormalOpponentLevel, selectedPreset, selectedQueue, profile, towerFloorSpec, towerRun?.deck])

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
      if (activeQueue === 'tower') {
        if (!startTowerRun || !resumeTowerRun) {
          throw new Error('Tower mode is unavailable in this context.')
        }

        if (towerRun) {
          resumeTowerRun()
        } else {
          startTowerRun()
        }
        navigate('/match')
        return
      }

      const startOptions =
        activeQueue === 'normal'
          ? { useAutoDeck: deckMode === 'auto', normalOpponentLevel: selectedNormalOpponentLevel }
          : { useAutoDeck: deckMode === 'auto' }

      startMatch(
        activeQueue,
        selectedMode,
        selectedDeck,
        {
          open: true,
          same: selectedSlot.rules.same,
          plus: selectedSlot.rules.plus,
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
    <section className="panel setup-panel">
      <div className="setup-layout setup-layout--play" data-testid="setup-layout">
        <aside className="setup-builder" data-testid="setup-column-play">
          {!selectedPreset ? (
            <>
              <p className="small">Choose your match format.</p>
              <div className="setup-preset-grid" data-testid="setup-preset-grid" aria-label="Play mode presets">
                {setupPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`setup-preset-button setup-preset-button--${preset.queue}`}
                    data-testid={getPresetTestId(preset.id)}
                    aria-label={`${preset.title} ${preset.subtitle}`}
                    onClick={() => handlePresetSelect(preset.id)}
                  >
                    <span className="setup-preset-art-wrap" aria-hidden="true">
                      <img className="setup-preset-art" src={preset.artwork} alt="" />
                    </span>
                    <span className="setup-preset-overlay" aria-hidden="true" />
                    <span className="setup-preset-copy">
                      <span className="setup-preset-title">{preset.title}</span>
                      <span className="setup-preset-subtitle">{preset.subtitle}</span>
                    </span>
                  </button>
                ))}
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
                      <p className="setup-new-challenger-title">{selectedQueue === 'tower' ? 'Tower Run' : 'New Challenger'}</p>
                      <p className="setup-new-challenger-meta" data-testid="setup-opponent-level">
                        CPU L{opponentPreview.level} · {formatTierLabel(opponentLevelInfo.tierId)}
                      </p>
                      <div className="setup-new-challenger-details">
                        {selectedQueue === 'tower' ? (
                          <>
                            <p className="setup-new-challenger-line" data-testid="setup-tower-floor">
                              Floor: {towerStartFloor} {towerFloorSpec.boss ? '· Boss' : '· Normal'}
                            </p>
                            <p className="setup-new-challenger-line" data-testid="setup-tower-checkpoint">
                              Checkpoint: {towerRun ? towerRun.checkpointFloor : safeTowerProgress.checkpointFloor}
                            </p>
                            <p className="setup-new-challenger-line" data-testid="setup-tower-relics">
                              Relics: {towerRun ? Object.values(towerRun.relics).reduce((sum, count) => sum + count, 0) : 0}
                            </p>
                          </>
                        ) : null}
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

              {selectedQueue !== 'tower' ? (
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
              ) : null}

              {selectedQueue !== 'tower' && !canUseAutoDeck && autoDeckRequirementMessage ? (
                <p className="small setup-auto-deck-note" data-testid="setup-auto-deck-note">
                  {autoDeckRequirementMessage}
                </p>
              ) : null}

              {selectedQueue === 'ranked' ? (
                <p className="small" data-testid="setup-ranked-note">
                  Ranked uses Open only (Same/Plus disabled).
                </p>
              ) : null}
              {selectedQueue === 'tower' && towerRun && towerRun.pendingRewards.length > 0 ? (
                <p className="small" data-testid="setup-tower-pending-reward-note">
                  Resolve pending tower rewards from Results before resuming the run.
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
                    {selectedQueue === 'tower'
                      ? towerRun
                        ? `Resume Tower Floor ${towerRun.floor}`
                        : `Start Tower Floor ${towerStartFloor}`
                      : selectedQueue === 'ranked'
                        ? `Start ${selectedMode} Ranked`
                        : `Start ${selectedMode} Normal`}
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
                ) : (
                  <p className="small setup-opponent-ranked-lock" data-testid="setup-tower-lock-note">
                    Tower rules and difficulty are driven by floor progression.
                  </p>
                )}
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
