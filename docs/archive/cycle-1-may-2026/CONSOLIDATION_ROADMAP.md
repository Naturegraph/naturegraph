# Naturegraph — Roadmap consolidation MVP

> **Version** : 1.0 — 2026-05-04
> **Posture** : tech lead + release manager. Plan séquencé pour stabiliser le MVP avant production.
> **Source** : synthèse de PROJECT_MASTER + AUDIT_TECH_DEBT + AUDIT_GITHUB + CLEANUP_PROJECT + AUDIT_DS + STORYBOOK + NEXT_TASKS.
> **Objectif** : MVP propre, robuste, documenté, scalable. **Pas de feature, pas de release publique**.

---

## TL;DR

**6 phases sur ~3 mois** pour passer de "MVP fonctionnel mais fragile" à "MVP production-ready" :

| Phase     | But                        | Durée       | Effort       |
| --------- | -------------------------- | ----------- | ------------ |
| 1         | Stabilisation critique     | 1 semaine   | 7-8j         |
| 2         | Consolidation UX/UI        | 1 semaine   | 6j           |
| 3         | Cleanup & architecture     | 4 semaines  | 21j          |
| 4         | GitHub & workflows         | 1 semaine   | 5j           |
| 5         | Design System & Storybook  | 3 semaines  | 13j          |
| 6         | Préparation pré-production | 1 semaine   | 5j           |
| **TOTAL** |                            | **~3 mois** | **~57j dev** |

**Étalable sur 3 mois** pour 1 dev solo en parallèle des tâches produit.
**~6 semaines** si 2 devs en parallèle.

---

# 📋 Vue d'ensemble : dépendances entre phases

```
Phase 1 (Fondations)
   │
   ├──→ Phase 2 (UX) ──┐
   │                    │
   ├──→ Phase 3 (Refacto composants) ──┐
   │                                     │
   │                                     ├──→ Phase 5 (DS + Storybook)
   │                                     │
   └──→ Phase 4 (GitHub) ────────────────┘
                                         │
                                         └──→ Phase 6 (Pré-prod)
```

**Règles** :

- Phase 1 **bloquante** pour tout le reste (filet de sécurité)
- Phase 2 peut être en parallèle Phase 3 si 2 devs
- Phase 4 peut être en parallèle Phase 1 (sans dépendance code)
- Phase 5 **dépend** Phase 3 (composants assez petits pour Storybook)
- Phase 6 finalise tout

---

# PHASE 1 — Stabilisation critique (1 semaine, ~7-8j dev)

## 🎯 Objectifs

- Filet de sécurité : tests E2E + types stricts + CI gates
- Aucune nouvelle feature ne casse les flows existants
- Fondation solide pour refactors suivants

## 📋 Tâches

| ID  | Tâche                                                                     | Effort | Pré-requis |
| --- | ------------------------------------------------------------------------- | ------ | ---------- |
| 1.1 | Régénérer `src/types/supabase.ts` (inclut posts_public + tables récentes) | 30 min | —          |
| 1.2 | Fix les 22 casts `as unknown as` un par un                                | 1-2j   | 1.1        |
| 1.3 | Étendre CI sur push `staging` (ci.yml triggers)                           | 30 min | —          |
| 1.4 | CI gate : drift detection types ↔ migrations (script bash + step)         | 1j     | 1.1, 1.2   |
| 1.5 | Coverage gate CI > 30% sur services + utils (vitest threshold)            | 4h     | —          |
| 1.6 | Tests E2E Playwright critical path                                        | 2j     | —          |
| 1.7 | Helper `requireSupabase()` centralisé                                     | 4h     | —          |
| 1.8 | Hook `useRequiredUser()` centralisé                                       | 4h     | —          |

## 🔗 Dépendances

- 1.2 dépend de 1.1 (régen types avant fix casts)
- 1.4 dépend de 1.1 + 1.2 (script compare types vs migrations)
- 1.6 peut commencer parallèle (independent)

## ⚠️ Risques

| Risque                                     | Mitigation                                                       |
| ------------------------------------------ | ---------------------------------------------------------------- |
| Régénération types casse des composants TS | Faire 1 PR test sur develop, voir erreurs, fixer progressivement |
| Tests E2E flaky en CI (auth magic link)    | Mocker l'auth en environnement test                              |
| Coverage gate trop strict bloque PRs       | Threshold initial à 25%, augmenter progressivement               |

## ✅ Critère de sortie

- ✅ 0 casts `as unknown as`
- ✅ CI déclenche sur staging
- ✅ CI gate drift TS ↔ DB actif
- ✅ Coverage > 30% sur services + utils
- ✅ 1 test E2E qui couvre signup → upload → delete

---

# PHASE 2 — Consolidation UX/UI (1 semaine, ~6j dev)

## 🎯 Objectifs

- Corriger les bugs UX restants (Phase 1 NEXT_TASKS)
- Créer les primitives d'état manquantes (Empty, Error, Loading)
- Implémenter ContributeEditForm (bouton Modifier observation)

## 📋 Tâches

| ID   | Tâche                                                        | Effort | Pré-requis                      |
| ---- | ------------------------------------------------------------ | ------ | ------------------------------- |
| 2.1  | Implémenter ContributeEditForm + ré-intégrer bouton Modifier | 2j     | —                               |
| 2.2  | Email change avec écran OTP de confirmation                  | 1j     | —                               |
| 2.3  | Toast errors uniformisé (`ToastProvider` + `useToast`)       | 1j     | —                               |
| 2.4  | Skeleton sur feed (remplace Spinner)                         | 4h     | 2.6 (Skeleton component existe) |
| 2.5  | Indicateur progression onboarding (4 étapes visibles)        | 4h     | —                               |
| 2.6  | Spinner pendant uploads photo                                | 2h     | —                               |
| 2.7  | `<EmptyState />` component                                   | 4h     | —                               |
| 2.8  | `<ErrorState />` component                                   | 4h     | —                               |
| 2.9  | `<LoadingState />` component                                 | 4h     | —                               |
| 2.10 | Adopter Empty/Error/Loading partout (remplace ad-hoc)        | 1j     | 2.7, 2.8, 2.9                   |

## 🔗 Dépendances

- 2.10 dépend de 2.7, 2.8, 2.9
- 2.4 dépend de 2.9 (LoadingState avec skeleton)

## ⚠️ Risques

- Toast uniformisé : régression possible sur erreurs existantes → tester chaque flow

## ✅ Critère de sortie

- ✅ Bouton Modifier observation fonctionnel
- ✅ Email change avec OTP
- ✅ EmptyState/ErrorState/LoadingState créés
- ✅ Adoption uniforme dans 5+ endroits clés (feed, profile, settings, notifs, search)

---

# PHASE 3 — Cleanup & architecture (4 semaines, ~21j dev)

## 🎯 Objectifs

- 0 composant > 200 lignes (CLAUDE.md respecté)
- Pattern container/presentational
- Hooks custom pour logique métier
- Sub-components par section visuelle

## 📋 Tâches (ordre simple → complexe)

| ID   | Composant               | Lignes | Plan refacto                                                                        | Effort |
| ---- | ----------------------- | ------ | ----------------------------------------------------------------------------------- | ------ |
| 3.1  | OnboardingStep4         | 667    | Extraire `<UsernameValidator>` + `<BannedCheck>`                                    | 2j     |
| 3.2  | SettingsPanel           | 727    | 4 sous-composants par section + nav controlled                                      | 2j     |
| 3.3  | ContributeEncounterForm | 681    | FormProvider + sub-steps autonomes (react-hook-form)                                | 2j     |
| 3.4  | FeedSection             | 730    | Container/Presentational + `useFeedFilters` hook                                    | 2j     |
| 3.5  | FeedPost                | 756    | Extract `<FeedPostHeader>` `<FeedPostContent>` `<FeedPostActions>` `<FeedPostMeta>` | 2j     |
| 3.6  | SearchPanel             | 594    | Container/Présentationnel                                                           | 1.5j   |
| 3.7  | EncounterStep3          | 574    | Sub-composants                                                                      | 1.5j   |
| 3.8  | EncounterStep2          | 510    | Sub-composants                                                                      | 1.5j   |
| 3.9  | FeedFilterPanel         | 508    | Sub-composants                                                                      | 1.5j   |
| 3.10 | ProfileMenu             | 500    | Sub-composants                                                                      | 1j     |
| 3.11 | PostOptionsMenu         | 486    | Sub-composants                                                                      | 1j     |
| 3.12 | LocationModal           | 462    | Sub-composants                                                                      | 1j     |
| 3.13 | NotificationsPanel      | 460    | Sub-composants                                                                      | 1j     |

## 🔗 Dépendances

- 3.4 (FeedSection) dépend de 3.5 (FeedPost) terminé (FeedSection utilise FeedPost)
- 3.3 (Encounter form) dépend de Phase 5 (forms unification) — optionnel parallèle
- Toutes les autres sont indépendantes entre elles

## ⚠️ Risques

| Risque                            | Mitigation                              |
| --------------------------------- | --------------------------------------- |
| Refacto casse un flow utilisateur | Tests E2E Phase 1 prévient              |
| PR review trop dense              | 1 PR = 1 composant, max 2j de travail   |
| Régression visuelle pixel-perfect | Screenshots Figma avant/après chaque PR |

## ✅ Critère de sortie

- ✅ 0 fichier `src/components/*` > 200 lignes
- ✅ 0 fichier `src/pages/*` > 200 lignes (sauf justifié)
- ✅ Hooks custom : `useFeedFilters`, `useUploadProgress`, `useUsernameValidation`, etc.
- ✅ Build OK + tests OK + CI green

---

# PHASE 4 — GitHub & workflows (1 semaine, ~5j dev)

## 🎯 Objectifs

- Repo niveau pro (templates, labels, CODEOWNERS, dependabot)
- Workflow release automatique (semantic-release ou changesets)
- Documentation GitHub à jour

## 📋 Tâches

| ID   | Tâche                                                               | Effort     | Pré-requis |
| ---- | ------------------------------------------------------------------- | ---------- | ---------- |
| 4.1  | Créer `.github/PULL_REQUEST_TEMPLATE.md`                            | 30 min     | —          |
| 4.2  | Créer `.github/ISSUE_TEMPLATE/bug_report.md` + `feature_request.md` | 30 min     | —          |
| 4.3  | Créer `.github/CODEOWNERS`                                          | 15 min     | —          |
| 4.4  | Créer `.github/SECURITY.md`                                         | 15 min     | —          |
| 4.5  | Créer `.github/dependabot.yml`                                      | 15 min     | —          |
| 4.6  | Créer 14 labels standardisés via gh CLI                             | 30 min     | —          |
| 4.7  | Désactiver merge_commit + rebase_merge dans Settings                | 5 min      | —          |
| 4.8  | Setup release workflow (semantic-release)                           | 1j         | —          |
| 4.9  | Créer premier tag `v0.1.0` + GitHub Release                         | 30 min     | 4.8        |
| 4.10 | CHANGELOG.md auto-généré                                            | inclus 4.8 | 4.8        |
| 4.11 | Setup CodeQL (SAST GitHub)                                          | 30 min     | —          |
| 4.12 | Activer Dependabot security updates                                 | 5 min      | 4.5        |
| 4.13 | Documenter convention TODO `TODO(date, owner, #issue)`              | 30 min     | —          |
| 4.14 | Audit advisors Supabase + Vercel                                    | 1h         | —          |

## 🔗 Dépendances

- 4.9 (premier tag) dépend de 4.8 (setup workflow release)
- 4.10 (changelog) intégré dans 4.8

## ⚠️ Risques

- semantic-release peut être lourd à configurer la première fois → backup plan : changesets (plus simple)

## ✅ Critère de sortie

- ✅ 14 labels créés et utilisés
- ✅ Templates PR/issue effectifs
- ✅ CODEOWNERS auto-assign reviewers
- ✅ Dependabot crée PRs hebdo
- ✅ 1 release tag créé (v0.1.0)
- ✅ CHANGELOG.md auto-généré

---

# PHASE 5 — Design System & Storybook (3 semaines, ~13j dev)

## 🎯 Objectifs

- DS documenté (spec tokens + catalogue primitives)
- Storybook setup avec 38 primitives en story
- Tests visuels CI

## 📋 Tâches

| ID   | Tâche                                                         | Effort | Pré-requis      |
| ---- | ------------------------------------------------------------- | ------ | --------------- |
| 5.1  | Spec tokens documentée (1 source vérité)                      | 2j     | Phase 3 partiel |
| 5.2  | Catalogue primitives `atoms.md`/`molecules.md`/`organisms.md` | 2j     | 5.1             |
| 5.3  | Fusion doublons UI : Switch + ToggleSwitch                    | 4h     | —               |
| 5.4  | Setup Storybook 8 + Vite + addons (a11y, themes)              | 1j     | —               |
| 5.5  | 15 stories atoms (MVP)                                        | 2j     | 5.4             |
| 5.6  | 12 stories molecules                                          | 2.5j   | 5.4             |
| 5.7  | 5 stories organisms                                           | 2.5j   | 5.4             |
| 5.8  | Tests visuels (Chromatic ou Playwright screenshot)            | 1j     | 5.5, 5.6, 5.7   |
| 5.9  | Déploiement Storybook Vercel `storybook.naturegraph.fr`       | 30 min | 5.7             |
| 5.10 | Page DesignTokens.stories.tsx (visualisation tokens)          | 4h     | 5.1             |
| 5.11 | Page Welcome.mdx (onboarding équipe)                          | 4h     | 5.4             |

## 🔗 Dépendances

- **Pré-requis Phase 5** : Phase 3 terminée (composants assez petits pour stories isolées)
- 5.5, 5.6, 5.7 peuvent être en parallèle si plusieurs devs
- 5.8 dépend de toutes les stories

## ⚠️ Risques

- Stories sur composants encore obèses = inutiles → respecter pré-requis Phase 3
- Chromatic coûte $ après 5000 snapshots/mois → alternative Playwright screenshot

## ✅ Critère de sortie

- ✅ 38 primitives en story
- ✅ Tokens documentés (1 source)
- ✅ Storybook déployé Vercel
- ✅ Tests visuels en CI
- ✅ Designer + dev peuvent voir tous les composants en isolation

---

# PHASE 6 — Préparation pré-production (1 semaine, ~5j dev)

## 🎯 Objectifs

- A11Y WCAG AA complet
- Sécurité durcie
- Performance optimisée
- Tests de sécurité automatisés

## 📋 Tâches

### Accessibilité (1j)

| ID  | Tâche                                                                    | Effort |
| --- | ------------------------------------------------------------------------ | ------ |
| 6.1 | Fix A1 : Onboarding multi-select `role="group"` + `aria-pressed`         | 1h     |
| 6.2 | Fix A2 : OTP form 6 inputs `aria-label` + `autocomplete="one-time-code"` | 1h     |
| 6.3 | Fix A3 : OTP timer `aria-live`                                           | 30 min |
| 6.4 | Fix A4 : FAQ accordion `aria-expanded`                                   | 30 min |
| 6.5 | Fix A5 : Burger menu mobile `aria-label`                                 | 15 min |
| 6.6 | Fix A6 : Focus trap modals (boucle complète)                             | 2h     |
| 6.7 | Fix A7 : Step indicator onboarding `aria-current="step"`                 | 30 min |
| 6.8 | Audit Lighthouse + axe-core sur 5 pages clés                             | 2h     |

### Sécurité (2j)

| ID   | Tâche                                                        | Effort |
| ---- | ------------------------------------------------------------ | ------ |
| 6.9  | Tests storage policies (unauthorized access blocked)         | 1j     |
| 6.10 | Magic numbers vérification serveur (uploads)                 | 4h     |
| 6.11 | Banned usernames côté serveur (Edge Function/RPC)            | 4h     |
| 6.12 | Audit advisors Supabase (performance + security)             | 2h     |
| 6.13 | Cleanup 50 RLS policies dupliquées (legacy)                  | 1j     |
| 6.14 | 4 indexes dupliqués DB : DROP doublons                       | 30 min |
| 6.15 | Optimiser `auth.uid()` → `(SELECT auth.uid())` (55 policies) | 2h     |

### Performance (1j)

| ID   | Tâche                                                    | Effort |
| ---- | -------------------------------------------------------- | ------ |
| 6.16 | Compression image client avatars/banners                 | 2h     |
| 6.17 | Conversion WebP côté client                              | 4h     |
| 6.18 | Code-split routes Auth/Profile/Settings                  | 1j     |
| 6.19 | Dynamic import Leaflet (60 KB)                           | 4h     |
| 6.20 | Lazy load `useFollowers`/`useFollowing` (tab Communauté) | 1h     |
| 6.21 | Bundle size budget surveillance auto (alerte > 300 KB)   | 2h     |
| 6.22 | Invalidations React Query ciblées (vs globales)          | 1j     |

### Quick wins (parallèle, 1j)

| ID   | Tâche                                   | Effort |
| ---- | --------------------------------------- | ------ |
| 6.23 | Throttle Hero mouse tracking 30fps      | 30 min |
| 6.24 | Lazy import StatsSidebar mobile         | 1h     |
| 6.25 | Tree-shake lucide-react                 | 2h     |
| 6.26 | Badge "Bientôt" sur onglet Statistiques | 1h     |

## 🔗 Dépendances

- 6.9 dépend de Phase 1 (tests setup)
- 6.13 dépend de Phase 4 (Dependabot pour PRs auto)

## ⚠️ Risques

| Risque                          | Mitigation                            |
| ------------------------------- | ------------------------------------- |
| RLS cleanup casse permissions   | Tester chaque DROP en staging d'abord |
| WebP pas supporté Safari ancien | Fallback JPEG si nécessaire           |
| Code-split LCP regression       | Mesurer Lighthouse avant/après        |

## ✅ Critère de sortie

- ✅ Lighthouse Accessibility > 95
- ✅ axe-core 0 erreur critique
- ✅ Bundle < 280 KB gzip
- ✅ Tests storage policies passants
- ✅ Audit advisors Supabase 0 critique
- ✅ LCP < 2.5s sur mobile 4G

---

# 📊 Synthèse globale

## Timeline visuelle

```
Semaine 1     : Phase 1 (fondations)
Semaine 2     : Phase 2 (UX) + début Phase 4 (GitHub) en parallèle
Semaine 3-6   : Phase 3 (refacto 13 composants)
Semaine 7-9   : Phase 5 (DS + Storybook)
Semaine 10    : Phase 6 (pré-prod)
Semaine 11    : Buffer + tests intensifs
Semaine 12    : Tag v1.0.0 + documentation finale
```

**Total** : ~3 mois calendaire pour 1 dev solo.

## Effort par catégorie

| Catégorie                         | Effort cumul |
| --------------------------------- | ------------ |
| Fondations (tests, types, CI)     | 8j           |
| UX / UI fixes                     | 6j           |
| Refacto composants                | 21j          |
| GitHub / workflows                | 5j           |
| Design System + Storybook         | 13j          |
| Pré-production (A11Y, sécu, perf) | 5j           |
| **TOTAL**                         | **~58j dev** |

## Critères de succès post-roadmap

À la fin de Phase 6 :

- [ ] 0 composant > 200 lignes
- [ ] 0 cast `as unknown as`
- [ ] Coverage tests > 30%
- [ ] Coverage services > 60%
- [ ] Bundle JS < 280 KB gzip
- [ ] Storybook 38 primitives + déployé Vercel
- [ ] WCAG AA 0 fail
- [ ] Tests E2E critical path passing
- [ ] CI gate drift TS ↔ DB
- [ ] Forms unifiés react-hook-form + zod
- [ ] Repo niveau pro (templates, labels, releases)
- [ ] Onboarding nouveau dev : 1 jour vs 1 semaine

---

# 🎯 Sortie de roadmap = état attendu

## Code

- 0 dette technique critique
- Architecture container/presentational propre
- Hooks réutilisables, services isolés
- Tests E2E + unit + visual

## Documentation

- 32+ docs maintenus à jour
- Master index navigable
- Storybook déployé
- CHANGELOG auto-généré

## Process

- Workflow Git pro (templates, labels, CODEOWNERS)
- Releases automatiques avec tags
- Dependabot actif
- Audit advisors trimestriels documentés

## Performance & sécurité

- Bundle optimisé
- WebP + lazy + code-split
- A11Y WCAG AA
- RLS clean + advisors green

## Équipe

- Onboarding 1 jour
- Conventions claires
- Filet de sécurité (tests + CI gates)

---

# 📎 Références croisées

- `docs/PROJECT_MASTER.md` — Source de vérité globale
- `docs/MASTER_TODO.md` — Liste exhaustive par priorité/catégorie
- `docs/AUDIT_GITHUB.md` — Détails Phase 4
- `docs/AUDIT_DESIGN_SYSTEM.md` — Détails Phase 5
- `docs/AUDIT_TECH_DEBT_GLOBAL.md` — Dette technique détaillée
- `docs/CLEANUP_PROJECT.md` — Cleanup post-v1
- `docs/STORYBOOK_STRATEGY.md` — Détails Phase 5 Storybook
- `docs/NEXT_TASKS.md` — Checklist priorisée (vue tâches)

---

**📌 Cette roadmap est le plan de bataille consolidation MVP. À mettre à jour à chaque phase terminée avec status + date + retex.**
