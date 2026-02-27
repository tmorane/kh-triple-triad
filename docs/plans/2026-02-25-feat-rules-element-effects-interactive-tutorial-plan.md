---
title: feat: Add strict interactive tutorial for rules element effects
type: feat
status: active
date: 2026-02-25
origin: docs/brainstorms/2026-02-25-rules-element-tutorial-v1-brainstorm.md
---

# feat: Add strict interactive tutorial for rules element effects

## Overview

Ajouter un tutoriel interactif dans la page `Rules`, déclenché uniquement par un bouton `Tutoriel`, avec un guidage strict pas-à-pas sur les 15 types (`normal` + 14 effets).  
Objectif: rendre les effets compréhensibles sans laisser l utilisateur se perdre dans les icônes.

Décision héritée du brainstorm: parcours manuel, strict, complet (15/15), avec `Passer` et `Quitter` (see brainstorm: `docs/brainstorms/2026-02-25-rules-element-tutorial-v1-brainstorm.md`).

## Problem Statement

Etat actuel:
- La page `Rules` expose bien les icônes et le texte d effet, mais uniquement via survol/focus/clic libre.
- Il n y a pas de parcours guidé garantissant que chaque effet est vu.

Impact actuel:
- Les nouveaux joueurs lisent partiellement.
- Les effets "once per match", passifs et exceptions (ex: `spectre`) se mélangent facilement.

Contexte code:
- Les données de type/effet sont déjà centralisées dans `elementRuleItems` ([RulesPage.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/RulesPage.tsx#L6)).
- L interaction actuelle est validée par test hover ([RulesPage.test.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/RulesPage.test.tsx#L16)).
- Le style de base des icônes existe déjà ([index.css](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/index.css#L1424)).

## Research Summary

### Local repo research (done)
- Page ciblée: [RulesPage.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/RulesPage.tsx#L74).
- Tests existants: [RulesPage.test.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/RulesPage.test.tsx#L15).
- Styles existants pour la zone: [index.css](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/index.css#L1417).
- Pattern interactif comparable (hover + click + panel détail): [DeckSynergyGuide.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/components/DeckSynergyGuide.tsx#L57).

### Institutional learnings (docs/solutions)
- Match pertinent trouvé: 1 fichier, non fonctionnel produit mais critique sur la stabilité du harnais de tests:
  - [vitest-worker-err-require-esm-development-workflow-20260222.md](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/docs/solutions/developer-experience/vitest-worker-err-require-esm-development-workflow-20260222.md)
- Action retenue: rester sur le workflow test actuel (`vitest`, config séparée), éviter toute modif de tooling.

### External research decision
- Décision: **pas de recherche externe**.
- Raison: feature locale UI simple, patterns déjà présents, aucun risque sécurité/paiement/API externe.

## Proposed Solution

### Scope V1
- Bouton `Tutoriel` dans la page `Rules`.
- Mode tutoriel strict:
  - 1 étape = 1 type.
  - Progression `Etape X/15`.
  - Seule l icône courante est cliquable.
  - Boutons `Passer` et `Quitter`.
- Couverture: 15 types dans l ordre existant de `elementRuleItems` (see brainstorm: `docs/brainstorms/2026-02-25-rules-element-tutorial-v1-brainstorm.md`).
- Fin: état terminé (`Tutoriel terminé`) + action `Relancer`.

### Non-goals V1
- Pas d auto-lancement à la première visite.
- Pas de persistance profil/localStorage.
- Pas d analytics.
- Pas de refonte complète de la page.

### UX Contract
- Hors tutoriel: comportement actuel inchangé (hover/focus/click libre).
- En tutoriel:
  - Texte d effet forcé sur l étape en cours.
  - Les autres icônes sont verrouillées (`disabled` + style "locked").
  - Le clic sur l icône attendue avance à l étape suivante.
  - `Passer` avance sans cliquer l icône.
  - `Quitter` quitte et réinitialise le tutoriel.

## State Model (RulesPage local state)

Conserver une machine d état locale dans [RulesPage.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/RulesPage.tsx#L74) pour éviter tout couplage global.

Proposition:

```ts
// src/ui/pages/RulesPage.tsx
type TutorialMode = 'idle' | 'active' | 'completed'

interface RulesTutorialState {
  mode: TutorialMode
  stepIndex: number // valide seulement en mode 'active'
}
```

Règles:
- `idle`: page normale.
- `active`: `stepIndex` borné entre `0` et `elementRuleItems.length - 1`.
- `completed`: message final + relance possible.

Garde-fous:
- Si la liste change de taille, borner `stepIndex`.
- Ne jamais dériver l ordre depuis ailleurs que `elementRuleItems` (single source of truth).

## User Flow Overview

1. L utilisateur ouvre `Rules`.
2. Il clique `Tutoriel`.
3. UI passe en mode `active` étape 1/15 (`normal`).
4. Il clique l icône surlignée, étape suivante.
5. Répétition jusqu à 15/15.
6. Fin: `Tutoriel terminé` + bouton `Relancer`.
7. A tout moment pendant `active`: `Passer` avance, `Quitter` stoppe.

## Flow Permutations Matrix

| Contexte | Entrée | Action | Résultat attendu |
|---|---|---|---|
| Desktop souris | `idle` | clic `Tutoriel` | `active`, étape 1/15, icône 1 active |
| Desktop souris | `active` | hover icône non-courante | aucun changement |
| Desktop souris | `active` | clic icône non-courante | impossible (disabled) |
| Desktop souris | `active` | clic icône courante | étape +1 |
| Desktop souris | `active` dernière étape | clic icône courante ou `Passer` | `completed` |
| Desktop souris | `active` | clic `Quitter` | `idle`, reset |
| Mobile tactile | `active` | tap icône courante | étape +1 |
| Mobile tactile | `active` | tap `Passer` rapidement xN | bornage, pas d overflow index |
| Clavier | `active` | Tab / Enter sur icône courante | étape +1 |
| Changement de route | `active` | navigation hors page puis retour | état local reset (`idle`) |

## Spec-Flow Gaps and Resolutions

### Gap 1: conflit hover vs tutoriel actif
- Risque: `onMouseLeave` remet le texte vide pendant le tuto.
- Résolution: en mode `active`, le texte ne dépend plus de `hoveredElementId` mais de `stepIndex`.

### Gap 2: état incohérent en multi-clic rapide
- Risque: `stepIndex` dépasse 14.
- Résolution: update fonctionnel + clamp systématique à `length - 1`.

### Gap 3: accessibilité du guidage strict
- Risque: utilisateur clavier bloqué.
- Résolution: seule l icône courante focusable/cliquable; les autres `disabled`; messages d état et progression exposés textuellement.

### Gap 4: régression du comportement historique
- Risque: casser le hover existant.
- Résolution: tests de non-régression dédiés hors mode tutoriel.

### Gap 5: fin de tutoriel ambiguë
- Risque: aucune confirmation claire.
- Résolution: état `completed` explicite + CTA `Relancer`.

## Technical Approach

### Architecture

Feature purement front locale:
- pas de changement domain.
- pas de changement API.
- pas de migration.
- pas de persistance.

Surface impactée:
- [RulesPage.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/RulesPage.tsx)
- [RulesPage.test.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/RulesPage.test.tsx)
- [index.css](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/index.css)

### Implementation Phases

#### Phase 1: TDD spec (must fail first)

Fichier: [RulesPage.test.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/RulesPage.test.tsx)

Ajouter des tests qui échouent avant implémentation:
- [ ] `renders tutorial entry controls` (bouton `Tutoriel` visible).
- [ ] `starts strict tutorial and shows step 1/15`.
- [ ] `locks non-current icons while tutorial is active`.
- [ ] `advances only when current icon is clicked`.
- [ ] `passer advances step even without icon click`.
- [ ] `quitter exits and resets tutorial state`.
- [ ] `completes tutorial and allows restart`.
- [ ] `preserves legacy hover behavior when tutorial is idle`.

Success criteria:
- Tests nouveaux passent.
- Test existant hover continue de passer.

#### Phase 2: State machine + interactions

Fichier: [RulesPage.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/RulesPage.tsx)

Checklist:
- [ ] Ajouter état tutorial (`idle|active|completed` + `stepIndex`).
- [ ] Définir helpers:
  - `startTutorial()`
  - `advanceTutorialStep()`
  - `skipTutorialStep()`
  - `quitTutorial()`
  - `restartTutorial()`
- [ ] Dériver l élément courant depuis `elementRuleItems[stepIndex]`.
- [ ] Adapter handlers `hover/focus/click` pour respecter mode strict.
- [ ] Introduire UI:
  - panneau tutoriel (titre, progression, consigne),
  - contrôles (`Tutoriel`, `Passer`, `Quitter`, `Relancer` selon état).

Success criteria:
- Aucune branche d état morte.
- Pas de warning React.
- Data-testid stables pour tests.

#### Phase 3: Styling and responsive polish

Fichier: [index.css](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/index.css)

Checklist:
- [ ] Styles pour panneau tutoriel:
  - `.rules-tutorial`
  - `.rules-tutorial__title`
  - `.rules-tutorial__meta`
  - `.rules-tutorial__actions`
- [ ] Styles icônes strictes:
  - `.rules-element-icons.is-tutorial-active`
  - `.rules-element-icon.is-tutorial-current`
  - `.rules-element-icon.is-tutorial-locked`
- [ ] Etat disabled visuel lisible (pas seulement opacité faible).
- [ ] Ajustements mobile (espacements, wrapping boutons).

Success criteria:
- Lecture claire sur desktop + mobile.
- Icône courante immédiatement identifiable.
- Contrôles utilisables sans zoom.

#### Phase 4: Validation and regression

Commandes:
- [ ] `npm run test -- src/ui/pages/RulesPage.test.tsx`
- [ ] `npm run test`
- [ ] `npm run lint`
- [ ] `npm run typecheck`

Validation navigateur (obligatoirement sans Playwright):
- [ ] Utiliser skill `agent-browser` pour:
  - ouvrir `/rules`,
  - démarrer tutoriel,
  - passer 2-3 étapes,
  - quitter,
  - relancer,
  - capturer screenshot desktop + mobile.

Success criteria:
- Tous checks verts.
- Pas d erreur console visible en interaction.

## Alternative Approaches Considered

### A. Infobulle enrichie au survol uniquement
- Rejeté: améliore le texte, pas l apprentissage séquentiel.

### B. Tutoriel libre (toutes icônes cliquables)
- Rejeté: pas aligné avec ta décision de guidage strict.

### C. Onboarding auto à la première visite
- Rejeté V1: plus intrusif, nécessite persistance (hors scope).

## System-Wide Impact

### Interaction Graph

`RulesPage render`  
→ utilisateur clique `Tutoriel`  
→ état `active + stepIndex=0`  
→ rendu des icônes en mode verrouillé  
→ clic icône courante  
→ `stepIndex + 1` ou `completed`  
→ mise à jour texte effet + progression.

### Error & Failure Propagation

Pas de backend. Les risques sont runtime UI:
- index hors borne.
- handlers concurrents (hover vs click).
- état incomplet si bouton spam.

Traitement:
- clamp systématique.
- source d état unique.
- tests de transitions critiques.

### State Lifecycle Risks

- Risque: quitter tuto laisse `hoveredElementId` ancien.
  - Mitigation: reset explicite de `hoveredElementId` à la sortie.
- Risque: mutation future de `elementRuleItems` casse progression.
  - Mitigation: progression basée sur `elementRuleItems.length`.

### API Surface Parity

Doit rester stable:
- route `/rules` via [App.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/App.tsx#L182),
- testids existants `rules-element-icon-*` et `rules-element-effect`.

Aucun changement attendu dans:
- `domain/*`
- `app/useGame`
- routing global.

### Integration Test Scenarios

Scénarios cross-layer utiles:
- `App` -> menu `More` -> `Rules` -> lancement tutoriel -> interactions -> retour Home.
- Navigation hors `Rules` puis retour: état non persistant.
- Thème pokemon forcé (`body[data-theme='pokemon']`): contraste des nouveaux styles correct.

## Acceptance Criteria

### Functional Requirements

- [ ] Un bouton `Tutoriel` est visible sur `Rules`.
- [ ] Cliquer `Tutoriel` démarre un parcours strict 15 étapes.
- [ ] Un indicateur `Etape X/15` est affiché en mode actif.
- [ ] Seule l icône de l étape courante est interactive.
- [ ] Clic sur icône courante fait avancer d une étape.
- [ ] Bouton `Passer` avance d une étape.
- [ ] Bouton `Quitter` sort du tutoriel et réinitialise.
- [ ] La dernière étape mène à un état `terminé` avec `Relancer`.
- [ ] Hors mode tutoriel, le hover historique fonctionne comme avant.

### Non-Functional Requirements

- [ ] Accessibilité clavier fonctionnelle (focus, activation Enter/Space).
- [ ] Pas de débordement visuel mobile (>= 360px largeur).
- [ ] Pas d erreur console en usage normal.
- [ ] Code ASCII only (cohérent avec la base actuelle).

### Quality Gates

- [ ] Nouvelles specs TDD écrites avant implémentation.
- [ ] `npm run test` passe.
- [ ] `npm run lint` passe.
- [ ] `npm run typecheck` passe.
- [ ] Validation browser via `agent-browser` (desktop + mobile).

## Success Metrics

Mesures V1 (qualitatives, sans analytics):
- Tutoriel terminable de bout en bout sans blocage.
- Aucune régression Rules existante.
- Validation QA desktop/mobile validée en une passe.

## Dependencies & Prerequisites

- Aucun package externe.
- Stack de tests existante intacte:
  - `vitest` + `testing-library` (déjà en place).
- Respect des contraintes projet:
  - TDD par défaut.
  - Pas de Playwright.
  - Browser validation via `agent-browser`.

## Risk Analysis & Mitigation

1. **Régression du comportement hover historique**
- Mitigation: test de non-régression dédié.

2. **Ambiguïté visuelle entre icône active et verrouillée**
- Mitigation: états CSS distincts et contrastés.

3. **Incohérence index/progression**
- Mitigation: clamp + utilitaires de transition purs.

4. **Complexité inutile**
- Mitigation: state local minimal, pas de store global, pas de persistance V1.

5. **Tests flakies sur interactions**
- Mitigation: assertions testid/role stables et transitions déterministes.

## Rollback Plan

Rollback rapide possible car changement local UI:

1. Revenir au comportement initial en retirant les branches `tutorial` de [RulesPage.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/RulesPage.tsx).
2. Supprimer styles tutoriel ajoutés dans [index.css](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/index.css).
3. Restaurer test file à l état pré-feature si nécessaire.

Impact rollback:
- `Rules` revient à hover-only.
- Aucun impact data/profil/match.

## Resource Requirements

Estimation:
- Phase 1 (tests): 45-60 min
- Phase 2 (implémentation): 60-90 min
- Phase 3 (styles): 30-45 min
- Phase 4 (validation): 30-45 min
- Total: 2h45 à 4h

## Future Considerations (V2+)

- Persister "tutorial completed" par profil.
- Ajouter accès direct "reprendre à l étape N".
- Ajouter micro-démo visuelle par effet (animation board miniature).
- Instrumentation analytics (start/quit/complete rate).

## Documentation Plan

- [ ] Conserver le brainstorm comme document d origine.
- [ ] Ajouter une entrée `docs/solutions/ui-bugs/...` uniquement si un bug réel est découvert pendant implémentation.
- [ ] Pas de mise à jour README requise pour V1.

## Sources & References

### Origin
- **Brainstorm document:** [2026-02-25-rules-element-tutorial-v1-brainstorm.md](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/docs/brainstorms/2026-02-25-rules-element-tutorial-v1-brainstorm.md)  
  Décisions reprises: déclenchement manuel, guidage strict, couverture 15 types, contrôles `Passer`/`Quitter`.

### Internal References
- Rules page actuelle: [RulesPage.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/RulesPage.tsx#L74)
- Liste des effets: [RulesPage.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/RulesPage.tsx#L6)
- Tests actuels: [RulesPage.test.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/pages/RulesPage.test.tsx#L15)
- Styles zone Rules: [index.css](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/index.css#L1417)
- Pattern interaction comparable: [DeckSynergyGuide.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/ui/components/DeckSynergyGuide.tsx#L57)
- Route Rules: [App.tsx](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/src/App.tsx#L182)

### Institutional Learnings
- Outiling test stability: [vitest-worker-err-require-esm-development-workflow-20260222.md](/Users/joellebeyens/Documents/Documents/BJM/TomMoraneINDPNT/kh-triple-triad/docs/solutions/developer-experience/vitest-worker-err-require-esm-development-workflow-20260222.md)
