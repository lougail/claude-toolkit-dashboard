---
title: "tsc lit les types de routes que Next garde dans .next"
date: "2026-11-24"
---

# tsc lit les types de routes que Next garde dans .next

- **Le piège.** `tsconfig.json` inclut `.next/types` et `.next/dev/types`. Next y range un fichier `validator.ts` qui importe chaque page et chaque route. Ces fichiers restent tels qu'ils étaient au dernier build ou au dernier démarrage du serveur. Après la suppression d'une page, `pnpm exec tsc --noEmit` échoue donc avec `Cannot find module '../../src/app/.../page.js'`, alors que le code est juste.
- **Ce que ça donnait ici.** Le premier morceau de la tâche 7 a retiré cinq pages et trois routes. `tsc` a rendu seize erreurs, toutes dans `.next/`.
- **La correction.** `pnpm exec next typegen` réécrit `.next/types`, et un démarrage de `pnpm dev` réécrit `.next/dev/types`. Git ignore les deux dossiers, donc un clone neuf passe sans ce geste.
