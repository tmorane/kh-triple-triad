---
date: 2026-02-25
topic: shiny-cards-v1
---

# Shiny Cards V1

## What We're Building
We are adding shiny variants as collectible card finishes, without requiring shiny artwork files yet.

V1 behavior:
- Shiny is a separate variant from normal cards, with separate copy tracking.
- Shiny is cosmetic only (no stat or gameplay bonus).
- Card frame/art treatment gets a metallic style plus a visible `SHINY` badge.
- If player owns both normal and shiny, shiny is displayed by priority in deck/match contexts.
- If player owns only shiny (no normal), the card is still considered owned/unlocked and usable.

Acquisition rules:
- Pack pulls: each pulled card has a `1%` shiny chance.
- This `1%` applies to all pack openings (regular, special, and any progression packs opened through existing systems).
- Match capture rewards stay normal-only (never shiny).

Craft rule (V1):
- In Pokédex card sheet (`Fiche`), player can craft `1` shiny by consuming `50` normal copies of the same Pokemon.

## Why This Approach
### Approach A: Cosmetic-only shiny toggle
No inventory concept, only visual mode.

Pros:
- Very fast to ship.
- Minimal data migration.

Cons:
- No collectible depth.
- No meaningful progression loop.

### Approach B: Collectible shiny variants + direct same-card craft (Chosen)
Shiny is a real inventory variant with a deterministic craft sink.

Pros:
- Strong collection motivation.
- Clean economy loop with copy sink.
- Works now even without shiny art assets.

Cons:
- Requires profile schema and migration updates.
- Requires duplicate handling across progression and UI.

### Approach C: Multi-recipe shiny economy in V1
Support several craft recipes immediately.

Pros:
- More systems depth from day one.

Cons:
- Heavier UX and balancing risk.
- Slower delivery for first usable version.

Chosen direction: Approach B with one recipe only for V1.

## Key Decisions
- Shiny variant is separate from normal variant.
- Shiny copies stack (not capped to 1 per card).
- Shiny chance is fixed at `1%` per pulled card.
- `1%` applies to all pack openings.
- Match captures are always normal.
- Craft recipe (V1): `50 normal copies of same card -> 1 shiny of same card`.
- Craft entry point (V1): Pokédex `Fiche`.
- Display priority: shiny over normal when both exist.
- Shiny adds no gameplay power.
- Visual treatment (V1): metallic card treatment + `SHINY` badge.

## Open Questions
- None for V1 scope.

## Next Steps
1. Proceed to implementation planning:
-> `/workflows:plan` with file-by-file changes, migration path, and test matrix.
2. V1.1 candidate:
- Add the second crafting recipe (`50 of same rarity -> random shiny of that rarity`) if desired after first release.
