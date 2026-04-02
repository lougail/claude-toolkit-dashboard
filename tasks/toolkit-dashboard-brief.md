# Brief — Claude Code Toolkit Dashboard
> Date : 2026-04-02
> Auteur : LouisG
> Statut : draft

## Resume executif

Dashboard web local (Next.js) qui visualise les donnees produites par le Claude Code Toolkit dans les projets de l'utilisateur. Il lit les fichiers du toolkit (state.json, sessions JSONL, vault/, tasks/, steering/) et affiche en temps reel la pipeline des features, les scores d'audit, les decisions recentes et les metriques d'activite. Aucun backend externe — lecture directe du filesystem via Server Components.

## Analyse produit

Le Claude Code Toolkit produit des fichiers structurés dans chaque projet (.claude/state.json, vault/, tasks/, steering/) mais n'offre aucune vue agregee. Le developpeur doit aujourd'hui lancer des commandes CLI (/pipeline, /status) pour voir l'etat de chaque projet individuellement. Le dashboard comble ce manque en offrant une vue unifiee, graphique, multi-projets.

- **Personas :** Developpeur solo ou lead technique utilisant Claude Code Toolkit au quotidien
- **Parcours principal :** Ouvrir le dashboard → voir l'etat de tous les projets → identifier les features bloquees → consulter les decisions en attente → observer les tendances d'activite
- **Impact business :** Gain de temps et visibilite sur le workflow — le dev ne perd plus de temps a naviguer entre fichiers
- **Priorite :** haute (le toolkit produit des donnees, mais sans visualisation elles restent sous-exploitees)

## Analyse technique

Architecture **monolithe full-stack simplifie** (Pattern 2 du catalogue) — pas de DB, pas d'auth, pas d'API externe.

- **Stack recommandee :** Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui + Recharts
- **Architecture :** Monolithe Next.js — les Server Components lisent le filesystem via `fs/promises`, les Client Components affichent les graphiques via Recharts
- **Modules impactes :** Nouveau projet standalone, aucun module existant impacte
- **Complexite :** L (l'UI est M, mais la couche data/parsing est L a cause de la diversite des formats)
- **Dependances :** next, react, tailwindcss, @shadcn/ui, recharts, gray-matter (parsing frontmatter markdown)
- **Estimation :** 2-3 sessions de travail

### Schema des donnees sources

| Source | Chemin | Format | Contenu |
|--------|--------|--------|---------|
| State | `{project}/.claude/state.json` | JSON | Pipeline features, decisions count, derniere session |
| Sessions | `~/.claude/projects/{encoded-path}/{uuid}/subagents/*.jsonl` | JSONL | Messages, tokens, modeles utilises |
| History | `~/.claude/history.jsonl` | JSONL | Index sessions (display, timestamp, project, sessionId) |
| Tasks | `~/.claude/tasks/{team-uuid}/*.json` | JSON | Taches d'equipe (status, owner, blocks) |
| Vault | `{project}/vault/**/*.md` | Markdown + frontmatter | Decisions, ideas, insights |
| PRDs | `{project}/tasks/prd-*.md` | Markdown | Specifications features |
| Steering | `{project}/steering/*.md` | Markdown | product.md, tech.md, structure.md |
| Memory | `~/.claude/projects/{encoded-path}/memory/*.md` | Markdown + frontmatter | Observations, feedback |

## Contexte existant

- Le toolkit est installe globalement dans `~/.claude/` (commands/, skills/, templates/, agents/)
- Le template `state.json` definit le schema de reference pour la pipeline features
- Les agents product-owner.md et tech-lead.md existent dans `~/.claude/templates/agents/`
- Plusieurs projets actifs : Hello-Mira (principal), billing-api, ledger-api — sources de donnees reelles
- Le format JSONL des sessions inclut : `version`, `model`, `usage.input_tokens`, `usage.output_tokens`, `timestamp`, `gitBranch`

## Etat de l'art

- Les dashboards Next.js modernes (2026) utilisent App Router server-first, shadcn/ui + Radix, et minimisent les `"use client"`
- Pattern confirme : Server Components pour le data fetching fs, Client Components uniquement pour les charts interactifs
- shadcn/ui est le standard de facto pour les dashboards Next.js (composable, accessible, themeable)
- Les outils dev locaux similaires (Webpack Dashboard, Vite Inspector) utilisent le meme pattern localhost + filesystem

## Code existant

Projet vierge — aucun code existant. Le toolkit fournit les templates et schemas de reference dans `~/.claude/templates/`.

## Risques

| Risque | Probabilite | Impact | Mitigation |
|--------|-------------|--------|------------|
| Fichiers state.json absents dans les projets (pas encore instancies par le toolkit) | H | H | Gerer gracieusement les donnees manquantes, afficher un etat "non initialise" par projet, proposer un bouton pour initialiser |
| Formats JSONL internes Claude Code non stables entre versions | M | H | Isoler le parsing dans une couche d'abstraction (`lib/parsers/`), versionner le schema attendu, fail gracefully |
| Securite localhost (DNS rebinding, CSRF sur port ouvert) | M | H | Binder sur 127.0.0.1 uniquement, ajouter header `Host` validation, ne jamais exposer de routes d'ecriture |
| Chemins encodes des projets (`-Users-louis-Developer-...`) fragiles | M | M | Decoder proprement, tester avec des chemins contenant espaces et caracteres speciaux |
| Performance sur gros fichiers JSONL (history.jsonl peut depasser 2MB) | L | M | Streaming line-by-line, pagination, ne charger que les N derniers jours |
| Dispersion des sources de donnees (5+ formats, 3+ emplacements) | H | M | Couche d'abstraction data unifiee, un parser par format, tests unitaires sur chaque parser |

## Recommandation

**GO — avec conditions**

Le projet est viable et repond a un besoin reel (le toolkit produit des donnees sans moyen de les visualiser). Les risques identifies (donnees manquantes, formats instables) sont mitigeables par une couche d'abstraction data solide et une gestion gracieuse des etats vides. La priorite du MVP doit etre : afficher ce qui existe deja (history.jsonl, sessions, tasks) plutot que ce qui n'existe pas encore (state.json non instancie).

## Stack et architecture recommandees

**Stack :** Next.js 15 (App Router) + TypeScript strict + Tailwind CSS v4 + shadcn/ui + Recharts
**Architecture :** Monolithe Next.js — Server Components lisent le fs, Client Components pour les charts
**Justification :** Un seul dev, donnees locales read-only, pas de DB ni d'auth — le monolithe Next.js est le choix le plus simple et le plus rapide. Les Server Components permettent l'acces filesystem natif sans API intermediaire.

### Structure cible

```
app/
  layout.tsx              ← Layout principal + sidebar
  page.tsx                ← Dashboard overview (metriques cles)
  pipeline/page.tsx       ← Pipeline features
  audits/page.tsx         ← Scores d'audit
  decisions/page.tsx      ← Decisions recentes
  activity/page.tsx       ← Metriques d'activite
  api/projects/route.ts   ← Liste des projets detectes
components/
  charts/                 ← Composants Recharts ("use client")
  ui/                     ← shadcn/ui
  dashboard/              ← Composants specifiques dashboard
lib/
  parsers/                ← Un parser par format (json, jsonl, markdown)
  data/                   ← Couche d'abstraction data (scanner projets, agreger)
  types.ts                ← Types TypeScript des schemas
```

## Prochaine etape

`/init next` pour scaffolder avec la stack recommandee
