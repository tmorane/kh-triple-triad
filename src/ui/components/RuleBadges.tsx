import type { RuleSet } from '../../domain/types'

export function RuleBadges({ rules }: { rules: RuleSet }) {
  return (
    <div className="rule-badges" aria-label="Active rules">
      <span className="rule-badge active">Open</span>
      <span className={`rule-badge ${rules.same ? 'active' : 'inactive'}`}>Same</span>
      <span className={`rule-badge ${rules.plus ? 'active' : 'inactive'}`}>Plus</span>
    </div>
  )
}
