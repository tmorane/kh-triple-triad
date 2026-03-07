---
date: 2026-03-02
topic: rules-match-tutorials-v2
---

# Rules Match Tutorials V2

## What We're Building
Add a real playable tutorial flow from `Rules` with strict guidance and no progression impact.

Scope:
- Base tutorial (first): launches a preconfigured match with fixed cards and step-by-step forced actions to teach core play.
- Element tutorials (after base): one tutorial per element, launched from `Rules`.
- Each element tutorial starts a preconfigured match with `5x` the targeted element for the player deck.
- Progression model: semi-guided unlock (base tutorial completion unlocks element tutorials).
- Tutorial matches are sandbox-only: no gold, no card capture, no ranked/tower impact, no mission/achievement/stat progression.

Hard constraint discovered:
- Current card pool cannot provide 5 unique cards for all elements (`glace:2`, `dragon:3`, `spectre:3`).
- Therefore, `5x targeted type` requires tutorial-only deck duplication support.

## Why This Approach
Recommended approach: dedicated tutorial queue + data-driven scenarios.

Why:
- Cleanly isolates tutorial logic from normal/ranked/tower loops.
- Prevents accidental progression leaks.
- Keeps strict scripted guidance deterministic and testable.
- Supports your exact requirement (`5x` targeted type) via tutorial-only duplicate allowance.

## Approaches Considered

### Approach A: Reuse normal queue + add flags (quick patch)
Use existing `startMatch` and `MatchPage`, pass tutorial flags through route/context.

Pros:
- Fast to ship.
- Fewer files touched initially.

Cons:
- Easy to leak rewards/stats by mistake.
- Tutorial behavior gets mixed into normal flow conditionals.
- Future tutorial expansion becomes messy.

Best when: one short-lived tutorial only.

### Approach B (Recommended): Dedicated `tutorial` queue + scenario registry
Add a new queue type and a small scenario engine. `Rules` launches scenarios; `MatchPage` enforces strict scripted steps.

Pros:
- Strong separation of concerns.
- Zero-impact sandbox is straightforward.
- Scales to all element tutorials without spaghetti conditionals.

Cons:
- Slightly more upfront plumbing.
- Requires small profile persistence addition for unlock/completion.

Best when: long-term tutorial system with multiple scenarios.

### Approach C: Separate tutorial-only page/runtime
Build another gameplay page dedicated to tutorials.

Pros:
- Complete isolation from normal game.

Cons:
- Duplicates board/gameplay UI logic.
- High maintenance cost.

Best when: tutorial mechanics diverge heavily from actual game (not the case here).

## Key Decisions
- Architecture: use Approach B.
- Entry point: `Rules` page.
- Unlocking: base tutorial must be completed first, then element tutorial buttons unlock.
- Guidance level: strict; only expected action is allowed at each step.
- Base tutorial powers: disabled (`enableElementPowers: false`).
- Element tutorial powers: enabled.
- Deck model for element tutorial: player deck is `5x` target element (duplicates allowed in tutorial only).
- CPU behavior in tutorial: scripted sequence per scenario (not free AI) for deterministic teaching moments.
- Progression impact: none (sandbox-only).

## Open Questions
- None blocking for planning.
- Optional V2.1: add replay medal/time scoring for each tutorial.

## Next Steps
-> `/workflows:plan` to produce a concrete implementation plan with file-level diffs and test matrix.
