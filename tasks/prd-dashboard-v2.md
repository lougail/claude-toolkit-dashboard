# PRD — Dashboard v2 (3 pages à valeur ajoutée)

> **Statut :** draft
> **Auteur :** Louis (LouisG)
> **Date :** 2026-04-03
> **Brief :** Refonte du dashboard autour de 3 pages qui font mieux que le CLI

## 1. Introduction

La v1 du dashboard affiche les données du toolkit mais n'apporte pas de valeur ajoutée claire vs `/status` et `/pipeline`. La v2 se concentre sur 3 pages qui font ce que le CLI **ne peut pas faire** : vue multi-projets, timeline visuelle, et métriques temporelles.

**Principe :** companion du CLI, pas remplacement. Si le CLI fait mieux → ne pas le dupliquer.

## 2. Objectifs

- Remplacer `/morning` par une vue multi-projets persistante et visuelle
- Montrer la progression des features dans le temps (Kanban)
- Visualiser les tokens/coût sur 30 jours en courbes
- Suivre Ralph en temps réel quand il tourne en arrière-plan
- Zero base de données — les fichiers locaux sont la source de vérité

## 3. Non-objectifs

- PAS de lancement de commandes depuis le dashboard
- PAS de gestion de décisions (valider/rejeter)
- PAS de multi-utilisateurs
- PAS de base de données
- PAS de réécriture de ce que `/status` et `/pipeline` font déjà en texte

## 4. User Stories

### US-001: Mission Control (page d'accueil)

**Description :** En tant que développeur, je veux voir tous mes projets actifs d'un coup d'oeil avec leur santé, pour savoir sur quoi travailler en priorité.

**Critères d'acceptation :**
- [ ] Grille de cartes, un par projet actif (détecté depuis ~/Developer/ ou configurable)
- [ ] Chaque carte : nom, branche, CI status (vert/rouge/gris), PRs ouvertes, dirty files, dernière activité
- [ ] Indicateur de santé par projet (CI + audit score + tests)
- [ ] Tri par dernière activité (le plus récent en premier)
- [ ] Click sur une carte → page détail du projet
- [ ] Auto-refresh toutes les 30s

### US-002: Feature Timeline (Kanban)

**Description :** En tant que développeur, je veux voir mes features progresser visuellement à travers les phases du workflow.

**Critères d'acceptation :**
- [ ] Colonnes : Idée | PRD | Building | Review | Ship | Done
- [ ] Chaque feature = une carte (titre, slug, temps dans la colonne)
- [ ] Les cartes se déplacent quand le statut change (via state.json ou events.jsonl)
- [ ] Click sur une carte → détail (PRD, audit score, PR link, Ralph progression)
- [ ] Filtrable par projet
- [ ] Source de données : state.json + tasks/prd-*.md + .ralph/*/fix_plan.md + events.jsonl

### US-003: Métriques & Coût (graphiques)

**Description :** En tant que développeur, je veux voir mes tendances de consommation tokens et coût sur 30 jours.

**Critères d'acceptation :**
- [ ] Graphique ligne : tokens input/output par jour (depuis history.jsonl)
- [ ] Graphique ligne : sessions par jour
- [ ] Coût estimé cumulé du mois en cours
- [ ] Sparklines dans le header pour aperçu rapide
- [ ] Période configurable (7j / 14j / 30j)

### US-004: Suivi Ralph en temps réel

**Description :** En tant que développeur, je veux voir la progression de Ralph quand il tourne en arrière-plan, sans ouvrir le terminal.

**Critères d'acceptation :**
- [ ] Détection des sessions Ralph actives (.ralph/*/status.json avec status != "completed")
- [ ] Barre de progression (tâches done/total)
- [ ] Log des dernières actions (dernières lignes de .ralph/logs/)
- [ ] Notification macOS quand Ralph termine ou bloque
- [ ] Mise à jour en temps réel via filesystem watcher (chokidar + SSE)

### US-005: Notifications passives

**Description :** En tant que développeur, je veux être notifié quand quelque chose se passe (Ralph terminé, CI échoue) même si le dashboard n'est pas au premier plan.

**Critères d'acceptation :**
- [ ] Notification macOS via osascript quand : Ralph terminé, Ralph bloqué, CI échoue
- [ ] Badge dans le titre de l'onglet navigateur (ex: "(2) Dashboard" pour 2 alertes)
- [ ] Section "Alertes" en haut du Mission Control avec les events non lus

### US-006: Configuration multi-projets

**Description :** En tant que développeur, je veux configurer quels projets le dashboard surveille.

**Critères d'acceptation :**
- [ ] Fichier config.json à la racine du dashboard
- [ ] Scan automatique de ~/Developer/ par défaut
- [ ] Possibilité d'ajouter/exclure des projets
- [ ] Settings page simple pour modifier la config

## 5. Architecture technique

### Sources de données (lecture seule)

| Source | Données | Parse |
|--------|---------|-------|
| `~/.claude/history.jsonl` | Tokens, sessions, coût | Parser JSONL → séries temporelles |
| `~/.claude/session-history.log` | Sessions par projet | Parser texte → activité par jour |
| `{projet}/.claude/state.json` | État workflow par feature | JSON direct |
| `{projet}/.claude/events.jsonl` | Timeline événements | Parser JSONL |
| `{projet}/.ralph/*/fix_plan.md` | Progression Ralph | Compter [x] vs [ ] |
| `{projet}/.ralph/*/status.json` | État Ralph | JSON direct |
| `{projet}/tasks/prd-*.md` | PRDs actives | Parser frontmatter markdown |
| `{projet}/tasks/audit-*.md` | Derniers audits | Parser frontmatter + score |

### Temps réel

```
[Fichiers] --chokidar--> [API route Next.js] --SSE--> [Navigateur]
```

- chokidar watche : history.jsonl, state.json, .ralph/logs/, events.jsonl
- SSE push les updates au navigateur sans polling
- Reconnexion automatique si le navigateur perd la connexion

### Stack

- Next.js 15 (App Router, Server Components)
- Recharts (graphiques)
- chokidar (filesystem watcher)
- SSE (Server-Sent Events pour le temps réel)
- Tailwind CSS v4

## 6. Métriques de succès

- Le développeur ouvre le dashboard chaque matin (remplace `/morning`)
- Il voit la progression de Ralph sans ouvrir le terminal
- Il connaît son coût tokens du mois sans aller sur le dashboard Anthropic
