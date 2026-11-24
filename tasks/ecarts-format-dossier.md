# Écarts de lecture entre le lecteur du dashboard et la commande de contrôle

> **Date :** 2026-11-24
> **Pour :** le projet `.claude`, qui tient le format du dossier et sa commande de contrôle
> **Versions comparées :** `scripts/check-dossier.py` au commit `8f6ca50` du toolkit, et `src/lib/parsers/dossier.ts` au commit `7064465` de ce dépôt

Le lecteur du dashboard et la commande lisent le même dossier. Ce fichier liste les textes qu'ils lisent différemment, avec les deux lectures et celle que ce dépôt propose. Chaque écart a été rejoué le 24 novembre sur un dossier d'essai.

## Ce qui concorde

Sur trois dossiers, le lecteur et la commande rendent le même nombre d'erreurs et de points à compléter.

| Dossier | Erreurs | Points à compléter |
|---|---|---|
| Le dossier d'exemple du toolkit (`tests/fixtures/dossier/valid/`) | 0 | 0 |
| Ce dépôt, avant l'écriture de son journal | 1 | 0 |
| Le projet pilote | 0 | 3 |

- **Le dossier d'exemple.** Sa copie est dans `src/__tests__/fixtures/dossier/valid/`, identique au commit `8f6ca50`. Le groupe de tests « readDossier on the valid fixture shared with the check command » la lit sans aucun manque. La copie de travail du toolkit y a ajouté depuis un `AGENTS.md`, absent de cette copie.
- **Les sections et les colonnes en plus.** Un plan avec les colonnes « Qui » et « Sprint » et une section « Sprint 3 » se lit sans aucun manque, comme dans la commande.
- **La date de l'état.** Le lecteur la lit maintenant comme la commande, écrite `(AAAA-MM-JJ)` n'importe où dans le titre.
- **Le reste du format.** Les titres `# Plan` et `# Journal`, les cinq états, « à valider par », « fait le » suivi de la preuve, une date sans année, un numéro en double, les trois points d'une séance, l'ordre des séances, le plan comparé au journal, `README.md` dans un dossier de décisions, un fichier qui n'est pas en UTF-8 et une décision atteinte par un lien symbolique se lisent de la même façon.

## Textes lus différemment

### 1. Un titre indenté

```markdown
   ## Prochaines tâches
```

- **Commande.** La ligne est du texte. Elle signale que la section « Prochaines tâches » manque.
- **Lecteur.** Un titre précédé d'une à trois espaces est un titre. Avec quatre espaces, la ligne reste du texte.
- **Proposition.** La commande accepte une à trois espaces devant un titre, comme CommonMark.

### 2. Un bloc de code qui en contient un autre

`````markdown
````markdown
```
## Prochaines tâches
```
````
`````

- **Commande.** Chaque ligne de clôture ouvre ou ferme un bloc. Le titre d'exemple devient une vraie section, vide, et la commande signale que la section « Prochaines tâches » n'a pas de tableau.
- **Lecteur.** Un bloc se ferme sur une clôture du même signe, au moins aussi longue que celle qui l'a ouvert. Le titre d'exemple reste dans le bloc.
- **Proposition.** La commande suit cette règle, qui est celle de CommonMark. Un plan qui montre son propre format dans un bloc de code y gagne.

### 3. Un deuxième titre de niveau 1

```markdown
## Prochaines tâches

Le tableau est en annexe.

# Annexe

| # | Tâche | Fini quand | État |
|---|---|---|---|
| 1 | **Chercher.** | Une recherche affiche trois recueils. | à faire |
```

- **Commande.** Le tableau reste dans la section « Prochaines tâches », et le dossier passe.
- **Lecteur.** `# Annexe` ferme la section. Il signale que la section des tâches n'a pas de tableau.
- **Proposition.** La commande ferme la section en cours sur un titre de niveau 1.

### 4. Une ligne indentée après un paragraphe

```markdown
1. Relire la page.

Paragraphe libre.
   Demandé le 12 mars.
```

- **Commande.** Toute ligne indentée se rattache au dernier élément lu. La ligne 1 se trouve datée.
- **Lecteur.** Une ligne non vide et non indentée termine l'élément. La ligne 1 reste sans date.
- **Proposition.** À trancher dans le format. Ici le paragraphe suit une ligne vide et termine la liste, donc la lecture du lecteur est celle de CommonMark. Sans cette ligne vide, CommonMark rattache les deux lignes à l'élément, ce que la commande rend et que le lecteur manque. Le plus simple est d'écrire dans le format qu'une ligne de continuation est indentée et suit directement son élément.

### 5. Des décisions rangées par groupes

```markdown
## 2026 — Évolutions

### [2026-03-10] Passer à un seul fichier

### Choisir une police lisible
```

- **Commande.** Une décision par titre de niveau 2. Elle compte ici une décision, « 2026 — Évolutions », datée par la ligne `### [2026-03-10]`.
- **Lecteur.** Deux décisions, dont la seconde sans date.
- **Proposition.** La commande reprend la règle du lecteur. Un titre de niveau 2 est une décision quand il commence par une date ou par un identifiant comme `ADR-005`, quand un champ `**Date**` ou `**Statut**` précède son premier titre de niveau 3, ou quand sa section n'a aucun titre de niveau 3. Sinon c'est un groupe, et chacun de ses titres de niveau 3 est une décision.

### 6. L'endroit où se lit la date d'une décision

```markdown
## Garder un fichier SQLite

Adopté le 2026-03-10.
```

Le second cas est un fichier `docs/decisions/001-2026-03-10-sqlite.md` qui ne porte aucune autre date.

- **Commande.** Une date écrite n'importe où dans le titre, dans les cinq premières lignes de la section, dans le nom du fichier ou dans ses dix premières lignes suffit. Les deux décisions sont datées.
- **Lecteur.** La date se lit à quatre endroits, dans cet ordre. Ce sont le champ `date` de l'en-tête YAML, le champ `**Date**`, le début du titre et le début du nom du fichier. Les deux décisions sont sans date.
- **Proposition.** La commande se limite à ces quatre endroits. Le dashboard trie les décisions par leur date et doit savoir laquelle est la bonne.

### 7. Une décision illisible

Un fichier de `docs/decisions/` sans droit de lecture, ou ce dossier lui-même.

- **Commande.** Le fichier se lit comme un fichier vide et donne une décision sans date. Le dossier se lit comme un dossier vide.
- **Lecteur.** Il signale une erreur, `unreadable_file`.
- **Proposition.** La commande signale l'erreur.

### 8. Un répertoire nommé `PLAN.md`

- **Commande.** « PLAN.md est absent du projet. »
- **Lecteur.** « PLAN.md existe mais n'a pas pu être lu. »
- **Proposition.** Aucune. Les deux échouent, et seul le message change.

### 9. Une tâche à l'état hors de la liste

```markdown
| 2 | **Prêter.** | Camille prête un livre. | bloqué |
| 2 | **Relancer.** | La page liste deux retards. | à faire |
| 3 | **Imprimer.** | | bloqué |
```

- **Commande.** La ligne à l'état inconnu sort de la liste. Elle signale les deux états, sans le numéro en double ni le « Fini quand » vide.
- **Lecteur.** La tâche reste dans la liste avec l'état `unknown`. Il signale les deux états, le numéro en double et le « Fini quand » vide.
- **Proposition.** La commande garde la tâche pour ses autres contrôles. Le verdict est déjà le même des deux côtés, seul le nombre de manques change.

### 10. Un répertoire nommé comme une décision

Un répertoire `docs/decisions/x.md/`.

- **Commande.** Elle le compte comme une décision sans date.
- **Lecteur.** Il l'ignore.
- **Proposition.** La commande ignore les répertoires.

## Lecture commune à revoir

Dans `DECISIONS.md`, des décisions écrites en titres de niveau 3 sans aucun titre de niveau 2 ne sont lues ni par la commande ni par le lecteur. Les deux signalent « Aucune décision n'est notée », alors que le fichier en contient.

## Ce que le lecteur ne lit pas encore

- **Git.** La commande compare la date de l'état au dernier commit et cherche le commit donné en preuve. Ces deux contrôles viendront dans le dashboard avec la tâche 7 du plan.
- **Les réglages.** La copie de travail du toolkit lit une section « Réglages » dans les consignes du projet. Elle n'est pas enregistrée au commit `8f6ca50`. Le lecteur cherche toujours le dossier à la racine du projet, donc un projet qui le range ailleurs par le réglage « Dossier » sortira sans dossier dans le dashboard.
- **Les messages.** Les manques qui existaient avant le 24 novembre gardent leur phrase d'avant, différente de celle de la commande. Les nouveaux reprennent la phrase de la commande.
