import { type CSSProperties, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { getCard } from '../../domain/cards/cardPool'
import { getCardFragmentCost } from '../../domain/progression/fragments'
import { missionDefinitions } from '../../domain/progression/missionCatalog'
import type { CardId } from '../../domain/types'
import { RankedLpRecap } from '../components/RankedLpRecap'
import { TriadCard } from '../components/TriadCard'

function formatGoldBonusDetails(rewards: {
  bonusGoldFromDuplicate: number
  bonusGoldFromDifficulty: number
  bonusGoldFromWinStreak: number
  bonusGoldFromComboBounty: number
  bonusGoldFromCleanVictory: number
  bonusGoldFromSecondarySynergy: number
  bonusGoldFromCriticalVictory: number
  bonusGoldFromAutoDeck: number
}): string {
  const parts: string[] = []
  if (rewards.bonusGoldFromDifficulty > 0) {
    parts.push(`+${rewards.bonusGoldFromDifficulty} difficulté`)
  }
  if (rewards.bonusGoldFromWinStreak > 0) {
    parts.push(`+${rewards.bonusGoldFromWinStreak} série`)
  }
  if (rewards.bonusGoldFromDuplicate > 0) {
    parts.push(`+${rewards.bonusGoldFromDuplicate} doublon`)
  }
  if (rewards.bonusGoldFromComboBounty > 0) {
    parts.push(`+${rewards.bonusGoldFromComboBounty} combo`)
  }
  if (rewards.bonusGoldFromCleanVictory > 0) {
    parts.push(`+${rewards.bonusGoldFromCleanVictory} victoire nette`)
  }
  if (rewards.bonusGoldFromSecondarySynergy > 0) {
    parts.push(`+${rewards.bonusGoldFromSecondarySynergy} synergie secondaire`)
  }
  if (rewards.bonusGoldFromCriticalVictory > 0) {
    parts.push(`+${rewards.bonusGoldFromCriticalVictory} critique`)
  }
  if (rewards.bonusGoldFromAutoDeck > 0) {
    parts.push(`+${rewards.bonusGoldFromAutoDeck} deck auto`)
  }
  return parts.length > 0 ? ` (${parts.join(', ')})` : ''
}

function getOutcomeLabel(winner: 'player' | 'cpu' | 'draw'): 'VICTOIRE' | 'DÉFAITE' | 'ÉGALITÉ' {
  if (winner === 'player') {
    return 'VICTOIRE'
  }
  if (winner === 'cpu') {
    return 'DÉFAITE'
  }
  return 'ÉGALITÉ'
}

function formatRewardCard(cardId: CardId): string {
  return `${getCard(cardId).name} (${cardId.toUpperCase()})`
}

function formatFragmentCardName(cardId: CardId): string {
  return getCard(cardId).name
}

function clampResultPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

const trainerSpriteSlugs = [
  'gamin',
  'fillette',
  'gentleman',
  'intello',
  'karateka',
  'medium',
  'montagnard',
  'nageur',
  'nageuse',
  'scientifique',
  'scout',
  'topdresseur',
  'topdresseur-f',
  'sbire-rocket',
  'sbire-rocket-f',
]

const trainerNames = [
  'Basile',
  'Mina',
  'Nora',
  'Éliott',
  'Léna',
  'Marius',
  'Iris',
  'Noé',
  'Alix',
  'Maëlle',
  'Gabin',
  'Zoé',
  'Robin',
  'Camille',
  'Sacha',
]

function getStableIndex(seed: string, modulo: number): number {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }
  return hash % modulo
}

export function ResultsPage() {
  const { profile, lastMatchSummary, towerRun, selectTowerReward } = useGame()
  const [towerError, setTowerError] = useState<string | null>(null)
  const [swapOutCardId, setSwapOutCardId] = useState<CardId | null>(towerRun?.deck[0] ?? null)

  if (!lastMatchSummary) {
    return <Navigate to="/" replace />
  }

  const { queue, result, rewards, opponent, rankedMode, rankedUpdate, trackedPokemonUpdate, tower, missionRecap, storyReward } =
    lastMatchSummary
  const droppedCardIds =
    rewards.droppedCardIds && rewards.droppedCardIds.length > 0
      ? rewards.droppedCardIds
      : rewards.droppedCardId
        ? [rewards.droppedCardId]
        : []
  const droppedCards = droppedCardIds.map((cardId) => getCard(cardId))
  const isTowerQueue = queue === 'tower' && tower
  const pendingReward = tower?.pendingReward ?? null
  const effectiveSwapOutCardId =
    swapOutCardId && (towerRun?.deck ?? []).includes(swapOutCardId) ? swapOutCardId : (towerRun?.deck[0] ?? null)
  const missionRecapEntries = missionRecap?.entries.filter(
    (entry) => entry.progressBefore !== entry.progressAfter || entry.completedBefore !== entry.completedAfter,
  )
  const trainerSeed = `${queue}:${result.playerCount}:${result.cpuCount}:${opponent.level}:${opponent.aiProfile}:${droppedCardIds.join(',')}`
  const trainerSpriteSlug =
    trainerSpriteSlugs[getStableIndex(trainerSeed, trainerSpriteSlugs.length)]!
  const trainerSpriteSrc = `/ui/trainers/hgss/${trainerSpriteSlug}.png`
  const trainerName = trainerNames[getStableIndex(`${trainerSeed}:name`, trainerNames.length)]!
  const handleTowerChoice = (choiceId: string) => {
    if (!tower || !pendingReward || !selectTowerReward) {
      return
    }

    try {
      if (pendingReward.kind === 'swap') {
        selectTowerReward(choiceId, effectiveSwapOutCardId ?? undefined)
      } else {
        selectTowerReward(choiceId)
      }
      setTowerError(null)
    } catch (error) {
      setTowerError(error instanceof Error ? error.message : 'Impossible de choisir cette récompense de tour.')
    }
  }

  return (
    <section className="panel">
      <header className="finish-score-header">
        <div className="finish-score finish-score--player">
          <span className="finish-score__label">TOI</span>
          <strong className="finish-score__value" data-testid="results-player-score">
            {result.playerCount}
          </strong>
        </div>
        <div className="finish-score finish-score--cpu">
          <span className="finish-score__label">CPU</span>
          <strong className="finish-score__value" data-testid="results-cpu-score">
            {result.cpuCount}
          </strong>
        </div>
        <h1 className={`finish-outcome finish-outcome--${result.winner}`} data-testid="results-outcome">
          {getOutcomeLabel(result.winner)}
        </h1>
      </header>
      {rewards.criticalVictory ? <p className="small">Victoire critique</p> : null}

      <div className="results-recap-grid">
        <div className="result-block results-match-recap">
          <p className="small results-queue-label">
            File:{' '}
            {queue === 'ranked'
              ? 'Classé'
              : queue === 'tower'
                ? 'Tour'
                : queue === 'tutorial'
                  ? 'Tutoriel'
                  : queue === 'story'
                    ? 'Histoire'
                    : 'Normal'}
          </p>
          <div className="results-match-summary">
            <div className="stat-row results-gold-row">
              <img className="results-gold-icon" src="/ui/icons/header/goldchest-1.png" alt="" width={32} height={32} />
              <span>Or gagné</span>
              <strong>
                +{rewards.goldAwarded}
                {formatGoldBonusDetails(rewards)}
              </strong>
            </div>
            <div className="stat-row results-opponent-row">
              <span className="results-trainer-sprite-frame" aria-hidden="true">
                <img className="results-trainer-sprite" src={trainerSpriteSrc} alt="" width={80} height={80} />
              </span>
              <span className="results-opponent-copy">
                <span className="results-opponent-eyebrow">Adversaire</span>
                <strong className="results-opponent-name" data-testid="results-opponent-name">
                  {trainerName}
                </strong>
                <span className="results-opponent-meta" data-testid="results-opponent-meta">
                  CPU L{opponent.level} ({opponent.aiProfile})
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="result-block result-fragment-block">
          {queue !== 'tower' && queue !== 'tutorial' && droppedCards.length > 0 ? (
            <div className="result-fragment-cards" aria-label="Fragments récupérés">
              {droppedCards.map((card) => (
                <TriadCard
                  card={card}
                  context="setup"
                  className="result-fragment-card"
                  key={`results-fragment-card-${card.id}`}
                  testId={`results-fragment-card-${card.id}`}
                />
              ))}
            </div>
          ) : null}
          <div className="result-fragment-copy">
            <h2>Fragment de carte</h2>
            <p>
              {queue === 'tower'
                ? 'Le mode Tour ne donne pas de fragments de carte.'
                : queue === 'tutorial'
                  ? 'Le tutoriel ne donne pas de fragments de carte.'
                  : droppedCardIds.length > 0
                    ? droppedCardIds.length === 1
                      ? `Tu as récupéré 1 fragment de carte: ${formatFragmentCardName(droppedCardIds[0]!)}.`
                      : `Tu as récupéré ${droppedCardIds.length} fragments de carte: ${droppedCardIds
                          .map((cardId) => formatFragmentCardName(cardId))
                          .join(', ')}.`
                    : queue === 'story'
                      ? 'Aucun fragment histoire gagné sur ce duel.'
                      : 'Aucun fragment gagné sur ce match.'}
            </p>
            {queue !== 'tower' && queue !== 'tutorial' && droppedCardIds.length > 0
              ? droppedCardIds.map((cardId, index) => (
                  <p
                    className="small"
                    data-testid={index === 0 ? 'results-fragment-total' : `results-fragment-total-${cardId}`}
                    key={`results-fragment-total-${cardId}`}
                  >
                    Progression fragment ({formatFragmentCardName(cardId)}): {profile.cardFragmentsById[cardId] ?? 0}/
                    {getCardFragmentCost(cardId)}
                  </p>
                ))
              : null}
          </div>
        </div>
      </div>

      {storyReward ? (
        <div className="result-block" data-testid="results-story-reward">
          <h2>Récompense histoire</h2>
          {storyReward.fragmentCardId ? (
            <p className="small" data-testid="results-story-trainer-reward">
              {storyReward.trainerName}: +{storyReward.trainerGoldAwarded} or et 1 fragment {formatRewardCard(storyReward.fragmentCardId)}.
            </p>
          ) : (
            <p className="small" data-testid="results-story-trainer-reward">
              {storyReward.trainerAlreadyDefeated
                ? 'Dresseur déjà battu: aucune récompense répétée.'
                : 'Aucune récompense de dresseur sur ce duel.'}
            </p>
          )}
          {storyReward.zoneReward ? (
            <p className="small" data-testid="results-story-zone-reward">
              {`Zone terminée: ${storyReward.zoneReward.title}. Carte ${formatRewardCard(storyReward.zoneReward.cardId)} obtenue, +${storyReward.zoneReward.gold} or.`}
            </p>
          ) : null}
        </div>
      ) : null}

      {trackedPokemonUpdate && trackedPokemonUpdate.targetCardId ? (
        <div className="result-block" data-testid="results-tracked-pokemon-update">
          <h2>Pokémon traqué</h2>
          <p className="small" data-testid="results-tracked-pokemon-message">
            {trackedPokemonUpdate.fragmentsGranted > 0
              ? `${trackedPokemonUpdate.targetCardId.toUpperCase()}: jauge pleine, +${trackedPokemonUpdate.fragmentsGranted} fragment.`
              : trackedPokemonUpdate.capReached
                ? `${trackedPokemonUpdate.targetCardId.toUpperCase()}: plafond atteint (${trackedPokemonUpdate.completedGaugesInWindow}/${trackedPokemonUpdate.maxCompletionsPerWindow} sur 12h).`
                : `${trackedPokemonUpdate.targetCardId.toUpperCase()}: +${trackedPokemonUpdate.gainedGaugePoints} jauge (${trackedPokemonUpdate.gaugeAfter}/100).`}
          </p>
        </div>
      ) : null}

      {missionRecap ? (
        <div className="result-block result-mission-recap" data-testid="results-mission-recap">
          <div className="result-mission-recap__head">
            <h2>Missions</h2>
            <div className="result-mission-summary" aria-label="Résumé missions">
              <span data-testid="results-mission-recap-completed">
                <strong>{missionRecap.completedMissionIds.length}</strong>
                nouvelles
              </span>
              <span data-testid="results-mission-recap-claimable">
                <strong>{missionRecap.readyToClaimMissionIds.length}</strong>
                à récupérer
              </span>
            </div>
          </div>
          {missionRecapEntries && missionRecapEntries.length > 0 ? (
            <div className="result-mission-card-grid">
              {missionRecapEntries.map((entry) => {
                const missionTitle = missionDefinitions[entry.id].title
                const beforePercent = clampResultPercent(entry.target > 0 ? Math.round((entry.progressBefore / entry.target) * 100) : 0)
                const afterPercent = clampResultPercent(entry.target > 0 ? Math.round((entry.progressAfter / entry.target) * 100) : 0)
                const progressDelta = entry.progressAfter - entry.progressBefore
                const statusLabel = entry.completedAfter
                  ? entry.completedBefore
                    ? 'Prête'
                    : 'Terminée'
                  : progressDelta > 0
                    ? `+${progressDelta}`
                    : 'Stable'
                const progressStyle = {
                  '--result-mission-progress': `${afterPercent}%`,
                  '--result-mission-before': `${beforePercent}%`,
                } as CSSProperties

                return (
                  <article
                    key={`mission-recap-${entry.id}`}
                    className={`result-mission-card ${entry.completedAfter ? 'is-complete' : progressDelta > 0 ? 'is-progress' : 'is-idle'}`}
                    data-testid={`results-mission-recap-card-${entry.id}`}
                  >
                    <div className="result-mission-card__topline">
                      <h3>{missionTitle}</h3>
                      <span>{statusLabel}</span>
                    </div>
                    <p className="result-mission-card__progress">
                      {entry.progressBefore}/{entry.target} {'->'} {entry.progressAfter}/{entry.target}
                    </p>
                    <div
                      className="result-mission-card__meter"
                      role="progressbar"
                      aria-label={`${missionTitle}: ${entry.progressAfter}/${entry.target}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={afterPercent}
                      style={progressStyle}
                      data-testid={`results-mission-recap-progress-${entry.id}`}
                    >
                      <span className="result-mission-card__meter-fill" />
                      <span className="result-mission-card__meter-before" aria-hidden="true" />
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="small" data-testid="results-mission-recap-empty">
              Aucune progression mission sur cette partie.
            </p>
          )}
          <div className="actions">
            <Link className="button" to="/missions" data-testid="results-mission-recap-link">
              Voir les missions
            </Link>
          </div>
        </div>
      ) : null}

      {isTowerQueue ? (
        <div className="result-block" data-testid="results-tower-summary">
          <h2>Progression de la Tour</h2>
          <p className="small" data-testid="results-tower-floor">
            Étage {tower.floor} · Palier {tower.checkpointFloor}
          </p>
          <p className="small" data-testid="results-tower-status">
            {tower.status === 'continue' ? 'Run actif' : tower.status === 'cleared' ? 'Tour terminée' : 'Run échoué'}
          </p>

          {pendingReward ? (
            <div className="result-block" data-testid="results-tower-reward-offer">
              <h2>{pendingReward.kind === 'relic' ? 'Choisir une relique' : 'Choisir un échange'}</h2>

              {pendingReward.kind === 'swap' ? (
                <div className="result-block">
                  <p className="small">Choisis une carte à remplacer</p>
                  <div className="actions">
                    {(towerRun?.deck ?? []).map((cardId) => (
                      <button
                        key={`swap-out-${cardId}`}
                        type="button"
                        className={`button ${effectiveSwapOutCardId === cardId ? 'button-primary' : ''}`}
                        onClick={() => setSwapOutCardId(cardId)}
                        data-testid={`results-tower-swap-out-${cardId}`}
                      >
                        {cardId.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="actions">
                {pendingReward.kind === 'relic'
                  ? pendingReward.choices.map((choice) => (
                      <button
                        key={`tower-choice-${choice.id}`}
                        type="button"
                        className="button"
                        onClick={() => handleTowerChoice(choice.id)}
                        data-testid={`results-tower-choice-${choice.id}`}
                      >
                        {choice.title}
                      </button>
                    ))
                  : pendingReward.choices.map((choice) => (
                      <button
                        key={`tower-choice-${choice.cardId}`}
                        type="button"
                        className="button"
                        onClick={() => handleTowerChoice(choice.cardId)}
                        data-testid={`results-tower-choice-${choice.cardId}`}
                      >
                        {choice.title} ({choice.cardId.toUpperCase()})
                      </button>
                    ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {towerError ? <p className="error">{towerError}</p> : null}

      {rankedUpdate && rankedMode ? (
        <>
          <RankedLpRecap mode={rankedMode} update={rankedUpdate} animated={false} context="results" testIdPrefix="results-ranked" />
          {rankedUpdate.awardedLeagueReward ? (
            <p className="small" data-testid="results-ranked-league-reward">
              Récompense de ligue débloquée: +{rankedUpdate.awardedLeagueReward.fragments} fragments aléatoires ({rankedUpdate.awardedLeagueReward.tier})
            </p>
          ) : null}
        </>
      ) : null}

      <div className="actions results-main-actions" data-testid="results-main-actions">
        <Link className="button button-primary results-main-action results-main-action--replay" to="/setup" data-testid="play-again-button">
          Rejouer
        </Link>
        <Link className="button results-main-action results-main-action--pokedex" to="/pokedex" data-testid="results-pokedex-button">
          Pokédex
        </Link>
        <Link className="button results-main-action results-main-action--shop" to="/shop" data-testid="results-shop-button">
          Shop
        </Link>
        <Link className="button results-main-action results-main-action--home" to="/" data-testid="results-home-button">
          Accueil
        </Link>
      </div>
    </section>
  )
}
