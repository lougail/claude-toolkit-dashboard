# Fix Plan — Dashboard v2

## High Priority

- [ ] **US-006: Config multi-projets** — Fondation pour tout le reste
  - Creer `config.json` (schema: projectDirs[], excludePatterns[])
  - Mettre a jour `lib/config.ts` pour lire config.json
  - Scanner automatique de ~/Developer/ par defaut
  - Page settings basique pour modifier la config

- [ ] **US-001: Mission Control** — Page d'accueil refaite
  - Grille de cartes projet avec : nom, branche, CI status, PRs, dirty, derniere activite
  - Indicateur sante par projet (CI + audit + tests)
  - Tri par derniere activite
  - Click carte → page detail projet
  - Auto-refresh 30s (existant, a reutiliser)

- [ ] **US-003: Metriques & Cout** — Graphiques tokens/sessions
  - Graphique ligne tokens input/output par jour (parser existant)
  - Graphique ligne sessions par jour
  - Cout estime cumule du mois (formule: input * 3$/MTok + output * 15$/MTok pour Opus)
  - Sparklines dans le header
  - Selecteur periode : 7j / 14j / 30j

## Medium Priority

- [ ] **US-002: Feature Timeline (Kanban)** — Vue progression features
  - Colonnes : Idee | PRD | Building | Review | Ship | Done
  - Cartes feature : titre, slug, temps dans colonne
  - Click carte → detail (PRD, audit, PR, Ralph)
  - Filtre par projet
  - Sources : state.json, tasks/prd-*.md, .ralph/*/fix_plan.md, events.jsonl

- [ ] **US-004: Suivi Ralph temps reel** — Progression Ralph
  - Detection sessions Ralph actives (.ralph/*/status.json)
  - Barre de progression (done/total depuis fix_plan.md)
  - Log dernieres actions (.ralph/logs/)
  - SSE pour mise a jour temps reel (chokidar → API route → navigateur)

## Low Priority

- [ ] **US-005: Notifications passives** — Alertes macOS + badge
  - Notification macOS via osascript (Ralph termine, CI echoue)
  - Badge dans titre onglet ("(2) Dashboard")
  - Section "Alertes" en haut du Mission Control
