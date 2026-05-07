# Lossless Image Optimization Report

- Date: 2026-03-10T01:50:40.961Z
- Scope: `public`
- Strategy: PNG optimization only, with strict pixel-identical guardrail (RGBA raw buffer equality).
- Quality policy: if dimensions/channels/pixels differ, file is rejected and left unchanged.

## Summary

- PNG files scanned: 593
- PNG files optimized: 555
- PNG skipped (not smaller): 37
- PNG skipped (guardrail failed): 0
- PNG failed (read/encode error): 1
- Post-run cleanup: `public/admin-images/card.png` (artefact de test invalide) a été supprimé du repo.
- Candidate bytes before: 179.28 MB (187986995)
- Candidate bytes after: 141.20 MB (148062280)
- Candidate bytes saved: 38.08 MB (39924715)
- public/ total before: 187.47 MB (196577822)
- public/ total after: 149.40 MB (156653107)
- public/ total saved: 38.08 MB (39924715)

## Top Savings

| File | Before | After | Saved |
| --- | ---: | ---: | ---: |
| `public/ui/match/board-effects/water.png` | 4.93 MB | 2.70 MB | 2.23 MB |
| `public/ui/match/board-effects/glace.png` | 5.29 MB | 3.09 MB | 2.20 MB |
| `public/ranks/challenger.png` | 3.60 MB | 1.66 MB | 1.94 MB |
| `public/cards/psy-background.png` | 3.82 MB | 2.23 MB | 1.59 MB |
| `public/cards/feu-background.png` | 3.52 MB | 1.97 MB | 1.55 MB |
| `public/cards/electrik-background.png` | 3.97 MB | 2.52 MB | 1.45 MB |
| `public/cards/combat-background.png` | 3.71 MB | 2.31 MB | 1.39 MB |
| `public/cards/poison-background.png` | 3.19 MB | 1.81 MB | 1.38 MB |
| `public/ranks/diamond.png` | 2.55 MB | 1.19 MB | 1.36 MB |
| `public/ui/match/boards/neutral-board.png` | 3.55 MB | 2.20 MB | 1.34 MB |
| `public/ui/setup/neutral-board.png` | 3.55 MB | 2.20 MB | 1.34 MB |
| `public/cards/vent-background.png` | 3.15 MB | 1.83 MB | 1.32 MB |
| `public/cards/insecte-background.png` | 3.60 MB | 2.31 MB | 1.29 MB |
| `public/cards/plante-background.png` | 3.40 MB | 2.15 MB | 1.25 MB |
| `public/cards/dragon-background.png` | 3.29 MB | 2.04 MB | 1.25 MB |
| `public/cards/normal-background.png` | 3.02 MB | 1.79 MB | 1.23 MB |
| `public/cards/glace-background.png` | 3.70 MB | 2.48 MB | 1.22 MB |
| `public/cards/spectre-background.png` | 3.31 MB | 2.12 MB | 1.19 MB |
| `public/cards/sol-background.png` | 3.33 MB | 2.13 MB | 1.19 MB |
| `public/cards/roche-background.png` | 3.31 MB | 2.14 MB | 1.17 MB |
| `public/cards/eau-background.png` | 3.09 MB | 2.00 MB | 1.09 MB |
| `public/ranks/bronze.png` | 2.05 MB | 1006.30 KB | 1.07 MB |
| `public/ranks/gold.png` | 1.96 MB | 982.40 KB | 1.00 MB |
| `public/ranks/silver.png` | 1.71 MB | 920.33 KB | 829.25 KB |
| `public/ranks/platinum.png` | 1.68 MB | 911.16 KB | 807.68 KB |
| `public/ranks/iron.png` | 1.44 MB | 812.30 KB | 665.58 KB |
| `public/modes/mode-3x3-normal-new.png` | 1.25 MB | 1.00 MB | 256.10 KB |
| `public/modes/mode-3x3-ranked-new.png` | 1.50 MB | 1.26 MB | 245.58 KB |
| `public/modes/mode-behind.png` | 1016.90 KB | 871.24 KB | 145.66 KB |
| `public/modes/Behind.png` | 922.89 KB | 807.64 KB | 115.25 KB |
