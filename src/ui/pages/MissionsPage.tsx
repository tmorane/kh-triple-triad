import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import { missionDefinitions, missionIds } from '../../domain/progression/missionCatalog'
import type { MissionReward } from '../../domain/types'

function formatMissionReward(reward: MissionReward): string {
  if (reward.kind === 'gold') {
    return `+${reward.amount} or`
  }
  if (reward.kind === 'pack') {
    return `+${reward.amount} pack ${reward.packId}`
  }
  return '1 carte (non possédée en priorité)'
}

export function MissionsPage() {
  const { profile, claimMission } = useGame()
  const [feedback, setFeedback] = useState<string | null>(null)
  const missions = missionIds.map((missionId) => profile.missions[missionId])
  const completedCount = missions.filter((mission) => mission.completed).length

  return (
    <section className="panel missions-panel">
      <header className="missions-head">
        <h1>Missions</h1>
        <p className="small" data-testid="missions-summary">
          {completedCount}/{missions.length} terminées
        </p>
      </header>

      {feedback ? (
        <p className="small" data-testid="missions-feedback" role="status">
          {feedback}
        </p>
      ) : null}

      <div className="missions-grid">
        {missions.map((mission) => {
          const definition = missionDefinitions[mission.id]
          const progressPercent = Math.max(0, Math.min(100, Math.round((mission.progress / mission.target) * 100)))
          const rewardAlreadyGranted = profile.missionRewardsGrantedById[mission.id] === true
          const status = mission.completed ? 'Prête à récupérer' : 'En cours'

          return (
            <article key={mission.id} className="missions-card" data-testid={`missions-card-${mission.id}`}>
              <h2>{definition.title}</h2>
              <p className="small">{definition.description}</p>
              <p className="small missions-reward" data-testid={`missions-reward-${mission.id}`}>
                Récompense: {formatMissionReward(definition.reward)}
              </p>
              {rewardAlreadyGranted ? (
                <p className="small missions-reward" data-testid={`missions-reward-history-${mission.id}`}>
                  Récompense déjà accordée avant réinitialisation.
                </p>
              ) : null}
              <p className="small" data-testid={`missions-progress-${mission.id}`}>
                {mission.progress}/{mission.target}
              </p>
              <div className="home-meter" aria-hidden="true">
                <span style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="small missions-status" data-testid={`missions-status-${mission.id}`}>
                {status}
              </p>
              {mission.completed ? (
                <button
                  type="button"
                  className="button home-mission-claim"
                  data-testid={`missions-claim-${mission.id}`}
                  onClick={() => {
                    if (!claimMission) {
                      setFeedback('Réclamation indisponible.')
                      return
                    }
                    const result = claimMission(mission.id)
                    if (result.valid) {
                      setFeedback('Récompense récupérée. Nouvelle mission lancée.')
                    } else {
                      setFeedback(result.reason ?? 'Mission non disponible.')
                    }
                  }}
                >
                  Récupérer
                </button>
              ) : null}
            </article>
          )
        })}
      </div>

      <div className="actions">
        <Link className="button button-primary" to="/setup">
          Jouer
        </Link>
        <Link className="button" to="/">
          Accueil
        </Link>
      </div>
    </section>
  )
}
