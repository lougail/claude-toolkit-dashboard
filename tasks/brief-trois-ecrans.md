# Brief — Refaire le dashboard en trois écrans

> **Statut :** validé par Louis le 24 novembre 2026
> **Date :** 2026-11-24
> **Tâche du plan :** 7, dans `PLAN.md`
> **Décisions :** `vault/decisions/2026-11-22-dashboard-poste-de-pilotage.md` pour la direction, `vault/decisions/2026-11-24-sept-choix-des-trois-ecrans.md` pour les sept choix

## But

Un matin, Louis ouvre le dashboard et sait quoi faire sur chaque projet sans ouvrir de conversation. Le dashboard affiche pour cela le dossier que les agents tiennent dans chaque projet, en trois écrans. « À toi » liste ce qui attend Louis dans tous ses projets. « Projets » donne une carte par projet. La page d'un projet montre ses tâches avec, pour chacune, le journal, les commits, les décisions et la preuve.

Le lecteur du dossier existe (tâches 2 et 5), et chaque projet de la liste porte son dossier lu (tâche 3). Aucune page ne l'affiche encore. Les pages en place affichent ce qu'écrivaient les commandes de la V4 du toolkit, retirées depuis.

## Le contrat

- **Taille.** Une fonctionnalité, livrée en cinq morceaux. Chaque morceau est une PR de moins de 150 000 caractères de diff, la limite du robot de revue.
- **Objectif.** Louis lit sur un écran ce qui l'attend dans tous ses projets, puis l'état et les tâches de chacun.
- **Fini quand.** Un matin, Louis ouvre le dashboard et dit quoi faire sur chaque projet sans ouvrir de conversation. Un `PLAN.md` abîmé affiche un message sur sa carte, et le reste de la page s'affiche.
- **Plus petite solution.** Trois écrans en lecture seule, nourris par le lecteur du dossier et par git. Les anciennes pages partent d'abord, selon la règle « alléger d'abord, ajouter ensuite » de la page de vision.
- **Hors périmètre.** Les réglages d'un projet (tâche 9), le travail à plusieurs (tâche 8), et tout ce qui écrit dans un dossier ou ouvre une session. La liste est à la fin de ce brief.
- **Décisions prises.** Louis a validé la direction et les trois écrans le 22 novembre. Depuis le 23 novembre, l'agent fusionne une PR vérifiée puis rend compte. Louis a validé les sept choix de ce brief le 24 novembre.

## Relevé du 24 novembre

Relevé sur la machine de Louis, au commit `3585f1f`, depuis une session sans réseau où `gh` échoue tout de suite.

- **La liste.** `discoverProjects` rend 101 entrées en 3,1 secondes. 29 répertoires existent, et deux chemins mènent au même, ce qui fait 28 répertoires distincts. 11 sont la racine d'un dépôt git. Les autres sont des dossiers parents, des dossiers d'outils ou un dossier de téléchargements.
- **Les dossiers.** Deux projets de la liste ont un `PLAN.md` et un `JOURNAL.md`, ce dépôt et le projet pilote. La commande de contrôle passe sur les deux, avec 0 et 3 points à compléter.
- **Ailleurs sur la machine.** Un troisième dossier passe la commande, celui de la refonte du toolkit. Il vit dans un sous-dossier de son dépôt (`~/.claude/vault/refonte/`), et la liste cherche le dossier de ce dépôt à sa racine. Deux autres `PLAN.md` rangés dans un sous-dossier portent 4 et 5 erreurs de format.
- **Ce qui attend.** Les deux dossiers de la liste portent 6 lignes en attente, toutes adressées à Louis, dont 3 sont datées. Deux tâches sont « à valider par Louis », et une ligne en attente cite chacune.
- **Ce qui relie une tâche au reste.** Sur 13 tâches, 8 sont citées par un point du journal. 3 sont citées dans l'objet d'un commit, par 3 commits sur 61. Deux autres commits nomment la tâche 7 dans leur texte sans la faire avancer. 4 tâches donnent un commit pour preuve, et git retrouve les quatre. Aucune des 7 décisions ne cite une tâche. Le journal cite le fichier d'une décision dans un point qui cite les tâches 1 et 2.
- **Les réglages.** Aucun des 29 répertoires ne porte la section « Réglages » dans ses consignes.
- **Les sessions.** La liste se trie sur les sessions de Claude Code. La dernière session de ce dépôt y date de 235 jours, et son dernier commit date du jour. Le projet pilote n'y a aucune session.
- **Le poids du retrait.** Les fichiers que suppriment les morceaux 1 et 2 pèsent 69 203 et 32 502 caractères.
- **Les contrôles.** `pnpm exec vitest run` compte 283 tests dans 5 fichiers. `tsc`, ESLint et la commande de contrôle du dossier passent.

## Choix validés par Louis

Louis les a validés tous les sept par un « ok », le 24 novembre.

1. **Ce qui part.** Toutes les pages actuelles partent, sauf Settings. La décision du 22 novembre nomme Pipeline, Audits et la lecture de `state.json`. S'y ajoutent Overview, Activity, Decisions & Vault, la page actuelle d'un projet, les graphiques de tokens, le score de santé, les steering docs et le suivi de Ralph. Codex et Claude Code montrent déjà les sessions, et ccusage compte les tokens.
2. **Les projets affichés.** Un projet est un répertoire qui existe, affiché une seule fois même quand deux chemins y mènent. Les projets qui ont un dossier viennent en premier. Les dépôts git sans dossier suivent dans une liste repliée. Les autres répertoires sortent de la liste. Sur le relevé, 101 entrées donnent 10 projets, 2 avec un dossier et 8 sans.
3. **Un dossier rangé ailleurs.** Un répertoire ajouté dans Settings qui porte lui-même un `PLAN.md` devient un projet. Le dossier de la refonte du toolkit s'affiche dès que son chemin y est ajouté.
4. **« À toi ».** L'écran réunit les lignes « Ce qui attend » de tous les projets et les tâches « à valider » qu'aucune ligne ne cite. La première ligne de chaque projet monte en haut, la demande la plus ancienne d'abord. Les autres suivent sous « Ensuite », car l'agent d'un projet propose une ligne à la fois. L'écran est en lecture seule, et Louis répond dans la conversation du projet.
5. **Les décisions d'une tâche.** Dans le format, une décision se rattache au projet. La page d'un projet les liste toutes. Une tâche affiche celles dont le fichier est cité dans sa ligne du plan ou dans un point du journal qui la cite.
6. **L'allure.** Les écrans reprennent la maquette de la page de vision (`~/.claude/vault/ideas/vision-poste-de-pilotage.html`), avec ses trois polices, son thème clair et son thème sombre. Leurs textes sont en français.
7. **Les réglages.** Leur lecture devient la tâche 9 du plan. Aucun projet de la machine n'en porte encore, et les trois écrans s'en passent.

## Les cinq morceaux

Chaque morceau part d'une branche `codex/`, finit par une PR et cite la tâche dans l'objet de ses commits, par exemple `Remove the pages of the V4 toolkit (task 7)`.

| # | Morceau | Fini quand |
|---|---|---|
| 1 | **Retirer les anciennes pages.** | `/` et `/settings` répondent 200, et `/pipeline`, `/audits`, `/activity` et `/decisions` répondent 404. |
| 2 | **Retirer leurs lectures et resserrer la liste.** | Sur la machine de Louis, la liste rend les seuls projets à afficher, 10 au relevé, sans lancer `gh`. |
| 3 | **L'écran « À toi ».** | L'accueil affiche les lignes en attente de ce dépôt et du projet pilote, la demande la plus ancienne en haut. Sans aucune ligne, il affiche « Rien ne t'attend. » |
| 4 | **L'écran « Projets ».** | Chaque projet a sa carte, avec son état, sa suite, son dernier passage et ses lignes en attente. Un `PLAN.md` abîmé affiche un message sur sa carte, et le reste de la page s'affiche. |
| 5 | **La page d'un projet.** | Sur ce dépôt, la tâche 5 affiche ses points du journal, les deux commits qui la citent et sa preuve retrouvée dans git. Sur un dossier d'essai, un commit donné pour preuve et absent du dépôt est signalé. |

Une fonction, un type ou une constante que plus rien n'appelle part dans le morceau qui lui retire son dernier appel.

### Morceau 1. Retirer les anciennes pages

| Fichier | Ce qui change |
|---|---|
| `src/app/pipeline/`, `audits/`, `activity/`, `decisions/`, `project/` | Supprimés |
| `src/app/api/ralph-stream/`, `notify/`, `sparklines/` | Supprimés |
| `src/components/charts/` | Supprimé, avec ses trois graphiques |
| `src/components/dashboard/` | `decision-filter`, `feature-modal`, `metric-card`, `period-selector`, `pipeline-board`, `ralph-tracker`, `sidebar-sparklines` et `tab-badge` sont supprimés |
| `src/app/page.tsx` | Garde la liste des projets, avec le nom et le chemin de chacun |
| `src/components/dashboard/sidebar.tsx` | Garde l'accueil et Settings |
| `package.json`, `pnpm-lock.yaml` | `recharts` et `chokidar` partent |

La page d'accueil garde son filtre actuel jusqu'au morceau 2. Les 283 tests passent toujours, car aucun ne couvre ces pages.

Le 24 novembre, aucune page n'appelle `RalphTracker`, `TabBadge`, `deriveAlerts`, la route `notify` ni `readTasks` de `scanner.ts`. La route `ralph-stream` sert le seul `RalphTracker`.

### Morceau 2. Retirer leurs lectures et resserrer la liste

| Fichier | Ce qui change |
|---|---|
| `src/lib/parsers/` | `state.ts`, `ralph.ts`, `jsonl.ts`, `markdown.ts` et `steering.ts` sont supprimés. `dossier.ts` et `frontmatter.ts` restent |
| `src/lib/data/alerts.ts`, `src/lib/constants.ts` | Supprimés |
| `src/lib/data/scanner.ts` | `discoverProjects` applique les règles de la liste. L'état de CI, le compte des PR, la branche, le score de santé, les sessions, `readTasks`, `collectAgentMessages` et `getDashboardMetrics` partent |
| `src/lib/types.ts` | `Project` garde `name`, `path`, `encodedPath`, `lastActivity` et `dossier`, et gagne `isGitRepository: boolean`. Les types des lectures retirées partent |
| `src/lib/utils.ts`, `src/lib/config.ts` | `formatTokenCount`, `estimateCost`, `formatCost`, `HISTORY_FILE` et `TASKS_DIR` partent |
| `src/app/page.tsx` | Affiche la liste rendue, un projet par ligne |
| `src/__tests__/` | `parsers.test.ts` et `fixtures/valid-state.json` sont supprimés. `scanner.test.ts` couvre les règles de la liste. `config.test.ts` perd les tests de `estimateCost` et de `formatCost` |

**Les règles de la liste.**

1. Un projet vient de trois sources. Ce sont une entrée de `~/.claude/projects`, un dépôt git placé directement dans un répertoire configuré, et un répertoire configuré qui porte lui-même un `PLAN.md`.
2. Un répertoire disparu sort de la liste.
3. Deux chemins qui mènent au même répertoire donnent un seul projet. Le répertoire se reconnaît à son numéro de périphérique et à son numéro d'inode, ce qui couvre un lien symbolique et un chemin écrit avec d'autres majuscules.
4. Un projet s'affiche quand il a un `PLAN.md` ou un `JOURNAL.md`, ou quand il est la racine d'un dépôt git.
5. Les projets qui ont un dossier viennent en premier, du dernier passage le plus récent au plus ancien. Le dernier passage est la date de la dernière séance du journal, sinon la date de l'état. Les dépôts sans dossier suivent, du dernier commit le plus récent au plus ancien.

**Cas à tester.**

- Une entrée dont le répertoire a disparu est absente de la liste.
- Un répertoire atteint par deux entrées, dont l'une passe par un lien symbolique, sort une fois.
- Un répertoire sans dossier et sans `.git` est absent. Avec un `.git`, il est présent. Avec un `PLAN.md` seul ou un `JOURNAL.md` seul, il est présent.
- Un répertoire configuré qui porte un `PLAN.md` est un projet. Un dépôt git placé dans un répertoire configuré en est un aussi, un cas couvert jusqu'ici par le seul essai sur la vraie machine.
- L'ordre suit la règle 5, avec un projet sans journal et deux dépôts sans dossier.
- `discoverProjects` ne lance jamais `gh`.
- Chaque projet affiché garde son dossier, comme dans les tests de la tâche 3.

Le compte rendu donne le nombre de projets rendus sur la vraie machine et le temps de `discoverProjects`, à comparer aux 3,1 secondes du relevé.

### Morceau 3. L'écran « À toi »

| Fichier | Contenu |
|---|---|
| `src/lib/data/waiting.ts` | `listWaitingCards(projects: Project[]): WaitingCard[]` et `listBrokenPlans(projects: Project[]): Project[]` |
| `src/lib/types.ts` | `WaitingCard` |
| `src/app/page.tsx` | L'écran « À toi » |
| `src/app/layout.tsx`, `src/app/globals.css`, `src/components/dashboard/sidebar.tsx` | Les polices, les couleurs et la navigation de la maquette |
| `src/__tests__/waiting.test.ts` | Les tests |

```ts
/** One thing waiting for a person, read in the PLAN.md of a project */
export interface WaitingCard {
  projectName: string
  /** encodedPath of the project */
  projectId: string
  kind: 'waiting_line' | 'task_to_validate'
  /** The line as written, or the title of the task */
  text: string
  requestedOn: string | null
  addressee: string | null
  taskNumbers: number[]
  /** True for the first card of its project, the one its agent proposes now */
  isNext: boolean
}
```

**Les règles.**

1. Chaque ligne de « Ce qui attend » donne une carte, dans l'ordre du fichier.
2. Une tâche « à valider » qu'aucune ligne en attente ne cite donne une carte après les lignes de son projet. Son texte est le titre de la tâche, et la personne attendue est celle qui valide.
3. La première carte de chaque projet porte `isNext`.
4. Les cartes `isNext` viennent en premier, de la demande la plus ancienne à la plus récente, les cartes sans date en dernier. Les autres suivent, projet par projet dans le même ordre, puis dans l'ordre du fichier.
5. `listBrokenPlans` rend les projets qui ont un `PLAN.md` ou un `JOURNAL.md` et dont le plan porte un manque de gravité `error`.

**L'écran.**

- Le titre compte les cartes du haut, comme « Deux gestes t'attendent ». Sans carte, il dit « Rien ne t'attend. »
- Une carte montre le nom du projet, le texte de la ligne, la date de la demande avec le nombre de jours écoulés, la personne attendue et les tâches citées. Une ligne sans date le dit.
- Les cartes qui suivent sont rangées sous « Ensuite », par projet.
- Pour chaque projet que rend `listBrokenPlans`, une ligne sous les cartes nomme ce projet et donne le message de sa première erreur, car ses lignes en attente peuvent manquer.
- La navigation propose « À toi » avec le nombre de cartes du haut, « Projets » et la page Settings. Celle-ci garde son contenu et prend le nom « Configuration », pour la distinguer des réglages d'un projet. Une requête lit les projets une seule fois.
- Dans un texte lu dans un dossier, le code et le gras s'affichent mis en forme. Le reste s'affiche tel qu'il est écrit.

**Cas à tester.**

- Deux projets avec des lignes sortent leur première carte en haut, la demande la plus ancienne d'abord, et une carte sans date passe après.
- Une tâche « à valider » citée par une ligne ne donne aucune carte de plus. La même tâche sans ligne qui la cite donne une carte après les lignes.
- Une section « Ce qui attend » qui dit « Rien. » ne donne aucune carte.
- Un projet sans dossier ne donne ni carte ni message. Un projet dont le `PLAN.md` a perdu sa section « Ce qui attend » donne le message.
- Sans aucun projet, la liste est vide.
- Mille lignes en attente dans un même plan sortent toutes, dans l'ordre.

### Morceau 4. L'écran « Projets »

| Fichier | Contenu |
|---|---|
| `src/lib/data/summary.ts` | `summarizeProject(project: Project): ProjectSummary` |
| `src/lib/types.ts` | `ProjectSummary` |
| `src/app/projects/page.tsx` | L'écran « Projets » |
| `src/__tests__/summary.test.ts` | Les tests |

```ts
/** What the card of a project shows, taken from its dossier */
export interface ProjectSummary {
  name: string
  /** encodedPath of the project */
  id: string
  path: string
  hasDossier: boolean
  stateDate: string | null
  /** Text of the state point labelled "En cours", otherwise of the first state point */
  stateText: string | null
  /** First task in progress, otherwise first task to validate, otherwise first task to do */
  nextTask: DossierTask | null
  /** Date of the latest journal session, otherwise the state date */
  lastSessionOn: string | null
  waitingCount: number
  errorCount: number
  warningCount: number
  /** Message of the first error, shown on the card */
  firstError: string | null
}
```

**L'écran.**

- Une carte par projet qui a un dossier, dans l'ordre de la liste. Elle montre le nom, l'état, la suite, le dernier passage et le nombre de lignes en attente.
- Un dossier qui porte une erreur de format affiche sur sa carte le nombre d'erreurs et le message de la première. La carte montre aussi tout ce que le lecteur a pu lire. Les points à compléter s'affichent en nombre.
- Les dépôts sans dossier sont dans une liste repliée, avec leur nom, leur chemin et la date de leur dernier commit. La liste rappelle la phrase qui pose un dossier, « mets en place le suivi ».

**Cas à tester.**

- Un dossier complet remplit tous les champs.
- Un `PLAN.md` dont un titre est renommé donne une erreur, son message et le reste du dossier. Le résumé d'un autre projet lu en même temps reste entier.
- Un `PLAN.md` vide et un `PLAN.md` qui n'est pas en UTF-8 donnent chacun une erreur et leur message.
- Un état sans point « En cours » donne son premier point. Un état sans point donne `null`.
- Sans tâche en cours, la suite est la première tâche à valider, sinon la première à faire. Quand tout est fait, elle vaut `null`.
- Sans journal, le dernier passage est la date de l'état.
- Le nombre de lignes en attente est celui des cartes que rend `listWaitingCards` pour ce projet.
- Un dépôt sans dossier a `hasDossier` à `false`.

### Morceau 5. La page d'un projet

| Fichier | Contenu |
|---|---|
| `src/lib/data/git.ts` | La lecture de git pour un projet |
| `src/lib/data/evidence.ts` | `listTaskEvidence`, qui rend un `TaskEvidence` par tâche |
| `src/lib/data/scanner.ts` | `buildProject` ajoute les deux manques tirés de git à ceux du dossier |
| `src/lib/types.ts` | `GitCommit`, `TaskEvidence` et deux valeurs de `DossierGapKind` |
| `src/app/project/[id]/` | La page et sa page 404 |
| `src/__tests__/` | Les tests de `git.ts` et de `evidence.ts` |
| `README.md`, `CLAUDE.md` | Décrivent les trois écrans et la nouvelle arborescence |

```ts
export interface GitCommit {
  hash: string
  /** Commit day, YYYY-MM-DD */
  date: string
  subject: string
  /** Task numbers cited in the subject, as "(task 2)" or "(tasks 5 and 6)" */
  taskNumbers: number[]
}

/** What the project page shows under one task */
export interface TaskEvidence {
  task: DossierTask
  /** Journal points citing the task, newest session first */
  journalPoints: Array<{ date: string; point: DossierPoint }>
  /** Commits whose subject cites the task */
  commits: GitCommit[]
  /** Decisions whose file is cited in the plan row or in one of these journal points */
  decisions: DossierDecision[]
  /** The commit given as proof, when git finds it */
  proofCommit: GitCommit | null
}
```

**Les règles.**

1. Git se lit quand le répertoire du projet est la racine de son propre dépôt, comme dans la commande de contrôle. Un dossier rangé dans le dépôt d'un autre projet sort sans commit et sans manque tiré de git.
2. `state_behind_last_commit` se signale quand le dernier commit est plus récent que la date de l'état. `proof_commit_not_found` se signale quand l'état d'une tâche faite donne `commit` suivi de 7 à 40 chiffres hexadécimaux et que git ne trouve pas ce commit. Ce sont deux points à compléter de source `plan`, avec les phrases de la commande.
3. Un commit se rattache à une tâche quand son objet la cite, écrite « task 2 », « tasks 5 and 6 », « tâche 2 » ou « tâches 2 et 3 », sans tenir compte de la casse. Le texte qui suit l'objet reste hors de cette lecture.
4. Un point du journal se rattache aux tâches de son champ `taskNumbers`.
5. Une décision qui a son propre fichier se rattache à une tâche quand la ligne de la tâche dans le plan, ou un point du journal rattaché à cette tâche, cite le chemin ou le nom de ce fichier.
6. La lecture s'arrête aux 2 000 commits les plus récents.
7. Quand git manque ou échoue, le projet sort sans commit et sans manque tiré de git, et la page s'affiche.

**La page.**

- L'en-tête donne le nom, le chemin et le dernier passage.
- « Où en est le projet » reprend la date et les points de l'état. « Ce qui attend » reprend les lignes en attente.
- Chaque tâche montre son numéro, son titre, son « Fini quand », son état, la personne qui valide, la date où elle a été faite et sa preuve. Elle s'ouvre sur ses points du journal, ses commits et ses décisions.
- Suivent le journal, toutes les décisions du projet, puis les manques du dossier, les erreurs avant les points à compléter.
- Un projet sans dossier le dit et rappelle la phrase « mets en place le suivi ».
- Les cartes des deux autres écrans mènent à cette page, et une tâche citée mène à sa ligne.

**Cas à tester.**

- Une tâche citée dans deux séances sort ses deux points, la séance la plus récente d'abord.
- Un commit dont l'objet cite « tasks 5 and 6 » se rattache aux deux tâches. La forme française se lit aussi. Un commit qui cite la tâche dans son texte seul reste hors de la liste.
- Une preuve écrite `commit 1a2b3c4` rend ce commit quand git le trouve. Sinon le manque `proof_commit_not_found` nomme la tâche et le commit.
- Un état daté d'avant le dernier commit donne `state_behind_last_commit`.
- Un dossier rangé dans le dépôt d'un autre projet sort sans commit et sans manque tiré de git.
- Une décision citée par son chemin dans la ligne de la tâche s'y rattache. Une décision citée dans un point du journal rattaché à la tâche s'y rattache aussi. Une décision de `DECISIONS.md` reste dans la seule liste du projet.
- Sans git sur la machine, la page s'affiche avec le dossier lu.
- Un identifiant inconnu donne la page 404.

Les tests simulent `node:child_process`, comme `scanner.test.ts`. Sur la vraie machine, le nombre d'erreurs et de points à compléter de ce dépôt et du projet pilote se compare à celui de la commande, contrôles git compris.

## Règles du dépôt

- TypeScript strict, ES modules, `async` et `await`, aucun `any`, aucun `console.log`. Les commentaires sont en anglais comme dans le reste du code.
- Aucune dépendance nouvelle. Les polices passent par `next/font/google`, comme Geist aujourd'hui.
- Chaque règle de ce brief vit dans une fonction de `src/lib/data/`, avec ses tests. Une page range ce que ces fonctions rendent.
- Un texte lu dans un dossier s'affiche comme du texte. Aucune page n'injecte de HTML venu d'un fichier, car le dashboard lit aussi des dépôts clonés.
- Les tests suivent `.claude/rules/tests.md`, et les écrans suivent `.claude/rules/accessibility.md`. Chaque écran se parcourt au clavier et tient sur un écran étroit sans défilement horizontal.
- Le dépôt est public. Aucun texte ni aucun nom d'un vrai projet de Louis n'entre dans un fichier. Les dossiers d'essai sont inventés, et le projet où le format a été essayé s'appelle « le projet pilote ».
- Chaque PR met à jour `PLAN.md` et `JOURNAL.md`. L'agent la fusionne quand ses contrôles passent, puis rend compte (`vault/decisions/2026-11-23-fusion-par-l-agent.md`).
- La documentation d'une bibliothèque se lit par Context7.

## Vérification

```bash
pnpm exec vitest run
pnpm exec tsc --noEmit
pnpm lint
python3 "$HOME/.claude/scripts/check-dossier.py" . --strict
git diff main...HEAD | wc -c
```

Les quatre premières commandes passent, et la dernière rend moins de 150 000.

Chaque morceau qui touche un écran s'ouvre aussi dans un navigateur, sur la vraie machine. Le compte rendu donne le code de réponse de chaque adresse et une capture de chaque écran en thème clair, en thème sombre et sur un écran étroit. Les captures montrent de vrais projets et restent hors du dépôt.

Pour les morceaux 2 à 5, un fichier de test temporaire lance les fonctions du morceau sur la vraie machine et relève ce qu'elles rendent. Ce fichier est supprimé avant le compte rendu.

## Compte rendu attendu

- La liste des fichiers créés, modifiés ou supprimés.
- Le résultat des cinq commandes, avec le nombre de tests et la taille du diff.
- Ce que rend l'essai sur la vraie machine, et les captures des écrans touchés.
- Les choix faits là où ce brief se tait, et tout écart par rapport à lui.
- Ce qui reste douteux ou non vérifié.

## Ce qui vient avec une autre tâche

- **Les réglages d'un projet.** La section « Réglages » des consignes et le réglage « Dossier » se lisent avec la tâche 9.
- **Le travail à plusieurs.** Le tri de « À toi » par personne vient avec la tâche 8.
- **Agir depuis le dashboard.** Répondre à une ligne, cocher une tâche ou ouvrir la session d'un projet dans Codex ou Claude Code demandent une décision à part.
- **Le reste de la page de vision.** Les écrans des agents au travail, des rituels et du radar, les cartes « décision », « preuve » et « comprendre », les durées, les sept étapes d'un projet et le plan en kanban attendent que le dossier les porte.
- **Poser un dossier.** Un projet sans dossier le reçoit du skill `demarrer`, dans sa propre conversation.
- **Les majuscules dans un chemin.** Le décodeur de chemins les compare telles qu'elles sont écrites, une limite notée dans `PLAN.md`.
- **Les en-têtes YAML.** Les écarts 12 à 14 de `tasks/ecarts-format-dossier.md` se corrigent à part.

## Trois ajouts possibles

Louis choisit ceux qu'il veut. Sans réponse, le travail part sans eux. Son « ok » du 24 novembre n'en nomme aucun, donc le premier morceau part sans eux.

1. **Un relevé de trois matins.** Chaque matin, Louis ouvre « À toi » et note s'il a su quoi faire sans ouvrir de conversation. C'est la mesure du « Fini quand » de la tâche.
2. **Une cible de temps.** « À toi » répond en moins de 2 secondes sur la machine de Louis, et un morceau qui la manque le dit.
3. **Des dossiers abîmés sur chaque écran.** Un plan vide, un tableau sans colonne « État », mille lignes en attente et un fichier qui n'est pas en UTF-8 sont rejoués sur les trois écrans.

## Trouvé en préparant ce brief

- **La commande suit le lecteur.** Le projet `.claude` a aligné sa commande le 24 novembre (commit `731e5f0` du toolkit). Relancée le soir même, la comparaison concorde sur ses 16 dossiers d'essai.
- **Trois en-têtes YAML divergent.** Le lecteur date du 2 mars une décision dont l'en-tête écrit `date: 2026-02-30`. Les trois cas sont dans `tasks/ecarts-format-dossier.md`, écarts 12 à 14.
- **Le dossier d'exemple a changé.** Celui du toolkit porte maintenant un `AGENTS.md` avec ses réglages. La copie de `src/__tests__/fixtures/dossier/valid/` le recevra avec la tâche 9.
