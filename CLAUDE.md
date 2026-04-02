# claude-toolkit-dashboard

Dashboard de visualisation pour le Claude Code Toolkit.

## Stack

Next.js 16 (App Router, Turbopack) + React 19 + TypeScript strict + Tailwind 4 + Recharts + Lucide React

## Architecture

```
src/
├── app/              # Pages (App Router)
│   ├── activity/     # Vue activite
│   ├── audits/       # Vue audits
│   ├── decisions/    # Vue decisions
│   ├── pipeline/     # Vue pipeline
│   └── page.tsx      # Dashboard principal
├── components/       # Composants React
│   ├── charts/       # Wrappers Recharts
│   └── dashboard/    # Composants dashboard
└── lib/              # Logique metier
    ├── config.ts     # Configuration
    ├── data/         # Data loaders
    ├── parsers/      # Parsers de fichiers
    ├── types.ts      # Types centralises
    └── utils.ts      # Utilitaires
```

## Commandes

```bash
pnpm dev          # Dev server (Turbopack)
pnpm build        # Build production
pnpm lint         # ESLint
```

## Conventions

- ES modules, TypeScript strict, async/await
- Tailwind pour le styling, Lucide pour les icones
- Composants organises par domaine dans components/
- Types centralises dans lib/types.ts

## Modules actifs

- **Product management** — agents: product-owner, tech-lead
- **Testing** — agent: tester, rules: tests.md
- **Design & accessibilite** — agent: designer, rules: accessibility.md
- **CI/CD** — commandes: /ship, /pr-create, /changelog, /review
- **Governance** — workflow tracks, ADR dans vault/decisions/
- **Vault** — capture auto dans vault/ (ideas, decisions, insights, journal)

## Track auto-detection

Identifier le track et l'annoncer avant d'agir :
- "down", "casse", "502", "urgent" → `[HOTFIX]` — fix minimal, push direct
- Modification simple, un seul module, pas de schema/event → `[FAST TRACK]` — push direct
- Nouvelle feature, multi-module, decision archi → `[REVIEW TRACK]` — PRD → impl → review → audit → PR

## Architecture Decision Records (ADR)

Les decisions architecturales sont documentees dans `vault/decisions/` au format MADR :

```markdown
### YYYY-MM-DD — {titre}
- **Statut :** validee | rejetee | en attente | remplacee
- **Contexte :** {pourquoi cette decision est necessaire}
- **Decision :** {ce qui a ete decide}
- **Options considerees :**
  - A. {option choisie} — {pourquoi}
  - B. {option rejetee} — {pourquoi pas}
- **Consequences :** {impact positif et negatif}
- **Decide par :** {utilisateur}
```

## Vault — Capture automatique

### Quand ecrire
- **Idee** : quand l'utilisateur dit "on pourrait...", "j'ai une idee...", "et si on..."
- **Decision** : quand une decision significative est prise (lister les options et la justification)
- **Insight** : quand on decouvre un pattern, une lecon, un piege
- **Journal** : via /recap en fin de session

### Regles
- Ne PAS demander la permission pour noter une idee — la noter, puis informer
- Ne PAS noter les idees triviales ou les questions rhetoriques
- Verifier qu'une idee similaire n'existe pas deja avant de creer un doublon
- Nommage : `vault/{type}/{YYYY-MM-DD}-{slug}.md`

## Niveaux de delegation

| Niveau | Qui decide | Exemples |
|--------|-----------|----------|
| 1 | Lead valide AVANT | Epics, PRD majeure, archi structurante |
| 2 | Dev decide, lead notifie | Arbitrages dans un scope valide |
| 3 | Dev execute seul | Fix simple, polish, deps, config |

## Steering docs

- `steering/product.md` — vision, personas, metriques
- `steering/tech.md` — stack, contraintes, decisions
- `steering/structure.md` — arborescence, conventions
