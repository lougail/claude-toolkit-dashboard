---
title: "Distribuer le suivi de projet sous forme de skill"
date: "2026-11-23"
status: a-explorer
---

# Distribuer le suivi de projet sous forme de skill

- **Origine.** En novembre 2026, une place de marché de skills pour agents propose à Louis de reprendre ce dashboard sous forme de skill. Le 23 novembre, Louis demande si c'est possible.
- **Ce qu'est un skill.** Un dossier avec un `SKILL.md` que l'agent lit pendant une conversation, et des scripts qu'il peut lancer. Tout ce qu'un skill produit passe par la conversation.
- **Ce qui s'y prête.** La méthode que le dashboard affiche. Le skill ferait tenir le dossier du projet par l'agent (`PLAN.md`, `JOURNAL.md`, les décisions), le contrôlerait par un script, et répondrait à « où en est le projet ? » dans la conversation.
- **Ce qui existe déjà.** Le lecteur du dossier (`src/lib/parsers/dossier.ts`, tâche 2 du plan) lit ces fichiers et signale ce qui manque. Il servirait de base au script.
- **Ce qui manque.** Un format fixé. Il est à l'essai jusqu'au 29 novembre et se fixe aux tâches 5 et 6 du plan, dans le projet `.claude`. Le skill se construirait ensuite.
- **L'écran.** Le dashboard reste une application à part. Un skill pourrait le lancer, ou produire une page HTML de synthèse.
