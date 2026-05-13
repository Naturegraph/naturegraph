# Naturegraph — Plan d'exécution prioritaire (NEXT TASKS)

> **Version** : 1.0 — 2026-05-04
> **Source** : synthèse de `PROJECT_MASTER.md` + `AUDIT_TECH_DEBT_GLOBAL.md` + bugs récents observés en test direct
> **Posture** : engineering only. Pas de produit / features / release talk.
> **Lecture cible** : checklist actionable à dérouler dans l'ordre. Cocher au fur et à mesure.
> **Mise à jour** : à chaque tâche complétée, marquer ✅ + date.

---

## 🚨 BLOQUANTS ACTIFS — Vérifier en premier

### Vérification post-déploiement (5 min)

- [ ] **B0** — Vérifier prod `naturegraph.fr` : les 3 posts s'affichent avec titres distincts, habitat emoji, masonry sans vide (hard refresh nécessaire)
- [ ] **B1** — Vérifier Vercel deployment : dernier commit bien déployé

### Bugs UX corrigés en session — à valider 100% OK sur prod

- [x] Bouton "Modifier observation" caché du menu
- [x] Notifications catch-up sur follow
- [x] Titre DB respecté (UI utilise `item.title`)
- [x] Habitat affiché avec emoji
- [x] Format paysage/carré respecté (`pickTempFormat` retiré)
- [x] Layout Masonry profil (CSS columns)
- [x] Vue `posts_public` expose `title` + `display_format`
- [x] Migration `display_order_positive` legacy DROP

→ Si tout coche en prod, passer à Phase 0.

---

## 🔴 PHASE 0 — Fondations techniques (1 semaine, ~7-8j dev)

> **But** : filet de sécurité avant tout refacto. Tâches dépendantes — à faire dans l'ordre.

- [ ] **F1** — Régénérer `src/types/supabase.ts`
  - Commande : `npx supabase gen types typescript --project-id hrxgduvworofnrjmgpcj > src/types/supabase.ts`
  - Effort : 30 min
  - Bénéfice : inclut `posts_public.title` + `display_format` + tables récentes (`support_tickets`, `security_audit_log`, `community_photos`)

- [ ] **F2** — Fix les 22 casts `as unknown as`
  - Effort : 1-2j
  - Bénéfice : types stricts, drift TypeScript ↔ DB résolu
  - Pré-requis : F1 fait

- [ ] **F3** — Ajouter CI sur push `staging`
  - Fichier : `.github/workflows/ci.yml`
  - Modif : `branches: [develop, staging, main]` dans `on.push` et `on.pull_request`
  - Effort : 30 min
  - Bénéfice : détecte régression UAT avant prod

- [ ] **F4** — CI gate : drift detection types ↔ migrations
  - Effort : 1j
  - Script : compare `supabase.ts` généré vs `migrations/` dir, fail si désynchro
  - Bénéfice : empêche nouvelle dérive

- [ ] **F5** — Coverage gate CI > 30% sur `src/services/` et `src/utils/`
  - Effort : 4h
  - Vitest configure + threshold dans `vitest.config.ts`

- [ ] **F6** — Tests E2E Playwright critical path
  - Effort : 2j
  - Scénario : signup magic link → onboarding 4 steps → upload encounter → réaction → delete account
  - Bénéfice : couvre les 10 bugs récents

- [ ] **F7** — Helper `requireSupabase()` centralisé
  - Effort : 4h
  - Élimine 26 occurrences `if (!supabase) throw`

- [ ] **F8** — Hook `useRequiredUser()` centralisé
  - Effort : 4h
  - Élimine 46 occurrences `getCurrentUser()` pattern

---

## ⚡ QUICK WINS — Intercaler entre les phases (~5h cumul)

> Petites tâches isolées, gain immédiat, à faire n'importe quand.

- [ ] **Q1** — Throttle Hero mouse tracking 30fps (`Landing/Hero.tsx:180`) — 30 min — UX mobile + batterie
- [ ] **Q2** — Standardiser stratégie merge (squash partout via GitHub Settings) — 30 min — Drift staging↔main éliminé
- [ ] **Q3** — Branch protection rules formalisées (require approvals, linear history) — 1h — Sécurité Git
- [ ] **Q4** — Lazy import StatsSidebar mobile — 1h — -2 KB bundle mobile
- [ ] **Q5** — Tree-shake lucide-react — 2h — -8 KB bundle
- [ ] **Q6** — Convention TODOs `TODO(YYYY-MM-DD, owner, #issue): description` — 1h — Tracking dette
- [ ] **Q7** — Badge "Bientôt" sur onglet Statistiques profil — 1h — Clarté UX
- [ ] **Q8** — Cleanup `naturegraph-make/` si existe encore en local — 5 min

---

## 🟠 PHASE 1 — Bug fixes restants + UX (1 semaine, ~6j dev)

### Features manquantes UX critique

- [ ] **P1-1** — Implémenter `ContributeEditForm` (bouton Modifier observation Phase 2)
  - Effort : 2j
  - Sous-tâches :
    - Modifier `Contribute/index.tsx` pour détecter `?edit=postId`
    - Fetch post existant + médias
    - Pré-remplir form
    - Submit appelle `updatePost` au lieu de `createPost`
    - Réintégrer le bouton dans `PostOptionsMenu`

- [ ] **P1-2** — Email change avec écran OTP de confirmation (B4 audit flows)
  - Effort : 1j
  - Sans l'écran OTP, l'utilisateur croit son email changé mais Supabase attend la confirmation

- [ ] **P1-3** — Toast errors uniformisé (système global vs ad-hoc)
  - Effort : 1j
  - Créer `ToastProvider` + `useToast` utilisé partout

- [ ] **P1-4** — Skeleton sur feed (vs Spinner actuel) — 4h — Cohérence DS
- [ ] **P1-5** — Indicateur progression onboarding (4 étapes visibles) — 4h — Réduit les abandons
- [ ] **P1-6** — Spinner pendant uploads photo (visible) — 2h — Évite "ça marche pas"

### Composants primitifs manquants

- [ ] **P1-7** — `<EmptyState />` component (icon + titre + sous-titre + CTA) — 4h
- [ ] **P1-8** — `<ErrorState />` component (icon + message + bouton retry) — 4h
- [ ] **P1-9** — `<LoadingState />` component (skeleton ou spinner selon prop) — 4h
- [ ] **P1-10** — Adopter EmptyState/ErrorState/LoadingState partout (remplace ad-hoc) — 1j

---

## 🔴 PHASE 2 — Refacto composants critiques (3-4 semaines, ~21j dev)

> **Pré-requis** : Phase 0 (tests E2E pour éviter régression).
> Ordre du plus simple au plus complexe.

- [ ] **P2-1** — OnboardingStep4 (667L) — extraire `<UsernameValidator>` + `<BannedCheck>` — 2j
- [ ] **P2-2** — SettingsPanel (727L) — 4 sous-composants par section — 2j
- [ ] **P2-3** — ContributeEncounterForm (681L) — FormProvider + sub-steps autonomes (react-hook-form) — 2j
- [ ] **P2-4** — FeedSection (730L) — Container/Presentational + `useFeedFilters` hook — 2j
- [ ] **P2-5** — FeedPost (756L) — extraire `<FeedPostHeader>` `<FeedPostContent>` `<FeedPostActions>` `<FeedPostMeta>` — 2j
- [ ] **P2-6** — SearchPanel (594L) — container/présentationnel — 1.5j
- [ ] **P2-7** — EncounterStep3 (574L) — sub-composants — 1.5j
- [ ] **P2-8** — EncounterStep2 (510L) — sub-composants — 1.5j
- [ ] **P2-9** — FeedFilterPanel (508L) — sub-composants — 1.5j
- [ ] **P2-10** — ProfileMenu (500L) — sub-composants — 1j
- [ ] **P2-11** — PostOptionsMenu (500L) — sub-composants — 1j
- [ ] **P2-12** — LocationModal (462L) — sub-composants — 1j
- [ ] **P2-13** — NotificationsPanel (460L) — sub-composants — 1j

**Critère sortie** : 0 composant > 200 lignes.

---

## 🎨 PHASE 3 — Design System + Storybook (3 semaines, ~13j dev)

> **Pré-requis** : Phase 2 finie (composants isolables).

### Documentation DS (parallélisable)

- [ ] **P3-1** — Spec tokens documentée (1 source de vérité, élimine 3 couches CSS) — 2j
  - Fichier : `docs/05-design-system/tokens-spec.md`
  - Convention naming + règles d'usage

- [ ] **P3-2** — Catalogue primitives `atoms.md` / `molecules.md` / `organisms.md` — 2j

### Storybook setup

- [ ] **P3-3** — Setup Storybook 8 + Vite + addons (a11y, themes) — 1j
  - `npx storybook@latest init --type react-vite`
  - Config `main.ts` + scripts npm
  - Stories collocated `*.stories.tsx`

- [ ] **P3-4** — 15 stories atoms (MVP) — 2j
  - Button, IconButton, Input, Textarea, Select, Checkbox, Switch, Badge, Tag, Avatar, Spinner, Skeleton, Heading, Text, Divider

- [ ] **P3-5** — 12 stories molecules — 2.5j
  - FormField, Card, FeatureCard, IconCircle, SelectOption, Tooltip, Container, Stack, PaginationDots, StepIndicator, SocialLink, TaxrefCredit

- [ ] **P3-6** — 5 stories organisms — 2.5j
  - Accordion, Alert, Modal, ConfirmModal, Tabs

- [ ] **P3-7** — Tests visuels Chromatic ou Playwright + screenshot — 1j
- [ ] **P3-8** — Déploiement Vercel `storybook.naturegraph.fr` — 30 min

---

## 🔒 PHASE 4 — Sécurité & A11Y (1 semaine, ~5j dev)

- [ ] **P4-1** — A11Y WCAG AA fix (A1-A7) — 1j
  - A1 : Onboarding multi-select `role="group"` + `aria-pressed`
  - A2 : OTP form 6 inputs `aria-label` + `autocomplete="one-time-code"`
  - A3 : OTP timer `aria-live`
  - A4 : FAQ accordion `aria-expanded`
  - A5 : Burger menu mobile `aria-label`
  - A6 : Focus trap modals (boucle complète)
  - A7 : Step indicator onboarding `aria-current="step"`

- [ ] **P4-2** — Tests storage policies (unauthorized access blocked) — 1j
- [ ] **P4-3** — Magic numbers vérification serveur (uploads) — 4h
- [ ] **P4-4** — Banned usernames côté serveur (Edge Function ou RPC) — 4h — sortir du bundle
- [ ] **P4-5** — Audit advisors Supabase (performance + security) — 2h
- [ ] **P4-6** — Cleanup 50 RLS policies dupliquées (legacy + nouvelles cohabitent) — 1j
- [ ] **P4-7** — 4 indexes dupliqués DB : DROP les doublons — 30 min
- [ ] **P4-8** — Optimiser `auth.uid()` → `(SELECT auth.uid())` (55 policies) — 2h

---

## 📝 PHASE 5 — Forms unification (3 jours)

> **Pré-requis** : Phase 2 (ContributeEncounterForm déjà migré).

- [ ] **P5-1** — Schemas zod par flow — 1j
- [ ] **P5-2** — Migration Onboarding → `react-hook-form` + zod — 1j
- [ ] **P5-3** — Migration Settings → idem — 1j

---

## ⚡ PHASE 6 — Performance & éco (1 semaine, ~4j dev)

- [ ] **P6-1** — Compression image client avatars/banners — 2h — -50% upload size
- [ ] **P6-2** — Conversion WebP côté client — 4h — -30% poids
- [ ] **P6-3** — Code-split routes Auth/Profile/Settings — 1j — LCP -200ms
- [ ] **P6-4** — Dynamic import Leaflet (60 KB) — 4h — Bundle plus léger
- [ ] **P6-5** — Lazy load `useFollowers`/`useFollowing` (tab Communauté) — 1h — -2 requêtes
- [ ] **P6-6** — Bundle size budget surveillance auto (alerte > 300 KB) — 2h — Prévention drift
- [ ] **P6-7** — Invalidations React Query ciblées (vs globales) — 1j — Refetch ciblé

---

## 🔁 PHASE 7 — Rituel récurrent (continuel, à formaliser)

### Trimestriel

- [ ] Audit advisors Supabase — 2h
- [ ] Cleanup branches locales mortes — 1h
- [ ] Review TODOs `[BACKEND]` — 1h
- [ ] `npm audit` + update dépendances — 2h

### Mensuel

- [ ] Review bundle size + perf — 1h

### Par release

- [ ] Tag git `release-YYYY-MM-DD` sur main — 5 min
- [ ] Smoke test prod après deploy — 15 min
- [ ] Ajouter ligne dans `RELEASE_READINESS.md` — 5 min

---

## 📊 Tableau récapitulatif

| Phase                       | Effort       | Délai cal.  | Priorité        | Pré-requis      |
| --------------------------- | ------------ | ----------- | --------------- | --------------- |
| **B0-B1** Vérif prod        | 5 min        | Maintenant  | 🔴 Critique     | —               |
| **Phase 0** Fondations      | 7-8j         | 1 semaine   | 🔴 Critique     | —               |
| **Quick Wins** (parallèle)  | 1j           | n'importe   | 🟢 Easy         | —               |
| **Phase 1** Bug fixes UX    | 6j           | 1 semaine   | 🟠 Important    | Phase 0 (idéal) |
| **Phase 2** Refacto         | 21j          | 4 semaines  | 🔴 Critique     | Phase 0 (E2E)   |
| **Phase 3** DS + Storybook  | 13j          | 3 semaines  | 🟠 Important    | Phase 2         |
| **Phase 4** Sécurité + A11Y | 5j           | 1 semaine   | 🟠 Important    | —               |
| **Phase 5** Forms           | 3j           | 1 semaine   | 🟡 Amélioration | Phase 2         |
| **Phase 6** Perf            | 4j           | 1 semaine   | 🟡 Amélioration | —               |
| **Phase 7** Rituel          | continu      | —           | 🟢 Process      | —               |
| **TOTAL**                   | **~60j dev** | **~3 mois** | —               | —               |

---

## 🎯 Critères de succès post-roadmap (3 mois)

| Métrique                    | Avant     | Cible             | État |
| --------------------------- | --------- | ----------------- | ---- |
| Composants > 200 lignes     | 14        | 0                 | ⬜   |
| Casts `as unknown as`       | 22        | 0                 | ⬜   |
| Coverage tests global       | ~2%       | > 30%             | ⬜   |
| Coverage services           | 5%        | > 60%             | ⬜   |
| Bundle JS gzip              | 325 KB    | < 280 KB          | ⬜   |
| Storybook primitives        | 0         | 38 (V1)           | ⬜   |
| WCAG AA fails               | 7         | 0                 | ⬜   |
| TypeScript drift            | Présent   | 0 (CI gate)       | ⬜   |
| Tests E2E critical path     | 0         | 1 (signup→delete) | ⬜   |
| Time to onboard nouveau dev | 1 semaine | 1 jour            | ⬜   |

---

## 🚀 Séquence immédiate recommandée

**Cette semaine** (parallèle au travail produit) :

1. ✅ B0 + B1 — Vérifier prod (5 min)
2. ⬜ F1 — Régénérer types Supabase (30 min)
3. ⬜ Q1 + Q2 + Q3 — 3 quick wins (2h cumul)
4. ⬜ F3 — CI sur staging (30 min)

**Semaine prochaine** : 5. ⬜ F2 — Fix 22 casts (1-2j) 6. ⬜ F6 — Tests E2E critical path (2j) 7. ⬜ F7 + F8 — Helpers centralisés (1j)

**Total semaine 1+2** : ~5j dev → fondation solide pour les refactors suivants.

---

## 📎 Références croisées

- `docs/PROJECT_MASTER.md` — Source de vérité engineering complète
- `docs/AUDIT_TECH_DEBT_GLOBAL.md` — Détails dette technique par catégorie
- `docs/AUDIT_DESIGN_SYSTEM.md` — Détails audit DS
- `docs/STORYBOOK_STRATEGY.md` — Détails plan Storybook
- `docs/AUDIT_FLOWS.md` — Bugs UX par flow + WCAG fails
- `docs/AUDIT_TECHNIQUE.md` — Audit technique v1 historique
- `docs/SYNTHESE_AUDITS.md` — Causes racines RC-A à RC-H

---

**📌 Document à mettre à jour à chaque tâche complétée : cocher la case + ajouter date d'achèvement.**
