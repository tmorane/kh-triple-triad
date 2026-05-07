---
date: 2026-05-07
topic: story-replayable-local-collections
---

# Story Replayable Local Collections

## What We're Building

Le mode histoire doit gagner en rejouabilite sans ajouter de complexite aux combats ni aux maps. La boucle V1 retenue est simple: le joueur choisit une carte qu'il veut focus, affronte le dresseur associe, gagne des fragments de cette carte ou de sa petite pool locale, puis complete progressivement la collection de la zone.

Chaque dresseur devient un spot de farm lisible. Le joueur ne farm pas "Mont Selenite" au hasard: il farm Marius pour ses cartes Roche/Sol, Rico pour sa pool Rocket/Poison, Eliott pour ses fossiles, etc.

## Why This Approach

On evite les objectifs de map, les evenements scenarises, les choix et les rotations quotidiennes pour la V1. Le jeu est deja assez dense; la meilleure amelioration est une motivation durable qui respecte le gameplay existant.

Cette approche donne une raison claire de rejouer les dresseurs sans introduire de nouvelles regles mentales: "je veux cette carte, donc je bats ce PNJ".

## Key Decisions

- Collections locales par zone: chaque map affiche une progression du type `7/24 fragments/cartes`.
- Pools de fragments par dresseur: chaque PNJ a 3 a 6 cartes/familles de cartes qu'il peut drop.
- Focus carte du dresseur: le joueur peut cibler les fragments lies au dresseur qu'il affronte.
- Premiere victoire distincte du farm: la premiere victoire peut donner or + fragment garanti; les revanches donnent des fragments rejouables.
- Identite des PNJ: chaque dresseur doit avoir une specialite claire pour que le farming soit memorisable.

## Open Questions

- Est-ce que le joueur choisit explicitement une carte a focus avant le duel, ou est-ce que le dresseur drop automatiquement dans sa pool?
- Combien de fragments faut-il pour debloquer une carte locale en V1?
- Est-ce qu'une carte debloquee via fragments donne directement 1 exemplaire jouable, ou seulement une entree de collection?

## Next Steps

-> Planifier une V1 avec pools de fragments par dresseur, recompenses de revanche, et affichage de collection locale.
