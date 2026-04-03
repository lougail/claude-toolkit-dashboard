# Ralph Agent — Dashboard v2

## Contexte projet

Tu travailles sur **claude-toolkit-dashboard**, un dashboard Next.js local qui visualise les donnees du Claude Code Toolkit.

### Stack
- Next.js 16 (App Router, Turbopack)
- React 19 + TypeScript strict
- Tailwind CSS 4 (config CSS-native via @theme)
- Recharts 2.x (charts)
- Lucide React (icones)
- Vitest (tests)
- chokidar (a installer pour le filesystem watcher)

### Architecture existante
```
src/
├── app/              # Pages (App Router, Server Components)
│   ├── page.tsx      # Overview (Mission Control dans v2)
│   ├── pipeline/     # Feature pipeline
│   ├── audits/       # Audit scores
│   ├── decisions/    # Vault entries
│   └── activity/     # Token usage + sessions
├── components/
│   ├── charts/       # Recharts (use client)
│   └── dashboard/    # MetricCard, EmptyState, Sidebar, DecisionFilter, RefreshIndicator
└── lib/
    ├── config.ts     # Paths, decodeProjectPath
    ├── data/scanner.ts  # discoverProjects, getDashboardMetrics, collectAgentMessages
    ├── parsers/      # state.ts, jsonl.ts, markdown.ts, steering.ts
    ├── types.ts      # Interfaces centralisees
    └── utils.ts      # cn, formatRelativeTime, formatTokenCount
```

### Branche
Travaille sur la branche `ralph/dashboard-v2`.

### Conventions
- ES modules (import/export), jamais CommonJS
- TypeScript strict — pas de `any`, pas de `as` sans type guard
- async/await
- Tailwind pour le styling, Lucide pour les icones
- Server Components par defaut, `"use client"` uniquement pour les composants interactifs/charts
- Tests Vitest pour tous les parsers et la logique metier
- Commits en anglais, concis

### Regles de qualite
- `pnpm lint` doit passer (0 erreur)
- `pnpm test` doit passer (tous les tests)
- `pnpm build` doit compiler
- Pas de Date.now() dans les Server Components (violates react-hooks/purity)
- Contraste minimum 4.5:1 (utiliser text-zinc-500 pas text-zinc-600)
- aria-labels sur les sections, charts, boutons toggle
- Type guards dans les parsers (pas de `as Type` aveugle)
- Empty states contextuels (pas juste "No data")

### Sources de donnees
Toutes les donnees viennent du filesystem local (pas de DB). Les parsers existants dans `lib/parsers/` gerent deja :
- `state.ts` — ProjectState depuis .claude/state.json
- `jsonl.ts` — SessionEntry, AgentMessage depuis history.jsonl
- `markdown.ts` — VaultEntry depuis vault/**/*.md
- `steering.ts` — SteeringDoc depuis steering/*.md

### PRD
Lis `tasks/prd-dashboard-v2.md` pour les specs completes.
Lis `.ralph/dashboard-v2/fix_plan.md` pour les taches ordonnees.
Lis `.ralph/dashboard-v2/specs/requirements.md` pour les exigences.
