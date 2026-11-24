# Brief — Ajuster le lecteur au format fixé

> **Statut :** à faire
> **Date :** 2026-11-23
> **Tâche du plan :** 5, dans `PLAN.md`
> **Décision :** `vault/decisions/2026-11-22-dashboard-poste-de-pilotage.md`

## But

Le format du dossier est fixé depuis le 23 novembre 2026. Le toolkit le décrit dans `~/.claude/skills/demarrer/DOSSIER.md` et le contrôle avec la commande `~/.claude/scripts/check-dossier.py` (commit `8f6ca50` du toolkit). Le lecteur livré à la tâche 2 (`src/lib/parsers/dossier.ts`) a été écrit pendant l'essai du format. Ce morceau l'ajuste pour que, sur un même dossier, le lecteur et la commande rendent le même verdict.

Le lecteur rend aussi ce que les écrans de la tâche 7 afficheront, c'est-à-dire qui valide une tâche, la date et la preuve d'une tâche finie, et à qui s'adresse une ligne en attente.

Quatre remarques de la revue automatique de la PR n°2 sont corrigées dans ce morceau. Elles portent sur les fichiers illisibles, les titres indentés, les années 1 à 99 et les sous-titres d'une décision. Une cinquième, sur les chemins des répertoires cachés, se corrige à part dans `src/lib/config.ts`.

## Références

Ces trois lectures se font en entier avant de coder.

- `~/.claude/skills/demarrer/DOSSIER.md` décrit le format.
- `~/.claude/scripts/check-dossier.py` est la lecture de référence. Là où ce brief et la commande disent deux choses différentes, la commande fait foi et le compte rendu le signale. Les écarts voulus, listés plus bas, font exception.
- `src/__tests__/fixtures/dossier/valid/` est la copie du dossier d'exemple du toolkit (`tests/fixtures/dossier/valid/`, commit `8f6ca50`). La commande le déclare conforme, même avec `--strict`. Le lecteur le lit sans aucun manque. Les deux copies restent identiques.

## Livrable

| Fichier | Contenu |
|---|---|
| `src/lib/types.ts` | La gravité d'un manque, les nouveaux manques et les nouveaux champs |
| `src/lib/parsers/dossier.ts` | Le lecteur ajusté |
| `src/__tests__/dossier.test.ts` | Les tests des règles nouvelles ou changées |
| `src/__tests__/fixtures/dossier/` | Les fixtures dont un test a besoin, au contenu inventé |
| `src/__tests__/scanner.test.ts` | Ses attentes, là où un nouveau manque les change |

`readDossier` garde sa signature et rend toujours un `Dossier`. Les autres fichiers du dépôt restent tels quels. `src/lib/config.ts`, `src/__tests__/config.test.ts`, `PLAN.md`, `JOURNAL.md`, `tasks/` et `vault/` sont modifiés en parallèle par l'agent principal.

## Types

**`DossierGap`** gagne `severity: 'error' | 'warning'`. Une erreur signale un format cassé, et la commande échoue dans le même cas. Un avertissement signale un contenu manquant ou périmé, que la commande range dans ses points à compléter. La gravité dépend du seul `kind` et s'écrit à un seul endroit du lecteur.

**`DossierTask`** gagne trois champs. Le nom et la preuve sortent tels qu'ils sont écrits dans la cellule « État », avec leurs accents et leurs majuscules.

| Champ | Contenu |
|---|---|
| `validator: string \| null` | Le nom qui suit « à valider par ». `null` pour un autre état ou sans nom. |
| `doneOn: string \| null` | La date qui suit « fait le », rendue `AAAA-MM-JJ`. `null` pour un autre état ou sans date lisible. |
| `proof: string \| null` | Le texte qui suit cette date, sans la ponctuation qui l'entoure, par exemple « commit \`1a2b3c4\` ». `null` sans date ou sans preuve. |

**`DossierWaitingItem`** gagne `addressee: string | null`, la personne qui doit répondre. C'est le nom écrit après la date de la ligne (« Demandé le 14 mars à Jeanne »), sinon le nom qui termine le titre « Ce qui attend », sinon `null`.

Un nom s'arrête à la première virgule, au premier point-virgule, aux premiers deux-points, à la première parenthèse ouvrante, ou à un point suivi d'une espace ou de la fin du texte.

## Les manques

Le message d'un nouveau manque reprend la phrase de la commande pour le même cas. `unreadable_task_row` prend aussi la phrase de la commande, pour ses deux cas. Les autres messages existants restent.

### Erreurs

| `kind` | Source | Quand |
|---|---|---|
| `missing_file` | plan, journal | Le fichier n'existe pas. |
| `unreadable_file` | plan, journal, décisions | Le fichier ou le dossier de décisions existe et n'a pas pu être lu. |
| `empty_file` | plan, journal | Le fichier est vide. |
| `missing_title` (nouveau) | plan, journal | Le premier titre de niveau 1 du fichier ne commence pas par « Plan » ou par « Journal », ou le fichier n'a aucun titre de niveau 1. |
| `missing_section` | plan | Une des trois sections manque. |
| `missing_state_date` | plan | Le titre de l'état n'a pas de date valide entre parenthèses. |
| `unreadable_tasks_table` | plan | La section des tâches n'a pas de tableau, ou il lui manque une des quatre colonnes. |
| `unreadable_task_row` | plan | Le numéro de la ligne n'est pas un entier, ou la ligne compte moins de cellules que n'en demande la plus à droite des quatre colonnes. La ligne est écartée. |
| `unknown_status` | plan | L'état est hors de la liste. La tâche reste dans la liste avec l'état `unknown`. |
| `duplicate_task_number` (nouveau) | plan | Un numéro est porté par deux tâches. Les deux restent dans la liste. |
| `journal_heading_without_date` | journal | Le titre d'une séance ne commence pas par une date. La séance est écartée. |

### Avertissements

| `kind` | Source | Quand |
|---|---|---|
| `point_without_label` | plan, journal | Une puce ne commence pas par un mot en gras. |
| `task_without_done_when` | plan | La cellule « Fini quand » est vide. |
| `validation_without_name` (nouveau) | plan | L'état « à valider » n'est pas suivi de « par » et d'un nom. |
| `done_without_date` (nouveau) | plan | L'état « fait » n'est pas suivi de « le » et d'une date lisible. |
| `done_without_proof` (nouveau) | plan | La date d'une tâche faite n'est suivie d'aucune preuve. |
| `waiting_without_date` | plan | Une ligne en attente n'a pas de « Demandé le » suivi d'une date lisible. |
| `waiting_without_addressee` (nouveau) | plan | Une ligne datée ne nomme personne après sa date, et le titre de la section ne nomme personne. |
| `journal_without_session` (nouveau) | journal | Le journal n'a aucun titre de niveau 2. |
| `session_missing_point` (nouveau) | journal | Une séance n'a pas de point « Fait. », « Appris. » ou « Bloque. ». Un seul manque par séance nomme les points absents. |
| `journal_out_of_order` (nouveau) | journal | Les séances ne vont pas de la plus récente à la plus ancienne dans le fichier. |
| `state_behind_journal` (nouveau) | plan | La dernière séance du journal est plus récente que la date de l'état. |
| `journal_behind_state` (nouveau) | journal | La date de l'état est plus récente que la dernière séance du journal. |
| `task_not_in_journal` (nouveau) | journal | Une tâche en cours, à valider ou faite n'est citée par aucune séance. |
| `decision_without_date` (nouveau) | décisions | Le lecteur ne trouve pas de date à une décision. |
| `no_decision` (nouveau) | décisions | Aucune décision n'est notée, ni dans `DECISIONS.md` ni dans un dossier de décisions. Il remplace `no_decision_entry`, qui disparaît. |
| `unreadable_frontmatter` | décisions | L'en-tête YAML d'un fichier de décision n'a pas pu être lu. |

## Règles de lecture

Chaque règle suit la commande. Les expressions régulières de la commande donnent le détail.

### Titres et sections

1. **Le titre du fichier.** Le premier titre de niveau 1, hors des blocs de code, commence par « Plan » dans `PLAN.md` et par « Journal » dans `JOURNAL.md`. La comparaison ignore la casse et les accents. « # Plan du carnet » passe.
2. **Les titres indentés.** Un titre précédé d'une à trois espaces est un titre, comme dans CommonMark. Avec quatre espaces, la ligne n'en est pas un. La commande ne lit pas encore ces titres, et cet écart se note dans le compte rendu.
3. **La date de l'état.** Elle s'écrit `(AAAA-MM-JJ)`, la parenthèse fermante juste après le jour, n'importe où dans le titre. « Où en est le projet (mis à jour) (2026-03-14) » donne le 14 mars. « (2026-03-14, soir) » ne donne pas de date.
4. **Les sections et les colonnes en plus.** Un projet ajoute les sections et les colonnes qu'il veut. Un plan avec les colonnes « Qui » et « Sprint » et une section « Sprint 3 » se lit sans aucun manque.

### Tâches

5. **L'état.** L'un des cinq états ouvre la cellule et se termine sur une limite de mot. « faites » est hors de la liste, « fait. » est dans la liste.
6. **Qui valide.** « à valider par Camille » donne `validator`. Sans « par » suivi d'un nom, le lecteur signale `validation_without_name`.
7. **La date et la preuve.** « fait le 12 mars, commit \`1a2b3c4\` » donne `doneOn` et `proof`. La date s'écrit comme dans une ligne en attente, « 12 mars », « 1er décembre 2026 » ou « 2026-03-12 ». La preuve est ce qui suit la date, une fois retirés les espaces et les signes `,.;:-–—` qui l'entourent.
8. **Une date sans année.** Elle tombe dans l'année de la date de l'état, ou dans l'année d'avant quand elle tomberait après cette date. Quand le plan n'a pas de date d'état, la date du jour (heure locale) sert de repère, comme dans la commande. Cette règle vaut pour « fait le » et pour « Demandé le ». Dans les tests, la date du jour se fixe avec les faux minuteurs de Vitest, limités à `Date`.
9. **Les numéros.** Un numéro porté par deux tâches donne un `duplicate_task_number` par ligne en trop.

### Lignes en attente

10. **Qui doit répondre.** Le titre « Ce qui attend Camille » nomme Camille pour toutes les lignes. Une ligne qui écrit « à Jeanne » juste après sa date s'adresse à Jeanne. `waiting_without_addressee` se signale pour une ligne datée, sans nom après sa date, sous un titre sans nom.

### Journal

11. **Les trois points.** Le libellé d'une puce est le texte en gras qui l'ouvre, sans ses points finaux, comparé sans casse ni accents. « **Fait :** » ne compte donc pas pour « Fait. », alors que `DossierPoint.label` continue de rendre « Fait ».
12. **L'ordre.** Il se contrôle sur l'ordre du fichier, avant le tri que fait le lecteur. Les séances au titre sans date sont laissées de côté.
13. **Aucune séance.** `journal_without_session` se signale quand le fichier n'a aucun titre de niveau 2.

### Le plan et le journal ensemble

14. Ces contrôles tournent quand le journal a au moins une séance datée. Ils comparent la date de l'état à celle de la séance la plus récente. Ils cherchent ensuite, pour chaque tâche en cours, à valider ou faite, une citation « tâche N » ou « tâches N et M » dans le texte entier des séances datées, paragraphes compris. Le titre d'une séance reste hors de cette recherche, comme dans la commande.

### Décisions

15. **`README.md`.** Un fichier de ce nom, quelle que soit sa casse, n'est pas une décision dans `docs/decisions` ni dans `vault/decisions`.
16. **`DECISIONS.md`, section par section.** Le titre de niveau 2 est une décision quand il commence par une date ou par un identifiant comme `ADR-005`, quand un champ `**Date**` ou `**Statut**` se trouve entre lui et son premier titre de niveau 3, ou quand sa section n'a aucun titre de niveau 3. Ses titres de niveau 3 font alors partie de son texte, et ses champs se cherchent avant le premier d'entre eux. Dans les autres cas ce titre est un groupe, et chaque titre de niveau 3 de sa section est une décision. Un fichier peut mêler les deux, par exemple des décisions datées au-dessus d'anciens groupes.
17. **Une décision sans date.** `decision_without_date` se signale quand le champ `date` de la décision vaut `null`.
18. **Aucune décision.** `no_decision` se signale une fois, quand le lecteur ne trouve aucune décision dans les trois emplacements.

### Fichiers

19. **Absent ou illisible.** Le lecteur ouvre le fichier sans tester son existence avant. Les erreurs `ENOENT` et `ENOTDIR` disent que le fichier est absent, toute autre erreur qu'il est illisible. Un dossier de décisions absent ne donne aucun manque, un dossier illisible donne `unreadable_file`. Il en va de même pour `DECISIONS.md`. `exists` (`src/lib/fs.ts`) reste tel quel pour ses autres appelants.
20. **Les années 1 à 99.** « 0099-01-01 » est une date valide. L'année 0 est refusée, comme dans la commande.

## Un piège

`normalizeText` retire les accents après une décomposition, et le texte normalisé peut compter plus ou moins de caractères que le texte écrit. Une position trouvée dans l'un ne vaut pas toujours dans l'autre. Le nom et la preuve doivent pourtant sortir avec leurs accents. Un test lit donc « à valider par Zoé » écrit avec un accent décomposé (un « e » suivi de U+0301) et attend « Zoé ».

## Ce qui reste comme avant

- Les contrôles qui demandent git restent hors du lecteur. La commande compare la date de l'état au dernier commit et cherche le commit donné en preuve. Ils viendront avec la tâche 7.
- Le lecteur lit le premier tableau de la section des tâches.
- Une tâche à l'état inconnu reste dans la liste, et ses autres manques se signalent aussi.
- La fixture `complete` reste un dossier varié. Ses attentes s'ajustent aux nouveaux manques, et la fixture `valid` porte le cas sans aucun manque.

## Écarts voulus avec la commande

Sur ces points, le lecteur garde ou prend une lecture différente de celle de la commande. L'agent principal les note dans `tasks/ecarts-format-dossier.md`, que le projet `.claude` lit pour aligner la commande. Le compte rendu y ajoute ceux qu'il trouve en chemin.

- **Les titres indentés** (règle 2).
- **Les blocs de code.** La commande ouvre ou ferme un bloc à chaque ligne de clôture. Le lecteur attend une clôture du même signe, au moins aussi longue, et garde cette lecture.
- **Un deuxième titre de niveau 1.** Il ferme la section en cours dans le lecteur. La commande le range dans le texte de cette section.
- **Les lignes de continuation d'une liste.** Dans le lecteur, une ligne non indentée qui suit un élément le termine. La commande rattache toute ligne indentée au dernier élément lu.
- **Les décisions groupées** (règle 16). La commande compte une décision par titre de niveau 2.
- **La date d'une décision** (règle 17). La commande accepte une date écrite n'importe où dans le titre, dans le nom du fichier ou dans les premières lignes.
- **Une décision illisible.** Un fichier ou un dossier de décisions illisible se signale dans le lecteur. La commande le lit comme s'il était vide.
- **Un répertoire nommé `PLAN.md` ou `JOURNAL.md`.** Le lecteur le dit illisible, la commande le dit absent.

## Cas à tester

- La fixture `valid` se lit sans manque, avec la date de l'état, ses cinq tâches et leurs cinq états, la date et la preuve de la tâche 1, le nom qui valide la tâche 3, ses deux lignes en attente adressées à Camille et à Jeanne, ses deux séances et sa décision datée.
- Chaque `kind` porte la gravité du tableau.
- Chaque règle numérotée a ses tests, avec le cas qui passe et le cas signalé.
- Une tâche « à faire » que le journal ne cite pas ne donne aucun manque.
- Un projet sans journal ne donne aucun manque croisé.
- Dans `DECISIONS.md`, une décision datée dont le texte a un sous-titre « Contexte » donne une seule décision. Un groupe aux titres de niveau 3 sans date donne une décision par titre. Un fichier qui mêle une décision datée et un groupe donne les deux lectures.
- Un fichier illisible et un dossier de décisions illisible se signalent, sans passer pour absents.

Les noms de personnes des tests sont inventés.

## Règles du dépôt

- TypeScript strict, ES modules, `async` et `await`, aucun `any`, aucun `console.log`. Les commentaires sont en anglais comme dans le reste du code.
- Aucune dépendance nouvelle. `tsconfig` vise ES2017, et les groupes nommés des expressions régulières y sont refusés.
- Les tests suivent `.claude/rules/tests.md`. Un bloc Arrange, Act, Assert, un concept par test, un nom descriptif en anglais, des tests indépendants, des fixtures ou des fabriques à la place de données répétées dans chaque test.
- Le dépôt est public. Aucun texte ni aucun nom d'un vrai projet de Louis n'entre dans un fichier. Le projet où le format a été essayé s'appelle « le projet pilote » dans ce dépôt.
- La documentation d'une bibliothèque se lit par Context7.

## Vérification

```bash
pnpm exec vitest run src/__tests__/dossier.test.ts
pnpm exec vitest run
pnpm exec tsc --noEmit
pnpm lint
```

Les quatre commandes passent.

Un essai sur la vraie machine s'y ajoute. Un fichier de test temporaire lit avec le vrai `readDossier` la fixture `valid`, ce dépôt et le projet pilote indiqué au lancement. La commande Python lit les mêmes dossiers. Pour chacun, le nombre d'erreurs et le nombre d'avertissements du lecteur se comparent aux deux listes de la commande, une fois mis de côté ses deux contrôles git. Ce fichier est supprimé avant le compte rendu.

## Compte rendu attendu

- La liste des fichiers créés ou modifiés.
- Le résultat des quatre commandes, avec le nombre de tests.
- Ce que rend l'essai sur la vraie machine, dossier par dossier.
- Chaque texte que le lecteur et la commande lisent différemment à la fin du travail, avec le texte en cause, les deux lectures et celle qui paraît juste.
- Les choix faits là où ce brief se tait, et tout écart par rapport à lui.
- Ce qui reste douteux ou non vérifié.
