---
title: "Les sept choix du brief des trois écrans sont validés"
date: "2026-11-24"
status: validee
---

### 2026-11-24 — Les sept choix du brief des trois écrans sont validés

- **Statut :** validee
- **Contexte :** La décision du 22 novembre fixe la direction et les trois écrans (`vault/decisions/2026-11-22-dashboard-poste-de-pilotage.md`). Le brief de la tâche 7 (`tasks/brief-trois-ecrans.md`) tranche sept points qu'elle laissait ouverts, à partir du relevé fait le 24 novembre sur la machine de Louis. Ce relevé compte 101 entrées dans la liste des projets. 10 sont des projets à afficher, et 2 ont un dossier.
- **Decision :** Le 24 novembre, Louis valide les sept choix du brief par un « ok ».
  1. Toutes les pages actuelles partent, sauf Settings. Les graphiques de tokens, le score de santé, les steering docs et le suivi de Ralph partent avec elles.
  2. Un projet est un répertoire qui existe, affiché une seule fois. Les projets qui ont un dossier viennent en premier. Les dépôts git sans dossier suivent dans une liste repliée, et les autres répertoires sortent de la liste.
  3. Un répertoire ajouté dans Settings qui porte lui-même un `PLAN.md` devient un projet.
  4. « À toi » réunit les lignes « Ce qui attend » de tous les projets et les tâches « à valider » qu'aucune ligne ne cite. La première ligne de chaque projet monte en haut, la demande la plus ancienne d'abord. L'écran est en lecture seule.
  5. La page d'un projet liste toutes ses décisions. Une tâche affiche celles dont le fichier est cité dans sa ligne du plan ou dans un point du journal qui la cite.
  6. Les écrans reprennent la maquette de la page de vision, avec ses trois polices, son thème clair et son thème sombre. Leurs textes sont en français.
  7. La lecture des réglages d'un projet devient la tâche 9 du plan.
- **Options considerees :**
  - A. Les sept choix du brief — chacun s'appuie sur le relevé du 24 novembre et tient dans un des cinq morceaux du brief.
  - B. Retirer les seules pages nommées par la décision du 22 novembre et garder Overview, Activity et Decisions & Vault — écartée, car Codex et Claude Code montrent déjà les sessions et ccusage compte les tokens.
  - C. Garder dans la liste toutes les entrées de `~/.claude/projects` — écartée, car le relevé y compte 10 projets pour 101 entrées.
  - D. Lire les réglages d'un projet dès la tâche 7 — écartée, car aucun répertoire de la machine n'en porte encore et les trois écrans s'en passent.
- **Consequences :** La tâche 7 passe en cours, et son premier morceau retire les anciennes pages. Le dashboard cesse de montrer les sessions, les tokens et le pipeline de la V4. Un répertoire sans dépôt git et sans dossier sort de la liste. Le dossier de la refonte du toolkit, rangé dans un sous-dossier de son dépôt, s'affichera une fois son chemin ajouté dans Settings. Les trois ajouts possibles du brief sont restés sans réponse, donc le travail part sans eux, comme le brief le prévoit.
- **Decide par :** Louis, le 24 novembre 2026
