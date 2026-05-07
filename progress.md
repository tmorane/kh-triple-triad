Original prompt: Implémenter une vertical slice de mode histoire avec vraie map/sprites Gen 1, dresseurs sur la map, déplacement, interaction, duel Triple Triad, retour map avec dresseur battu.

## 2026-05-06

- Décision: intégrer `story` comme file de match dédiée pour garder le retour `/story` propre.
- Décision: tester la logique story en TDD; UI validée par typecheck/lint et navigateur intégré, pas Playwright, conformément à `AGENTS.md`.
- Sources assets repérées:
  - StrategyWiki Pallet Town: https://strategywiki.org/wiki/Pok%C3%A9mon_Red_and_Blue/Pallet_Town
  - Red overworld sprite: https://archives.bulbagarden.net/wiki/File:RedRGBwalkdown.png
- Domaine story ajouté en TDD:
  - map `pallet-town`
  - 3 dresseurs (`route-kid`, `lab-aide`, `rival-blue`)
  - déplacement grille + collision
  - interaction avec dresseur en face
  - progression dresseur battu immutable
- Vertical slice UI ajoutée:
  - route `/story`
  - map Gen 1 + sprites overworld
  - interaction dresseur -> match `story`
  - retour `/story` après finalisation, sans fragment de carte
- Validation:
  - `bun test src/domain/story/story.test.ts src/ui/pages/ResultsPage.test.tsx`
  - `bun test src/app/App.integration.test.tsx -t "story page"`
  - `bun test src/app/App.integration.test.tsx -t "more menu keeps"`
  - `bun run typecheck`
  - `bun run lint`
  - navigateur intégré: `/story` charge, les 3 dresseurs sont présents, Theo lance bien `/match`

## 2026-05-06 - Sprite joueur animé

- Ajout d'une frame idle `public/story/gen1/red-idle.png` extraite de l'APNG de Red.
- Le joueur utilise maintenant `red-idle.png` à l'arrêt et `red.png` (APNG 4 frames) pendant un pas.
- Déplacement lissé entre les tuiles via transition CSS + petit bob de marche.
- Validation:
  - `bun test src/app/App.integration.test.tsx -t "story page"`
  - `bun run typecheck`
  - `bun run lint`
  - navigateur intégré: le sprite passe bien de idle à APNG pendant le déplacement, puis revient idle; pas d'erreur console app.

## 2026-05-06 - Collisions map d'origine

- Les deux PNJ déjà dessinés dans `pallet-town.png` sont maintenant de vrais dresseurs:
  - `route-kid` à la tuile `{ x: 4, y: 8 }`
  - `lab-aide` à la tuile `{ x: 10, y: 15 }`
- Ces dresseurs sont rendus comme hotspots invisibles pour ne pas doubler les sprites déjà présents dans le PNG.
- Ajout de collisions pour les décors principaux: maisons, panneaux, barrières, labo, point d'eau et dresseurs.
- `render_game_to_text` expose maintenant les dresseurs et le nombre de tuiles walkables.
- Validation:
  - RED puis GREEN sur `bun test src/domain/story/story.test.ts`
  - `bun test src/app/App.integration.test.tsx -t "story original|story page"`
  - `bun run typecheck`
  - `bun run lint`
- Note: le browser automation du navigateur intégré n'était pas exposé dans ce tour; la validation UI est donc passée par tests d'intégration React.

## 2026-05-06 - Sprite sheet de déplacement

- Conversion de l'APNG Red en vraie sprite sheet horizontale `public/story/gen1/red-walk-sheet.png` (4 frames, 64x16).
- Ajout d'une variante lisible `public/story/gen1/red-walk-sheet-color.png`, utilisee par le joueur pour ne pas se confondre avec la map monochrome.
- Le joueur n'utilise plus d'image APNG dans le DOM: la marche est pilotée par une vraie image `.story-player-strip` masquee dans `.story-player-crop`.
- L'arrêt force la frame 1, la marche boucle sur les 4 frames, la gauche garde le flip CSS existant, et le joueur est legerement scale/ombre pour rester visible.
- Correction robuste: la sheet est rendue via un vrai `<img>` dans une fenetre croppee, avec un halo jaune `.story-player-presence` sur la tuile joueur.
- Validation:
  - `bun test src/app/App.integration.test.tsx -t "story page"`
  - `bun test src/domain/story/story.test.ts`
  - `bun run typecheck`
  - `bun run lint`
  - `agent-browser` sur `/story`: sprite joueur Red rouge/bleu + halo visible sur la map.

## 2026-05-06 - Terrain et collisions story

- Remplacement des collisions muettes par une carte de terrain typée:
  - `road` praticable
  - `building`, `water`, `fence`, `sign`, `border` bloquants
  - les dresseurs bloquent en tant que collision `trainer`
- `moveStoryPlayer` renvoie maintenant la cible, le terrain et la raison de blocage (`blockedBy`, `trainerId` si besoin).
- Ajout de `getStoryTile` pour inspecter une tuile: terrain, passable, libellé.
- L'UI story affiche désormais le terrain sous Red et celui devant lui, et les messages de blocage disent quoi bloque.
- Correction du bord droit de l'eau en bas: la 4e colonne d'eau est bloquante aussi.
- Validation:
  - RED puis GREEN sur `bun test src/domain/story/story.test.ts`
  - `bun test src/app/App.integration.test.tsx -t "story page|story original"`
  - `bun run typecheck`
  - `bun run lint`
  - `agent-browser` sur `/story`: deux pas gauche depuis le départ bloquent sur l'eau avec message `Obstacle: eau`.

## 2026-05-06 - Collisions précises et focus exploration

- Remplacement des rectangles de terrain par une grille 20x18 tuile par tuile pour caler les obstacles sur le PNG original.
- Correction précise de la barrière haut-gauche:
  - `{ x: 5, y: 9 }` est une `barriere` bloquante
  - `{ x: 5, y: 10 }` reste une `route` praticable
  - les panneaux `{ x: 7, y: 9 }` et `{ x: 13, y: 13 }` sont des obstacles `panneau`
- Suppression du grand menu à droite: la page story passe en mode focus, sans topbar globale, avec HUD compact sous la map et bouton `Menu`.
- Validation:
  - `bun test src/domain/story/story.test.ts`
  - `bun test src/app/App.integration.test.tsx -t "story page|story original"`
  - `bun run typecheck`
  - `bun run lint`
  - `agent-browser` sur `/story`: layout complet visible en 1280x720, collision eau à `{ x: 7, y: 15 }`, collision barrière à `{ x: 5, y: 9 }`.

## 2026-05-06 - Story sans bandeau de commandes

- Retrait du bandeau persistant sous la map (`message`, `Sol/Devant`, flèches, `Parler`).
- La topbar globale reste visible sur `/story`.
- Les déplacements et l'interaction passent au clavier (`flèches`, `Entrée`), et la carte dresseur n'apparait que quand on parle à un dresseur.
- Validation:
  - RED puis GREEN sur `bun test src/app/App.integration.test.tsx -t "story page|story original"`
  - `bun run typecheck`
  - `bun run lint`
  - `agent-browser` sur `/story`: bandeau retiré, topbar visible, dialogue dresseur visible après `ArrowRight` + `Enter`.

## 2026-05-06 - Sprite joueur noir et blanc

- Red utilise à nouveau la sprite sheet noir et blanc `public/story/gen1/red-walk-sheet.png`.
- Le halo jaune a été remplacé par une présence gris/noir plus discrète pour mieux coller à la DA Gen 1.
- Validation:
  - RED puis GREEN sur `bun test src/app/App.integration.test.tsx -t "story page"`
  - `bun test src/app/App.integration.test.tsx -t "story page|story original"`
  - `bun run typecheck`
  - `bun run lint`
  - `agent-browser` sur `/story`: sprite joueur noir et blanc visible sur la map.

## 2026-05-06 - Sélecteur de maps story

- `/story` affiche maintenant un sélecteur de cartes au lieu d'entrer directement dans l'exploration.
- Ajout d'une carte `Bourg Palette` avec aperçu pixel, compteur `0/3 dresseurs battus` et entrée vers `/story/pallet-town`.
- L'exploration de Bourg Palette vit sur `/story/pallet-town`, avec redirection propre si l'id de map est invalide.
- Les matchs histoire mémorisent la map d'origine pour revenir sur `/story/pallet-town` après un duel au lieu de retomber sur le sélecteur.
- Validation:
  - RED puis GREEN sur `bun test src/domain/story/story.test.ts`
  - `bun test src/app/App.integration.test.tsx -t "story mode opens|story original"`
  - `bun run typecheck`
  - `bun run lint`
  - `agent-browser` sur `/story`: le sélecteur apparait, puis le clic sur Bourg Palette ouvre `/story/pallet-town` avec la map active.

## 2026-05-06 - Musique et prompt dresseur story

- Ajout d'une metadata musique sur Bourg Palette: `pallet-town-theme`.
- Ajout d'une boucle WebAudio chiptune originale dans `src/ui/audio/storyMusic.ts`, lancée à l'entrée de `/story/pallet-town` si l'audio du profil est activé.
- La musique est arrêtée au démontage de la page story ou au changement de map.
- `render_game_to_text` expose maintenant `music: { id, label, enabled }` pour valider l'état audio demandé.
- Ajout d'un prompt dans la fenêtre dresseur: `Clique sur Defier pour lancer le duel.`
- Validation:
  - RED puis GREEN sur `bun test src/domain/story/story.test.ts`
  - `bun test src/app/App.integration.test.tsx -t "story mode opens|story original"`
  - `bun run typecheck`
  - `bun run lint`
  - `agent-browser` sur `/story`: entrée dans Bourg Palette, état `music.id = pallet-town-theme`, puis interaction avec Nora montrant le prompt de duel.

## 2026-05-06 - Carte dresseur sans deck visible

- Retrait de la ligne `Deck CPU` dans la fenêtre dresseur story.
- Remplacement par un statut simple:
  - `Statut: pas encore battu`
  - `Statut: battu` quand le dresseur est déjà vaincu.
- Cliquer ou parler à un dresseur battu peut maintenant afficher sa carte de statut, sans bouton `Defier`.
- Validation:
  - RED puis GREEN sur `bun test src/app/App.integration.test.tsx -t "story original"`
  - `bun test src/domain/story/story.test.ts && bun test src/app/App.integration.test.tsx -t "story mode opens|story original"`
  - `bun run typecheck`
  - `bun run lint`
  - `agent-browser` sur `/story/pallet-town`: la carte de Nora affiche `Statut: pas encore battu` et ne montre plus son deck.

## 2026-05-06 - Scope musique story

- Ajout d'un contrôleur global pour la musique story:
  - `playPalletTownMusic()` remplace proprement toute boucle déjà active.
  - `stopStoryMusic()` coupe la boucle active et remet l'état à `null`.
  - `getActiveStoryMusicId()` permet aux tests de vérifier ce qui joue.
- `App` coupe désormais toute musique story dès que l'URL n'est plus une vraie map `/story/:mapId`; le sélecteur `/story` ne garde donc pas la musique.
- Validation:
  - RED puis GREEN sur `bun test src/ui/audio/storyMusic.test.ts`
  - `bun test src/app/App.integration.test.tsx -t "story music|story mode opens|story original"`
  - `bun run typecheck`
  - `bun run lint`
  - `agent-browser`: `/story` sans runtime map, entrée `/story/pallet-town` avec `music.id = pallet-town-theme`, retour `/story` avec `window.render_game_to_text` retiré.

## 2026-05-06 - Sprite sheet DS pour Red

- Extraction depuis `/Users/joellebeyens/Downloads/pokemon_red_ds_style_sprites_by_pkmntrainerrick_demk7wr-fullview.jpg`.
- Génération de `public/story/gen1/red-ds-walk-sheet.png`:
  - PNG transparent
  - 128x128
  - 4 colonnes de frames
  - 4 lignes directionnelles: bas, gauche, droite, haut.
- `StoryPage` utilise maintenant `/story/gen1/red-ds-walk-sheet.png` avec `data-sprite-layout="4x4-directional"`.
- CSS story mis à jour pour choisir la bonne ligne selon la direction du joueur, avec offsets explicites par direction.
- Validation:
  - RED puis GREEN sur `bun test src/app/App.integration.test.tsx -t "story mode opens"`
  - `bun test src/app/App.integration.test.tsx -t "story mode opens|story original|story music"`
  - `bun test src/domain/story/story.test.ts src/ui/audio/storyMusic.test.ts`
  - `bun run typecheck`
  - `bun run lint`
  - `agent-browser` sur `/story/pallet-town`: Red DS visible sur la map, sans fond blanc.

## 2026-05-06 - Correction sprite Red story

- Correction des directions gauche/droite: les lignes du sprite sheet étaient inversées dans le CSS.
- Retrait complet du petit socle/halo sous les pieds du joueur:
  - suppression du markup `.story-player-presence`
  - suppression du style associé.
- Validation:
  - RED puis GREEN sur `bun test src/app/App.integration.test.tsx -t "story mode opens"`
  - `bun test src/app/App.integration.test.tsx -t "story mode opens|story original|story music"`
  - `bun run typecheck`
  - `bun run lint`
  - `agent-browser` sur `/story/pallet-town`: déplacement gauche/droite revalidé visuellement, sans socle sous Red.

## 2026-05-06 - Roster dresseurs story

- Ajout d'une colonne dresseurs a droite de la map Bourg Palette.
- Chaque entree affiche:
  - un avatar Pokemon choisi depuis le premier Pokemon du deck du dresseur
  - le nom
  - le titre
  - la moyenne de valeur du deck, calculee depuis les stats des cartes.
- Les entrees sont cliquables et ouvrent la fiche/dialogue du dresseur sans afficher la liste brute du deck.
- Validation:
  - RED puis GREEN sur `bun test src/app/App.integration.test.tsx -t "story mode opens"`
  - `bun test src/app/App.integration.test.tsx -t "story mode opens|story original|story music"`
  - `bun test src/domain/story/story.test.ts`
  - `bun run typecheck`
  - `bun run lint`
  - `agent-browser` sur `/story/pallet-town`: roster visible a droite, avatars Magicarpe/Carapuce/Bulbizarre charges.

## 2026-05-06 - Retour au choix des maps story

- Ajout d'un bouton `Choix des maps` dans l'en-tete des maps story.
- Le bouton renvoie vers `/story` pour revenir au selecteur de cartes.
- Validation:
  - RED puis GREEN sur `bun test src/app/App.integration.test.tsx -t "story mode opens"`
  - `bun test src/app/App.integration.test.tsx -t "story mode opens|story original|story music"`
  - `bun run typecheck`
  - `bun run lint`
  - `agent-browser`: clic sur `Choix des maps` depuis `/story/pallet-town`, retour confirme sur `/story`.

## 2026-05-06 - Hub Kanto story

- Transformation de `/story` en hub d'aventure Kanto.
- Ajout de la structure de progression dans le domaine story:
  - 8 chapitres `Ville -> Zone -> Arene`
  - ordre Kanto: Pierre, Ondine, Major Bob, Erika, Koga, Morgane, Auguste, Giovanni
  - Ligue Pokemon: Olga, Aldo, Agatha, Peter, Regis.
- Bourg Palette reste la seule entree jouable pour l'instant, via le chapitre `Badge Roche`.
- Les autres chapitres sont visibles comme jalons verrouilles pour donner la vision long terme du mode histoire.
- Capture du brainstorm dans `docs/brainstorms/2026-05-06-story-kanto-hub-brainstorm.md`.
- Validation:
  - RED puis GREEN sur `bun test src/domain/story/story.test.ts -t "Kanto story hub"`
  - RED puis GREEN sur `bun test src/app/App.integration.test.tsx -t "story mode opens"`
  - `bun test src/domain/story/story.test.ts`
  - `bun test src/app/App.integration.test.tsx -t "story mode opens|story original|story music"`
  - `bun run typecheck`
  - `bun run lint`
  - `agent-browser` sur `/story`: hub visible, puis clic sur le premier chapitre confirme l'ouverture de `/story/pallet-town`.

## 2026-05-06 - Fond de map sur le hub Kanto

- Le chapitre jouable `Badge Roche` affiche de nouveau Bourg Palette comme vraie image de fond, au lieu d'un petit aperçu isole.
- Ajout d'un voile sombre progressif pour garder les libelles lisibles tout en laissant la map respirer.
- Retrait du thumbnail `.story-chapter-card__preview` sur le chapitre jouable.
- Validation:
  - RED puis GREEN sur `bun test src/app/App.integration.test.tsx -t "story mode opens"`
  - `bun run typecheck`
  - `bun run lint`
  - `agent-browser` sur `/story`: fond de Bourg Palette visible dans la carte du premier chapitre.

## 2026-05-06 - Zones Kanto déverrouillées pour test

- Tous les chapitres Kanto sont temporairement déverrouillés pendant la phase de test.
- Chaque chapitre pointe vers la vertical slice actuelle `/story/pallet-town`, en attendant les vraies maps dédiées.
- Les cartes du hub affichent maintenant `Entrer` au lieu de `Verrouille` sur les 8 arènes.
- Validation:
  - RED puis GREEN sur `bun test src/domain/story/story.test.ts -t "Kanto story hub"`
  - RED puis GREEN sur `bun test src/app/App.integration.test.tsx -t "story mode opens"`
  - `bun test src/domain/story/story.test.ts`
  - `bun test src/app/App.integration.test.tsx -t "story mode opens|story original|story music"`
  - `bun run typecheck`
  - `bun run lint`
  - `agent-browser` sur `/story`: les 8 chapitres sont des liens, clic sur Azuria confirme l'ouverture de `/story/pallet-town`.

## 2026-05-07 - Check-up global pre-demo

- Correction du dernier blocage lint dans `AccountPage`: formulaire de nom extrait en composant local au lieu d'un `setState` synchrone dans un effet.
- Validation:
  - `bun test src/ui/pages/AccountPage.test.tsx`
  - `bun run lint`
  - `bun run typecheck`
  - `bun test` => 770 tests pass
  - `bun run build` => build OK, mais warning chunks >500 kB
  - `agent-browser` preview build: home, setup, match et story chargent sans erreurs page/console.
- Notes:
  - Le match transfere environ 28.8 Mo de ressources sur le run browser, dont environ 22 Mo via des images de background CSS.
  - Mobile match 390x844: fonctionnel, mais le plateau et la main joueur sont trop bas au premier viewport.
  - Equilibrage: starter OK niveau 1-2; niveau 3+ normal/ranked exige collection/auto deck. En story, Azuria/Mont Selenite/Azuria Gym sont trop raides pour un starter pur.

## 2026-05-07 - Optimisation assets pre-demo

- Conversion des gros backgrounds de cartes, effets de board, splasharts, rangs, packs, visuels setup/home et fonds JPEG vers WebP/SVG servis par l'app.
- Suppression des anciens PNG/JPG lourds non utilises par le runtime.
- `getCardArtCandidates` priorise WebP pour eviter les requetes fallback PNG.
- Validation:
  - `bun test` => 770 tests pass
  - `bun run lint`
  - `bun run typecheck`
  - `bun run build` => build OK, warning chunks >500 kB conserve
  - `agent-browser` preview: match charge sans erreurs page/console.
- Mesures:
  - `dist`: ~157 Mo -> 25 Mo
  - `public`: ~156 Mo -> 24 Mo
  - lancement match apres setup: ~28.8 Mo -> ~0.76 Mo transferes sur le run mesure
