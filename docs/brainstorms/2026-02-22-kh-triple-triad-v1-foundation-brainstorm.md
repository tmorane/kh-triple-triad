---
date: 2026-02-22
topic: kh-triple-triad-v1-foundation
---

# KH Triple Triad V1 Foundation

## What We're Building
We are building a Kingdom Hearts inspired Triple Triad game that starts as 1vCPU and is intentionally shaped to evolve into multiplayer later. V1 is not a demo-only prototype: it should already feel like a coherent product loop where the player can play matches, earn gold, expand collection, tune decks, and chase first achievements.

The target feeling is "easy to enter, tactical to master." Players should understand the board quickly, then discover depth through optional rules. The game keeps the current hybrid structure from the draft because it already matches that goal: menu, play screen, decks, collection, and shop connected by persistent progression.

V1 scope in plain product terms:
- One stable playable loop: start match, place cards, resolve flips, end match, rewards.
- One clear progression loop: gain resources, buy/earn cards, improve deck choices.
- One clear rules loop: learn rules in a dedicated screen, choose rule toggles before match.
- One clear long-term hook: shared collection and core achievements.

V1 success criteria:
- A new player can understand the basic rule flow in under 3 minutes.
- A match can be started from menu in under 2 clicks after initial setup.
- Rule toggles (Same/Plus) are visible before launch and during match.
- Saves survive refresh and restart through local persistence.
- CPU is stronger than random and creates meaningful board pressure.

## Why This Approach
### Approach A: React shell + PixiJS match + Miniplex match ECS (Recommended)
Use React and existing app patterns for navigation and progression screens, then move match rendering/interaction to PixiJS. Use Miniplex only inside the match runtime (board state projection, placed cards, effects, turn-state entities), not across the whole app.

Pros:
- Keeps speed by reusing the current React draft.
- Gives stronger board visuals and animation headroom immediately.
- Keeps complexity local to match domain instead of global architecture rewrite.
- Creates a clean boundary for future multiplayer rules engine reuse.

Cons:
- Two UI layers to coordinate (React shell + Pixi canvas).
- Requires explicit state contract between app state and match runtime.

Best when: the product is card-game first, with rich menus/progression and a board that benefits from effects.

### Approach B: React only
Keep everything in React/CSS with no Pixi and no ECS. This is the fastest implementation path for short-term output.

Pros:
- Lowest immediate engineering overhead.
- Single rendering mental model and simpler debugging.

Cons:
- Board polish ceiling reached quickly (FX, timing, layered feedback).
- Harder to keep match presentation "premium" as complexity grows.

Best when: the goal is pure prototype validation with minimal visual ambition.

### Approach C: Phaser-centered rewrite
Move the game into a Phaser-first architecture and rebuild screens as game scenes.

Pros:
- Unified game runtime and scene stack.
- Strong tooling for action-heavy loops.

Cons:
- High rewrite cost for existing app logic and menus.
- Lower delivery speed for this specific product shape.
- Overkill for a turn-based board game with heavy non-match UI.

Best when: the product is action-loop first with little app-shell complexity.

Chosen direction: Approach A, because it protects delivery speed while unlocking better match readability and animation quality without forcing a framework reset.

## Key Decisions
- Core stack: React + Vite for app shell, PixiJS for the match board.
Rationale: best speed-to-quality ratio with current draft assets and screens.

- ECS scope: Miniplex only for match runtime, not full application state.
Rationale: structure where entropy appears (combat flow/effects) while keeping YAGNI for menus.

- Rules in V1: Open always active, with pre-match toggles for Same and Plus.
Rationale: progressive complexity, accessible onboarding, strategic depth optional by player choice.

- Combo behavior: full combo chain flips enabled for Same and Plus.
Rationale: preserves expected tactical identity and avoids "half-rule" confusion.

- Rules UX: dedicated Rules screen in menu + pre-match toggle panel + in-match active rule badges.
Rationale: teach, choose, then remind. Reduces cognitive load mid-game.

- Product model: keep current hybrid loop (gold/shop/decks/collection), no FF8-only strict mode for V1.
Rationale: this loop is already present and aligns with collection motivation.

- Progression model: one shared profile for collection and achievements across all rule toggles.
Rationale: avoids fragmenting player progress and keeps reward economy legible.

- Economy for now: rewards identical regardless of enabled optional rules.
Rationale: simpler balancing pass, fewer edge-case exploits in V1.

- CPU logic: greedy heuristic AI (immediate flips, risk exposure, board position tie-breaks).
Rationale: meaningful opponent quality without minimax implementation cost.

- Persistence: localStorage only for V1.
Rationale: minimizes backend coupling before gameplay is stable.

- Multiplayer: explicitly out of V1 scope, but architecture should preserve path to server-authoritative rules later.
Rationale: focus on a good single-player core before distributed complexity.

- Audio: optional for V1, Howler.js candidate if added.
Rationale: clear stack option known early, but not mandatory to validate core loop.

Non-goals for V1:
- Real-time multiplayer infrastructure.
- Ranked ladders or matchmaking.
- Full economy balancing by rule difficulty.
- Large-scale achievement matrix per card/per rule combination.

## Open Questions
- Rules copy: exact text, order, and visual examples for Open/Same/Plus in the Rules screen.
- Achievement definition: final list and thresholds for the "core milestones" set.
- Audio scope: include Howler.js in V1 or defer to V1.1 after gameplay stabilization.
- AI tuning envelope: target win rate against new players versus experienced players.
- Match setup defaults: should Same/Plus default to off on first launch, then remember last choice.

## Next Steps
1. Proceed to implementation planning:
-> `/workflows:plan` for technical phases, file map, and test strategy.

2. Refine further before planning:
- Freeze final Rules copy.
- Freeze core achievements list.
- Decide audio in/out for V1 milestone.

3. Done for now:
- Keep this document as source of truth and start planning in next session.
