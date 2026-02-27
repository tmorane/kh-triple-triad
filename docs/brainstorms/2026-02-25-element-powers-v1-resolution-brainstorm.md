---
date: 2026-02-25
topic: element-powers-v1-resolution
---

# Element Powers V1 Resolution

## What We're Building
We are adding a 15-element power system to match gameplay, with one hard mode gate:
- If at least one starting deck contains a `normal` card, the match runs in `mode normal` and all special effects are disabled.
- Otherwise, the match runs in `mode effects` and powers are active.

Scope is intentionally strict for V1:
- 1 power per element.
- `a la pose` powers can trigger only once per element, per player, per match.
- `inne` powers are always active while the card is in play.
- Stats never go below 1.

## Why This Approach
Recommended approach: manual targeting for all powers qui demandent un choix.

Reason:
- It matches exactly le feeling "si on cible, c est le joueur qui choisit".
- It keeps tactical intent in player hands instead of opaque auto-picks.
- It avoids frustration from "the game chose the wrong target".

## Key Decisions
- Match mode is locked at match creation and never changes mid-match.
- `normal` is a pre-match mode switch, not an in-match triggered effect.
- `mode normal` is a true vanilla match: only base capture rules remain.
- In `mode normal`, force rules to `open: true, same: false, plus: false`.
- In `mode normal`, disable all current and future non-core effects (element powers, type synergies, keyword effects).
- `a la pose` activation is consumed on the first card of that element played by that actor, even if no valid target exists.
- V1 targeting is manual when a power asks for a target.

## Technical Spec

### 1) New Runtime State
Add element runtime state under `MatchState`:

```ts
type ElementMode = 'normal' | 'effects'

interface MatchElementState {
  mode: ElementMode
  usedOnPoseByActor: Record<Actor, Partial<Record<CardElementId, true>>>
  actorTurnCount: Record<Actor, number>
  frozenCellsByActor: Partial<Record<number, Actor>>
  floodedCell: { cell: number; owner: Actor } | null
  poisonedHandByActor: Record<Actor, CardId[]>
  boardEffectsByCell: Partial<Record<number, CardBoardEffects>>
}

interface CardBoardEffects {
  permanentDelta: { top: number; right: number; bottom: number; left: number }
  burnTicksRemaining: number
  volatileAllStatsMinusOneUntilEndOfOwnerNextTurn: boolean
  unflippableUntilEndOfOpponentNextTurn: boolean
  swappedHighLowUntilMatchEnd: boolean
  rockShieldCharges: number
  poisonFirstCombatPending: boolean
  insectEntryStacks: 0 | 1 | 2
  dragonApplied: boolean
}
```

Store per board cell, not per card id, because ownership can flip.

### 2) Canonical Power List (V1)
1. **Normal** (`inne`, pre-match gate): if either starting deck has at least one `normal` card, match mode is `normal` and all powers are disabled.
2. **Feu** (`a la pose`, once): target adjacent enemy card, apply `burnTicksRemaining = 2`. At start of target owner turn: permanent `-1` on all 4 stats, then decrement ticks.
3. **Eau** (`a la pose`, once): mark one empty cell as flooded. Next non-`spectre` card played there gets `-2` on one highest stat (random among ties using seeded RNG), then flood is consumed.
4. **Plante** (`inne`): dynamic aura `+1` all stats per adjacent allied card, max `+2`.
5. **Electrik** (`a la pose`, once): shield the placed allied card; it cannot be flipped during next opponent turn.
6. **Glace** (`a la pose`, once): freeze one empty cell; opponent cannot play next card there (single use).
7. **Combat** (`inne`): `+2` only when that card is the attacking source in its placement resolution.
8. **Poison** (`a la pose`, once): mark one random opponent hand card. When that card is played, it gets `-1` all stats for its first combat only.
9. **Sol** (`a la pose`, once): all adjacent cards (ally + enemy) get `-1` on one highest stat for current combat resolution only.
10. **Vol** (`a la pose`, once): target one enemy board card, `-1` all stats until end of its owner next turn.
11. **Psy** (`a la pose`, once): target one enemy board card, swap highest and lowest stat until end of match.
12. **Insecte** (`inne`): on entry, gain `+1` all stats per allied `insecte` already on board, max `+2` (permanent on that card instance).
13. **Roche** (`inne`): starts with 1 shield charge; first time card would flip, consume charge and prevent flip.
14. **Spectre** (`a la pose` behavior): can be played on any empty cell even if frozen/flooded and ignores cell malus.
15. **Dragon** (`a la pose`, once): apply `+1` to two weakest stats and `-1` to strongest stat on placed card (tie order: top, right, bottom, left).

### 3) Targeting and Tie-Break Policy
Manual selection in V1.

Player-chosen targets:
- Feu: choose one adjacent enemy card.
- Vol: choose one enemy board card.
- Psy: choose one enemy board card.
- Glace: choose one empty cell.
- Eau: choose one empty cell.

Tie-break for "highest stat" side:
- Default: `top > right > bottom > left`.
- Exception: `eau` explicitly uses seeded random for tied highest stats.

Move payload must carry targeting:

```ts
interface MovePowerTarget {
  targetCell?: number
  targetCardCell?: number
}

interface Move {
  actor: Actor
  cardId: CardId
  cell: number
  powerTarget?: MovePowerTarget
}
```

Validation:
- If a power requires a target and `powerTarget` is missing/invalid, reject the move.
- If exactly one legal target exists, UI may prefill it, but move still carries explicit target.

### 4) Turn Resolution Order (Strict)
In `mode effects`, run this order inside `applyMoveDetailed`:

1. `startTurn(move.actor)`:
- increment `actorTurnCount[actor]`
- apply burn ticks on actor-owned board cards
- clear effects that expire at start/end boundaries

2. Validate move:
- base rules (turn, hand, bounds, occupancy)
- frozen cell check (blocked unless placed card is `spectre`)

3. Place card on board and create card instance runtime effects.

4. On-pose power window:
- if this element has unused on-pose power for actor, validate chosen target, mark used, and resolve power now.

5. Build effective side values for this move:
- `base`
- `permanentDelta`
- temporary debuffs/buffs (Vol, Poison-first-combat, etc.)
- dynamic innates (Plante adjacency, Combat attacker bonus, Insecte entry bonus)
- Psy swap
- clamp min 1

6. Resolve normal capture + Same/Plus + combo chain.

7. Flip prevention priority when a card would flip:
- Electrik unflippable
- Roche shield charge
- else flip

8. Consume one-time combat flags:
- Poison first combat malus consumed after first combat participation.

9. End-turn cleanup:
- decrement end-of-owner-next-turn timers
- switch turn and update match status.

In `mode normal`, skip steps 1/4/5/7/8 element behavior and use current core engine rules only.
Also force `same` and `plus` off in this mode.

### 5) Edge Cases
- If no valid target exists for an on-pose power, activation is still consumed.
- If no empty cell exists for Glace/Eau, activation is consumed with no effect.
- Poison with empty opponent hand: consumed, no effect.
- Effects are attached to card instance on board and persist through ownership flips.
- Plante aura recalculates from current owner adjacency each combat.
- Spectre can ignore frozen/flooded malus, but cannot occupy an already occupied cell.
- `normal` mode disables everything except base board placement and capture logic.
- A stat decrement that would go below 1 is clamped to 1 immediately.

### 6) Implementation File Map
- `src/domain/types.ts`
  - add `ElementMode`, runtime effect types.
- `src/domain/match/types.ts`
  - extend `MatchState` with `elementState`.
- `src/domain/match/engine.ts`
  - add mode gate, turn-start effects, on-pose resolution hook, effective stat resolver, flip prevention.
- `src/domain/cards/taxonomy.ts`
  - keep `cardElementIds` as source of truth.
- `src/domain/match/engine.test.ts`
  - add effect-focused specs for each element and mode gate behavior.

### 7) TDD Test Matrix (Must Fail First)
1. Match enters `mode normal` when either deck includes `normal`.
2. `mode normal` disables all element effects.
3. Each `a la pose` power triggers once per element/actor/match.
4. Move is rejected if required manual target is missing or invalid.
5. Feu burn ticks apply twice on owner turn starts.
6. Eau flood consumes on next non-spectre placement.
7. Plante adjacency bonus updates dynamically.
8. Electrik shield blocks flips only during next opponent turn.
9. Combat `+2` applies only while card attacks on placement.
10. Poison marks random hand card and applies first-combat-only malus.
11. Sol malus lasts only current combat resolution.
12. Vol debuff expires at end of owner next turn.
13. Psy swap persists until match end.
14. Insecte entry stacks cap at `+2`.
15. Roche shield prevents first flip only once.
16. Spectre ignores cell malus but not occupancy.
17. Dragon deterministic stat transform follows tie order.

## Next Steps
1. Run `/workflows:plan` from this spec for implementation phases.
2. Execute implementation with strict TDD on `engine.test.ts` first.
