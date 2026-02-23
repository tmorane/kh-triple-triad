import { Link } from 'react-router-dom'
import { useGame } from '../../app/useGame'
import type { MissionId, MissionReward } from '../../domain/types'

const missionOrder: MissionId[] = ['m1_type_specialist', 'm2_combo_practitioner', 'm3_corner_tactician']

const missionTitles: Record<MissionId, string> = {
  m1_type_specialist: 'Type Specialist',
  m2_combo_practitioner: 'Combo Practitioner',
  m3_corner_tactician: 'Corner Tactician',
}

const missionDescriptions: Record<MissionId, string> = {
  m1_type_specialist: 'Win 5 matches with an active primary type synergy.',
  m2_combo_practitioner: 'Trigger Same/Plus a total of 6 times.',
  m3_corner_tactician: 'Play 12 cards in corner cells.',
}

const missionRewards: Record<MissionId, MissionReward> = {
  m1_type_specialist: { kind: 'gold', amount: 120 },
  m2_combo_practitioner: { kind: 'pack', packId: 'rare', amount: 1 },
  m3_corner_tactician: { kind: 'card', strategy: 'prefer_non_owned' },
}

function formatMissionReward(reward: MissionReward): string {
  if (reward.kind === 'gold') {
    return `+${reward.amount} gold`
  }
  if (reward.kind === 'pack') {
    return `+${reward.amount} ${reward.packId} pack`
  }
  return '1 card (prefer non-owned)'
}

export function MissionsPage() {
  const { profile } = useGame()
  const missions = missionOrder.map((missionId) => profile.missions[missionId])
  const completedCount = missions.filter((mission) => mission.completed).length

  return (
    <section className="panel missions-panel">
      <header className="missions-head">
        <h1>Missions</h1>
        <p className="small" data-testid="missions-summary">
          {completedCount}/{missions.length} completed
        </p>
      </header>

      <div className="missions-grid">
        {missions.map((mission) => {
          const progressPercent = Math.max(0, Math.min(100, Math.round((mission.progress / mission.target) * 100)))
          const status = mission.claimed ? 'Claimed' : mission.completed ? 'Completed' : 'In progress'
          return (
            <article key={mission.id} className="missions-card" data-testid={`missions-card-${mission.id}`}>
              <h2>{missionTitles[mission.id]}</h2>
              <p className="small">{missionDescriptions[mission.id]}</p>
              <p className="small missions-reward" data-testid={`missions-reward-${mission.id}`}>
                Reward: {formatMissionReward(missionRewards[mission.id])}
              </p>
              <p className="small" data-testid={`missions-progress-${mission.id}`}>
                {mission.progress}/{mission.target}
              </p>
              <div className="home-meter" aria-hidden="true">
                <span style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="small missions-status" data-testid={`missions-status-${mission.id}`}>
                {status}
              </p>
            </article>
          )
        })}
      </div>

      <div className="actions">
        <Link className="button button-primary" to="/setup">
          Play Match
        </Link>
        <Link className="button" to="/">
          Home
        </Link>
      </div>
    </section>
  )
}
