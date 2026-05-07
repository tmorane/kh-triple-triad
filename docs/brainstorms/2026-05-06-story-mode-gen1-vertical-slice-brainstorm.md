---
date: 2026-05-06
topic: story-mode-gen1-vertical-slice
---

# Story Mode Gen 1 Vertical Slice

## What We're Building

Build a first playable story slice around a real Gen 1-style overworld: one map, the player sprite, a few trainer sprites, movement on a tile grid, NPC interaction, and Triple Triad battles launched from the map.

The first slice should prove the full loop: enter story mode, walk around, talk to or trigger a trainer, start a match with that trainer's deck, finish the match, return to the map, and keep the trainer marked as beaten.

## Why This Approach

The game already has a strong match loop, profile persistence, rewards, and routing. The story mode should not rebuild combat; it should become an overworld layer that feeds curated encounters into the existing match engine.

Starting with one compact map is better than importing all Kanto immediately. Full Kanto becomes manageable once the loop works: maps become data, trainers become data, and transitions can be added zone by zone.

## Key Decisions

- Start with a vertical slice: Pallet Town-style first map, 3 trainers, 1 mini-boss.
- Use real map/sprite assets locally, while keeping paths/data isolated so they can be swapped later.
- Use tile-grid movement, not free movement, because it matches Gen 1 and simplifies collision.
- Treat trainers as story entities with id, position, sprite, dialogue, deck, reward, and defeated state.
- Return to `/story` after story battles instead of `/results`, with a short battle recap on the map.
- Store story progress separately at first, then migrate into profile if the feature becomes core.

## Open Questions

- Should story battles grant normal gold/fragments, or story-only rewards at first?
- Should trainer vision trigger fights automatically, or should the first slice use only talk-to-battle interactions?
- Should the player use their own deck, a forced story deck, or choose before each trainer?

## Next Steps

Proceed to implementation planning for the vertical slice: story data model, route, map renderer, movement/collision, trainer interaction, and story match finalization.
