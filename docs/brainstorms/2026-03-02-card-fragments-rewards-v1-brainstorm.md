---
date: 2026-03-02
topic: card-fragments-rewards-v1
---

# Card Fragments Rewards V1

## What We're Building
Replace post-fight direct card rewards with a fragment-based progression system.

New flow:
- Winning a combat grants `1` fragment.
- The fragment is for the exact card that would have been awarded previously.
- Fragments are tracked per specific card.
- When enough fragments are available, the player can manually craft the card via a dedicated action.
- If the player already owns the card, extra fragments are still stored (not lost).

Fragment costs by rarity:
- Common: `3`
- Uncommon: `6`
- Rare: `10`
- Epic: `25`
- Legendary: `100`

## Why This Approach
Recommended approach: direct replacement of reward output (card -> fragment), while keeping reward source logic unchanged.

Why:
- Minimal systemic risk.
- Preserves current reward identity and balancing per combat source.
- Gives clearer long-term progression without random frustration.
- Leaves room for future systems (upgrades, duplicate sinks) because fragments are never discarded.

## Approaches Considered

### Approach A (Recommended): Direct reward replacement
Keep current reward selection logic; convert the result into `+1 fragment` for that specific card.

Pros:
- Fastest, safest migration path.
- Almost no change to encounter balance logic.
- Easy to test with existing reward scenarios.

Cons:
- No extra strategic choice at reward time.

Best when: you want a clean v1 with low complexity.

### Approach B: Fragment pools by rarity
Combat gives rarity fragments, player crafts any card of matching rarity.

Pros:
- More player agency.

Cons:
- Larger economy impact.
- Harder balancing and anti-hoarding decisions.

Best when: economy redesign is desired (not v1).

## Key Decisions
- Reward unit: fragment, not card.
- Combat payout: fixed `1 fragment` per victory.
- Fragment target: exact card that would have been granted before.
- Storage model: per-card fragment counters.
- Craft trigger: manual (button/action), not automatic.
- Overflow behavior: fragments are always kept, including after first ownership.
- Cost model: rarity-based thresholds (`3/6/10/25/100`).

## Open Questions
- Craft UX surface: where manual craft lives first (`collection`, `reward modal`, or both).
- Batch crafting: v1 can ship with single-craft action per click.

## Next Steps
-> `/workflows:plan` for file-level implementation steps and test matrix.
