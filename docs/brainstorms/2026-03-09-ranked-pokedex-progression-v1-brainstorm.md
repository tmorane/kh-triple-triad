---
date: 2026-03-09
topic: ranked-pokedex-progression-v1
---

# Ranked + Pokedex Progression V1

## What We're Building
Refonte V1 de la boucle de progression pour rendre le jeu moins facile, moins répétitif, et beaucoup plus lisible, sans ajouter de nouveau mode.

Axes retenus:
- Boucle principale centrée sur la complétion du Pokédex.
- Ranked plus clair et plus motivant.
- Draft adverse plus intelligent.
- UX/animations explicites sur chaque progression.

Cette V1 ne cherche pas à multiplier les features. Elle consolide le coeur: jouer, progresser, compléter.

## Why This Approach
Approche recommandée: renforcer les systèmes existants (ranked, rewards, deckbuilding, feedback UI) au lieu d’ajouter un mode annexe.

Pourquoi:
- Aligné avec l’objectif produit: complétion du Pokédex.
- Effet direct sur rétention et rejouabilité.
- Scope réaliste pour une V1.
- Complexité concentrée dans des briques déjà présentes dans le code.

## Key Decisions
- Pas de nouveau mode de jeu.
- Traque active: 1 Pokémon ciblé, changement libre.
- Jauge traque: `+20` par victoire, `+0` en défaite, `+1` fragment garanti à `100`.
- Cap traque: `10` jauges pleines par `12h`.
- Milestones Pokédex:
  - `50%`: sélection de `2` Pokémon en fin de combat.
  - `75%`: sélection de `3` Pokémon.
  - `100%`: sélection sur tout le deck adverse.
- Draft challenge:
  - Budget deck activé pour joueur + IA.
  - Coûts cartes: common `1`, uncommon `2`, rare `3`, epic `5`, legendary `8`.
  - Plafonds par ligue:
    - Iron `14`, Bronze `15`, Silver `16`, Or `18`, Platinum `20`, Diamond `23`, Challenger `27`.
  - IA avec 3 archétypes: Aggro / Tempo / Contrôle.
  - Ajustement dynamique de difficulté selon le niveau/performance joueur.
- Ranked:
  - Progression par points vers `100`.
  - Série de promotion BO3 à `100` (montée sans gain/perte de points).
  - Victoires d’affilée: `+30` à `+35` (cap).
  - Défaites d’affilée: `-15` à `-20` (cap).
  - À `0` point: 2 boucliers; 3e défaite à `0` = rétrogradation directe.
  - Boucliers rechargés à chaque montée de ligue.
  - Challenger: pas de rétrogradation vers Diamond.
- Saisons:
  - Durée: `2 mois`.
  - Reset fin de saison: `-2` ligues.
- Récompenses de passage de ligue (full aléatoire):
  - Bronze `10`, Silver `15`, Or `20`, Platinum `30`, Diamond `50`, Challenger `100` fragments.
  - Récompense donnée `1 fois / ligue / saison`.
- Lisibilité produit:
  - Tous les systèmes doivent être notifiés et expliqués dans l’UI.
  - Track visuelle permanente des récompenses de ligue.
  - Priorité lisibilité animations/feedback.

## Open Questions
- Récompense de fin de saison additionnelle: garder ou non un coffre en plus des rewards de passage.
- Scope V1 des archétypes IA: simple heuristique pondérée ou vraie génération par templates.
- Surface exacte du nouveau Hub Progression (nouvelle page dédiée vs extension des pages existantes).

## Next Steps
-> `/workflows:plan` pour le plan d’implémentation détaillé, TDD matrix, migration profile et découpage en phases.
