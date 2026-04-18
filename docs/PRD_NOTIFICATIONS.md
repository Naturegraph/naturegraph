# PRD — Gestion des Notifications

> Document de référence pour la mise en place du système de notifications Naturegraph.
> Créé le 2026-04-16. Source : briefing produit + analyse multi-agents (PM/UX/Dev/UI/Nicolas).

---

## 1. Contexte & objectifs

**But produit** : retenir l'utilisateur par des signaux sociaux pertinents sans bruit.

**KPIs MVP** :

- Taux d'ouverture du panel > 40 %
- CTR notif → post > 20 %
- Taux d'unsubscribe digest < 10 %

**Principe directeur** : qualité > quantité. Digest hebdo plutôt que spam individuel pour les espèces.

## 2. Types de notifications (MVP Phase 1)

| Type             | Déclencheur                        | Canal  | Fréquence        |
| ---------------- | ---------------------------------- | ------ | ---------------- |
| `reaction`       | Quelqu'un réagit à un de mes posts | In-app | Temps réel       |
| `follow`         | Quelqu'un commence à me suivre     | In-app | Temps réel       |
| `post` (new)     | Un profil suivi publie un post     | In-app | Temps réel       |
| `species_digest` | Activité sur une espèce suivie     | In-app | Hebdo (lundi 9h) |

**Phase 2** : `comment`, `identification`, push mobile, mentions `@`.
**Phase 3** : personnalisation IA, alertes géolocalisées PostGIS.

## 3. État actuel (baseline — 2026-04-16)

**Existant** :

- Table `notifications` + RLS + types de base
- Service CRUD `notificationService.ts` (list/count/markAsRead/markAllAsRead)
- Hooks React Query + Realtime (`useNotifications`, `useUnreadCount`)
- Composant `NotificationsPanel` (dropdown desktop + bottom sheet mobile)
- Trigger SQL `notify_on_reaction` opérationnel
- `NotificationContext` pour toasts transitoires (ambigu — à renommer)

**Gaps vs PRD** :

- Pas de trigger `notify_on_follow` ni `notify_on_new_post`
- Pas de digest hebdo espèces
- Pas de page `/notifications` dédiée
- Pas de table `notification_preferences`
- Deep-linking non implémenté (reference_id ignoré à la navigation)
- Pas de pagination
- Avatars : initiales seulement
- Pas de regroupement 24h
- i18n : textes FR en dur
- Pas de tests

## 4. Analyse multi-agents

### 🎯 PM

Hiérarchiser sociale (temps réel) vs éditoriale (digest). KPIs ouverture / CTR / unsubscribe. Qualité > quantité.

### 🎨 UX

Deep-link sur clic, regroupement < 24h (Alice + 3 autres), état vide avec CTA, préférences 1 clic depuis panel.

### 💻 Dev

Renommer `NotificationContext` → `ToastContext`. Centraliser triggers SQL. Edge function `weekly_species_digest` + `pg_cron`. Vue `notifications_grouped`. i18n complète. Tests Vitest + Playwright.

### 🖌 UI

Tokens design system respectés. Avatars réels + fallback. Icônes Lucide par type. Skeleton loader. `prefers-reduced-motion`.

### 🌿 Nicolas (Lead Product Designer)

Renforcer le sentiment de communauté bienveillante. Digest espèces = différenciateur vs Instagram/Strava. Pas de push en MVP (batterie + complexité). Opt-in RGPD explicite pour digest.

## 5. Roadmap — Epics & Tasks

### EPIC 1 — Triggers & Backend complet (P1)

- [ ] 1.1 Migration `notify_on_follow` (trigger INSERT follows) — 2h
- [ ] 1.2 Migration `notify_on_new_post` (fan-out followers, SECURITY DEFINER, LIMIT) — 4h
- [ ] 1.3 Table `notification_preferences` + RLS — 2h
- [ ] 1.4 Edge function `weekly_species_digest` (cron lundi 9h) — 6h
- [ ] 1.5 Type `species_digest` ajouté à `NotificationType` — 30min

### EPIC 2 — UI Panel v2 (P1)

- [ ] 2.1 Jointure actor_id/username/avatar via vue SQL — 3h
- [ ] 2.2 Deep-link onClick → reference_type/reference_id — 2h
- [ ] 2.3 Regroupement 24h — 4h
- [ ] 2.4 Skeleton loader + état vide illustré — 2h
- [ ] 2.5 i18n clés `home.notifications.*` FR/EN — 1h
- [ ] 2.6 Icônes Lucide par type (Heart/UserPlus/MessageCircle/Leaf) — 1h

### EPIC 3 — Page dédiée /notifications (P1)

- [ ] 3.1 Route + page `NotificationsPage.tsx` — 3h
- [ ] 3.2 Filtres tabs Tous/Sociale/Espèces/Système — 2h
- [ ] 3.3 Pagination curseur 20/page — 2h
- [ ] 3.4 CTA panel → route — 15min

### EPIC 4 — Préférences utilisateur (P1)

- [ ] 4.1 UI `/settings/notifications` — 4h
- [ ] 4.2 Hook `useNotificationPreferences` — 2h
- [ ] 4.3 Check préférences dans triggers SQL — 3h
- [ ] 4.4 Onboarding opt-in digest hebdo — 2h

### EPIC 5 — Qualité & observabilité

- [ ] 5.1 Renommer `NotificationContext` → `ToastContext` — 1h
- [ ] 5.2 Tests Vitest service + hooks — 3h
- [ ] 5.3 Test Playwright flow complet — 2h
- [ ] 5.4 Logs analytics (panel_opened, notif_clicked, mark_all_read) — 1h

### EPIC 6 (Phase 2 — backlog)

Commentaires, identification collaborative, push mobile (PWA + Web Push API), mentions `@`, digest quotidien optionnel.

### EPIC 7 (Phase 3 — backlog)

Personnalisation IA, alertes espèces rares géolocalisées (PostGIS), digest personnalisé par zone d'intérêt.

## 6. Ordre d'exécution

- **Sprint 1** (MVP P1 core) : 1.1 → 1.3, 2.1 + 2.2 + 2.5, 5.1
- **Sprint 2** (MVP P1 UX) : 1.4 + 1.5, 2.3 + 2.4 + 2.6, EPIC 3
- **Sprint 3** (MVP P1 conformité) : EPIC 4 complet, 5.2–5.4

**Estimation totale MVP P1** : ~55h dev + design.

## 7. Règles techniques

- Tous les triggers en `SECURITY DEFINER SET search_path = public`
- RLS stricte sur `notifications` et `notification_preferences`
- Pagination curseur (`created_at`, `id`) — pas d'offset
- i18n systématique (FR + EN)
- Accessibilité WCAG AA : `role="dialog"`, `aria-modal`, `aria-label`, focus trap
- Éco-conception : pas de polling, Realtime uniquement ; digest batch
- RGPD : opt-in explicite pour digest, opt-out 1 clic

## 8. Liens fichiers

- Panel : `src/components/home/NotificationsPanel.tsx`
- Context toasts (à renommer) : `src/contexts/NotificationContext.tsx`
- Hooks : `src/hooks/useNotifications.ts`
- Service : `src/services/notificationService.ts`
- Migration actuelle : `supabase/migrations/20260413_reactions_notifications.sql`
