---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.html"
  - "**/components/**"
  - "**/pages/**"
  - "**/app/**"
---

# Regles d'accessibilite

## Navigation
- Tout le site DOIT etre navigable au clavier
- Focus visible sur tous les elements interactifs
- Skip to main content link en premier element
- Ordre de tabulation logique

## Formulaires
- Chaque input DOIT avoir un label associe (htmlFor/id ou aria-label)
- Messages d'erreur lies a l'input (aria-describedby)
- Pas de placeholder comme seul label

## Couleurs et contraste
- Ratio de contraste minimum 4.5:1 pour le texte normal
- Ratio minimum 3:1 pour le texte large (> 18px bold ou > 24px)
- Ne jamais communiquer une info uniquement par la couleur

## Images et media
- alt="" pour les images decoratives (pas d'alt absent)
- alt descriptif pour les images informatives

## ARIA
- Utiliser les elements HTML natifs d'abord (button, a, nav, main)
- aria-label uniquement quand le texte visible ne suffit pas
- Ne pas surcharger de roles ARIA

## Responsive
- Pas de scroll horizontal sur mobile
- Touch targets minimum 44x44px
- Texte lisible sans zoom (min 16px pour le body)
