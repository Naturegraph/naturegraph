# second-agent — Journal des modifications front-end (cycle Profil utilisateur)

Ce dossier documente **chaque** modification appliquée par l'agent **front-end UX/UI** (mode Safe Local) sur la worktree `claude/loving-shaw-034524`. Il sert de point d'entrée pour l'agent backend lorsqu'il vient inspecter ou poursuivre le travail.

## 🎯 Périmètre du cycle Profil

L'agent travaille **strictement en local** sur :

- UX / UI / Produit du **profil utilisateur** (visiteur, owner, édition, préférences)
- Mock data complets pour itérer sans Supabase pendant la phase build
- Accessibilité (WCAG AA)
- Éco-conception

Il **ne touche pas** à :

- Git (commit, push, PR, branches) — Nicolas regroupe en gros commit final
- Supabase (DB, RLS, migrations, types générés)
- API / authentification / sessions
- Déploiement (Vercel, staging, prod)

Toute autorisation hors périmètre est ponctuelle, explicitement donnée par Nicolas dans le fil de conversation, et tracée dans le fichier de doc concerné.

## 📋 Process de tracking 100%

Chaque modification suit obligatoirement ces étapes :

1. **Création immédiate** d'un fichier de doc numéroté `NN-titre.md` dans ce dossier
2. **Statut** mis à jour à chaque évolution (🟡 → 🟢 ou 🔴)
3. **Validation Nicolas** explicitement notée avec date et citation

### 🚦 Statuts

| Icône | Statut         | Signification                                             |
| ----- | -------------- | --------------------------------------------------------- |
| 🟡    | TEMP / Proposé | Code en place mais non validé. À retirer si non confirmé. |
| 🟢    | Validé 100%    | Nicolas a explicitement validé "à garder". À conserver.   |
| 🔴    | À reprendre    | Bug ou limitation identifié, nécessite intervention.      |
| ⚫    | Annulé         | Modif effectuée puis reverté. Conservé pour historique.   |

### 📝 Structure obligatoire de chaque fichier

```markdown
# NN — Titre court

**Statut :** 🟡 / 🟢 / 🔴 / ⚫
**Date création :** YYYY-MM-DD
**Date validation :** YYYY-MM-DD (si applicable)
**Auteur :** agent front-end (Safe Local Mode)
**Figma nodes :** liste des node IDs liés

## 🎯 Contexte

Pourquoi cette modification est nécessaire (problème, demande utilisateur).

## 🤔 Décision et alternatives

Quelles options ont été envisagées et pourquoi celle-ci a été retenue.

## 🔧 Modifications

Fichiers et zones touchées avec snippets si utile.

## ✅ Validation Nicolas

Citations exactes de la validation/refus de Nicolas avec date.

## 🔁 TODO côté backend

Ce qui reste à faire de l'autre côté (si applicable).

## 🧹 Comment retirer / finaliser

Procédure de cleanup si TEMP.

## 📂 Fichiers touchés

Liste exhaustive.
```

## 🗺️ Plan global du cycle Profil

```
Phase 1 — Refonte base profil VISITEUR + OWNER (terminée)
├── 01 — Setup mock data + analyse                        🟢
├── 02 — ProfileHeader + cards À propos & ADN             🟢
├── 03 — Notes backend (Phase 2 + Settings)               📚 doc référence
├── 04 — Onglets Journal / Inspirations / Communauté       🟢
├── 05 — Profil owner + audit complet + refactor base     🟢
└── 06 — EditProfilePanel pixel-perfect (3 onglets)        🟢

Phase 2 — Backend Supabase
└── Voir 03-profil-backend-notes.md §1-14 (tables, RPC, services, hooks, storage)

Phase 3 — Page Settings (dernier point MVP)
├── PRD à créer : docs/PRD_SETTINGS.md
├── Sections : Compte / Notifs / Confidentialité / Données / Sécurité / Suppression
└── Voir 03-profil-backend-notes.md §15 pour les tables et RPCs

Phase 4 — Polish a11y / i18n / perf
├── Focus trap dans EditProfilePanel + ProfileOptionsMenu
├── Navigation flèches WAI-ARIA dans tablists
└── ~30 clés i18n FR/EN à compléter
```

## 📚 Index des modifications

| #                                              | Sujet                                                                                                                          | Statut       | Date                           | Figma                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| [01](./01-setup-mock-data-profil.md)           | Setup mock data profil + audit composants existants                                                                            | 🟢 Validé    | 2026-05-01                     | —                                                                                                          |
| [02](./02-profile-header-cards-visiteur.md)    | Profile visiteur : Header refactor (horizontal desktop / vertical mobile) + cards À propos & ADN                               | 🟢 Validé    | 2026-05-01                     | 6385:74429, 6385:70500, 6385:71694                                                                         |
| [03](./03-profil-backend-notes.md)             | **Notes backend Phase 2** — schema SQL, RLS, RPC, services, hooks React Query, owner-specific actions                          | 📚 Référence | 2026-05-01 (étendu 2026-05-02) | —                                                                                                          |
| [04](./04-onglets-profil-visiteur.md)          | Onglets Journal nature + Inspirations (FeedGallery reuse) + Communauté + factorisation `<ProfileEmptyState />`                 | 🟢 Validé    | 2026-05-02                     | 6385:77220, 6385:74690, 6385:76765, 6385:73578, 6385:76903, 6385:74108, 6385:77009                         |
| [05](./05-profil-owner-audit-refactor.md)      | Profil owner (Modifier + Paramètres) + suppression posts + audit complet + corrections (10 fixes critiques)                    | 🟢 Validé    | 2026-05-02                     | 6385:77470, 6385:77493                                                                                     |
| [06](./06-edit-profile-panel-pixel-perfect.md) | EditProfilePanel pixel-perfect (3 onglets : Informations / Préférences / Photo de profil) + auto-save photo + full page mobile | 🟢 Validé    | 2026-05-02                     | 6385:75440, 6385:73687, 6385:73715, 6385:75887, 6385:73873, 6385:75904, 6385:75941, 6385:76303, 6385:73995 |

> Mettre à jour ce tableau à chaque ajout / changement de statut.

## 🔍 Pour démarrer côté backend

Le document de référence pour la Phase 2 backend est
[**03-profil-backend-notes.md**](./03-profil-backend-notes.md). Il contient :

1. **§1** — Schéma SQL à enrichir (`ALTER TABLE profiles`, nouvelles tables `follows`, `saved_posts`, `blocks`, `reports`)
2. **§2** — Policies RLS recommandées
3. **§3** — Triggers compteurs dénormalisés (followers_count, etc.)
4. **§4** — RPCs (`get_observer_dna`, `get_profile_stats`)
5. **§5** — Services TypeScript à créer (`profileService`, `savedPostService`, `moderationService`)
6. **§6** — Hooks React Query (`useProfile`, `useToggleFollow`, `useSavedPosts`, `useObserverDNA`)
7. **§7** — Mapping composants UI → endpoints
8. **§8** — Frontend cleanup au switch (retirer flag mock, brancher hooks, etc.)
9. **§9** — Sécurité / privacy
10. **§10** — Performance & éco-conception
11. **§11** — Owner profile actions (`/settings`, delete post, isOwnProfile)
12. **§13** — Checklist au switch backend
