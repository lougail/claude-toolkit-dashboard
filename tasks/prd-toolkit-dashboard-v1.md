# PRD — Toolkit Dashboard v1 (finition)

> **Statut :** draft
> **Auteur :** Louis (LouisG)
> **Date :** 2026-04-02
> **Brief :** tasks/toolkit-dashboard-kickoff.md

## 1. Introduction

Le dashboard Claude Code Toolkit est implémenté à ~90% (5 pages, 3 parsers, scanner, charts, layout). Cette PRD couvre la finition vers une v1 utilisable au quotidien : corrections critiques, fiabilisation des parsers, setup tests, et polish UI.

**Scope :** read-only, localhost uniquement, pas d'écriture, pas d'auth.

## 2. Objectifs

- Corriger les bugs critiques (decodeProjectPath, parsing aveugle)
- Installer un framework de test et couvrir les parsers/scanner
- Rendre les empty states informatifs (distinguer "rien" de "cassé")
- Compléter les fonctionnalités manquantes (steering, filtrage, accessibilité)
- Avoir un dashboard fiable pour usage quotidien

## 3. User Stories

### US-001: Fix decodeProjectPath

**Description :** En tant que développeur, je veux que le dashboard détecte correctement les projets dont le chemin contient des tirets afin que tous mes projets apparaissent.

**Critères d'acceptation :**
- [ ] `decodeProjectPath` gère les tirets dans les noms de dossiers (`my-project` ne devient pas `my/project`)
- [ ] Projets avec tirets (ex: `hello-mira`, `billing-api`) apparaissent correctement
- [ ] Tests unitaires couvrent les cas : chemin simple, tirets, espaces, caractères spéciaux

### US-002: Setup Vitest

**Description :** En tant que développeur, je veux un framework de test configuré afin de pouvoir écrire et lancer des tests.

**Critères d'acceptation :**
- [ ] Vitest installé et configuré pour Next.js 16 + TypeScript
- [ ] Script `pnpm test` fonctionne
- [ ] Au moins un test passe (smoke test)

### US-003: Tests parsers

**Description :** En tant que développeur, je veux des tests sur les 3 parsers afin de détecter les régressions quand le format des fichiers change.

**Critères d'acceptation :**
- [ ] Tests pour `parsers/state.ts` : JSON valide, JSON invalide, fichier manquant, champs manquants
- [ ] Tests pour `parsers/jsonl.ts` : lignes valides, lignes corrompues, fichier vide, fichier très gros (performance)
- [ ] Tests pour `parsers/markdown.ts` : frontmatter valide, frontmatter absent, markdown pur, fichier vide
- [ ] Fixtures de test avec des données réalistes

### US-004: Tests scanner

**Description :** En tant que développeur, je veux des tests sur le scanner afin de valider la découverte de projets et l'agrégation des métriques.

**Critères d'acceptation :**
- [ ] Tests pour `data/scanner.ts` : découverte projets, agrégation métriques, sessions
- [ ] Test avec un dossier `~/.claude/` simulé (fixture)
- [ ] Test cas limites : dossier vide, fichiers corrompus, permissions refusées

### US-005: Validation runtime des données parsées

**Description :** En tant que développeur, je veux que les parsers valident les données au runtime afin que le dashboard ne mente pas silencieusement quand le format change.

**Critères d'acceptation :**
- [ ] Supprimer les `as Type` aveugles dans les parsers
- [ ] Ajouter une validation des champs obligatoires (vérification manuelle ou type guard)
- [ ] Si un fichier a un format inattendu, logger un warning et retourner un résultat partiel (pas crash, pas silence)
- [ ] Tests couvrent les cas de données mal formées

### US-006: Empty states avec diagnostic

**Description :** En tant que utilisateur, je veux comprendre pourquoi une section est vide afin de distinguer "rien à montrer" de "quelque chose est cassé".

**Critères d'acceptation :**
- [ ] Overview : si 0 projets, afficher "Aucun projet détecté dans ~/.claude/projects/" avec les causes possibles
- [ ] Pipeline : si 0 features, afficher "Aucun state.json trouvé — lancer /setup dans un projet"
- [ ] Audits : si 0 audits, afficher "Aucun fichier audit-*.md trouvé — lancer /audit"
- [ ] Decisions : si 0 entries vault, afficher "Vault vide — les décisions seront capturées automatiquement"
- [ ] Activity : si 0 sessions, afficher "Aucune session trouvée dans ~/.claude/history.jsonl"

### US-007: Parser steering

**Description :** En tant que utilisateur, je veux voir les données steering (product.md, tech.md) dans le dashboard afin d'avoir une vue complète du projet.

**Critères d'acceptation :**
- [ ] Nouveau parser `parsers/steering.ts` qui lit steering/*.md avec gray-matter
- [ ] Données steering intégrées dans la vue projet (overview ou page dédiée)
- [ ] Tests unitaires sur le parser

### US-008: Filtrage interactif des décisions

**Description :** En tant que utilisateur, je veux filtrer les décisions par type (idea, decision, insight, research, journal) afin de trouver rapidement ce que je cherche.

**Critères d'acceptation :**
- [ ] Badges de type cliquables sur la page /decisions
- [ ] Filtre actif visuellement distinct
- [ ] "Tous" comme filtre par défaut
- [ ] Composant Client (`"use client"`) pour le state du filtre

### US-009: Accessibilité de base

**Description :** En tant que utilisateur, je veux naviguer au clavier et avoir des labels accessibles afin que le dashboard respecte les standards WCAG AA.

**Critères d'acceptation :**
- [ ] Skip to main content link
- [ ] Focus visible sur tous les éléments interactifs (sidebar, filtres)
- [ ] `aria-label` sur les charts Recharts
- [ ] Contraste 4.5:1 vérifié sur le thème sombre
- [ ] Navigation sidebar accessible au clavier

### US-010: Auto-refresh

**Description :** En tant que utilisateur, je veux que le dashboard se rafraîchisse automatiquement afin de voir les dernières données sans recharger manuellement.

**Critères d'acceptation :**
- [ ] Revalidation automatique toutes les 30 secondes (ou polling côté client)
- [ ] Indicateur visuel du dernier rafraîchissement ("mis à jour il y a X secondes")
- [ ] Pas de flash/flicker au rafraîchissement

## 4. Exigences fonctionnelles

- FR-1: Le dashboard lit les données depuis le filesystem local (`~/.claude/` et projets) via Server Components
- FR-2: Aucune écriture — le dashboard est 100% read-only
- FR-3: Toutes les pages gèrent gracieusement les données manquantes ou mal formées
- FR-4: Le dashboard fonctionne sur localhost uniquement (pas d'exposition réseau)
- FR-5: Les parsers valident les données au runtime sans `as Type` aveugle
- FR-6: Chaque parser a des tests unitaires couvrant les cas nominaux et limites

## 5. Non-objectifs (hors scope)

- Écriture/modification de fichiers (pas d'éditeur de décisions, pas de modification de PRDs)
- Authentification ou multi-utilisateur
- Déploiement en production (localhost uniquement)
- Support mobile (desktop-first, responsive nice-to-have)
- Notifications ou alertes
- Intégration API externe (tout est filesystem local)

## 6. Pages et composants

### Pages

| Path | Composant | Description |
|------|-----------|-------------|
| `/` | Overview | Métriques clés, charts, sessions récentes, liste projets |
| `/pipeline` | Pipeline | Kanban 3 colonnes (planning, in-progress, shipped) |
| `/audits` | Audits | Scores d'audit par projet, blockers |
| `/decisions` | Decisions | Vault entries par type, filtrage interactif |
| `/activity` | Activity | Tokens, sessions par projet/jour |

### Composants clés

| Nom | Type | Description |
|-----|------|-------------|
| `Sidebar` | Client | Navigation + projet actif |
| `MetricCard` | Server | Carte avec icône, valeur, label |
| `TokenUsageChart` | Client | AreaChart Recharts (tokens in/out par jour) |
| `PipelineChart` | Client | BarChart Recharts (features par statut) |
| `EmptyState` | Server | Message contextuel quand une section est vide |
| `DecisionFilter` | Client | Badges cliquables pour filtrer par type |

## 7. Ordre d'implémentation

Les stories sont ordonnées par dépendance :

1. **Fondations :** US-002 (Vitest) → US-001 (fix decodeProjectPath) → US-005 (validation runtime)
2. **Tests :** US-003 (tests parsers) → US-004 (tests scanner)
3. **UI :** US-006 (empty states) → US-007 (steering) → US-008 (filtrage) → US-009 (a11y) → US-010 (auto-refresh)

## 8. Métriques de succès

- `pnpm test` passe avec 100% des tests verts
- `pnpm build` compile sans erreur
- Tous les projets locaux apparaissent dans le dashboard (y compris ceux avec tirets)
- Empty states affichent un message de diagnostic pertinent
- Navigation clavier fonctionnelle sur toutes les pages

## 9. Décisions

- Steering intégré dans l'overview (pas de page dédiée)
- Auto-refresh toutes les 30 secondes
- Indicateur de santé par projet (state.json présent, vault non vide, tests configurés, etc.)
