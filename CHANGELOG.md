# Changelog

## [Unreleased] — 2026-04-03

### Added
- Mission Control: project cards with git branch, CI status, PRs, dirty files, health score (`c5828c4`, `42fe0a3`, `e8d6de3`, `0f0be59`)
- Feature Timeline: 6-column kanban (Idea → Done) with project filter and feature detail modal (`f8f49ff`, `d4be98a`)
- Metrics & Cost: token/session charts, Opus cost estimation, period selector 7/14/30/90d, sidebar sparklines (`fa1c04a`, `6e7ff16`)
- Ralph real-time tracking via SSE (chokidar filesystem watcher), macOS notifications on status transitions (`9850df2`, `d4be98a`)
- Notifications: alerts section, browser tab badge, osascript integration (`cd0f688`)
- Multi-project config with settings page (`f9634cc`)
- Project detail page `/project/[id]` with consolidated view (`d4be98a`)
- Centralized feature status constants in `lib/constants.ts` (`112040c`)
- Shared `exists()` utility in `lib/fs.ts` (`112040c`)
- Vitest setup with 39 tests covering parsers, config, ralph, cost (`00ce7e0`)
- Claude Code Toolkit infrastructure: agents, rules, steering docs, vault (`f9d8c4c`)

### Changed
- Pipeline upgraded from 3 to 6 columns with v2 statuses (`f8f49ff`)
- Projects list filtered to active only with counter (`f138425`)
- State parser normalizes legacy statuses (planning→prd, in-progress→building, shipped→done) (`112040c`)
- Health score uses weighted checks (CI passing worth more, tests high-value) (`0f0be59`)

### Fixed
- `decodeProjectPath` handles hyphens in folder names via greedy filesystem decoding (`00ce7e0`)
- Runtime validation (type guards) replaces blind `as Type` casts in all parsers (`00ce7e0`, `e4d2443`)
- SSE chokidar cleanup leak: watcher properly closed on client disconnect (`112040c`, `cf2d6a4`)
- SSE race condition: cancelled flag prevents orphaned watchers (`cf2d6a4`)
- Double `discoverProjects()` call eliminated via `preloadedProjects` param (`8b1e2a7`)
- Accessibility: skip-to-content, focus-visible, aria-labels, contrast 4.5:1, single H1 (`9244ae8`)
- Security headers: CSP, X-Frame-Options, nosniff in next.config (`9244ae8`)
- ESLint `Date.now()` purity violation in Server Components (`9244ae8`)
- Agent messages memory cap (50k) with early exit (`e4d2443`)

### Security
- Input validation on `decodeProjectPath` (reject empty/short paths) (`e4d2443`)
- Type guard on `readTasks` replacing blind cast (`8b1e2a7`)
