# Brief — Joindre le dossier à la liste des projets

> **Statut :** prêt à lancer
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
