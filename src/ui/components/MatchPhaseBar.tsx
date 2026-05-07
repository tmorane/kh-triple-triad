import type { CombatPhase } from '../../domain/match/combatPhase'

const phaseSteps: Array<{ id: CombatPhase; label: string; action: string; next: string }> = [
  { id: 'pose', label: 'Pose', action: 'Choisis carte + case', next: 'pouvoir si disponible' },
  { id: 'power', label: 'Pouvoir', action: 'Clique une cible', next: 'duel ou tour CPU' },
  { id: 'duel', label: 'Duel', action: 'Compare les côtés', next: 'capture visible' },
  { id: 'result', label: 'Résultat', action: 'Lis les captures', next: 'tour suivant' },
  { id: 'cpu', label: 'CPU', action: 'Regarde le CPU', next: 'à toi de jouer' },
]

export function MatchPhaseBar({ phase }: { phase: CombatPhase }) {
  const activeIndex = Math.max(
    0,
    phaseSteps.findIndex((step) => step.id === phase),
  )
  const currentStep = phaseSteps[activeIndex] ?? phaseSteps[0]!

  return (
    <nav className="match-phase-bar" aria-label="Phase du combat" data-testid="match-phase-bar">
      <p className="match-phase-bar__label" data-testid="match-phase-bar-label">
        Combat Console
      </p>
      <div className="match-phase-bar__readout">
        <span className="match-phase-bar__current" data-testid="match-phase-bar-current">
          {currentStep.label}
        </span>
        <span className="match-phase-bar__action" data-testid="match-phase-bar-action">
          {currentStep.action}
        </span>
        <span className="match-phase-bar__next" data-testid="match-phase-bar-next">
          Ensuite: {currentStep.next}
        </span>
      </div>
      <ol className="match-phase-bar__steps">
        {phaseSteps.map((step, index) => {
          const phaseState = index < activeIndex ? 'done' : index === activeIndex ? 'active' : index === activeIndex + 1 ? 'next' : 'locked'
          return (
            <li
              key={step.id}
              className={`match-phase-bar__step ${step.id === phase ? 'is-active' : ''}`}
              aria-current={step.id === phase ? 'step' : undefined}
              data-phase-state={phaseState}
              data-testid={`match-phase-step-${step.id}`}
            >
              <span>{step.label}</span>
              <small>{step.action}</small>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
