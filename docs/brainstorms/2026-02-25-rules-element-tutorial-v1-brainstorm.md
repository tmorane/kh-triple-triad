---
date: 2026-02-25
topic: rules-element-tutorial-v1
---

# Rules Element Tutorial V1

## What We're Building
Add a **manual** tutorial entry point in the `Rules` menu via a `Tutoriel` button.

Tutorial format is a **mini interactive demo**:
- 1 step per element type (`normal` + 14 effects).
- The current target icon is visually highlighted.
- User must click the highlighted icon to advance.
- Progress indicator: `Etape X/15`.
- Controls: `Passer` and `Quitter`.

Scope is intentionally strict:
- No autoplay onboarding.
- No free navigation between steps during the tutorial.
- Existing hover behavior remains outside tutorial mode.

## Why This Approach
Recommended approach: **strict guided flow** over flexible exploration.

Reason:
- It guarantees that each effect type is actually seen once.
- It matches your intent for a “real tutorial”, not a passive help text.
- It keeps implementation simple and testable in V1.

## Key Decisions
- Trigger mode: **on-demand only** (`Tutoriel` button).
- Coverage: **all element types** (15 total).
- Guidance: **strict** (only highlighted icon is actionable).
- End states:
  - `Passer` jumps to next step.
  - `Quitter` exits tutorial immediately.
  - Last step shows completion state with `Terminer`.
- Tutorial state is local to `RulesPage` (no global store needed in V1).

## Open Questions
- None blocking for V1.
- Optional V2: persist `deja termine` in profile/local storage.

## Next Steps
1. Add TDD specs in `RulesPage.test.tsx` for strict tutorial flow.
2. Implement tutorial state machine in `RulesPage.tsx`.
3. Add minimal UI hooks/classes in CSS for highlight/lock mode.
