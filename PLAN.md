# Plan

> Où en est le projet et ce qui vient ensuite. Écrit le 22 novembre 2026 à la demande de Louis, avec les mêmes titres que le `PLAN.md` du projet pilote. Louis a validé la direction le 22 novembre. La décision est notée dans `vault/decisions/2026-11-22-dashboard-poste-de-pilotage.md`.
>
> Le projet pilote est le projet privé de Louis où le format du dossier est à l'essai. Ce dépôt est public, donc le nom et le contenu de ce projet restent hors de ses fichiers et de ses commits. Le nom figure dans le relevé de l'essai, `~/.claude/vault/ideas/essai-piece-1-*.md`.

## Où en est le projet (2026-11-23)

- **Fait.** Le dashboard construit en avril 2026 pour la V4 du toolkit. Ses six pages lisent `.claude/state.json`, `vault/`, les sessions de Claude Code, git et `gh`. La correction d'une date mal lue est enregistrée (tâche 1). Le lecteur du dossier est écrit et testé sur les vrais dossiers du projet pilote et de ce dépôt (tâche 2). Chaque projet de la liste porte son dossier lu (tâche 3).
- **Constaté.** Lancé le 22 novembre sur les vraies données de Louis. Overview, Decisions, Audits, Activity et Settings répondent sans erreur. Pipeline renvoie une erreur 500, car les anciens `state.json` n'ont pas le champ `ralph`. Activity affiche 0 token, car elle lit seulement les fichiers des sous-agents. Ces deux défauts restent jusqu'à la tâche 7. Relancées le 23 novembre, les pages donnent les mêmes réponses.
- **Périmé.** Pipeline, Audits et la lecture de `state.json` affichent ce qu'écrivaient les commandes de la V4 (`/prd`, `/ralph`, `/audit`), retirées par la refonte du toolkit. Les trois `state.json` qui restent datent de mai à août.
- **En cours.** L'essai du format sur le projet pilote court jusqu'au 29 novembre (tâche 4). La branche `codex/dossier-reader` est sur GitHub avec les tâches 1, 2 et 3. Sa PR attend que Louis la fasse fusionner (https://github.com/lougail/claude-toolkit-dashboard/pull/2).

## Direction

Le dashboard devient le poste de pilotage décrit dans la page de vision du toolkit (`~/.claude/vault/ideas/vision-page.md`, quatrième pièce). Il affiche le dossier que les agents tiennent dans chaque projet (`PLAN.md`, `JOURNAL.md`, les décisions). Pour tous les projets de Louis, il dit où en est chacun, ce qui est fait, ce qui reste et ce qui attend Louis.

Les applications Codex et Claude Code montrent déjà les sessions et les diffs, et des outils gratuits comme ccusage comptent les tokens. Le dashboard montre le projet dans la durée, quel que soit l'assistant qui y travaille.

Le dashboard vaut ce que valent ces fichiers. Leur format se fixe donc avant les écrans. Le lecteur (tâche 2) et son branchement sur la liste des projets (tâche 3) se construisent pendant l'essai du format. Le lecteur lit ce qu'il reconnaît et signale ce qui manque. Il sera ajusté quand le format sera fixé.

## Prochaines tâches

| # | Tâche | Fini quand | État |
|---|---|---|---|
| 1 | **Enregistrer la correction de la date.** | `git status` ne liste plus `markdown.ts` ni `parsers.test.ts`, et `pnpm exec vitest run src/__tests__/parsers.test.ts` passe. | fait le 22 novembre, commit `a9f228a` |
| 2 | **Lire le dossier d'un projet.** Une fonction lit `PLAN.md`, `JOURNAL.md` et les décisions d'un projet. Chaque fichier peut manquer ou être abîmé sans empêcher la lecture des autres, et la fonction signale ce qu'elle n'a pas pu lire. Le brief est dans `tasks/brief-lecteur-dossier.md`. | Les tests du lecteur passent. Sur le dossier du projet pilote tel qu'il est le 22 novembre, il rend la date de l'état, cinq tâches, quatre lignes en attente, cinq séances et cinq décisions. Sur la version du même plan dont un titre porte son ancien nom, il signale le titre manquant. | fait le 22 novembre, commit `84821e8` |
| 3 | **Brancher le lecteur sur la liste des projets.** La découverte des projets qui existe déjà (`src/lib/data/scanner.ts`) joint à chaque projet son dossier lu. Le brief est dans `tasks/brief-dossier-dans-la-liste.md`. | Sur la machine de Louis, le projet pilote et ce dépôt sortent avec leur dossier, et un projet sans `PLAN.md` sort avec ce manque signalé. | fait le 23 novembre, commit `f3c2164` |
| 4 | **Laisser finir l'essai sur le projet pilote.** Le format de `PLAN.md` y est à l'essai jusqu'au 29 novembre. Le projet `.claude` tient le relevé dans `~/.claude/vault/ideas/essai-piece-1-*.md`. | Le relevé final du 29 novembre est écrit. | en cours |
| 5 | **Fixer le format du dossier et son contrôle.** Ce travail se fait dans le projet `.claude`. Des titres fixes, une liste fermée d'états, une date et un nom sur chaque ligne en attente, le numéro de la tâche dans le journal et les commits, une preuve sur chaque tâche finie. Une commande lit le dossier d'un projet et signale ce qui manque ou ce qui est périmé. | La commande passe sur le projet pilote et échoue sur une copie dont un titre est renommé. Le lecteur de la tâche 2 est ajusté au format fixé. | à faire |
| 6 | **Poser le format sur un deuxième projet.** Ce dépôt est candidat. | La commande passe sur deux projets, et Louis dit où en est chacun en lisant son `PLAN.md` seul. | à faire |
| 7 | **Refaire le dashboard en trois écrans.** « À toi », les projets, puis la page d'un projet avec ses tâches et, pour chacune, le journal, les commits, les décisions et la preuve. Pipeline, Audits et la lecture de `state.json` partent. | Un matin, Louis ouvre le dashboard et dit quoi faire sur chaque projet sans ouvrir de conversation. Un `PLAN.md` abîmé affiche un message sur sa carte, et le reste de la page s'affiche. | à faire |
| 8 | **Le travail à plusieurs.** L'essai prévu à la question 6 de la page de vision, sur un projet mené à plusieurs. | L'essai est fait et sa conclusion est notée. | plus tard |

## Relevé du 22 novembre, pour la tâche 5

Un lecteur d'essai de 46 lignes a lu le dossier du projet pilote. Il en sort la date de l'état, cinq tâches avec leur « fini quand » et quatre lignes en attente. Cinq points gênent un suivi dans le détail.

- **Le titre de la liste en attente a changé en un jour.** Sur la version enregistrée dans git, où la section s'appelle « En attente d'une réponse de Louis », le même lecteur trouve 0 ligne.
- **Une ligne en attente sur quatre porte sa date.**
- **Les états sont écrits librement**, par exemple « à faire » et « à valider par Louis ».
- **Rien ne relie le travail fait à sa tâche.** Aucun des dix commits faits depuis le 20 novembre ne cite une tâche. Le journal en cite une dans deux lignes, en toutes lettres.
- **Aucun programme ne vérifie que le dossier est à jour.** La règle de fin de séance de `CLAUDE.md` repose sur l'agent. Les hooks et les scripts du toolkit ne citent ni `PLAN.md` ni `JOURNAL.md`.

## Relevé du 23 novembre, pour la tâche 7

Sur la machine de Louis, la liste rendue par `discoverProjects` compte 88 entrées. Quatre points comptent pour les écrans.

- **La plupart des entrées sont mortes.** 76 pointent vers un répertoire disparu. Douze répertoires existent, et deux ont un `PLAN.md`, ce dépôt et le projet pilote.
- **La liste bouge dans la journée.** Le premier essai du matin comptait 103 entrées, et `~/.claude/projects` a changé entre les deux essais.
- **Deux chemins sont faux.** `decodeProjectPath` rend `//` pour un répertoire caché comme `.claude`, et le dossier de ces deux entrées est cherché au mauvais endroit.
- **La lecture des dossiers pèse peu dans le chargement.** La découverte prend 4 à 5 secondes, et la lecture de tous les dossiers y compte pour moins d'un dixième de seconde. Dans un essai sans réseau, où `gh` échoue tout de suite, la découverte prend 1,5 seconde.

## Ce qui attend Louis

L'agent propose la première ligne, attend la réponse, puis passe à la suivante.

1. Dire « fusionne » pour faire entrer dans `main` la PR des tâches 1, 2 et 3 (https://github.com/lougail/claude-toolkit-dashboard/pull/2). Demandé le 23 novembre, la réponse attendue est « fusionne ».
