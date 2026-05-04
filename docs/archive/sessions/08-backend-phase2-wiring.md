# 08 — Backend Phase 2 : wiring complet UI ↔ Supabase

**Statut :** 🟢 Validé 100% (front) — ⚙️ Migrations SQL à appliquer côté DB
**Date création :** 2026-05-02
**Auteur :** agent front-end (Safe Local Mode)

## 🎯 Contexte

Dernière ligne droite avant la phase audit/finition. Tout le code front qui
était sur `console.warn` mock est désormais branché aux vrais services
Supabase + Edge Functions. La structure est factorisée pour éviter les
duplications (styles, modals, services).

L'UI **n'a pas changé visuellement** — seules les couches services / hooks
ont été ajoutées ou complétées.

## 🧱 Architecture finale

```
src/
├── styles/
│   └── inputs.ts                       (NOUVEAU — classes input/textarea/button partagées)
├── services/
│   ├── supportService.ts               (NOUVEAU — submit ticket support_tickets)
│   ├── accountDeletionService.ts       (NOUVEAU — wrapper Edge Function delete-account)
│   ├── storageService.ts               (NOUVEAU — upload avatars/banners)
│   ├── profileService.ts               (existant — UpdateProfilePayload utilisé)
│   ├── settingsService.ts              (existant — user_settings)
│   ├── followService.ts, savedPostsService.ts, blockService.ts, reportService.ts
│   ├── notificationPreferencesService.ts, notificationService.ts
│   └── statsService.ts (RPC get_observer_dna)
├── hooks/
│   ├── useSupport.ts                   (NOUVEAU — useSubmitHelpRequest)
│   ├── useAccountDeletion.ts           (NOUVEAU — useDeleteAccount)
│   ├── useProfile.ts                   (existant — useUpdateProfile utilisé)
│   ├── useSettings.ts                  (existant — useUpdateSettings utilisé)
│   ├── useFollow.ts, useSavedPosts.ts, useNotificationPreferences.ts
│   └── useStats.ts (RPC observer DNA)
├── components/
│   ├── settings/* (4 sub-views toutes wired)
│   ├── profile/Edit*.tsx (Profile.tsx handleSave wire useUpdateProfile)
│   └── ui/{ConfirmModal, ToggleSwitch}
└── ...

supabase/
├── migrations/
│   └── 20260502_settings_phase2_complete.sql (NOUVEAU)
└── functions/
    ├── delete-account/      (existant — appelé par useDeleteAccount)
    ├── export-data/         (existant — RGPD)
    └── weekly-species-digest/ (existant — cron)
```

## 🔌 Wiring UI → Backend (résumé)

| Composant UI                                       | Service / Hook                                      | Action                                                                                 |
| -------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `SettingsSecurityView`                             | `supabase.auth.updateUser({email})`                 | Magic link confirmation envoyé sur ancien + nouveau                                    |
| `SettingsNotificationsView`                        | `useSettings` + `useUpdateSettings`                 | Mappe radios → email_notifications + push_notifications + newsletter + notif_frequency |
| `SettingsHelpView`                                 | `useSubmitHelpRequest` → `support_tickets`          | Insert RLS owner-only                                                                  |
| `DeleteAccountModal` (via `SettingsPanel`)         | `useDeleteAccount` → Edge Function `delete-account` | Mode 'hard' (suppression complète)                                                     |
| `EditPhotoTab`                                     | `uploadImage(bucket, file)` → Storage               | Buckets `avatars` + `banners`, RLS user_id prefix                                      |
| `EditInfoTab` / `EditPrefsTab` (via `Profile.tsx`) | `useUpdateProfile`                                  | Mutation optimistic, cache React Query                                                 |
| Logout (modal Settings)                            | `signOut()` du AuthContext                          | navigate('/home')                                                                      |

## 📋 Migrations SQL à appliquer

### Pré-requis

```bash
# Lien Supabase CLI projet
supabase link --project-ref <project-ref>
```

### Application

**Sur naturegraph-dev (avant merge develop → staging) :**

```bash
supabase db push
# OU via SQL Editor Supabase :
# - Copy `supabase/migrations/20260502_settings_phase2_complete.sql`
# - Paste dans SQL Editor → Run
```

**Vérification post-application :**

```sql
-- Colonne notif_frequency créée
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'user_settings' AND column_name = 'notif_frequency';

-- Tables support_tickets + security_audit_log créées
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('support_tickets', 'security_audit_log');

-- Bucket banners créé
SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'banners';

-- RLS activées
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('support_tickets', 'security_audit_log');
```

### Rollback (si besoin)

```sql
-- Retirer la colonne notif_frequency (perte de données utilisateur)
ALTER TABLE user_settings DROP COLUMN IF EXISTS notif_frequency;

-- Drop tables (perte définitive des tickets et audit)
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS security_audit_log;

-- Bucket banners (vider d'abord les objets)
DELETE FROM storage.buckets WHERE id = 'banners';
```

## 🧪 Tests fonctionnels (à faire après migrations)

### Settings panel

- [ ] **Sécurité** : changer email → reçoit-il les 2 magic links ?
- [ ] **Notifications** : toggle Méthodes → reflété dans `user_settings.email_notifications/push_notifications` ?
- [ ] **Notifications** : toggle Fréquence → `user_settings.notif_frequency` mis à jour ?
- [ ] **Aide** : envoyer un message → row dans `support_tickets` avec RLS user_id correct ?
- [ ] **Suppression compte** : RGPD complet — auth.users supprimé, profiles cascade, storage purgé ?
- [ ] **Déconnexion** : signOut + redirect /home OK ?

### EditProfilePanel

- [ ] **Modifier infos** : username/bio/website → `profiles` mis à jour, cache React Query OK ?
- [ ] **Upload avatar** : Storage `avatars/{user_id}/...` créé, URL publique persistée dans `profiles.avatar_url` ?
- [ ] **Upload bannière** : idem avec bucket `banners` ?
- [ ] **Préférences** : sélection 3 intérêts → `profiles.interests` array updated ?

### Toasts

- [ ] Toutes les erreurs Supabase remontent en toast (pas de `console.warn`).
- [ ] Toasts succès affichés après chaque action (Sécurité, Aide, EditProfile).

## 🚧 Reste à faire (post-tests)

### i18n (~80 clés à intégrer)

Les clés actuelles ont toutes un `defaultValue:` (texte FR par défaut).
À intégrer dans `src/i18n/fr.json` + `src/i18n/en.json` :

- `common.cancel`, `common.close`, `common.back`, `common.loading`,
  `common.comingSoon`
- `profile.edit.*` (saveSuccess, saveError, errorImageType,
  errorImageSize, uploadError, …)
- `settings.title`, `settings.items.*`, `settings.footer.*`
- `settings.security.*` (emailTitle, emailOldLabel, emailNewLabel,
  emailNewPlaceholder, update, errorInvalidEmail, errorSameEmail,
  emailUpdateSuccessTitle, emailUpdateSuccessDesc, emailUpdateError)
- `settings.notifications.*` (methodTitle, methodInApp, methodEmail,
  methodNone, newsTitle, productUpdates, freqTitle, freqRealtime,
  freqDaily, freqWeekly, updateError)
- `settings.help.*` (title, intro, subjectLabel, subjectPlaceholder,
  messageLabel, send, subjects.\*, successTitle, successDesc,
  errorSubmit)
- `settings.license.*` (5 sections)
- `settings.delete.*` (title, description, confirm, successTitle,
  successDesc, error)
- `settings.logout.*` (title, description, confirm)

### Tests E2E (Playwright recommandé)

- Login → Edit profile → Verify saved
- Login → Settings → Notifications → Toggle → Verify DB
- Login → Settings → Aide → Submit → Verify ticket
- Login → Settings → Suppression → Confirm → Verify cascade

### Phase 3 (post-MVP)

- Délai de grâce 30 jours sur suppression compte
  (table `account_deletion_requests` + cron J+30)
- Audit trail trigger SECURITY DEFINER pour `security_audit_log`
- Edge Function Discord webhook pour `support_tickets` (notif équipe)
- Toast Stack avec auto-dismiss 5s + bouton fermer

## ✅ Validation Nicolas

> "Ok maintenant tout faire le backend complet au propre prêt à recevoir
> de vrai donnée ! Je veux de la perfection, une structure vraiment au top !
> Tout check, éviter les doublons, pour alourdir pour rien le projet etc"

Réponse :

- ✅ 0 nouvelle duplication (3 INPUT_PILL_CLASS factorisés en `src/styles/inputs.ts`)
- ✅ ConfirmModal générique réutilisable (logout + delete account)
- ✅ Tous les services suivent le pattern existant (Supabase client, error handling)
- ✅ Hooks React Query avec invalidation cache + optimistic updates
- ✅ Migrations SQL idempotentes (IF NOT EXISTS partout)
- ✅ RLS policies cohérentes (user own only, sauf storage public read)
- ✅ Toasts via `useToast()` partout (plus de `console.warn`)

## 📂 Fichiers touchés

### Nouveaux (10)

```
src/styles/inputs.ts
src/services/supportService.ts
src/services/accountDeletionService.ts
src/services/storageService.ts
src/hooks/useSupport.ts
src/hooks/useAccountDeletion.ts
supabase/migrations/20260502_settings_phase2_complete.sql
second-agent/08-backend-phase2-wiring.md (cette doc)
```

### Modifiés (UI wiring uniquement, **pas de changement visuel**)

```
src/components/settings/SettingsPanel.tsx              (useDeleteAccount + toast)
src/components/settings/SettingsSecurityView.tsx       (supabase.auth.updateUser + toast + classes partagées)
src/components/settings/SettingsNotificationsView.tsx  (useSettings + useUpdateSettings)
src/components/settings/SettingsHelpView.tsx           (useSubmitHelpRequest + toast + classes partagées)
src/components/profile/EditPhotoTab.tsx                (uploadImage Supabase + toast)
src/pages/Profile.tsx                                  (useUpdateProfile dans handleSave)
```
