<p align="center">
  <h1 align="center">Claude Code Toolkit Dashboard</h1>
  <p align="center">
    Local visual companion for the <a href="https://github.com/lougail/claude-toolkit">Claude Code Toolkit</a>
    <br />
    <strong>Multi-project overview &middot; Feature pipeline &middot; Token metrics &middot; Ralph tracking</strong>
  </p>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#pages">Pages</a> &middot;
  <a href="#architecture">Architecture</a> &middot;
  <a href="#contributing">Contributing</a>
</p>

---

## Why

The Claude Code Toolkit generates structured data across all your projects: PRDs, vault entries, audit reports, session history, Ralph progress. But this data lives in scattered files with no unified view.

The dashboard reads these files and turns them into a persistent visual cockpit you keep open alongside your terminal. It does what the CLI can't: show multiple projects at once, track trends over time, and monitor background agents in real time.

**Principle:** the CLI remains the command center. The dashboard is read-only — it never writes to your projects.

## Quick Start

```bash
git clone https://github.com/lougail/claude-toolkit-dashboard
cd claude-toolkit-dashboard
pnpm install
pnpm dev
# Open http://localhost:3000
```

The dashboard auto-discovers projects from `~/Developer/` and `~/.claude/projects/`. Configure directories in the Settings page.

### Requirements

- Node.js 20+
- pnpm 9+
- [Claude Code Toolkit](https://github.com/lougail/claude-toolkit) (for data to visualize)

## Pages

### Mission Control

The home page. A grid of every active project with live indicators:

| Indicator | Source |
|-----------|--------|
| Git branch + dirty files | `git status` |
| CI status (passing/failing/pending) | `gh run list` |
| Open PRs | `gh pr list` |
| Health score | Weighted check: state, vault, steering, tests, CI, audit |
| Last activity | `git log` timestamp |

Click any project card to open its detail page — a consolidated view of features, steering docs, recent sessions, and vault entries.

### Feature Pipeline

A 6-column kanban board tracking features through the development workflow:

```
Idea  →  PRD  →  Building  →  Review  →  Ship  →  Done
```

- Filter by project
- Click a feature card to open a detail modal (PRD link, audit score, Ralph progress, PR number)
- Reads from `.claude/state.json` per project

### Metrics & Cost

Token usage and cost tracking over configurable periods (7 / 14 / 30 / 90 days):

- **Token charts** — input/output tokens per day (Recharts area chart)
- **Session trends** — sessions per project, sessions per day
- **Cost estimate** — cumulative Opus pricing ($15/M input, $75/M output)
- **Sparklines** — 7-day trends in the sidebar for quick glance

### Ralph Tracking

Real-time monitoring of [Ralph](https://github.com/frankbria/ralph-claude-code) agent sessions:

- Progress bar (tasks done / total from `fix_plan.md` checkboxes)
- Live log stream (last lines of `.ralph/live.log`)
- Loop count and last action
- **SSE-powered** — uses chokidar filesystem watcher to push updates instantly
- macOS notification via `osascript` when Ralph completes or blocks

### Decisions & Vault

Aggregated vault entries from all projects, with interactive type filtering:

`Decision` · `Idea` · `Insight` · `Research` · `Journal`

### Settings

Configure which directories the dashboard scans:

- Project directories (default: `~/Developer/`)
- Exclude patterns (default: `node_modules`, `.git`, `dist`, `build`, `.next`)
- Toggle `~/.claude/projects/` scanning
- Persisted to `~/.claude/dashboard/config.json`

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Mission Control (overview)
│   ├── pipeline/           # Feature kanban
│   ├── activity/           # Metrics & cost
│   ├── decisions/          # Vault browser
│   ├── settings/           # Configuration
│   ├── project/[id]/       # Project detail
│   └── api/
│       ├── ralph-stream/   # SSE endpoint (chokidar watcher)
│       ├── notify/         # macOS notification endpoint
│       ├── config/         # Config read/write
│       └── sparklines/     # Sparkline data
├── components/
│   ├── charts/             # Recharts wrappers (token usage, pipeline, sparkline)
│   └── dashboard/          # UI components (metric card, sidebar, filters, modals)
└── lib/
    ├── config.ts           # Path resolution, dashboard config
    ├── constants.ts        # Feature status definitions (single source of truth)
    ├── fs.ts               # Filesystem helpers (server-only)
    ├── types.ts             # All TypeScript interfaces
    ├── utils.ts            # Formatting, cost estimation
    ├── data/
    │   ├── scanner.ts      # Project discovery, health scoring, git/CI detection
    │   └── alerts.ts       # Alert derivation (CI fail, health low, Ralph blocked)
    └── parsers/
        ├── state.ts        # .claude/state.json (with legacy status normalization)
        ├── jsonl.ts        # history.jsonl, agent messages
        ├── markdown.ts     # Vault entries (frontmatter via gray-matter)
        ├── steering.ts     # Steering docs (product.md, tech.md, structure.md)
        └── ralph.ts        # .ralph/ session data
```

### Data flow

```
Filesystem (read-only)          Dashboard
─────────────────────          ─────────
~/.claude/history.jsonl    →   Sessions, token usage
~/.claude/projects/        →   Project discovery
{project}/.claude/state.json → Feature pipeline
{project}/vault/**/*.md    →   Decisions & vault
{project}/steering/*.md    →   Steering docs
{project}/.ralph/          →   Ralph tracking (SSE)
.github/workflows/ + gh    →   CI status, PR count
```

### Key design decisions

| Decision | Rationale |
|----------|-----------|
| Server Components for data fetching | Direct filesystem access, no API layer needed |
| Client Components only for interactivity | Charts (Recharts), filters, modals, SSE connection |
| `force-dynamic` on all pages | Data comes from local filesystem, no static caching |
| No database | Files are the source of truth — zero infrastructure |
| chokidar + SSE for Ralph | Push-based updates, no polling overhead |
| Type guards in all parsers | Runtime validation instead of blind `as Type` casts |

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4 |
| Charts | Recharts 2.x |
| Icons | Lucide React |
| Filesystem watcher | chokidar 5.x |
| Tests | Vitest (39 tests) |

## Scripts

```bash
pnpm dev          # Dev server (Turbopack)
pnpm build        # Production build
pnpm lint         # ESLint
pnpm test         # Vitest
```

## How it was built

This project was built entirely using the Claude Code Toolkit workflow:

```
/setup → /kickoff → /prd → /plan → Ralph → /audit-prd → /review-deep → /ship
```

- 22 commits across v1 and v2
- 39 tests covering all parsers and utilities
- 3 review passes (including 2 triple-blind reviews)
- 2 full audits (security, accessibility, performance, code quality)
- PRD conformity audit at 93%
- All PRDs and audit reports available in `tasks/`

## Known limitations

- **Pipeline kanban requires `state.json`** — this file must be written by toolkit skills (`update-state.sh`, currently being implemented). Other pages work without it.
- **First dev load is slow** — Turbopack compiles on first request (~5-10s). Subsequent loads are instant.
- **`gh` CLI optional** — CI status and PR count degrade gracefully to "unknown" if `gh` is not installed or not authenticated.

## Contributing

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run `pnpm lint && pnpm test && pnpm build`
5. Open a PR

## License

MIT
