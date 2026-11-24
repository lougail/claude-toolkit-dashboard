# Journal

> Trois points par séance. La séance la plus récente est en haut.

## 2026-11-24 (soir)

- **Fait.** Le brief de la tâche 7 est écrit (`tasks/brief-trois-ecrans.md`). Il découpe le travail en cinq morceaux, donne le relevé du jour et liste sept choix qui attendent Louis. La lecture des réglages d'un projet devient la tâche 9. Le fichier des écarts dit que le toolkit a aligné sa commande sur le lecteur (commit `731e5f0` du toolkit). Relancée, la comparaison concorde sur ses 16 dossiers d'essai.
- **Appris.** Sur 101 entrées découvertes, 10 sont des projets à afficher, dont 2 avec un dossier. La liste se trie encore sur les sessions de Claude Code, où la dernière session de ce dépôt date de 235 jours. Les anciennes pages pèsent environ 100 000 caractères à supprimer, donc leur retrait prend deux PR sous la limite du robot de revue. Aucune décision des deux dossiers ne cite une tâche. Trois en-têtes YAML rares se lisent différemment dans le lecteur et dans la commande, et le lecteur date du 2 mars une décision datée du 30 février (`tasks/ecarts-format-dossier.md`, écarts 12 à 14).
- **Bloque.** La tâche 7 attend l'accord de Louis sur le brief. La tâche 6 attend toujours sa lecture des deux plans.

## 2026-11-24

- **Fait.** Le lecteur du dossier suit le format fixé. Il range chaque manque en erreur ou en point à compléter, comme la commande de contrôle. Sur le dossier d'exemple du toolkit, sur ce dépôt et sur le projet pilote, il rend le même verdict qu'elle (tâche 5, commit `7064465`). Les chemins des répertoires cachés se décodent au bon endroit (commit `b311f33`). Ce dépôt a son journal et passe la commande (tâche 6). Le robot de revue n'a pas relu la PR n°3, trop grande pour lui, et un second agent a relu la branche à sa place. Sa relecture a mené à deux commits. Un en-tête ouvert par `---js` n'est plus exécuté (commit `c6af56e`). Le lecteur et le décodeur de chemins ne se bloquent plus sur une longue ligne, une très longue liste ou une boucle de liens symboliques, et les lignes se coupent comme dans la commande (commit `6d93aaa`). Le tout est dans la PR n°3, fusionnée dans `main` (commit `052e4c2`).
- **Appris.** Le lecteur et la commande lisent encore différemment une dizaine de textes rares, comme un titre indenté ou des décisions rangées par groupes. Ils sont notés dans `tasks/ecarts-format-dossier.md`, que le projet `.claude` lit pour aligner la commande. Le toolkit prépare des réglages par projet, pas encore enregistrés, que le lecteur ne lit pas. gray-matter exécute par défaut un en-tête écrit en JavaScript (`vault/insights/2026-11-24-gray-matter-javascript.md`). Le décodeur de chemins respecte les majuscules, une limite notée dans `PLAN.md` pour la tâche 7. Le robot de revue refuse une PR dont le diff dépasse 150 000 caractères. La place de marché qui a écrit à Louis annonce une audience que des estimations publiques confirment à peu près, et son revenu récurrent suivi reste très faible (`vault/ideas/2026-11-23-suivi-de-projet-en-skill.md`).
- **Bloque.** La tâche 6 attend que Louis lise les deux plans. La tâche 4 attend le relevé du 29 novembre, tenu par le projet `.claude`.

## 2026-11-23 (reconstitué depuis git)

- **Fait.** Chaque projet de la liste porte son dossier lu (tâche 3, commit `f3c2164`). La PR n°2 est fusionnée dans `main` avec les tâches 1, 2 et 3. Le projet `.claude` a enregistré le format du dossier et sa commande de contrôle (tâche 5).
- **Appris.** Appelé sans option, gray-matter garde un texte en cache et masque une erreur à la deuxième lecture (`vault/insights/2026-11-23-gray-matter-cache.md`). Sur 88 entrées découvertes, 76 pointent vers un répertoire disparu.
- **Bloque.** Rien.

## 2026-11-22 (reconstitué depuis git)

- **Fait.** Louis a validé la direction. Le dashboard devient le poste de pilotage qui affiche le dossier des projets (`vault/decisions/2026-11-22-dashboard-poste-de-pilotage.md`). La correction d'une date mal lue est enregistrée (tâche 1, commit `a9f228a`). Le lecteur du dossier est écrit et testé (tâche 2, commit `84821e8`).
- **Appris.** Lancé sur les vraies données, Pipeline renvoie une erreur 500 et Activity affiche 0 token. Un lecteur d'essai a montré cinq manques du format, notés dans `PLAN.md`.
- **Bloque.** Rien.
