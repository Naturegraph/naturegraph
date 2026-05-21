# Roadmap V2+ — Naturegraph

> Pistes d'évolution post-V1 (2026-05-15).
>
> ⚠️ Cette roadmap n'est PAS un engagement. Elle liste les axes d'évolution
> identifiés lors des audits cycle 3. Priorités à valider avec Nicolas
> selon les retours des premiers beta testers.

---

## 🎯 Règles de versioning post-V1

| Type de changement              | Versioning                      |
| ------------------------------- | ------------------------------- |
| Bug fixes invisibles            | `1.0.x` patch (1.0.1, 1.0.2, …) |
| Améliorations mineures UX/perf  | `1.0.x` patch                   |
| Nouvelle feature notable        | `1.x.0` minor (1.1.0, 1.2.0)    |
| Refonte UX/architecture majeure | `x.0.0` major (V2.0.0, V3.0.0)  |

**Aucun nouveau "V2" ne sera créé sans :**

- Nouvelle architecture majeure
- Refonte UX significative (ex: changement design system, navigation totale)
- Évolution business majeure (ex: passage gratuit → freemium)
- Big feature qui change la nature du produit

---

## 🟢 Phase 2 — Court terme (1-2 mois)

### Backend completions

- **Upload photos via Storage** : finaliser le workflow MediaUploader + EXIF strip + thumbnail generation
- **Identifications collaboratives** : RLS + workflow proposition → vote → consensus
- **Suppression / édition de posts** : DELETE + UPDATE endpoints avec confirmation
- **Follow system** : implémenter `follows` table + queries fan-out
- **Recherche full-text** : pgroonga ou tsvector PostgreSQL

### Infra

- **Domaine custom Vercel** : `naturegraph.ca` ou `naturegraph.ca` (action manuelle Nicolas)
- **HaveIBeenPwned protection** activée dans Supabase Auth
- **OTP expiry** : 600s → 120s
- **SMTP custom** : Gmail ou Resend au lieu du SMTP Supabase
- **Edge Functions secrets** : `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM` configurés en prod

### UX polish

- 7 LOW issues responsive non corrigées en V1 (cosmétique)
- Animations micro-interactions (motion subtil)
- Skeleton loaders sur toutes les pages async

---

## 🟡 Phase 3 — Moyen terme (3-6 mois)

### Features produit

- **Dark mode** : activer le toggle (architecture déjà en place dans `useTheme`)
- **OAuth providers** : Google + Apple (UI commentée, à réactiver)
- **PWA installable** : service worker offline-first
- **Stats utilisateurs avancées** : RPC Supabase pour insights observers
- **Carnets de terrain (Notebooks)** : workflow complet (create/edit/share)
- **Identifications expertes** : système de réputation + badges

### Qualité produit

- **EN fully translated** : 1 214 clés présentes mais qualité linguistique à valider par locuteur natif
- **Tests E2E Playwright** : élargir la couverture (actuellement minimaliste)
- **Storybook** : composants UI documentés (stratégie déjà draftée dans archive)
- **Sentry monitoring** : activer en prod avec `VITE_SENTRY_DSN`

### Infra advanced

- **Migration `postgis`/`pg_trgm`/`unaccent`** du schema `public` → `extensions` (destructif, maintenance window)
- **Read replicas Supabase** pour scaling lectures
- **CDN images** : Cloudflare Images ou similaire pour optimisation auto + variants

---

## 🔵 Phase 4 — Long terme (6-12 mois)

### Évolution produit majeure (candidate V2.0.0)

- **Application mobile native** (React Native ou Capacitor)
- **Cartographie observations** : MapLibre + tuiles biodiversité
- **Espèces fiches enrichies** : descriptions, photos communautaires, distributions
- **Programme partenaires** : naturalistes pro, associations, parcs
- **API publique** : exposer les observations CC-BY (Inspire) avec quota

### Monétisation (candidate V2.0.0)

- **Plan Premium** : abonnement avec features avancées (export HD, stats détaillées, accès API)
- **Payment Stripe** : workflow checkout + webhooks

### Communauté

- **Discussions / groupes thématiques** (oiseaux, botanique, mycologie…)
- **Événements / sorties** : organisation + agenda communautaire
- **Programme ambassadeurs** : badges + outils dédiés

---

## 🚨 Items NE PAS faire (anti-roadmap)

Pour éviter le scope creep, voici ce qu'on N'aborde PAS sans validation produit :

- ❌ Réseau social classique (likes/comments en masse) — focus reste **biodiversité ciblée**
- ❌ Système de chat / messagerie directe — risque modération démesuré
- ❌ Stories / Reels — hors mission éco-conception
- ❌ Algorithme For You agressif — éthique platform doit primer
- ❌ Notifications push intrusives — RGPD + sobriété numérique

---

## 📊 Bonnes pratiques pour évoluer

1. **Toujours commencer par mesurer** (analytics, retours user) avant de coder
2. **Toujours faire un audit pré-launch** (cycle 3 = template à reproduire)
3. **Pas de feature sans PRD** documenté dans `docs/PRD_*.md`
4. **Pas de migration sans plan rollback** (Supabase migrations versionnées)
5. **Pas de release sans tag git + GitHub Release**
6. **Pas de tag majeur sans BATCH d'audits complets** (responsive + browser + infra)

---

**Cette roadmap est un guide, pas une promesse. Les priorités émergent du terrain.**
