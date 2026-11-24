---
title: "gray-matter exécute un en-tête écrit en JavaScript"
date: "2026-11-24"
---

# gray-matter exécute un en-tête écrit en JavaScript

- **Le piège.** Un fichier markdown dont la première ligne est `---js` ou `---javascript` fait évaluer son en-tête comme du code. gray-matter 4 le fait par défaut.
- **Ce que ça donnait ici.** Le dashboard lit les décisions, le vault et les steering docs de tous les projets trouvés sur la machine, y compris un dépôt cloné. Un fichier piégé dans un tel dépôt exécutait son code dans le serveur du dashboard au chargement d'une page.
- **La correction.** Les trois lecteurs passent par `parseFrontmatter` (`src/lib/parsers/frontmatter.ts`), qui remplace le moteur `javascript` de gray-matter par une fonction qui lève une erreur. Les écritures `js`, `JS` et `--- js` mènent au même moteur. Le fichier se lit alors comme un fichier à l'en-tête invalide. Commit `c6af56e`.
- **Le test qui le voit.** Un en-tête qui écrirait une propriété sur `globalThis`, puis la vérification que cette propriété n'existe pas après la lecture.

