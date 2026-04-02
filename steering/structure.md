# Structure — claude-toolkit-dashboard

> Derniere mise a jour : 2026-04-02

## Arborescence

```
claude-toolkit-dashboard/
├── src/                  # Code source
│   ├── app/              # Next.js App Router
│   ├── components/       # Composants React
│   └── lib/              # Utilitaires, parsers, types
├── public/               # Assets statiques
├── .claude/              # Config Claude Code
│   ├── agents/           # Agents specialises du projet
│   ├── rules/            # Regles automatiques du projet
│   └── skills/           # Conventions de stack
├── steering/             # Documents de cadrage
│   ├── product.md        # Vision produit
│   ├── tech.md           # Stack et contraintes
│   └── structure.md      # Ce fichier
├── vault/                # Connaissances du projet
│   ├── ideas/            # Idees
│   ├── decisions/        # ADR (Architecture Decision Records)
│   ├── insights/         # Lecons apprises
│   ├── research/         # Resultats de /research
│   ├── journal/          # Journal quotidien
│   ├── questions/        # Questions en attente
│   └── inbox/            # Notes rapides
└── tasks/                # PRDs et specs
```

## Conventions de nommage

| Element | Convention | Exemple |
|---------|-----------|---------|
| Fichiers | kebab-case | `user-profile.tsx` |
| Composants | PascalCase | `UserProfile` |
| Variables | camelCase | `userName` |
| CSS classes | Tailwind utilities | `flex items-center gap-2` |
| Branches | type/description | `feat/booking-form` |
| Commits | description concise en anglais | `add booking form` |

## Patterns

### Data fetching
{A documenter — Server Components, loaders dans lib/data/}

### Charts
{Recharts — composants wrapper dans components/charts/}

## Points d'attention

- Dashboard interne — performance et lisibilite prioritaires
- Pas de scroll horizontal sur mobile
- Accessibilite clavier sur tous les elements interactifs
