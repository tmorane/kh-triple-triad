export interface ChangelogEntry {
  version: string
  date: string
  infos: string[]
  nouveautes: string[]
  changements: string[]
}

// Add each new release at the top of this list before pushing a new version.
export const changelogEntries: ChangelogEntry[] = [
  {
    version: 'v0.5.1-dev',
    date: '2026-03-03',
    infos: ['Balance patch centre sur les effets de type les plus polarisants apres extension a 251 cartes.'],
    nouveautes: ['Patch d equilibrage live: nerfs et buffs cibles sur les pouvoirs de type et harmonisation des stats.'],
    changements: [
      'Nerf Combat: bonus applique uniquement sur le cote conteste en attaque (plus de +all stats).',
      'Nerf Feu: brulure reduite a 1 tick.',
      'Nerf Eau: malus de case inondee passe a -3 sur la stat la plus haute.',
      'Nerf Glace: gel reduit a 1 tour de la cible.',
      'Nerf Roche: le bouclier d entree devient 1x par joueur sur la premiere carte Roche posee.',
      'Nerf Sol: pouvoir consomme apres le premier declenchement reussi (au lieu de reutilisable en boucle).',
      'Buff Normal: en mode normal, les cartes Normal gagnent +1 sur les 4 cotes.',
      'Buff Vol: pouvoir reutilisable par le meme acteur et malus temporaire passe de -1 a -2 sur toutes les stats de la cible.',
      'Buff Insecte: bonus d entree monte a +3 max (au lieu de +2) selon les allies adjacents.',
      'Buff Spectre: +1 sur les 4 cotes, ignore les malus de stats (debuffs temporaires et poison) et ignore les restrictions de case.',
      'Reequilibrage des statistiques top/right/bottom/left sur les 251 cartes pour resserrer les ecarts inter-types.',
      'Mise a jour des textes de regles, tutoriels et indicateurs UI pour refléter les nouvelles valeurs.',
    ],
  },
  {
    version: 'v0.5.0-dev',
    date: '2026-03-03',
    infos: [
      'Grosse mise a jour de contenu avec extension du roster, tutoriels jouables et progression enrichie.',
      'Le rendu des effets en match est plus lisible, avec des indicateurs plus clairs sur le plateau et dans le feed.',
      'Navigation enrichie avec nouvelles pages utiles (Mentions IP, Changelogs, acces admin images selon droits).',
    ],
    nouveautes: [
      'Ajout de 100 cartes Johto (c152 a c251) avec splasharts et versions shiny associees.',
      'Ajout des tutoriels de match (intro + tutoriels elementaires) avec guidage strict en partie.',
      'Ajout du craft par fragments et du claim groupe des recompenses d achievements.',
      'Ajout de la page Mentions IP (/legal) et extension du menu More.',
      'Ajout des nouveaux emblemes de rang en PNG (iron a challenger).',
    ],
    changements: [
      'Balance patch nerfs/buffs (Combat, Roche, Vol, Insecte, Spectre) applique et details disponibles en v0.5.1-dev.',
      'Refonte du moteur d effets: stacks de debuffs Vol/Sol, gel avec duree, feed et indicateurs enrichis.',
      'Refonte du rendu PixiBoard: overlays Sol/Plante/Glace, indicateurs de terrain et ciblage clavier revu.',
      'Mises a jour gameplay/UI sur Home, Match, Rules, Collection, Achievements, Missions, Packs, Ranks, Results, Setup et Decks.',
    ],
  },
  {
    version: 'v0.4.1',
    date: '2026-03-02',
    infos: ['Release patch de stabilisation du pouvoir Roche.'],
    nouveautes: ['Pouvoir Roche livre: bouclier d entree.'],
    changements: ['Feed + indicateurs du bouclier roche.'],
  },
  {
    version: 'v0.4.0',
    date: '2026-03-01',
    infos: ['Mise a jour gameplay et rendu visuel.'],
    nouveautes: ['Ajout des shiny.', 'Ajout des pouvoirs (Eau).'],
    changements: [
      'Amelioration visuelle des cartes.',
      'Amelioration visuelle en jeu.',
      "Ajout d icones dans le header.",
      'Ajout d icones pour les rangs.',
      'Suppression du rank Emeraude.',
      'Correction des latences dans le Pokedex.',
    ],
  },
  {
    version: 'v0.3.0',
    date: '2026-03-01',
    infos: ['Refonte de navigation avec menu More pour les pages secondaires.'],
    nouveautes: ['Nouvelle page Changelogs accessible depuis le menu More.'],
    changements: ['Structure des notes de version standardisee en Infos / Nouveautes / Changements.'],
  },
  {
    version: 'v0.2.0',
    date: '2026-02-25',
    infos: ['Ajout des pages Ranks et Missions dans la navigation secondaire.'],
    nouveautes: ['Tutoriel interactif des effets d elements dans la page Rules.'],
    changements: ['Ajustements de progression et affichage du profil joueur sur Home.'],
  },
]
