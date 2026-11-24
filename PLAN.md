# Plan

> Où en est le projet et ce qui vient ensuite. Écrit le 22 novembre 2026 à la demande de Louis, avec les mêmes titres que le `PLAN.md` du projet pilote. Louis a validé la direction le 22 novembre. La décision est notée dans `vault/decisions/2026-11-22-dashboard-poste-de-pilotage.md`.
>
> Le projet pilote est le projet privé de Louis où le format du dossier est à l'essai. Ce dépôt est public, donc le nom et le contenu de ce projet restent hors de ses fichiers et de ses commits. Le nom figure dans le relevé de l'essai, `~/.claude/vault/ideas/essai-piece-1-*.md`.
>
> Le format de ce dossier est décrit dans `~/.claude/skills/demarrer/DOSSIER.md`, et `python3 ~/.claude/scripts/check-dossier.py .` le contrôle. Les séances sont dans `JOURNAL.md`.
>
> Depuis le 23 novembre, l'agent fusionne lui-même une PR quand ses contrôles passent, puis dit à Louis quand il a fusionné et comment il a vérifié (`vault/decisions/2026-11-23-fusion-par-l-agent.md`). Le robot de revue relit une PR de moins de 150 000 caractères de diff.

## Où en est le projet (2026-11-24)

- **Fait.** Le dashboard a été construit en avril 2026 pour la V4 du toolkit. Le premier morceau de la tâche 7 en a retiré cinq pages (Pipeline, Audits, Activity, Decisions et la page d'un projet), leurs graphiques et trois routes d'API. Il reste l'accueil, qui liste les projets avec leur nom et leur chemin, et Settings. La correction d'une date mal lue est enregistrée (tâche 1). Le lecteur du dossier est écrit (tâche 2), et chaque projet de la liste porte son dossier lu (tâche 3). Le lecteur suit le format fixé le 23 novembre. Sur le dossier d'exemple du toolkit, sur ce dépôt et sur le projet pilote, il rend le même verdict que la commande de contrôle (tâche 5). Le format est posé sur un deuxième projet, ce dépôt. Il tient son journal depuis le 24 novembre et passe la commande de contrôle, et Louis a répondu « clair » à la lecture des deux plans (tâche 6). Les chemins des répertoires cachés, comme `.claude`, se décodent au bon endroit. Un en-tête écrit en JavaScript n'est plus exécuté à la lecture d'une décision, d'une note du vault ou d'un steering doc.
- **Constaté.** Lancé le 24 novembre sur les vraies données de Louis, après le retrait. `/` et `/settings` répondent 200, et `/pipeline`, `/audits`, `/activity` et `/decisions` répondent 404. L'accueil garde son filtre d'avant et liste 16 projets pour 101 entrées. Aucune page n'affiche encore le dossier lu.
- **Périmé.** Les lectures de la V4 restent dans `src/lib/` (`state.json`, Ralph, les sessions, le vault et les steering docs). L'accueil s'en sert encore pour son filtre, qui garde un projet quand il a une session récente ou un score de santé. Elles partent avec le deuxième morceau. `README.md`, `CLAUDE.md` et les steering docs décrivent encore les pages retirées. Le cinquième morceau réécrit les deux premiers.
- **En cours.** L'essai du format sur le projet pilote court jusqu'au 29 novembre (tâche 4). La tâche 7 refait le dashboard en cinq morceaux, décrits dans son brief (`tasks/brief-trois-ecrans.md`). Louis a validé les sept choix de ce brief le 24 novembre (`vault/decisions/2026-11-24-sept-choix-des-trois-ecrans.md`). Le premier morceau est fait. Le deuxième retire les lectures de la V4 et resserre la liste des projets.

## Direction

Le dashboard devient le poste de pilotage décrit dans la page de vision du toolkit (`~/.claude/vault/ideas/vision-page.md`, quatrième pièce). Il affiche le dossier que les agents tiennent dans chaque projet (`PLAN.md`, `JOURNAL.md`, les décisions). Pour tous les projets de Louis, il dit où en est chacun, ce qui est fait, ce qui reste et ce qui attend Louis.

Les applications Codex et Claude Code montrent déjà les sessions et les diffs, et des outils gratuits comme ccusage comptent les tokens. Le dashboard montre le projet dans la durée, quel que soit l'assistant qui y travaille.

Le dashboard vaut ce que valent ces fichiers. Leur format s'est donc fixé avant les écrans. Le projet `.claude` le décrit depuis le 23 novembre et le contrôle par une commande. Le lecteur (tâches 2 et 5) lit ce format et range chaque manque en erreur ou en point à compléter, comme la commande. Le projet `.claude` a aligné sa commande sur le lecteur le 24 novembre, et les deux concordent sur ses 16 dossiers d'essai. Trois en-têtes YAML rares se lisent encore différemment, notés dans `tasks/ecarts-format-dossier.md`.

## Prochaines tâches

| # | Tâche | Fini quand | État |
|---|---|---|---|
| 1 | **Enregistrer la correction de la date.** | `git status` ne liste plus `markdown.ts` ni `parsers.test.ts`, et `pnpm exec vitest run src/__tests__/parsers.test.ts` passe. | fait le 22 novembre, commit `a9f228a` |
| 2 | **Lire le dossier d'un projet.** Une fonction lit `PLAN.md`, `JOURNAL.md` et les décisions d'un projet. Chaque fichier peut manquer ou être abîmé sans empêcher la lecture des autres, et la fonction signale ce qu'elle n'a pas pu lire. Le brief est dans `tasks/brief-lecteur-dossier.md`. | Les tests du lecteur passent. Sur le dossier du projet pilote tel qu'il est le 22 novembre, il rend la date de l'état, cinq tâches, quatre lignes en attente, cinq séances et cinq décisions. Sur la version du même plan dont un titre porte son ancien nom, il signale le titre manquant. | fait le 22 novembre, commit `84821e8` |
| 3 | **Brancher le lecteur sur la liste des projets.** La découverte des projets qui existe déjà (`src/lib/data/scanner.ts`) joint à chaque projet son dossier lu. Le brief est dans `tasks/brief-dossier-dans-la-liste.md`. | Sur la machine de Louis, le projet pilote et ce dépôt sortent avec leur dossier, et un projet sans `PLAN.md` sort avec ce manque signalé. | fait le 23 novembre, commit `f3c2164` |
| 4 | **Laisser finir l'essai sur le projet pilote.** Le format de `PLAN.md` y est à l'essai jusqu'au 29 novembre. Le projet `.claude` tient le relevé dans `~/.claude/vault/ideas/essai-piece-1-*.md`. | Le relevé final du 29 novembre est écrit. | en cours |
| 5 | **Fixer le format du dossier et son contrôle.** Ce travail se fait dans le projet `.claude`. Des titres fixes, une liste fermée d'états, une date et un nom sur chaque ligne en attente, le numéro de la tâche dans le journal et les commits, une preuve sur chaque tâche finie. Une commande lit le dossier d'un projet et signale ce qui manque ou ce qui est périmé. Le brief de l'ajustement du lecteur est dans `tasks/brief-lecteur-format-fixe.md`. | La commande passe sur le projet pilote et échoue sur une copie dont un titre est renommé. Le lecteur de la tâche 2 est ajusté au format fixé. | fait le 24 novembre, commit `7064465` |
| 6 | **Poser le format sur un deuxième projet.** Ce dépôt est candidat. | La commande passe sur deux projets, et Louis dit où en est chacun en lisant son `PLAN.md` seul. | fait le 24 novembre, commit `0e65c57`, puis Louis a répondu « clair » après la lecture des deux plans |
| 7 | **Refaire le dashboard en trois écrans.** « À toi », les projets, puis la page d'un projet avec ses tâches et, pour chacune, le journal, les commits, les décisions et la preuve. Pipeline, Audits et la lecture de `state.json` partent. Le brief est dans `tasks/brief-trois-ecrans.md`, et ses sept choix sont validés dans `vault/decisions/2026-11-24-sept-choix-des-trois-ecrans.md`. | Un matin, Louis ouvre le dashboard et dit quoi faire sur chaque projet sans ouvrir de conversation. Un `PLAN.md` abîmé affiche un message sur sa carte, et le reste de la page s'affiche. | en cours |
| 8 | **Le travail à plusieurs.** L'essai prévu à la question 6 de la page de vision, sur un projet mené à plusieurs. | L'essai est fait et sa conclusion est notée. | plus tard |
| 9 | **Lire les réglages d'un projet.** Le lecteur lit la section « Réglages » des consignes d'un projet, comme la commande de contrôle, et cherche le dossier là où le réglage « Dossier » le range. | Sur les dossiers d'essai du toolkit qui portent des réglages, le lecteur rend le même verdict que la commande. Un projet dont le dossier vit dans un sous-dossier s'affiche avec ce dossier. | à faire |
| 10 | **Décider si le suivi de projet devient un skill à publier.** Une place de marché de skills l'a proposé à Louis. L'idée et les conditions relevées sont dans `vault/ideas/2026-11-23-suivi-de-projet-en-skill.md`. Le 24 novembre, Louis a répondu « plus tard », après la fin de l'essai du format (tâche 4). | Louis a répondu « oui » ou « non », et l'idée porte sa réponse. | plus tard |

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
- **Deux chemins étaient faux.** `decodeProjectPath` rendait `//` pour un répertoire caché comme `.claude`, et le dossier de ces entrées était cherché au mauvais endroit. Corrigé le 24 novembre, commit `b311f33`.
- **La lecture des dossiers pèse peu dans le chargement.** La découverte prend 4 à 5 secondes, et la lecture de tous les dossiers y compte pour moins d'un dixième de seconde. Dans un essai sans réseau, où `gh` échoue tout de suite, la découverte prend 1,5 seconde.

Relancée le 24 novembre, la découverte rend 100 entrées. 28 répertoires existent, et deux ont un `PLAN.md` et un `JOURNAL.md`, ce dépôt et le projet pilote. Un projet sort deux fois, car son chemin diffère par ses majuscules entre `~/.claude/projects` et le disque. Le décodeur de chemins compare les noms en respectant les majuscules. Une entrée dont un répertoire intermédiaire diffère par ses majuscules sortirait avec un chemin faux. Le 24 novembre, aucune des 99 entrées de `~/.claude/projects` n'est dans ce cas.

Le relevé du 24 novembre au soir est dans `tasks/brief-trois-ecrans.md`. Sur 101 entrées, 10 sont des projets à afficher, 2 avec un dossier et 8 dépôts git sans dossier.

## Ce qui attend Louis

Rien.
