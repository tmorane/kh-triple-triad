---
status: ready
priority: p1
issue_id: "001"
tags: [frontend, quality, lint, p0]
dependencies: []
---

# Fix lint blockers on React hooks and test vars

Stabilize lint by removing hard errors reported by `bun run lint`.

## Problem Statement

The release pipeline is red because lint fails on multiple files (react-hooks/set-state-in-effect, preserve-manual-memoization, unused vars). V1 must not ship with red quality gates.

## Findings

- `bun run lint` returns 8 errors and 1 warning.
- Blocking files include:
  - `src/ui/components/RankedLpRecap.tsx`
  - `src/ui/components/TriadCard.tsx`
  - `src/ui/pages/AchievementsPage.tsx`
  - `src/ui/pages/CollectionPage.tsx`
  - `src/ui/pages/SetupPage.tsx`
  - `src/ui/pages/ShopPage.test.tsx`
- Several errors come from synchronous `setState` in effects.

## Proposed Solutions

### Option 1: Minimal compliant refactor

**Approach:** Replace effect-driven state sync with derived values or guarded event/state transitions, and remove unused params in tests.

**Pros:**
- Fastest path to green lint.
- Lowest behavior risk.

**Cons:**
- Leaves some architectural debt for later cleanup.

**Effort:** 2-4 hours

**Risk:** Low

---

### Option 2: Full hook architecture cleanup

**Approach:** Rework state ownership in impacted pages/components to avoid sync effects globally.

**Pros:**
- Cleaner long-term architecture.

**Cons:**
- Larger scope for a V1 pre-release window.

**Effort:** 1-2 days

**Risk:** Medium

## Recommended Action

Execute Option 1 now. Keep all current behavior, remove lint violations only, and add focused tests if a behavior guard changes.

## Technical Details

**Affected files:**
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/components/RankedLpRecap.tsx`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/components/TriadCard.tsx`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/AchievementsPage.tsx`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/CollectionPage.tsx`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/SetupPage.tsx`
- `/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/ShopPage.test.tsx`

## Resources

- Lint output (`bun run lint`)

## Acceptance Criteria

- [ ] `bun run lint` returns exit code 0
- [ ] No new `eslint-disable` added to bypass errors
- [ ] Behavior of setup/collection/ranked recap remains unchanged
- [ ] ShopPage tests compile without unused variable errors

## Work Log

### 2026-03-10 - Todo creation

**By:** Codex

**Actions:**
- Converted audit finding into actionable ready todo.
- Scoped impacted files and constraints.

**Learnings:**
- Most blockers are lint-policy violations, not type errors.

## Notes

- This task is a hard gate for release.
