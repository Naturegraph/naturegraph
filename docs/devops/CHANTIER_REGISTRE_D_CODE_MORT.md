# Registre D — Code mort & dépendances (Lot 3 du chantier qualité)

> Preuve de couverture du Lot 3. Source : `npm run check:dead-code` (knip).
> Chaque catégorie a un **verdict**. Mis à jour 2026-08-19.

## Fichiers morts — SUPPRIMÉS (7)

Cluster « location » (ancienne UI de CTA géoloc retirée en Phase 1, fichiers laissés
derrière) + un composant image inutilisé. Vérifiés non atteignables (knip) et non
importés hors du cluster lui-même.

| Fichier                                            | Note                                                 |
| -------------------------------------------------- | ---------------------------------------------------- |
| `components/location/CityAutocomplete.tsx`         | importé seulement par LocationPickerSection (mort)   |
| `components/location/LocationPermissionModal.tsx`  | référencé uniquement en commentaire dans FeedSection |
| `components/location/LocationPickerSection.tsx`    | 0 référence externe                                  |
| `components/location/LocationRadiusSlider.tsx`     | interne au cluster mort                              |
| `components/location/LocationVisibilityToggle.tsx` | interne au cluster mort                              |
| `components/ui/OptimizedImage.tsx`                 | 0 référence                                          |
| `hooks/useLocationCTA.ts`                          | référencé uniquement en commentaire (FeedSection)    |

Le dossier `components/location/` est désormais supprimé. Nettoyé au passage : les
`// import` commentés de FeedSection qui pointaient vers ces fichiers (note du « pourquoi » conservée).

Après suppression : `knip` ne liste plus aucun fichier mort. Build + tests (148/148) verts.

## Gardés intentionnellement (NE PAS supprimer)

- **Exports inutilisés (~120) + types (~82)** : en très grande majorité le **design
  system** (`components/ui/` : Alert, Avatar, Card, Badge, Input, Modal, Tabs…) et la
  **surface d'API** des hooks / query-keys (useFeed, usePost, profileQueryKey…).
  Bibliothèque de composants réutilisables (CLAUDE.md) : on ne « gutte » pas le kit UI
  parce qu'une page ne l'utilise pas encore. **Verdict : gardés.**
- **devDependencies flaggées** (`tailwindcss`, `lint-staged`, `@vercel/node`) :
  **faux positifs** knip. `tailwindcss` est utilisé via `@tailwindcss/vite`/postcss ;
  `lint-staged` via `.husky/pre-commit` ; `@vercel/node` par les fonctions serverless.
  **Verdict : gardés.**

## À traiter à part (tracé, non fait ici)

- [ ] **`pg` dépendance non déclarée** (scripts dev `run-dev-rebuild.mjs` /
      `copy-refdata-prod-to-dev.mjs`) : à ajouter en `devDependencies` (`npm i -D pg`)
      quand on relance ces scripts. Dev-only, zéro impact app -> hors périmètre « retrait ».
- [ ] **Passe fine sur les exports** : quelques exports pourraient être réellement morts
      (ex. `lib/location/geocoding.ts` `reverseGeocode`/`requestBrowserLocation` maintenant
      que le cluster location est parti ; `postSlug.slugify` ; `demoAuth.hasPendingOtp`).
      À vérifier UN PAR UN dans une passe dédiée (ne pas supprimer en masse : risque de
      casser une API interne ou un usage dynamique). Non fait dans ce lot.

## Conclusion

Gain sûr du Lot 3 : **7 fichiers morts supprimés**, dossier `location/` retiré, 0
régression. Le gros des « exports inutilisés » est le design system, gardé à dessein.
Les vrais candidats résiduels (exports isolés, `pg`) sont tracés pour une passe fine.
