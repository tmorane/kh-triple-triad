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
    version: 'v0.4.0',
    date: '2026-03-01',
    infos: ['Mise a jour gameplay et rendu visuel.'],
    nouveautes: ['Ajout des shiny.', 'Ajout des pouvoirs (Eau).'],
    changements: [
      'Amelioration visuelle des cartes.',
      'Amelioration visuelle en jeu.',
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
