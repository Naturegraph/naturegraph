# Audit Dead Code — 2026-05-13 (BATCH 25)

> **Tool** : `knip` v5
> **Refs** : T-087 (composants) + T-088 (services) + T-089 (hooks)
> **Verdict** : 🟢 Pas de code mort critique — la majorite des "unused" est intentionnellement preparee pour Phase 2.

---

## Methodologie

Script `npm run check:dead-code` (knip) configure dans `knip.json` :

- Entry points : `main.tsx`, `App.tsx`, tests, scripts, configs Vite/Vitest/Playwright/ESLint
- Project scope : `src/**/*.{ts,tsx}` + `scripts/**`
- Ignored : `supabase.ts` (auto-genere), mock data, migrations, dist, coverage

## Resultats bruts

- **27 fichiers** marques unused
- **118 exports** marques unused
- **3 dependencies** marquees unused (leaflet, react-leaflet, zod)
- **2 devDependencies** marquees unused (lint-staged, tailwindcss)

## Analyse

### 🟢 Faux positifs — A garder

**Barrel exports (`index.ts`)** : tous les `**/index.ts` sont marques unused car les imports utilisent les chemins directs (`@/components/ui/Button` vs `@/components/ui`). C'est **intentionnel** :

- Permet le tree-shaking optimal
- Reduit le bundle initial
- Standard dans les codebases Vite

→ **Garder** : `src/components/*/index.ts`, `src/contexts/index.ts`, `src/hooks/index.ts`, `src/lib/location/index.ts`, `src/components/profile/tabs/index.ts`, `src/components/templates/index.ts`, `src/types/index.ts`, `src/schemas/index.ts`.

**Helpers crees pour adoption progressive (BATCH 1, 23)** :

- `src/lib/requireSupabase.ts` (T-004) — 26 sites a migrer progressivement
- `src/hooks/useRequiredUser.ts` (T-005) — 46 sites a migrer
- `src/schemas/*.ts` (T-068) — zod schemas prets pour T-069/T-070/T-071
- `zod` dependency — utilisee par les schemas, prete a etre consommee

→ **Garder** : pattern d'adoption progressive documente.

**Composants prets pour Phase 2** :

- `ObservationsMap.tsx` + `observationsMapUtils.ts` + `leaflet`/`react-leaflet` — carte des observations, branchee plus tard
- `SpeciesSearch.tsx` — search avancee, Phase 2
- `ShareProfileSheet.tsx` — partage profil, Phase 2
- `ProfileAbout.tsx` — onglet About profil, Phase 2 (composant present mais non-utilise dans ProfileTabs actuel)
- `TaxrefCredit.tsx` — attribution CC-BY INPN, a brancher dans footer Phase 2

→ **Garder** : code-ready pour Phase 2.

**Hooks prets** :

- `useNearbyFeed.ts` — feed geolocalise, Phase 2

→ **Garder** : ready-to-use.

**Configs/build** :

- `lint-staged`, `tailwindcss` — utilises via pre-commit hooks + Vite plugin (faux positif knip)

→ **Garder** : indispensables.

### ⚠️ Cas a analyser plus tard (S effort dedie)

**Components candidats a suppression** (si confirmes inutilises post-deploy beta) :

- `src/components/auth/AuthPatterns.tsx` — pattern decoratif auth, verifier usage
- `src/pages/Landing/Storytelling.tsx` — section Landing absente du Hero actuel ?
- `src/components/profile/SettingsProfileSection.tsx` — peut-etre remplace par `SettingsProfileView` ?
- `src/types/data.ts` — type orphelin, valider

**Exports a re-evaluer (118 unused exports)** :

- La plupart sont des composants UI primitives (`Alert`, `Card`, `Avatar`, etc.) exportes via barrel `index.ts` mais non-encore consommes
- C'est l'API publique du DS — normal d'avoir des primitives non-utilisees, elles servent aux futurs developpements

→ **Action** : ne PAS supprimer. Re-auditer dans 6 mois post-prod pour identifier les vraiment morts.

## Conclusion

T-087/088/089 = **0 code mort critique a supprimer maintenant**. Le rapport `knip` est utile mais necessite analyse contextuelle (faux positifs = barrel exports + Phase 2 + adoption progressive).

**Recommandation future** :

1. Re-run `npm run check:dead-code` apres 6 mois de prod
2. Confirmer les vrais orphelins par audit manuel
3. Eventuellement integrer en CI mais avec un grand nombre d'`ignore` patterns pour eviter le bruit

Refs : T-087, T-088, T-089 (MASTER_TODO).
