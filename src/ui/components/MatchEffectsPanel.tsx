import type { EffectFeedEntry } from '../../domain/match/effectFeed'
import type { EffectIndicator, MatchEffectsViewModel } from '../../domain/match/effectsViewModel'
import { getElementLabel } from '../../domain/cards/taxonomy'
import type { CardElementId } from '../../domain/types'

function renderIndicatorList(indicators: EffectIndicator[]) {
  return indicators.map((indicator) => (
    <span
      key={indicator.key}
      className={`effect-chip effect-chip--${indicator.tone}`}
      title={indicator.tooltip}
      aria-label={indicator.tooltip}
    >
      <span aria-hidden="true">{indicator.icon}</span>
      <span>{indicator.label}</span>
      {indicator.valueText ? <strong>{indicator.valueText}</strong> : null}
    </span>
  ))
}

function flattenCellIndicators(cellIndicators: MatchEffectsViewModel['cellIndicators']): EffectIndicator[] {
  const flattened: EffectIndicator[] = []
  for (const [cellText, indicators] of Object.entries(cellIndicators)) {
    const cell = Number(cellText)
    if (!Number.isInteger(cell) || !indicators) {
      continue
    }
    for (const indicator of indicators) {
      flattened.push({
        ...indicator,
        key: `${indicator.key}:${cell}`,
        label: `${indicator.label} C${cell + 1}`,
      })
    }
  }
  return flattened
}

function flattenBoardIndicators(boardCardIndicators: MatchEffectsViewModel['boardCardIndicators']): EffectIndicator[] {
  const flattened: EffectIndicator[] = []
  for (const [cellText, indicators] of Object.entries(boardCardIndicators)) {
    const cell = Number(cellText)
    if (!Number.isInteger(cell) || !indicators) {
      continue
    }
    for (const indicator of indicators) {
      flattened.push({
        ...indicator,
        key: `${indicator.key}:${cell}`,
        label: `${indicator.label} C${cell + 1}`,
      })
    }
  }
  return flattened
}

function flattenUsedPowers(view: MatchEffectsViewModel): Array<{ key: string; label: string }> {
  const used: Array<{ key: string; label: string }> = []
  for (const actor of ['player', 'cpu'] as const) {
    const actorUsed = view.usedOnPoseByActor[actor]
    for (const [element, enabled] of Object.entries(actorUsed)) {
      if (enabled) {
        const actorLabel = actor === 'player' ? 'Joueur' : 'CPU'
        used.push({
          key: `${actor}:${element}`,
          label: `${actorLabel} • ${getElementLabel(element as CardElementId)}`,
        })
      }
    }
  }
  return used
}

export function MatchEffectsPanel({ effectsView, effectFeed }: { effectsView: MatchEffectsViewModel; effectFeed: EffectFeedEntry[] }) {
  const modeIndicator = effectsView.mode === 'normal' ? 'EFFETS OFF' : 'EFFETS ON'
  const hazards = flattenCellIndicators(effectsView.cellIndicators)
  const activeEffects = flattenBoardIndicators(effectsView.boardCardIndicators)
  const usedPowers = flattenUsedPowers(effectsView)

  return (
    <section className="match-effects-panel" aria-label="Résumé des effets actifs">
      <div className="match-effects-panel__top">
        <span
          className={`effect-chip match-effects-panel__mode-chip ${
            effectsView.mode === 'normal' ? 'effect-chip--debuff' : 'effect-chip--buff'
          }`}
          data-testid="match-effects-panel-mode"
        >
          <span aria-hidden="true">{effectsView.mode === 'normal' ? '⛔' : '✨'}</span>
          <span>{modeIndicator}</span>
        </span>
        {renderIndicatorList(effectsView.globalIndicators)}
      </div>
      <p className="match-effects-panel__hint">
        {effectsView.mode === 'normal'
          ? 'Mode normal: aucun pouvoir de type ne se declenche.'
          : 'Mode effets: survole les types de chaque main pour voir les pouvoirs disponibles.'}
      </p>

      {effectsView.mode === 'normal' ? null : (
        <>
          <div className="match-effects-panel__row" data-testid="match-effects-panel-hazards">
            <span className="match-effects-panel__label">Cases</span>
            <div className="match-effects-panel__chips">{hazards.length > 0 ? renderIndicatorList(hazards) : <span className="small">Aucun</span>}</div>
          </div>

          <div className="match-effects-panel__row" data-testid="match-effects-panel-active">
            <span className="match-effects-panel__label">Actifs</span>
            <div className="match-effects-panel__chips">
              {activeEffects.length > 0 ? renderIndicatorList(activeEffects) : <span className="small">Aucun</span>}
            </div>
          </div>

          <div className="match-effects-panel__row" data-testid="match-effects-panel-used">
            <span className="match-effects-panel__label">Pouvoirs utilisés</span>
            <div className="match-effects-panel__chips">
              {usedPowers.length > 0 ? (
                usedPowers.map((entry) => (
                  <span key={entry.key} className="effect-chip effect-chip--info">
                    {entry.label}
                  </span>
                ))
              ) : (
                <span className="small">Aucun</span>
              )}
            </div>
          </div>

          {effectFeed.length > 0 ? (
            <ol className="effect-feed" data-testid="match-effects-panel-feed">
              {effectFeed.map((entry) => (
                <li key={entry.id} className={`effect-feed__item effect-feed__item--${entry.tone}`}>
                  {entry.text}
                </li>
              ))}
            </ol>
          ) : null}
        </>
      )}
    </section>
  )
}
