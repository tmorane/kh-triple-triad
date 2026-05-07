---
date: 2026-05-06
topic: combat-clarity-coach
---

# Combat Clarity Coach

## What We're Building
All combat queues need the same always-visible guidance layer: normal, ranked, tower, tutorial, and story. The player should understand the current turn, the next expected action, and the immediate consequence of a move without leaving the match screen.

The coach should stay short: one title, one action sentence, one tactical detail. No rulebook dump in combat.

## Why This Approach
The app already has rules pages and tutorials, so adding another separate tutorial would miss the real problem. The fight needs to explain itself at the moment the player is making decisions.

The chosen approach is a global contextual coach plus move preview and recent-capture recap. This helps beginners immediately while still being useful for experienced players checking exact captures.

## Key Decisions
- Global combat coach: applies to every match queue, not only story or tutorial.
- Preview before commitment: selected card + focused cell explains capture count and the first stat comparison.
- CPU recap takes priority: if the CPU just flipped cards, explain that before showing the next move advice.
- Type-power targeting takes priority: when a power needs a target, the coach tells the player exactly what to click.
- Keep copy compact: clarity beats walls of text. Holy shit, especially in a board game UI.

## Open Questions
- Later, decide whether to add hover-based cell previews for mouse users. Keyboard focus already has exact preview.
- Later, decide whether advanced players can collapse the coach.

## Next Steps
Implement the coach as a pure tested match-domain view model, then render it in `MatchPage`.
