import type { RuleSet } from '../../domain/types'

export function RuleBadges({ rules }: { rules: RuleSet }) {
  return (
    <div className="rule-badges" aria-label="Active rules">
      <span className={`rule-badge ${rules.open ? 'active' : 'inactive'}`}>{rules.open ? 'Open' : 'Hidden'}</span>
    </div>
  )
}
