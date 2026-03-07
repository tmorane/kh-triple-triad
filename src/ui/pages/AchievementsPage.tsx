import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { achievementCatalog } from '../../domain/progression/achievements'
import { listClaimableAchievementRewardIds } from '../../domain/progression/achievementRewards'
import type { AchievementId } from '../../domain/types'

export function AchievementsPage() {
  const { profile, claimAllAchievementRewards } = useGame()
  const [hoveredId, setHoveredId] = useState<AchievementId | null>(null)
  const [focusedId, setFocusedId] = useState<AchievementId | null>(null)
  const [pinnedId, setPinnedId] = useState<AchievementId | null>(null)

  const unlockedIds = useMemo(() => {
    const ids = new Set<AchievementId>()
    for (const entry of profile.achievements) {
      ids.add(entry.id)
    }
    return ids
  }, [profile.achievements])

  const claimableRewardCount = useMemo(
    () => listClaimableAchievementRewardIds(profile).length,
    [profile.achievements, profile.achievementRewardsClaimedById],
  )
  const claimButtonLabel = `Récupérer ${claimableRewardCount} pack(s) commun(s)`

  return (
    <section className="panel achievements-panel">
      <div className="achievements-headline">
        <h1>Succès</h1>
        <p className="small" data-testid="achievements-unlocked-count">
          Débloqués {unlockedIds.size}/{achievementCatalog.length}
        </p>
        <p className="small" data-testid="achievements-claimable-summary">
          Récompenses claimables: {claimableRewardCount} pack(s) commun(s)
        </p>
        <button
          type="button"
          className="button"
          data-testid="achievements-claim-all-button"
          disabled={claimableRewardCount === 0 || !claimAllAchievementRewards}
          onClick={() => {
            if (!claimAllAchievementRewards) {
              return
            }
            claimAllAchievementRewards()
          }}
        >
          {claimButtonLabel}
        </button>
      </div>

      <div className="achievements-grid" aria-label="Grille des succès">
        {achievementCatalog.map((achievement) => {
          const isUnlocked = unlockedIds.has(achievement.id)
          const tooltipId = `achievement-tooltip-${achievement.id}`
          const isTooltipVisible = hoveredId === achievement.id || focusedId === achievement.id || pinnedId === achievement.id

          return (
            <article className="achievement-card" key={achievement.id}>
              <button
                type="button"
                className={`achievement-item ${isUnlocked ? 'is-unlocked' : 'is-locked'}`}
                aria-describedby={tooltipId}
                data-testid={`achievement-item-${achievement.id}`}
                onMouseEnter={() => setHoveredId(achievement.id)}
                onMouseLeave={() => {
                  setHoveredId((current) => (current === achievement.id ? null : current))
                }}
                onFocus={() => setFocusedId(achievement.id)}
                onBlur={() => {
                  setFocusedId((current) => (current === achievement.id ? null : current))
                }}
                onClick={() => {
                  setHoveredId(null)
                  setFocusedId(null)
                  setPinnedId((current) => (current === achievement.id ? null : achievement.id))
                }}
              >
                <span
                  className={`achievement-status ${isUnlocked ? 'is-unlocked' : 'is-locked'}`}
                  aria-hidden="true"
                  data-testid={`achievement-status-${achievement.id}`}
                />
                <span className="achievement-title">{achievement.title}</span>
                <span className="achievement-description">{achievement.condition}</span>
              </button>

              <p
                id={tooltipId}
                role="tooltip"
                className="achievement-tooltip"
                data-testid={`achievement-tooltip-${achievement.id}`}
                hidden={!isTooltipVisible}
              >
                {achievement.condition}
              </p>
            </article>
          )
        })}
      </div>

      <div className="actions">
        <Link className="button button-primary" to="/setup">
          Lancer un match
        </Link>
        <Link className="button" to="/">
          Accueil
        </Link>
      </div>
    </section>
  )
}
