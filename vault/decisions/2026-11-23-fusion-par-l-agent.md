---
title: "L'agent fusionne lui-même une PR vérifiée, puis rend compte"
date: "2026-11-23"
status: validee
---

### 2026-11-23 — L'agent fusionne lui-même une PR vérifiée, puis rend compte

- **Statut :** validee
- **Contexte :** Chaque PR de ce dépôt attendait que Louis écrive « fusionne », y compris quand ses tests passaient et que les remarques de la revue automatique étaient traitées. La PR n°2 a attendu ainsi le 23 novembre.
- **Decision :** L'agent fusionne lui-même une PR quand ses contrôles passent. Il dit ensuite à Louis quand il a fusionné et comment il a vérifié.
- **Options considerees :**
  - A. L'agent fusionne après ses contrôles et rend compte — Louis garde la trace de chaque fusion sans donner un accord à chaque PR.
  - B. Louis écrit « fusionne » pour chaque PR — écartée par Louis le 23 novembre, car elle lui ajoute un geste à chaque PR.
- **Consequences :** Avant une fusion, l'agent passe les tests (`pnpm exec vitest run`), le contrôle des types (`pnpm exec tsc --noEmit`), ESLint (`pnpm lint`) et la commande de contrôle du dossier. Il lit les remarques de la revue automatique, corrige celles qui tiennent et donne la raison des autres. Le compte rendu à Louis cite ces contrôles et leur résultat. Une décision d'architecture structurante attend toujours l'accord de Louis avant le travail.
- **Decide par :** Louis, le 23 novembre 2026
