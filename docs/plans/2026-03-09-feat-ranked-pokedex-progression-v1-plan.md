---
title: feat: Ranked + Pokedex progression v1 overhaul
type: feat
status: active
date: 2026-03-09
origin: docs/brainstorms/2026-03-09-ranked-pokedex-progression-v1-brainstorm.md
---

# feat: Ranked + Pokedex progression v1 overhaul

## Overview

Implémenter la V1 de progression décidée au brainstorm:
- Ranked plus lisible et plus engageant.
- Boucle Pokédex basée sur traque active + milestones de complétion.
- Deck budget pour joueur + IA avec draft IA plus solide.
- Transparence UX: chaque règle expliquée dans les écrans et notifications.

Objectif produit: réduire la sensation "trop facile/répétitif" et rendre la progression claire à tout instant.

## Scope Contract

### In scope
- Nouveau comportement ranked (points dynamiques, BO3 promotion, boucliers à 0, challenger non rétrogradable).
- Rewards de passage de ligue, 1 fois par ligue/saison.
- Season lifecycle (2 mois, reset -2 ligues).
- Traque active + cap 10 jauges/12h.
- Milestones Pokédex (50/75/100).
- Deck budget by ligue (joueur + IA).
- IA adversaire en 3 archétypes + scaling dynamique.
- Hub progression + notifications.

### Out of scope V1
- Nouveau mode de jeu dédié.
- Match boss.
- Anti-cheat avancé serveur (jeu local).
- Refonte visuelle complète de toutes les pages.

## Current Code Impact (hotspots)

- Ranked domain:
  - [ranked.ts](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/domain/progression/ranked.ts)
  - [ranked.test.ts](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/domain/progression/ranked.test.ts)
  - [types.ts](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/domain/types.ts)
  - [profile.ts](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/domain/progression/profile.ts)
- Match loop orchestration:
  - [GameContext.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/app/GameContext.tsx)
- Rewards/results:
  - [rewards.ts](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/domain/progression/rewards.ts)
  - [ResultsPage.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/ResultsPage.tsx)
- Deck building / preview:
  - [DecksPage.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/DecksPage.tsx)
  - [SetupPage.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/SetupPage.tsx)
- IA:
  - [ai.ts](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/domain/match/ai.ts)
  - [opponents.ts](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/domain/match/opponents.ts)

## Data Model Changes

### Ranked state (breaking behavior, compatible migration)
- Remplacer l’usage division IV/III/II/I par un modèle ligue + points + séries.
- Conserver la compatibilité de lecture des profils legacy:
  - mapper ancien `tier/division/lp` vers nouveau `league/points`.
  - initialiser nouveaux champs (`promotionSeries`, `demotionShields`, `bestLeagueReached`, `seasonId`, `claimedLeagueRewards`).

### New progression state
- Ajouter état traque active:
  - `trackedCardId`
  - `trackGauge`
  - `trackGaugeCompletionsInWindow`
  - `trackWindowStartAt`
- Ajouter état Pokédex milestones actifs.
- Ajouter état récompenses de ligue par saison (set des ligues déjà payées).

## TDD-First Implementation Plan

### Phase 1: Ranked v2 domain (tests first)

Files:
- `src/domain/progression/ranked.test.ts`
- `src/domain/progression/ranked.ts`
- `src/domain/types.ts`

Checklist:
- [ ] Écrire tests qui échouent sur:
  - [ ] `+30..+35` sur win streak, reset après défaite.
  - [ ] `-15..-20` sur loss streak, reset après victoire.
  - [ ] BO3 promotion à 100 sans delta points.
  - [ ] Promotion réussie -> nouvelle ligue + 20 points + recharge boucliers.
  - [ ] Promotion ratée -> retour à 80 points.
  - [ ] À 0 points: consommation boucliers et rétrogradation à la 3e défaite.
  - [ ] Challenger non rétrogradable.
- [ ] Implémenter minimalement pour faire passer.
- [ ] Supprimer les anciennes règles LP/divisions non utilisées.

Definition of done:
- Tous les tests ranked passent.
- Aucune régression sur sérialisation profile.

### Phase 2: Profile migration and persistence safety

Files:
- `src/domain/progression/profile.ts`
- `src/domain/progression/profile.test.ts`

Checklist:
- [ ] Ajouter version profile suivante (migration pure).
- [ ] Migrer anciens champs ranked vers nouveau schéma.
- [ ] Ajouter validations runtime strictes des nouveaux champs.
- [ ] Ajouter tests de migration v11->vNext avec snapshots réalistes.

Definition of done:
- Chargement d’un profil legacy fonctionne sans perte.
- Sauvegarde/reload stable.

### Phase 3: League rewards + season rules

Files:
- `src/domain/progression/rewards.ts`
- `src/app/GameContext.tsx`
- `src/domain/progression/rewards.test.ts`

Checklist:
- [ ] Attribuer rewards de passage:
  - [ ] Bronze 10, Silver 15, Or 20, Platinum 30, Diamond 50, Challenger 100.
  - [ ] Full random.
  - [ ] 1 fois/ligue/saison.
- [ ] Appliquer logique saison:
  - [ ] durée 2 mois.
  - [ ] reset -2 ligues.
- [ ] Tester exploit montée/descente (pas de double reward).

Definition of done:
- Rewards impossibles à farmer via yoyo.
- Reset saison reproductible en test déterministe.

### Phase 4: Active tracking + Pokedex milestones

Files:
- `src/domain/progression/rewards.ts`
- `src/domain/progression/fragments.ts`
- `src/ui/pages/CollectionPage.tsx`
- `src/ui/pages/ResultsPage.tsx`
- nouveaux tests domain/ui

Checklist:
- [ ] Traque active:
  - [ ] choisir une cible librement.
  - [ ] +20 victoire, +0 défaite.
  - [ ] à 100 -> +1 fragment garanti cible.
  - [ ] cap 10 jauges/12h.
- [ ] Milestones pokédex:
  - [ ] 50% -> 2 sélections.
  - [ ] 75% -> 3 sélections.
  - [ ] 100% -> deck adverse complet.
- [ ] Écran fin: sélection fragments d’abord, puis récap.

Definition of done:
- Boucle traque testée et visible UI.
- Milestones déclenchent bien le bon nombre de choix.

### Phase 5: Deck budget and AI drafting upgrade

Files:
- `src/domain/cards/decks.ts`
- `src/domain/match/opponents.ts`
- `src/domain/match/ai.ts`
- `src/ui/pages/DecksPage.tsx`
- `src/ui/pages/SetupPage.tsx`
- tests associés

Checklist:
- [ ] Introduire coût de carte par rareté (`1/2/3/5/8`).
- [ ] Introduire plafond budget par ligue (`14/15/16/18/20/23/27`).
- [ ] Bloquer deck builder si budget dépassé.
- [ ] Construire 3 archétypes IA (Aggro/Tempo/Contrôle).
- [ ] Ajuster dynamiquement le draft adverse selon performance joueur.

Definition of done:
- Joueur et IA respectent le budget.
- L’IA ne génère plus de decks incohérents.

### Phase 6: Progression Hub + mandatory notifications

Files:
- `src/ui/pages/HomePage.tsx`
- `src/ui/pages/RanksPage.tsx`
- `src/ui/pages/ResultsPage.tsx`
- nouveaux composants: `src/ui/components/ProgressionHub*`
- `src/index.css`

Checklist:
- [ ] Track visuelle des rewards de ligue (réclamé / à venir).
- [ ] Explication claire de toutes les règles ranked.
- [ ] Affichage traque/cap/timer.
- [ ] Notifications/toasts pour tous les événements clés:
  - points, séries, BO3, promotion/échec, boucliers, rétrogradation, reward ligue, traque pleine, cap atteint, milestone pokédex.
- [ ] Animations raccourcies et lisibles.

Definition of done:
- Aucune règle cachée.
- Le joueur comprend “pourquoi” après chaque match.

## QA Strategy

### Automated
- [ ] Domain tests ciblés par phase.
- [ ] UI tests des pages touchées.
- [ ] Suite complète `bun test`.

### Manual (no Playwright)
- [ ] Validation browser via skill `agent-browser`.
- [ ] Parcours:
  - montée à 100 -> BO3 -> promotion.
  - chute à 0 -> boucliers -> rétrogradation.
  - cap traque atteint puis reset.
  - passage de ligue et reward non duplicable.

### Performance/UX checks
- [ ] Temps de feedback animation perçu (court et lisible).
- [ ] Lisibilité mobile: info progression visible sans fouiller.

## Delivery Sequence

1. Ranked v2 + migration profile.
2. Rewards ligue/saison.
3. Traque + milestones pokédex.
4. Budget deck + IA archétypes.
5. Hub progression + notifications + polish UI.

## Risks and Mitigations

- Risque: migration profile casse des saves existantes.
  - Mitigation: tests de migration multi-versions + fallback safe.
- Risque: surcharge cognitive UI.
  - Mitigation: hiérarchie stricte (toast court -> récap match -> hub complet).
- Risque: économie fragments trop rapide.
  - Mitigation: cap traque + reward ligue limitée à 1 fois/saison.

## Exit Criteria

- Ranked conforme aux règles validées.
- Boucle Pokédex plus lisible et moins frustrante.
- Deck budget + IA augmentent réellement le challenge.
- Toutes les règles sont visibles, notifiées et consultables en permanence.
