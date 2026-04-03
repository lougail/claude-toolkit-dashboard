# Audit PRD — Dashboard v2

> Date : 2026-04-03
> PRD source : tasks/prd-dashboard-v2.md
> Score : 24/30 criteres conformes (80%)
> Auteur : Louis (LouisG)

## Resume executif

L'implementation couvre les 6 user stories avec 10 commits sur la branche ralph/dashboard-v2 (+2109 lignes, 31 fichiers). Les fonctionnalites core (Mission Control, Kanban 6 colonnes, metriques/cout, Ralph SSE, notifications, config) sont en place. 3 criteres non conformes et 3 partiels, principalement sur l'interactivite (click sur cartes, filtre par projet) et des fonctionnalites secondaires.

## Conformite des exigences

### User Stories

| ID | Titre | Statut | Detail |
|----|-------|--------|--------|
| US-001 | Mission Control | PARTIEL | 5/6 criteres OK. Click carte → page detail projet : NON CONFORME |
| US-002 | Feature Timeline | PARTIEL | 3/6 criteres OK. Click carte, filtre projet, temps dans colonne : manquants |
| US-003 | Metriques & Cout | CONFORME | 5/5 criteres OK |
| US-004 | Suivi Ralph | PARTIEL | 4/5 criteres OK. Notification macOS auto non declenchee par SSE |
| US-005 | Notifications | CONFORME | 3/3 criteres OK |
| US-006 | Configuration | CONFORME | 4/4 criteres OK |

### Criteres detailles

| # | Critere | Statut | Detail |
|---|---------|--------|--------|
| 1 | Grille cartes projet | CONFORME | page.tsx — activeProjects, grid sm:grid-cols-2 |
| 2 | Carte : nom, branche, CI, PRs, dirty, activite | CONFORME | page.tsx:370-410 |
| 3 | Indicateur sante | CONFORME | scanner.ts:159-179 — score pondere |
| 4 | Tri par derniere activite | CONFORME | page.tsx:86 — sort lastActivity |
| 5 | Click carte → detail projet | NON CONFORME | Pas de page /project/[id] ni de lien |
| 6 | Auto-refresh 30s | CONFORME | RefreshIndicator + force-dynamic |
| 7 | Colonnes 6 phases | CONFORME | pipeline/page.tsx PIPELINE_COLUMNS |
| 8 | Carte : titre, slug, temps dans colonne | PARTIEL | Titre/slug OK, temps dans colonne absent |
| 9 | Cartes bougent au changement statut | CONFORME | force-dynamic relit state.json |
| 10 | Click carte → detail | NON CONFORME | Pas de lien/modal sur FeatureCard |
| 11 | Filtrable par projet | NON CONFORME | Pas de filtre projet |
| 12 | Sources : state + prd + ralph + events | PARTIEL | events.jsonl non parse |
| 13 | Graphique tokens/jour | CONFORME | TokenUsageChart Recharts |
| 14 | Graphique sessions/jour | CONFORME | activity/page.tsx sessionsByDay |
| 15 | Cout estime cumule | CONFORME | estimateCost() pricing Opus |
| 16 | Sparklines header | CONFORME | sidebar-sparklines.tsx + /api/sparklines |
| 17 | Periode configurable | CONFORME | PeriodSelector via searchParams |
| 18 | Detection Ralph actives | CONFORME | ralph.ts parseRalphSession |
| 19 | Barre progression | CONFORME | ralph-tracker.tsx [x]/total |
| 20 | Log dernieres actions | CONFORME | ralph.ts lit live.log |
| 21 | Notification macOS auto | PARTIEL | /api/notify existe mais pas appele par SSE |
| 22 | Temps reel chokidar + SSE | CONFORME | api/ralph-stream chokidar watch |
| 23 | Notification macOS osascript | CONFORME | /api/notify/route.ts |
| 24 | Badge titre onglet | CONFORME | tab-badge.tsx |
| 25 | Section Alertes | CONFORME | page.tsx:114-170 alerts section |
| 26 | Fichier config.json | CONFORME | ~/.claude/dashboard/config.json |
| 27 | Scan auto ~/Developer/ | CONFORME | config.ts DEFAULT_CONFIG |
| 28 | Ajouter/exclure projets | CONFORME | projectDirs + excludePatterns |
| 29 | Settings page | CONFORME | settings/page.tsx |

## Tests

| Suite | Total | Pass | Fail | Statut |
|-------|-------|------|------|--------|
| Vitest | 39 | 39 | 0 | PASS |

## Arbitrage

| # | Critere | Statut | Arbitrage | Justification |
|---|---------|--------|-----------|---------------|
| 5 | Click carte → detail projet | NON CONFORME | A arbitrer | Necessite une page dynamique /project/[id] — effort non negligeable |
| 8 | Temps dans colonne | PARTIEL | Acceptable | Info secondaire, necessite tracking des transitions de statut |
| 10 | Click feature → detail | NON CONFORME | A arbitrer | Meme pattern que #5 — page detail ou modal ? |
| 11 | Filtre par projet (pipeline) | NON CONFORME | A corriger | Client component avec state, pattern deja utilise dans DecisionFilter |
| 12 | Parser events.jsonl | PARTIEL | Acceptable | events.jsonl pas encore genere par le toolkit, pas de donnees sources |
| 21 | Notification macOS auto | PARTIEL | A corriger | Le SSE watcher doit appeler /api/notify quand Ralph change de statut |

## Actions requises

### A corriger (2)
- [ ] #11 — Filtre par projet sur la page pipeline (reutiliser pattern DecisionFilter)
- [ ] #21 — SSE watcher appelle /api/notify quand Ralph termine ou bloque

### Acceptables (2)
- [ ] #8 — Temps dans colonne : info secondaire, pas de source de donnees fiable
- [ ] #12 — events.jsonl : fichier pas encore genere par le toolkit

### A arbitrer (2)
- [ ] #5 — Click projet → page detail : creer /project/[id] ou laisser tomber ?
- [ ] #10 — Click feature → detail : page dediee, modal, ou laisser tomber ?
