# Requirements — Dashboard v2

## Principes

- Companion du CLI, pas remplacement
- Zero base de donnees — fichiers locaux = source de verite
- Read-only — jamais d'ecriture vers les projets surveilles
- Localhost uniquement

## Exigences fonctionnelles

### FR-01: Configuration multi-projets
- Fichier `config.json` a la racine du dashboard
- Scan automatique ~/Developer/ par defaut
- Possibilite d'ajouter/exclure des projets (patterns glob)
- Page settings pour modifier la config

### FR-02: Mission Control
- Grille de cartes projet (1 par projet actif)
- Donnees par carte : nom, branche courante, CI status (vert/rouge/gris), PRs ouvertes, dirty files, derniere activite
- Score sante : CI + audit + tests
- Tri par derniere activite
- Auto-refresh 30s

### FR-03: Feature Timeline
- Colonnes workflow : Idee → PRD → Building → Review → Ship → Done
- Carte par feature : titre, slug, temps dans la colonne
- Detail au click : PRD link, audit score, PR link, Ralph progression
- Filtrable par projet
- Sources : state.json, tasks/prd-*.md, .ralph/*/fix_plan.md, events.jsonl

### FR-04: Metriques & Cout
- Tokens input/output par jour (graphique ligne, Recharts)
- Sessions par jour (graphique ligne)
- Cout cumule du mois (estimation basee sur pricing Anthropic)
- Sparklines dans le header global
- Selecteur de periode : 7j / 14j / 30j

### FR-05: Suivi Ralph
- Detection sessions Ralph actives via .ralph/*/status.json
- Barre de progression (taches [x] / total dans fix_plan.md)
- Derniers logs (.ralph/logs/)
- Temps reel via SSE (chokidar filesystem watcher → API route → navigateur)

### FR-06: Notifications passives
- Notification macOS via osascript
- Badge titre onglet navigateur
- Section "Alertes" dans Mission Control

## Exigences techniques

### ET-01: Stack
- Next.js 16 (App Router, Turbopack)
- React 19 + TypeScript strict
- Tailwind CSS 4
- Recharts 2.x
- chokidar (filesystem watcher)
- SSE (Server-Sent Events)

### ET-02: Architecture
- Server Components pour le data fetching filesystem
- Client Components uniquement pour charts, interactions, SSE
- Parsers isoles dans lib/parsers/ avec type guards
- Tests Vitest sur tous les parsers

### ET-03: Qualite
- ESLint clean (0 erreur)
- TypeScript strict (pas de any, pas de as aveugle)
- Accessibilite WCAG AA (contraste 4.5:1, focus visible, aria-labels)
- Pas de Date.now() dans les Server Components
