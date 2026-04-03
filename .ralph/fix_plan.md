# Ralph Fix Plan — Dashboard v2

## Gap Analysis (v1 → v2 PRD)

### Current State
- Overview page: basic metrics + project grid (no branch/CI/PRs/dirty info)
- Pipeline: 3 columns (planning, in-progress, shipped) — PRD wants 6
- Activity: token charts + sessions — PRD wants cost estimation + period selector
- Audits: flat list of audit results
- Decisions: vault entry browser with filters

### PRD v2 Targets
- US-001: Mission Control — multi-project grid with branch, CI, PRs, dirty files, health
- US-002: Feature Timeline — 6-column kanban (Idée → PRD → Building → Review → Ship → Done)
- US-003: Metrics & Cost — tokens + cost estimation + period selector + sparklines
- US-004: Ralph tracking — real-time SSE with progress bars
- US-005: Notifications — macOS notifications + browser badge + alerts section
- US-006: Configuration — config.json + settings page

## High Priority

- [x] **US-002: Upgrade Pipeline to 6-column kanban** (Loop 1)
  - Extended Feature.status to 6 phases with legacy mapping
  - 6-column responsive layout with icons and horizontal scroll

- [~] **US-001: Enhance Mission Control** (Loop 2 — partial)
  - [x] Added GitInfo type (branch + dirtyCount) to Project
  - [x] getGitInfo() via execFile('git') with 3s timeout
  - [x] Project cards show branch name + dirty file count
  - [x] CI status indicator (.github/workflows detection + gh run status)
  - [ ] PR count per project
  - [ ] Improve health score with more granular checks

- [~] **US-003: Cost estimation & period selector** (Loop 3 — partial)
  - [x] estimateCost() + formatCost() with Opus pricing ($15/M in, $75/M out)
  - [x] PeriodSelector client component (7d/14d/30d via URL search params)
  - [x] Activity page: cost metric card, dynamic period for all data
  - [x] Sessions per day chart respects selected period
  - [ ] Sparklines in global header/sidebar

## Medium Priority

- [x] **US-004: Ralph real-time tracking** (Loop 4)
  - [x] Ralph parser: reads status.json + counts fix_plan.md checkboxes
  - [x] SSE API route (/api/ralph-stream) with chokidar filesystem watcher
  - [x] RalphTracker client component with live updates via EventSource
  - [x] Integrated into Overview page (shows active sessions with progress bars)
  - [x] Live log display for running sessions

- [x] **US-006: Multi-project configuration** (Loop 5)
  - [x] DashboardConfig type (projectDirs, excludePatterns, scanClaudeProjects)
  - [x] Config reader/writer persisted to ~/.claude/dashboard/config.json
  - [x] discoverProjects() scans configured dirs for git repos (one level deep)
  - [x] API route GET/PUT /api/config
  - [x] Settings page with directory list, exclude patterns, scan toggle

## Low Priority

- [ ] **US-005: Notifications**
  - macOS notifications via osascript
  - Browser tab badge for unread alerts
  - Alerts section in Mission Control

## Completed

- [x] Project enabled for Ralph
- [x] Review codebase and understand architecture (Loop 1)
- [x] US-002: 6-column kanban pipeline (Loop 1)
- [x] US-001: Git branch + dirty count in project cards (Loop 2)
- [x] US-003: Cost estimation + period selector on Activity page (Loop 3)
- [x] US-004: Ralph real-time tracking with SSE (Loop 4)
- [x] US-006: Multi-project config + Settings page (Loop 5)

## Notes

- Feature.status type change requires backward compat with existing state.json files
- SSE implementation needs careful cleanup (chokidar watchers, connection handling)
- Cost estimation uses public Anthropic pricing — needs to stay updated
- All data is read-only from local filesystem — no writes to project dirs
