---
title: "Le dashboard devient le poste de pilotage qui affiche le dossier des projets"
date: "2026-11-22"
status: validee
---

### 2026-11-22 — Le dashboard devient le poste de pilotage qui affiche le dossier des projets

- **Statut :** validee
- **Contexte :** Le dashboard a été construit en avril 2026 pour la V4 du toolkit. Trois de ses pages affichent ce qu'écrivaient des commandes retirées depuis par la refonte du toolkit (`/prd`, `/ralph`, `/audit`). Lancé le 22 novembre 2026 sur les vraies données de Louis, Pipeline renvoie une erreur 500 et Activity affiche 0 token. Louis veut suivre ses projets dans le détail, comprendre ce qui est fait et ce qu'il reste à faire, seul puis en équipe.
- **Decision :** Le dashboard devient le poste de pilotage de la page de vision du toolkit (`~/.claude/vault/ideas/vision-page.md`). Il affiche le dossier que les agents tiennent dans chaque projet, c'est-à-dire `PLAN.md`, `JOURNAL.md` et les décisions, en trois écrans (« À toi », les projets, la page d'un projet). Le format du dossier se fixe avant les écrans. Le lecteur du dossier se construit dès maintenant. Il lit ce qu'il reconnaît et signale ce qui manque.
- **Options considerees :**
  - A. Afficher le dossier tenu par les agents — il montre le projet dans la durée, quel que soit l'assistant qui y travaille, avec ce qui est fait, ce qui reste et ce qui attend Louis.
  - B. Des pages de sessions et de tokens — écartée, les applications Codex et Claude Code montrent déjà les sessions et les diffs, et ccusage compte les tokens.
  - C. Garder le pipeline lu dans `state.json` — écartée, les commandes qui écrivaient ce fichier sont retirées et les trois fichiers qui restent datent de mai à août 2026.
- **Consequences :** Le dashboard vaut ce que valent les fichiers du dossier, donc leur tenue par les agents devient le point à soigner. Pipeline, Audits et la lecture de `state.json` partiront avec les trois écrans. Le format du dossier et sa commande de contrôle vivent dans le projet `.claude`. Ce format est à l'essai sur un projet privé de Louis, appelé le projet pilote dans ce dépôt, et le relevé de cet essai est attendu le 29 novembre 2026. Le travail à plusieurs reste ouvert et se tranchera par un essai. Le plan est dans `PLAN.md`.
- **Decide par :** Louis, le 22 novembre 2026
