import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PRIMARY_MATCH_MODE } from '../../app/matchUiConfig'
import { useGame } from '../../app/useGame'
import { cardPool } from '../../domain/cards/cardPool'
import { getDeckForMode } from '../../domain/cards/decks'
import { getModeSpec } from '../../domain/match/modeSpec'
import { achievementCatalog } from '../../domain/progression/achievements'
import type { RankedTierId } from '../../domain/types'

const GOLD_MILESTONES = [150, 200, 300, 450, 600, 800, 1000]
const numberFormat = new Intl.NumberFormat('fr-FR')

const tierNames: Record<RankedTierId, string> = {
  iron: 'Fer',
  bronze: 'Bronze',
  silver: 'Argent',
  gold: 'Or',
  platinum: 'Platine',
  diamond: 'Diamant',
  challenger: 'Challenger',
}

interface DetailedMetric {
  icon: string
  label: string
  value: string
  sub: string
  progress?: number
}

interface PlayerNameFormProps {
  initialName: string
  onRename(name: string): { valid: boolean; reason?: string }
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

function formatTierLabel(tier: RankedTierId, division: string | null): string {
  const tierLabel = tierNames[tier]
  if (division) {
    return `${tierLabel} ${division}`
  }
  return tierLabel
}

function PlayerNameForm({ initialName, onRename }: PlayerNameFormProps) {
  const [playerNameDraft, setPlayerNameDraft] = useState(initialName)
  const [playerNameError, setPlayerNameError] = useState<string | null>(null)

  const submitPlayerName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = onRename(playerNameDraft)
    if (!result.valid) {
      setPlayerNameError(result.reason ?? 'Nom de joueur invalide.')
      return
    }

    setPlayerNameError(null)
  }

  return (
    <>
      <form className="account-local-form" onSubmit={submitPlayerName}>
        <label className="account-label" htmlFor="account-player-name-input">
          Nom du joueur
          <input
            id="account-player-name-input"
            data-testid="account-player-name-input"
            type="text"
            value={playerNameDraft}
            onChange={(event) => setPlayerNameDraft(event.target.value)}
          />
        </label>
        <button type="submit" className="button" data-testid="account-player-name-submit">
          Enregistrer le nom
        </button>
      </form>
      {playerNameError ? (
        <p className="error" role="alert">
          {playerNameError}
        </p>
      ) : null}
    </>
  )
}

export function AccountPage() {
  const { profile, storedProfiles, renamePlayer, setAudioEnabled, createStoredProfile, switchStoredProfile, deleteStoredProfile, resetProfile } = useGame()

  const [newProfileName, setNewProfileName] = useState('')
  const [profilesError, setProfilesError] = useState<string | null>(null)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)

  const selectedDeck = profile.deckSlots.find((slot) => slot.id === profile.selectedDeckSlotId) ?? profile.deckSlots[0]
  const activeDeckMode = PRIMARY_MATCH_MODE
  const rankedModeLabel = PRIMARY_MATCH_MODE.toUpperCase()
  const activeDeckMaxSize = getModeSpec(activeDeckMode).deckSize
  const activeDeckCount = getDeckForMode(selectedDeck, activeDeckMode).length
  const ownedCards = profile.ownedCardIds.length
  const totalCards = cardPool.length
  const unlockedAchievements = profile.achievements.length
  const totalAchievements = achievementCatalog.length
  const played = profile.stats.played
  const wins = profile.stats.won
  const losses = Math.max(played - wins, 0)
  const ranked = profile.rankedByMode[PRIMARY_MATCH_MODE]
  const rankedTierLabel = formatTierLabel(ranked.tier, ranked.division)
  const rankedRecordLabel = `${ranked.wins}V ${ranked.losses}D ${ranked.draws}N`
  const nextGoldTarget = GOLD_MILESTONES.find((milestone) => profile.gold < milestone) ?? null

  const detailedMetrics = useMemo<DetailedMetric[]>(
    () => [
      {
        icon: PRIMARY_MATCH_MODE === '4x4' ? '4' : '3',
        label: `Rang classé ${rankedModeLabel}`,
        value: rankedTierLabel,
        sub: `${ranked.lp} LP`,
        progress: ranked.lp,
      },
      {
        icon: 'G',
        label: "Réserve d'or",
        value: numberFormat.format(profile.gold),
        sub: nextGoldTarget ? `${numberFormat.format(nextGoldTarget - profile.gold)} avant le prochain palier` : 'Palier max atteint',
        progress: nextGoldTarget ? clampPercent(Math.round((profile.gold / nextGoldTarget) * 100)) : 100,
      },
      {
        icon: 'C',
        label: 'Pokédex',
        value: `${ownedCards}/${totalCards}`,
        sub: `${clampPercent(Math.round((ownedCards / totalCards) * 100))}% complété`,
        progress: clampPercent(Math.round((ownedCards / totalCards) * 100)),
      },
      {
        icon: 'A',
        label: 'Succès',
        value: `${unlockedAchievements}/${totalAchievements}`,
        sub: `${clampPercent(Math.round((unlockedAchievements / totalAchievements) * 100))}% débloqué`,
        progress: clampPercent(Math.round((unlockedAchievements / totalAchievements) * 100)),
      },
      {
        icon: 'D',
        label: selectedDeck.name,
        value: `${activeDeckCount}/${activeDeckMaxSize}`,
        sub: 'Emplacements du deck actif remplis',
        progress: clampPercent(Math.round((activeDeckCount / activeDeckMaxSize) * 100)),
      },
      {
        icon: 'S',
        label: 'Série actuelle',
        value: `${profile.stats.streak}`,
        sub: `Meilleure série: ${profile.stats.bestStreak}`,
      },
      {
        icon: 'R',
        label: `Bilan classé ${rankedModeLabel}`,
        value: rankedRecordLabel,
        sub: `${ranked.matchesPlayed} matchs classés`,
      },
      {
        icon: 'M',
        label: 'Bilan combat',
        value: `${wins}V / ${losses}D`,
        sub: `${played} matchs joués`,
      },
    ],
    [
      rankedModeLabel,
      rankedTierLabel,
      ranked.lp,
      profile.gold,
      nextGoldTarget,
      ownedCards,
      totalCards,
      unlockedAchievements,
      totalAchievements,
      selectedDeck.name,
      activeDeckCount,
      activeDeckMaxSize,
      profile.stats.streak,
      profile.stats.bestStreak,
      rankedRecordLabel,
      ranked.matchesPlayed,
      wins,
      losses,
      played,
    ],
  )

  const submitNewProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = createStoredProfile(newProfileName)
    if (!result.valid) {
      setProfilesError(result.reason ?? 'Nom de profil invalide.')
      return
    }

    setProfilesError(null)
    setNewProfileName('')
  }

  return (
    <section className="panel account-panel">
      <h1>Compte</h1>
      <section className="account-section" data-testid="account-local-profile-section">
        <h2>Profil local</h2>
        <PlayerNameForm key={profile.playerName} initialName={profile.playerName} onRename={renamePlayer} />
        <div className="account-local-form">
          <p className="small" data-testid="account-audio-state">
            Les effets sonores sont {profile.settings.audioEnabled ? 'activés.' : 'désactivés.'}
          </p>
          <button
            type="button"
            className="button"
            onClick={() => setAudioEnabled(!profile.settings.audioEnabled)}
            data-testid="account-audio-toggle"
          >
            {profile.settings.audioEnabled ? 'Couper le son' : 'Activer le son'}
          </button>
        </div>
      </section>

      <section className="account-section">
        <h2>Stats détaillées</h2>
        <div className="account-metrics-grid">
          {detailedMetrics.map((metric) => (
            <article key={metric.label} className="home-metric-card">
              <p className="home-metric-label">
                <span className="home-metric-icon" aria-hidden="true">
                  {metric.icon}
                </span>
                {metric.label}
              </p>
              <p className="home-metric-value">{metric.value}</p>
              <p className="home-metric-sub">{metric.sub}</p>
              {metric.progress !== undefined ? (
                <div className="home-meter" aria-hidden="true">
                  <span style={{ width: `${metric.progress}%` }} />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="account-section account-profiles-block" data-testid="account-profiles-block">
        <div className="account-section-head">
          <h2>Profils locaux</h2>
          <p className="small">{storedProfiles.profiles.length} au total</p>
        </div>

        <div className="account-profiles-list">
          {storedProfiles.profiles.map((storedProfile) => {
            const profileLosses = Math.max(storedProfile.played - storedProfile.wins, 0)
            return (
              <article
                key={storedProfile.id}
                className={`home-profile-card${storedProfile.isActive ? ' home-profile-card--active' : ''}`}
              >
                <div className="home-profile-card__copy">
                  <p className="home-profile-card__name">{storedProfile.playerName}</p>
                  <p className="small">
                    {storedProfile.wins}V / {profileLosses}D · {numberFormat.format(storedProfile.gold)} or
                  </p>
                </div>

                <div className="home-profile-card__actions">
                  {storedProfile.isActive ? (
                    <span className="home-profile-card__active">Actif</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="button"
                        onClick={() => {
                          switchStoredProfile(storedProfile.id)
                          setProfilesError(null)
                        }}
                      >
                        Changer
                      </button>
                      <button
                        type="button"
                        className="button button-danger"
                        onClick={() => {
                          const result = deleteStoredProfile(storedProfile.id)
                          if (!result.valid) {
                            setProfilesError(result.reason ?? 'Impossible de supprimer le profil.')
                            return
                          }
                          setProfilesError(null)
                        }}
                      >
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <form className="account-profile-create" onSubmit={submitNewProfile}>
          <input
            type="text"
            value={newProfileName}
            onChange={(event) => setNewProfileName(event.target.value)}
            placeholder="Nom du nouveau profil"
            aria-label="Nom du nouveau profil"
            data-testid="account-profile-create-input"
          />
          <button type="submit" className="button" data-testid="account-profile-create-submit">
            Ajouter le profil
          </button>
        </form>

        {profilesError ? (
          <p className="error" role="alert">
            {profilesError}
          </p>
        ) : null}
      </section>

      <section className="account-section account-danger-zone" data-testid="account-danger-zone">
        <h2>Zone dangereuse</h2>
        <p className="small">Cette action réinitialise ton profil de jeu. Impossible de revenir en arrière.</p>
        <button
          type="button"
          className="button button-danger"
          data-testid="account-reset-trigger"
          onClick={() => setIsResetConfirmOpen(true)}
        >
          Réinitialiser le profil
        </button>
        {isResetConfirmOpen ? (
          <div className="account-danger-confirm">
            <button
              type="button"
              className="button button-danger"
              data-testid="account-reset-confirm"
              onClick={() => {
                resetProfile()
                setIsResetConfirmOpen(false)
              }}
            >
              Confirmer la réinitialisation
            </button>
            <button
              type="button"
              className="button"
              data-testid="account-reset-cancel"
              onClick={() => setIsResetConfirmOpen(false)}
            >
              Annuler
            </button>
          </div>
        ) : null}
      </section>

      <section className="account-section" data-testid="account-legal-links">
        <h2>Légal & confidentialité</h2>
        <p className="small">Consulte la politique de confidentialite et les mentions IP avant publication.</p>
        <div className="account-actions">
          <Link className="button button-primary" to="/privacy">
            Politique de confidentialité
          </Link>
          <Link className="button" to="/legal">
            Mentions IP
          </Link>
        </div>
      </section>

    </section>
  )
}
