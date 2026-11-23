# Brief — Joindre le dossier à la liste des projets

> **Statut :** livré le 23 novembre 2026, commit `f3c2164` sur la branche `codex/dossier-reader`
> **Date :** 2026-11-23
> **Tâche du plan :** 3, dans `PLAN.md`
> **Décision :** `vault/decisions/2026-11-22-dashboard-poste-de-pilotage.md`

## But

`discoverProjects` (`src/lib/data/scanner.ts`) rend la liste des projets de Louis. Pour chacun, elle rend déjà son `state.json`, son vault, son état git et ses sessions. Ce morceau y joint le dossier lu par `readDossier`, livré à la tâche 2. Les trois écrans de la tâche 7 trouveront le dossier à cet endroit. Les pages actuelles gardent leur affichage.

## Livrable

| Fichier | Contenu |
|---|---|
| `src/lib/types.ts` | `Project` gagne le champ `dossier: Dossier` |
| `src/lib/data/scanner.ts` | `buildProject` lit le dossier du projet avec `readDossier`, en même temps que ses autres lectures |
| `src/__tests__/scanner.test.ts` | Les tests, les premiers de `scanner.ts` |

Chaque projet de la liste porte un `Dossier`, jamais `null`. `readDossier` rend toujours un `Dossier` et range dans `gaps` ce qu'il n'a pas pu lire. Un projet sans `PLAN.md` sort donc avec `dossier.plan` à `null` et un manque `missing_file` de source `plan`. Il en va de même pour une entrée de `~/.claude/projects` dont le répertoire a disparu.

## Cas à tester

Les tests appellent `discoverProjects`, le point d'entrée des pages.

- Un projet au dossier complet sort avec son plan, son journal et ses décisions.
- Un projet sans `PLAN.md` sort avec `plan` à `null` et le manque `missing_file`, et ses autres champs sont remplis.
- Un projet dont le `PLAN.md` a un titre renommé sort avec le manque `missing_section` et le reste du dossier.
- Un projet sans aucun fichier de dossier sort avec les deux manques `missing_file`.
- Une entrée de `~/.claude/projects` dont le répertoire a disparu sort avec les deux manques `missing_file`.
- Deux projets découverts ensemble gardent chacun leur dossier, et `dossier.projectPath` vaut `path`.
- Les champs rendus avant ce morceau (`name`, `path`, `encodedPath`, `state`, `vaultEntries`, `health`, `git`) gardent leur valeur.

Les tests restent enfermés dans un répertoire temporaire. Ils ne lisent rien de `~/.claude` ni de `~/Developer`, et ils ne lancent ni `git` ni `gh`. `@/lib/config` et `node:child_process` se simulent avec `vi.mock`. `readDossier` et les parsers tournent pour de vrai dans ces tests. Le dossier complet réutilise `src/__tests__/fixtures/dossier/complete`.

## Règles du dépôt

- TypeScript strict, ES modules, `async` et `await`, aucun `any`, aucun `console.log`. Les commentaires sont en anglais comme dans le reste du code.
- Aucune dépendance nouvelle.
- Le comportement de `discoverProjects` est conservé pour tout le reste. Les pages, les composants, `readDossier`, `decodeProjectPath`, le score de santé et les alertes restent tels quels. Un défaut trouvé en chemin se signale dans le compte rendu.
- Les tests suivent `.claude/rules/tests.md`. Un bloc Arrange, Act, Assert, un concept par test, un nom descriptif en anglais, des tests indépendants, des fixtures ou des fabriques à la place de données répétées dans chaque test.
- Le dépôt est public. Aucun texte ni aucun nom d'un vrai projet de Louis n'entre dans un fichier. Le projet où le format est à l'essai s'appelle « le projet pilote » dans ce dépôt.
- La documentation d'une bibliothèque se lit par Context7.

## Vérification

```bash
pnpm exec vitest run src/__tests__/scanner.test.ts
pnpm exec vitest run
pnpm exec tsc --noEmit
pnpm lint
```

Les quatre commandes passent, et `pnpm exec vitest run` compte toujours les 120 tests présents avant ce morceau.

Un essai sur la vraie machine s'y ajoute. Un fichier de test temporaire appelle le vrai `discoverProjects` et relève le nombre de projets, le nombre de projets qui ont un plan, et ce qui sort pour ce dépôt et pour le projet pilote indiqué au lancement. Ce fichier est supprimé avant le compte rendu.

## Compte rendu attendu

- La liste des fichiers créés ou modifiés.
- Le résultat des quatre commandes, avec le nombre de tests.
- Ce que rend l'essai sur la vraie machine.
- Les choix faits là où ce brief se tait, et tout écart par rapport à lui.
- Ce qui reste douteux ou non vérifié.

## Après ce morceau

Le 23 novembre, `discoverProjects` rend 103 entrées sur la machine de Louis. Beaucoup pointent vers des répertoires disparus, et un même projet peut sortir deux fois. Le tri de cette liste appartient à la tâche 7, avec les trois écrans.

## Livré le 23 novembre

Le branchement est dans le commit `f3c2164`. `buildProject` appelle `readDossier` pour chaque projet, que son répertoire existe ou qu'il ait disparu, et chaque projet de la liste porte un `Dossier`.

- **Tests.** `pnpm exec vitest run` compte 136 tests dans 4 fichiers, dont les 13 de `scanner.test.ts`. `tsc` et ESLint passent. Une lecture faite au mauvais chemin fait échouer 5 de ces 13 tests.
- **Essai sur la vraie machine.** Au contrôle final, `discoverProjects` rend 88 entrées en 4 à 5 secondes, et la lecture de tous les dossiers y compte pour moins d'un dixième de seconde. Deux entrées ont un plan, ce dépôt et le projet pilote, et leur dossier est celui que rend un appel direct à `readDossier`. Dix répertoires présents n'ont pas de `PLAN.md` et portent le manque `missing_file`. Les 76 entrées dont le répertoire a disparu portent ce manque pour le plan et pour le journal. Le premier essai du matin comptait 103 entrées, et `~/.claude/projects` a changé entre les deux.
- **Correction ajoutée.** Appelé sans option, gray-matter garde un texte en cache avant de le lire, et la deuxième lecture d'un frontmatter invalide sortait du cache sans erreur. Le lecteur du dossier perdait alors le manque `unreadable_frontmatter` après le premier chargement (commit `c0da1f6`). Les lecteurs du vault et des steering docs avaient le même défaut (commit `4b3b37d`). Le piège est noté dans `vault/insights/2026-11-23-gray-matter-cache.md`.

Deux points restent ouverts pour la tâche 7.

- `decodeProjectPath` rend `//` pour un répertoire caché comme `.claude`. Deux des 88 entrées ont ce chemin faux. Leur dossier est cherché à cet endroit, et `dossier.projectPath` y diffère de `path`.
- Les tests passent par `~/.claude/projects`. La découverte par les répertoires configurés (`scanConfiguredDirs`) est couverte par le seul essai sur la vraie machine.
