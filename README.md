# Claude Code Toolkit Dashboard

Companion visuel du [Claude Code Toolkit](https://github.com/lougail/claude-toolkit). Un dashboard Next.js local qui montre ce que le CLI ne peut pas faire : vue multi-projets, timeline graphique, metriques temporelles, suivi Ralph en temps reel.

Le CLI reste le centre de commande. Le dashboard est le cockpit qu'on garde ouvert a cote — il lit les memes fichiers (`state.json`, `vault/`, `tasks/`, `history.jsonl`) et les affiche en temps reel.

## Pages

### Mission Control (accueil)

Grille de tous les projets avec : branche git, CI status, PRs ouvertes, dirty files, score de sante (state/vault/steering/tests/CI/audit). Trie par derniere activite. Clic sur un projet pour voir le detail consolide.

### Feature Pipeline (kanban)

6 colonnes : Idea, PRD, Building, Review, Ship, Done. Filtrable par projet. Clic sur une feature pour voir le detail (PRD, audit score, Ralph progress, PR link).

### Metriques et Cout

Courbes tokens input/output sur 7/14/30/90 jours. Sessions par projet et par jour. Cout Opus estime cumule du mois. Sparklines dans la sidebar.

### Ralph Tracking

Progression en temps reel via SSE (filesystem watcher chokidar). Barre de progression des taches, live log, loop count. Notification macOS quand Ralph termine ou bloque.

### Decisions et Vault

Toutes les entries vault de tous les projets, filtrables par type (decision, idea, insight, research, journal).

### Settings

Config des repertoires a scanner, patterns d'exclusion, toggle scan `~/.claude/projects/`.

## Quick start

```bash
git clone https://github.com/lougail/claude-toolkit-dashboard
cd claude-toolkit-dashboard
pnpm install
pnpm dev
```

Le dashboard scanne automatiquement `~/Developer/` et `~/.claude/projects/`. Configurable dans Settings.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript strict
- Tailwind CSS 4
- Recharts
- chokidar (SSE filesystem watcher)
- Vitest (39 tests)

## Comment ca a ete construit

Entierement avec le toolkit, en une session :

```
/setup → /kickoff → /prd → /plan → Ralph → /audit-prd → /review-deep → /ship
```

- 22 commits, 39 tests
- 3 passes de review (dont 2 triple-review aveugle)
- 2 audits (code quality, securite, accessibilite, performance)
- 1 audit-prd (93% conformite)
- PRD v1 + PRD v2 documentees dans `tasks/`

## Note

Le pipeline kanban necessite que `state.json` soit ecrit par les skills du toolkit (`update-state.sh`, fix en cours). Les autres pages (Mission Control, Metriques, Decisions, Ralph) fonctionnent deja avec les fichiers existants.

## Licence

MIT
