---
date: 2026-05-06
topic: story-kanto-hub
---

# Story Kanto Hub

## What We're Building

Le mode histoire doit avoir une ossature claire inspiree de la progression Kanto: huit badges, puis la Ligue Pokemon. Chaque chapitre suit le rythme `Ville -> Zone -> Arene`, avec un champion, un badge et une identite de deck.

Le hub `/story` devient donc la carte de progression principale. Il montre toute l'aventure, mais seule la premiere entree jouable pointe vers la map actuelle de Bourg Palette pour garder une vertical slice propre.

## Why This Approach

Le hub est le bon choix maintenant: il donne une vision longue de l'aventure sans obliger a produire toutes les maps d'un coup. Une map explorable par ville viendra quand la boucle de gameplay story sera assez solide.

## Key Decisions

- Progression lineaire par badges: plus lisible, plus facile a equilibrer, meilleure sensation d'avancement.
- Ordre Kanto retenu: Pierre, Ondine, Major Bob, Erika, Koga, Morgane, Auguste, Giovanni.
- Ligue apres les badges: Olga, Aldo, Agatha, Peter, puis Regis.
- Bourg Palette reste la seule entree jouable pour l'instant; les autres chapitres sont affiches comme jalons verrouilles.

## Open Questions

- Est-ce qu'on debloque les chapitres par dresseurs battus, par champion battu, ou par badge explicite?
- Est-ce que chaque zone intermediaire devient une vraie map, une liste de combats, ou un mini-donjon de cartes?

## Next Steps

Ajouter le modele de progression des badges, puis brancher le chapitre 1 vers `Route 1 -> Foret de Jade -> Argenta`.
