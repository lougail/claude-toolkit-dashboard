# Tech — claude-toolkit-dashboard

> Derniere mise a jour : 2026-11-24

## Stack

| Couche | Choix | Justification |
|--------|-------|---------------|
| **Framework** | Next.js 16 (App Router, Turbopack) | |
| **Langage** | TypeScript (strict) | |
| **UI** | React 19 | |
| **Styling** | Tailwind CSS 4 | |
| **Icons** | Lucide React | |
| **Hebergement** | {Vercel / VPS / ...} | |
| **CI/CD** | {GitHub Actions / ...} | |

## Contraintes

- {ex: Budget hebergement < 20€/mois}
- {ex: Pas de base de donnees — donnees statiques parsees depuis le filesystem}

## Conventions

- ES modules (import/export), jamais CommonJS
- TypeScript strict mode
- async/await plutot que Promises brutes
- Commits en anglais, concis, focalises sur le "pourquoi"

## Architecture

```
src/
├── app/              # Next.js App Router pages
│   ├── api/config/   # Lecture et ecriture de la configuration
│   ├── settings/     # Vue configuration
│   ├── layout.tsx    # Layout principal
│   └── page.tsx      # Page d'accueil, liste des projets
├── components/       # Composants React
│   └── dashboard/    # Composants du dashboard
└── lib/              # Utilitaires, parsers, types
    ├── config.ts
    ├── data/          # Donnees et loaders
    ├── parsers/       # Parsers de fichiers
    ├── types.ts
    └── utils.ts
```

## Decisions prises

| Date | Decision | Justification |
|------|----------|---------------|
| 2026-04-02 | Setup initial Next.js 16 + Tailwind 4 | Stack moderne, performance Turbopack |

## Services critiques

- {module necessitant review track obligatoire}

## Environnements

| Env | URL | Notes |
|-----|-----|-------|
| Local | localhost:3000 | `pnpm dev` |
