# Brief — Claude Toolkit Dashboard
> Date : 2026-04-02
> Auteur : Louis (LouisG)
> Statut : draft

## Résumé exécutif

Dashboard web local (Next.js 16) qui visualise les données du Claude Code Toolkit : pipeline des features, scores d'audit, décisions, métriques d'activité. Lit les fichiers du toolkit (state.json, vault/, tasks/, steering/) via Server Components. Le projet est déjà implémenté à ~90% — il reste de la finition, des corrections critiques, et la mise en place de tests.

## Analyse produit

**Alignement vision :** Fort — c'est la raison d'être du repo, pas une feature annexe.

- **Personas :** Développeur solo utilisant Claude Code quotidiennement (Louis). Secondaire : tech lead supervisant plusieurs projets Claude Code.
- **Parcours principal :** `pnpm dev` → localhost:3000 → dashboard overview (métriques clés) → navigation vers pipeline/audits/decisions/activity pour le détail.
- **Impact productivité :** Élevé — remplace la lecture manuelle de 5-10 fichiers éparpillés. Gain estimé : 5-15 min/jour. Permet de détecter des dérives (scores d'audit en baisse, décisions qui s'accumulent).
- **Priorité :** P0 — core product.

### Risques produit

- **Couplage fort** avec la structure `~/.claude/` qui est un détail d'implémentation interne d'Anthropic, sans contrat d'API
- **Scope creep** : tentation d'ajouter de l'écriture (éditer décisions, modifier PRDs) alors que la valeur est dans la lecture
- **Usage réel** : si le dev ne lance pas le dashboard, zéro valeur

## Analyse technique

**Architecture :** Monolithe Next.js local (Pattern 1). Server Components pour la lecture filesystem, Client Components (`"use client"`) uniquement pour les charts Recharts et la sidebar interactive. Pas de DB, pas d'auth, read-only.

- **Stack :** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript strict + Tailwind 4 + Recharts 2.x + Lucide React
- **Modules existants :** 5 pages, 3 parsers, 1 scanner, 2 charts, layout complet, 9 interfaces typées
- **Complexité restante :** S→M (Small à Medium avec les correctifs)
- **Dépendances :** aucune supplémentaire requise (+ Vitest pour les tests)
- **Estimation révisée :** 1-2 sessions (~6-8h avec tests et correctifs)

### Ce qui manque

| Élément | Effort | Priorité |
|---------|--------|----------|
| Fix `decodeProjectPath` (bug tirets) | 30min | Critique |
| Setup Vitest + tests parsers/scanner | 2-3h | Haute |
| Validation de schéma sur les parsers (pas de `as` aveugle) | 1-2h | Haute |
| Empty states avec diagnostic (pas juste "0") | 1h | Moyenne |
| Parser steering/ | 30min | Moyenne |
| Filtrage interactif (decisions) | 1h | Basse |
| Auto-refresh / revalidation | 30min | Basse |
| Accessibilité (skip-to-content, aria-labels, focus) | 1h | Moyenne |

## Contexte existant

### Code en place
- **Pages :** Overview, Pipeline (kanban 3 colonnes), Audits (scores + blockers), Decisions (vault par type), Activity (tokens, sessions)
- **Parsers :** state.ts (ProjectState JSON), jsonl.ts (SessionEntry, AgentMessage), markdown.ts (vault frontmatter via gray-matter)
- **Data layer :** scanner.ts — découverte dynamique projets dans `~/.claude/projects/`, agrégation métriques, historique sessions
- **Types :** ProjectState, Feature, SessionEntry, AgentMessage, Task, VaultEntry, Project, DashboardMetrics
- **Composants :** MetricCard, Sidebar, TokenUsageChart (AreaChart), PipelineChart (BarChart)

### Brief existant
`tasks/toolkit-dashboard-brief.md` — brief initial avec personas, sources de données, risques.

## État de l'art

- **Pattern dominant 2026 :** Next.js + shadcn/ui + Tailwind pour les dashboards. Server Components comme architecture de base.
- **Lecture filesystem :** `fs.readFile` directement dans les Server Components async, gray-matter pour le frontmatter markdown.
- **Charts :** Recharts avec `<ResponsiveContainer>` obligatoire, `"use client"` sur les composants chart.
- **Tailwind 4 :** Config CSS-native via `@theme` au lieu de tailwind.config.js.

## Risques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| `decodeProjectPath` casse sur dossiers avec tirets | **H** | **H** | Fix immédiat — revoir la logique de décodage |
| Format `~/.claude/` change entre versions Claude Code | **M** | **H** | Validation de schéma + tests sur les parsers + empty states avec diagnostic |
| Parsing `as Type` aveugle masque les erreurs | **H** | **M** | Remplacer par validation runtime (zod ou vérification manuelle) |
| `history.jsonl` dépasse 100MB après 6 mois d'usage | **M** | **M** | Lecture par stream/lignes, déjà mitigé par limitDays=30 |
| Dashboard affiche "0" sans distinguer "rien" de "cassé" | **H** | **M** | Empty states avec message de diagnostic |

## Recommandation

**GO — avec prérequis**

Le produit est fonctionnel à 90%. Avant de finir l'UI, il faut corriger le bug `decodeProjectPath`, installer Vitest, et écrire des tests sur les parsers. Ce sont les fondations sans lesquelles le dashboard ment silencieusement.

## Stack et architecture recommandées

**Stack :** Next.js 16 + React 19 + TypeScript + Tailwind 4 + Recharts (déjà en place)
**Architecture :** Monolithe local, Server Components pour le data fetching filesystem
**Justification :** Dashboard local read-only sans auth ni DB — un monolithe Next.js est le choix le plus simple et suffisant. Pas besoin de séparer front/back.

## Prochaine étape

→ `/prd tasks/toolkit-dashboard-kickoff.md` pour spécifier les features restantes
→ Priorité immédiate : fix `decodeProjectPath` + setup Vitest + tests parsers
