---
title: "gray-matter garde un texte en cache avant de le lire"
date: "2026-11-23"
---

# gray-matter garde un texte en cache avant de le lire

- **Le piège.** Appelé sans option, `matter(texte)` range le texte dans un cache avant de lire son frontmatter. Si la lecture échoue, le texte reste dans le cache. Le deuxième appel sur le même texte rend alors l'entrée du cache sans lever d'erreur, avec des données vides et le frontmatter brut dans le contenu.
- **Ce que ça donnait ici.** Dans un serveur qui reste lancé, le lecteur du dossier perdait le manque `unreadable_frontmatter` après le premier chargement. Les lecteurs du vault et des steering docs écartaient le fichier au premier chargement et l'affichaient avec son frontmatter brut aux suivants.
- **La correction.** Passer un objet d'options, même vide. `matter(texte, {})` lit le texte à chaque appel. Les trois appels du dépôt le font depuis les commits `c0da1f6` et `4b3b37d`.
- **Le test qui le voit.** Lire deux fois le même fichier au frontmatter invalide et vérifier le résultat de la deuxième lecture.
