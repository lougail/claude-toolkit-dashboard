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
- **Ce qui manque.** Un seul dossier portable. Le format est fixé depuis le 23 novembre dans le projet `.claude` (tâche 5 du plan), et son essai court jusqu'au 29 novembre.
- **L'écran.** Le dashboard reste une application à part. Un skill pourrait le lancer, ou produire une page HTML de synthèse.

## Vérifié le 24 novembre

La place de marché est Agensi. Ces points viennent de ses pages publiques, lues le 24 novembre.

- **Le paquet.** Un ZIP avec un `SKILL.md` qui porte `name` et `description`. Les dépendances embarquées sont refusées. Chez l'acheteur, chaque script part seul dans un fichier temporaire, donc il ne lit aucun autre fichier du paquet. Le site conseille moins de 20 Ko de logique par script. La commande de contrôle du toolkit pèse 23,6 Ko au commit `8f6ca50`. (https://www.agensi.io/docs/packaging)
- **La revue.** Une analyse de sécurité, un avis d'IA, puis une validation humaine. Le site annonce de quelques heures à 48 heures. (https://www.agensi.io/docs/review-and-approval)
- **L'argent.** L'auteur garde 70 % du prix hors TVA et reste propriétaire de son skill. L'inscription est gratuite et sans exclusivité. Le partage peut changer avec 30 jours de préavis. (https://www.agensi.io/docs/earnings-and-payouts, https://www.agensi.io/terms)
- **L'affiliation.** Elle donne 20 % des achats d'une personne amenée par son lien, pendant 6 mois, pris sur la part du site. Un auteur qui amène l'acheteur de son propre skill touche donc 90 %. (https://www.agensi.io/affiliates)
- **L'audience.** Deux sites d'estimation donnent de 190 000 à 230 000 visites par mois. L'un compte 40 % de visites venues de la recherche, l'autre environ 1 000 visites. Le revenu récurrent suivi pour tout le site est de 38 dollars par mois au 6 novembre. Ce sont des estimations de tiers, et elles ne laissent pas attendre de revenu. (https://grasppy.com/stack/tools/agensi/, https://mrrtrack.com/saas/agensi.io)
- **Dans le toolkit.** Le toolkit de Louis fait tenir le dossier par ses skills `demarrer`, `passation` et `point`, et le contrôle par sa commande. Un skill à publier serait l'emballage de ces pièces dans un seul dossier, avec une commande assez petite pour la place de marché.
- **Avis de l'agent.** Attendre la fin de l'essai du format, le 29 novembre. Publier ne coûte rien, et le revenu à en attendre est faible.
- **Réponse de Louis.** « plus tard », le 24 novembre. La question revient après le relevé du 29 novembre. Elle est la tâche 10 de `PLAN.md`.
