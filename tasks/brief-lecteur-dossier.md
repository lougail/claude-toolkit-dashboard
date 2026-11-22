# Brief — Lire le dossier d'un projet

> **Statut :** prêt à lancer
> **Date :** 2026-11-22
> **Tâche du plan :** 2, dans `PLAN.md`
> **Décision :** `vault/decisions/2026-11-22-dashboard-poste-de-pilotage.md`

## But

Le dashboard devient le poste de pilotage des projets de Louis. Il affichera le dossier que les agents tiennent dans chaque projet, c'est-à-dire `PLAN.md`, `JOURNAL.md` et les décisions. Ce morceau livre la fonction qui lit ce dossier et le rend en données typées. Les écrans s'appuieront dessus dans un morceau suivant.

Le format du dossier est à l'essai jusqu'au 29 novembre 2026 et sera fixé ensuite. Le lecteur est donc tolérant. Il lit ce qu'il reconnaît, garde le texte tel qu'il est écrit et signale chaque chose attendue qu'il n'a pas pu lire. Une lecture qui échoue laisse toujours une trace dans la liste des manques.

## Livrable

| Fichier | Contenu |
|---|---|
| `src/lib/parsers/dossier.ts` | `readDossier(projectDir: string): Promise<Dossier>`. Elle rend toujours un `Dossier`, même quand le projet n'a aucun fichier de dossier |
| `src/lib/types.ts` | Les types ci-dessous, dans une nouvelle section `// --- Dossier` |
| `src/__tests__/dossier.test.ts` | Les tests |
| `src/__tests__/fixtures/dossier/` | Les fichiers d'exemple des tests |

```ts
/** A labelled bullet, written "- **Fait.** text" in the plan state or in a journal entry */
export interface DossierPoint {
  label: string
  text: string
  taskNumbers: number[]
}

export type DossierTaskStatus = 'todo' | 'in_progress' | 'to_validate' | 'done' | 'later' | 'unknown'

export interface DossierTask {
  number: number
  title: string
  description: string
  doneWhen: string
  status: DossierTaskStatus
  statusText: string
}

export interface DossierWaitingItem {
  position: number
  text: string
  requestedOn: string | null
  taskNumbers: number[]
}

export interface DossierPlan {
  stateDate: string | null
  state: DossierPoint[]
  tasks: DossierTask[]
  waiting: DossierWaitingItem[]
}

export interface DossierJournalEntry {
  date: string
  note: string | null
  points: DossierPoint[]
}

export interface DossierDecision {
  id: string | null
  title: string
  date: string | null
  status: string | null
  path: string
}

export interface DossierGap {
  source: 'plan' | 'journal' | 'decisions'
  kind: DossierGapKind
  message: string
}

export interface Dossier {
  projectPath: string
  /** null when PLAN.md is absent or unreadable */
  plan: DossierPlan | null
  /** null when JOURNAL.md is absent or unreadable */
  journal: DossierJournalEntry[] | null
  decisions: DossierDecision[]
  gaps: DossierGap[]
}
```

`DossierGapKind` est l'union des sortes listées dans « Les manques ». Toutes les dates sont des chaînes `AAAA-MM-JJ`. Tu peux ajuster un nom ou ajouter un champ quand la lecture le demande. Signale-le dans ton compte rendu.

## Ce que le lecteur lit

Les titres, les libellés, les états et les mots repères (« tâche », « Demandé le ») se comparent sans tenir compte des majuscules ni des accents. Les fins de ligne `\n` et `\r\n` sont acceptées. Une puce ou une ligne de liste qui se poursuit sur des lignes indentées forme un seul texte.

### `PLAN.md`

```markdown
# Plan

> Où en est le projet et ce qui vient ensuite.

## Où en est le projet (2026-11-22)

- **Fait.** L'import des recettes fonctionne (ADR-002).
- **En cours.** La tâche 1 est construite et attend que Louis l'essaie.

## Comment on travaille

- Une tranche à la fois.

## Prochaines tâches

| # | Tâche | Fini quand | État |
|---|---|---|---|
| 1 | **Voir la liste.** Les recettes importées s'affichent. | Louis ouvre la page et voit ses dix recettes. | à valider par Louis |
| 2 | **Chercher**, par nom ou par ingrédient. | Une recherche de « tarte » affiche les tartes. | à faire |

Un paragraphe libre peut suivre le tableau.

## Ce qui attend Louis

L'agent propose la première ligne, attend la réponse, puis passe à la suivante.

1. Ouvrir la page et dire si la liste est lisible. Demandé le 22 novembre, la réponse attendue est « vu ».
2. Choisir l'hébergement. Avec la ligne 1, cela valide la tâche 1.
```

| Donnée | Règle |
|---|---|
| `stateDate` | La date entre parenthèses du titre `## Où en est le projet (AAAA-MM-JJ)`, quand elle existe au calendrier. Sinon `null` |
| `state` | Chaque puce `- **Libellé.** texte` de cette section donne un `DossierPoint`. Le libellé perd sa ponctuation finale et devient `Fait` |
| `tasks` | Les lignes du tableau placé sous `## Prochaines tâches`. Les colonnes `#`, `Tâche`, `Fini quand` et `État` sont repérées par leur nom dans la ligne d'en-tête. Leur ordre est libre et une colonne en plus est ignorée |
| `title`, `description` | `title` est la partie en gras de la cellule `Tâche`, sans son point final. `description` est le reste de la cellule, tel quel. Dans l'exemple, la tâche 2 donne `Chercher` et `, par nom ou par ingrédient.`. Une cellule sans gras donne son texte entier comme `title` |
| `status`, `statusText` | `statusText` garde la cellule `État` entière. `status` vient du début de cette cellule, d'après la liste ci-dessous |
| `waiting` | Les lignes numérotées de la section dont le titre commence par `## Ce qui attend`. `position` est le rang de la ligne, à partir de 1. Une section sans ligne numérotée donne une liste vide |
| `requestedOn` | La date qui suit « Demandé le » dans la ligne, écrite `22 novembre`, `1er décembre 2026` ou `2026-11-22`. Une date sans année prend l'année de `stateDate`, ou l'année d'avant quand cela la placerait après `stateDate`. Sans `stateDate`, elle vaut `null` |
| `taskNumbers` | Les numéros cités dans le texte sous la forme `tâche 1` ou `tâches 2 et 3`, sans doublon |

| Début de la cellule `État` | `status` |
|---|---|
| `à faire` | `todo` |
| `en cours` | `in_progress` |
| `à valider` | `to_validate` |
| `fait` | `done` |
| `plus tard` | `later` |
| autre chose | `unknown`, avec un manque |

Cette liste vit dans une constante. Elle changera quand le format sera fixé.

### `JOURNAL.md`

```markdown
# Journal

> Trois points par séance. La séance la plus récente est en haut.

## 2026-11-22

- **Fait.** L'écran de la tâche 1 affiche la liste.
- **Appris.** Le fichier d'export contient des lignes vides.
- **Bloque.** La validation de la tâche 1 attend Louis.

## 2026-07-03 (reconstitué depuis git)

- **Fait.** Import des recettes.
- **Appris.** Rien.
- **Bloque.** Rien.
```

Chaque titre `## AAAA-MM-JJ` ouvre une séance. Le texte entre parenthèses qui suit la date va dans `note`. Les puces se lisent comme celles de l'état du plan. Les séances sortent de la plus récente à la plus ancienne.

### Les décisions

Les trois emplacements se lisent tous. Le résultat est trié de la décision la plus récente à la plus ancienne, les décisions sans date à la fin.

| Emplacement | Une décision par | Ce qu'on y trouve chez Louis |
|---|---|---|
| `docs/decisions/*.md` | fichier | `# ADR-005 — Client web unique`, puis la ligne `**Date** : 2026-11-21 · **Statut** : accepté par Louis le 2026-11-21 · **Source** : essai du 2026-11-21` |
| `vault/decisions/*.md` | fichier | Un frontmatter `title`, `date`, `status`. Ou un titre `### 2026-11-22 — Titre` suivi de `- **Statut :** validee`. Ou un titre `# Titre` suivi de `> **Date :** 2026-04-07` |
| `DECISIONS.md` | entrée | Des titres `## 2026-11-20 — Titre`. Ou des titres `### Titre` rangés sous des titres de groupe comme `## 2026 — Evolutions` |

| Donnée | Règle, dans cet ordre |
|---|---|
| `title` | Le `title` du frontmatter. Sinon le premier titre du fichier ou le titre de l'entrée, sans la date ni l'identifiant placés à son début. Sinon le nom du fichier sans extension |
| `id` | L'identifiant placé au début du titre, comme `ADR-005`. Sinon `null` |
| `date` | La `date` du frontmatter. Sinon la valeur de `**Date**`. Sinon la date placée au début du titre, écrite `2026-11-20` ou `[2026-11-20]`. Sinon la date placée au début du nom du fichier. Sinon `null` |
| `status` | Le `status` ou le `statut` du frontmatter. Sinon le texte qui suit `**Statut**`, jusqu'au séparateur ` · ` ou à la fin de la ligne. Sinon `null` |
| `path` | Le chemin absolu du fichier qui contient la décision |

- Les écritures `**Statut** : texte` et `**Statut :** texte` existent toutes les deux, de même pour `**Date**`.
- `**Date**` et `**Statut**` se cherchent dans l'en-tête d'un fichier, avant son deuxième titre, et dans le corps d'une entrée de `DECISIONS.md`.
- gray-matter rend un objet `Date` quand la date du frontmatter est écrite sans guillemets. `src/lib/parsers/markdown.ts` montre la conversion.
- Dans `DECISIONS.md`, les entrées sont les titres `###` quand le fichier en contient, sinon les titres `##`.

## Les manques

Chaque manque nomme sa source, sa sorte et porte une phrase en français prête à afficher, qui cite l'élément concerné. Par exemple « Dans PLAN.md, la tâche 3 n'a pas de « Fini quand ». ». Une cause donne un seul manque. Une section absente donne donc un manque pour la section, et aucun pour ce qu'elle aurait contenu.

| `kind` | Quand |
|---|---|
| `missing_file` | `PLAN.md` ou `JOURNAL.md` est absent |
| `unreadable_file` | Un fichier du dossier existe et sa lecture échoue |
| `missing_section` | Une des trois sections attendues de `PLAN.md` est absente ou porte un autre titre. Le message cite les titres trouvés |
| `missing_state_date` | Le titre de l'état n'a pas de date valide |
| `unreadable_tasks_table` | La section des tâches n'a pas de tableau, ou une des quatre colonnes manque |
| `unreadable_task_row` | La colonne `#` d'une ligne ne contient pas un entier. La ligne est écartée |
| `task_without_done_when` | La cellule `Fini quand` d'une tâche est vide |
| `unknown_status` | L'état d'une tâche est hors de la liste connue |
| `waiting_without_date` | Une ligne en attente n'a pas de « Demandé le » suivi d'une date lisible |
| `journal_heading_without_date` | Un titre `## ` du journal ne commence pas par une date valide. Le titre est écarté |

Cette liste est un minimum. Ajoute une sorte quand une lecture échouerait sinon sans trace.

## Cas limites à tester

- Le dossier du projet n'existe pas, un fichier est absent, vide ou illisible. Un dossier nommé `PLAN.md` simule un fichier illisible. Les autres sources se lisent quand même.
- Un des trois titres de `PLAN.md` est renommé ou absent, les sections sont dans un autre ordre.
- Le tableau a une colonne en moins, une colonne en plus, ses colonnes dans un autre ordre.
- Une cellule `Fini quand` est vide, une cellule contient `\|`, un numéro de tâche est `5a`.
- Un état est inconnu, un état connu est suivi d'un détail comme `fait le 22 novembre, commit a9f228a`.
- Une ligne en attente est sans date, avec une date sans année, avec l'année, au format ISO, avec « 1er », avec un mois sans accent, avec une date impossible comme `31 février`.
- L'état est daté de janvier et la demande de décembre, sans année.
- Le texte cite `tâche 1`, `tâches 2 et 3`, `tache 4`.
- Le journal a une note entre parenthèses, un titre sans date, une séance sans puce.
- Des décisions existent à plusieurs emplacements à la fois, une décision n'a ni date ni statut.

## Règles du dépôt

- TypeScript strict, ES modules, `async` et `await`, aucun `any`, aucun `console.log`. Les commentaires sont en anglais comme dans le reste du code.
- Aucune dépendance nouvelle. `gray-matter` lit déjà les frontmatters et `exists` est dans `src/lib/fs.ts`.
- Le comportement des parsers existants est conservé, les pages actuelles s'en servent.
- `tsconfig.json` vise ES2017, donc `tsc` refuse les groupes nommés dans les regex (erreur TS1503).
- Les tests suivent `.claude/rules/tests.md`. Un bloc Arrange, Act, Assert, un concept par test, un nom descriptif en anglais, des tests indépendants, des fixtures ou des fabriques à la place de données répétées dans chaque test.
- Les fixtures sont des fichiers inventés qui reprennent la structure des exemples de ce brief. Le dépôt est public, donc aucun texte d'un vrai projet de Louis n'y entre.
- La documentation d'une bibliothèque se lit par Context7.

## Vérification

```bash
pnpm exec vitest run src/__tests__/dossier.test.ts
pnpm exec vitest run
pnpm exec tsc --noEmit
pnpm lint
```

Les quatre commandes passent, et `pnpm exec vitest run` compte toujours les 40 tests présents avant ce morceau. Un essai à la main sur de vrais dossiers s'y ajoute, avec les chiffres attendus donnés au lancement.

## Compte rendu attendu

- La liste des fichiers créés ou modifiés.
- Le résultat des quatre commandes, avec le nombre de tests.
- Ce que le lecteur rend sur les vrais dossiers indiqués au lancement.
- Les choix faits là où ce brief se tait, et tout écart par rapport à lui.
- Ce qui reste douteux ou non vérifié.

## Après ce morceau

La tâche 3 du plan branche le lecteur sur la liste des projets (`src/lib/data/scanner.ts`) et la tâche 7 construit les trois écrans. Les liens avec les commits, le contrôle de la fraîcheur du dossier et la commande de contrôle du format appartiennent à ces tâches ou au projet `.claude`. Les pages, `scanner.ts` et `package.json` restent donc tels quels dans ce morceau.
