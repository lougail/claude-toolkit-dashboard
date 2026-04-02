---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/__tests__/**"
  - "**/tests/**"
---

# Regles de tests

- Pattern AAA : Arrange, Act, Assert — un bloc logique par test
- Un concept par test — pas de tests "et aussi"
- Noms de tests descriptifs : "should return 404 when user not found"
- Mock les dependances externes (API, DB, services tiers) mais PAS la logique metier
- Tester les cas limites : null, undefined, erreurs reseau, 401/403/404
- Tests independants et idempotents (pas de dependance a l'ordre d'execution)
- Pas de donnees de test hardcodees — utiliser des factories ou fixtures
