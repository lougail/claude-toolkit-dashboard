# Conventions Frontend — claude-toolkit-dashboard

> Auto-genere par /setup. Mettre a jour via /refresh.

## Stack
- **Framework :** Next.js 16 (App Router, Turbopack)
- **UI :** React 19
- **Styling :** Tailwind CSS 4 (via @tailwindcss/postcss)
- **Charts :** Recharts 2.x
- **Icons :** Lucide React
- **Utils :** clsx + tailwind-merge
- **Linter :** ESLint 9 + eslint-config-next
- **Tests :** non configure (Vitest recommande)

## Patterns du projet
- **Routing :** App Router (src/app/)
- **Data fetching :** Server Components + parsers dans src/lib/parsers/
- **Data loaders :** src/lib/data/
- **Types :** centralises dans src/lib/types.ts
- **Config :** src/lib/config.ts
- **Utils :** src/lib/utils.ts (clsx + twMerge probable)

## Regles
- Composants dans src/components/, organises par domaine (charts/, dashboard/)
- Pages dans src/app/ avec le pattern App Router (page.tsx, layout.tsx)
- TypeScript strict — pas de `any`, pas de `as` sauf cas justifie
- Tailwind pour tout le styling — pas de CSS modules ni styled-components
- Lucide pour les icones — pas de SVG inline sauf cas specifique
- Imports ES modules uniquement
