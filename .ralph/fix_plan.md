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

- [ ] **US-002: Upgrade Pipeline to 6-column kanban**
  - Extend Feature.status type: idea | prd | building | review | ship | done
  - Map legacy 3 statuses → 6 (planning→prd, in-progress→building, shipped→done)
  - 6-column responsive layout with horizontal scroll on mobile
  - Feature cards: add time-in-column, detail click

- [ ] **US-001: Enhance Mission Control**
  - Add git info per project: current branch, dirty file count
  - Add CI status indicator (read from state.json or .github)
  - Add PR count per project
  - Improve health score with more granular checks

- [ ] **US-003: Cost estimation & period selector**
  - Calculate estimated cost from token usage (Anthropic pricing)
  - Add period selector component (7d / 14d / 30d)
  - Sessions per day chart
  - Sparklines in global header

## Medium Priority

- [ ] **US-004: Ralph real-time tracking**
  - SSE API route with chokidar filesystem watcher
  - Ralph progress component (tasks done/total from fix_plan.md)
  - Active session detection from .ralph/*/status.json
  - Last actions log display

- [ ] **US-006: Multi-project configuration**
  - config.json schema and reader
  - Auto-scan ~/Developer/ with include/exclude patterns
  - Settings page UI

## Low Priority

- [ ] **US-005: Notifications**
  - macOS notifications via osascript
  - Browser tab badge for unread alerts
  - Alerts section in Mission Control

## Completed

- [x] Project enabled for Ralph
- [x] Review codebase and understand architecture (Loop 1)

## Notes

- Feature.status type change requires backward compat with existing state.json files
- SSE implementation needs careful cleanup (chokidar watchers, connection handling)
- Cost estimation uses public Anthropic pricing — needs to stay updated
- All data is read-only from local filesystem — no writes to project dirs
