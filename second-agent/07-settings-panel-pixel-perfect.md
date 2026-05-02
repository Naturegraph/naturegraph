# 07 — SettingsPanel pixel-perfect (dernier point MVP)

**Statut :** 🟢 Validé 100%
**Date création :** 2026-05-02
**Date validation :** 2026-05-02
**Auteur :** agent front-end (Safe Local Mode)
**Figma nodes :**

- Panel desktop : 6385:175483 (Frame 1171276250 — container 448px, padding 24px)
- Panel mobile : 6385:175242
- Sub-views (specs détaillées dans le code de chaque sous-composant)

## 🎯 Contexte

Dernier point MVP du cycle profil — page Settings accessible depuis :

1. **Bouton "Paramètres"** du `ProfileHeader` (mode owner)
2. **Item "Paramètres"** du `ProfileMenu` (avatar dropdown navbar)

Panneau latéral 448px desktop / full-page mobile, avec 7 items + footer
(CGU / Politique / version) + 4 sous-vues fonctionnelles.

## 🧱 Structure

```
SettingsPanel (panel container — backdrop + ESC + lock-scroll)
├── Header        : "Paramètres" + bouton X
├── Content
│   ├── SettingsList (liste principale, 7 items)
│   │   ├── Sécurité            → ouvre sub-view 'security'
│   │   ├── Notifications       → ouvre sub-view 'notifications'
│   │   ├── Besoin d'aide ?     → ouvre sub-view 'help'
│   │   ├── Partage tes idées   → lien externe Discord
│   │   ├── Licence             → ouvre sub-view 'license'
│   │   ├── Déconnexion         → ConfirmModal logout
│   │   └── Supprimer compte    → DeleteAccountModal (ConfirmModal danger)
│   └── SettingsSubView
│       ├── SettingsSecurityView   (changement email — magic link)
│       ├── SettingsNotificationsView (3 sections : méthodes / news / fréquence)
│       ├── SettingsHelpView       (formulaire contact + dropdown sujet)
│       └── SettingsLicenseView    (5 sections texte légal)
├── Footer (liste uniquement) : CGU + Politique + App version
└── Modals (overlays z-[60])
    ├── ConfirmModal (logout — variant default)
    └── DeleteAccountModal (suppression — variant danger)
```

## 🤔 Décisions clés

### Container 448px desktop / full-page mobile

- Width 448px (Figma Frame 1171276250) — différent du EditProfilePanel (420px)
- Padding 24px all around (`p-6`)
- Background `--color-bg-primary` (#FFFDF8)
- Shadow `0px 6px 16px -4px rgba(0,0,0,0.1)`
- Mobile : `fixed inset-0` plein écran avec safe-area-inset-top

### Items list (Frame 4707)

- Hauteur 56px (h-14) + gap 32px entre contenu gauche et trailing
- Icon + label gap 16px
- Label : **Quicksand bold 16px line-height 24px** (Title/Button — pas Mulish)
- Trailing : ChevronRight 24px ou ExternalLink 24px
- Séparateur 1px solid `#C4C4CC` (Stroke/Light)
- Hover : pas de bg, juste `text-action-default` (icon + label + chevron via currentColor)
- Item danger ("Supprimer mon compte") : couleur `#9E0F22` fixe sans hover violet

### Footer

- CGU + Politique : Quicksand bold 16px underlined, color `--color-action-default`
  → Phase 1 disabled (contenu juridique Phase 3)
- Version : **dynamique** via `import { version } from '../../../package.json'`
  (Vite tree-shake — pas de surpoids)
- Mulish 400 12px, color `#424747`

### "Partage tes idées" → Discord

- Lien externe vers `https://discord.gg/naturegraph`
- Permet à la communauté de rejoindre Discord et d'échanger directement
  avec l'équipe (Nicolas 2026-05-02)

### Sub-views — patterns DS appliqués

#### Security (changement email magic link)

- Pas de section mot de passe (auth magic link uniquement)
- Champ "Ton ancien courriel" read-only (valeur du compte)
- Champ "Ton nouveau courriel" + `INPUT_PILL_CLASS` (focus primary-light)
- Boutons Annuler + Mettre à jour

#### Notifications (3 sections)

1. **Méthodes** (radio exclusif via switches stylisés) :
   Dans l'application / Par courriel / Aucune notification
2. **Nouvelles et mises à jour** (toggle simple) :
   "Obtenez des informations sur les mises à jour…"
3. **Fréquence** (radio exclusif) :
   Temps réel / Une fois par jour / Une fois par semaine
   (ordre : du plus fréquent au moins fréquent)

→ **Connexion onboarding** : l'onboarding step 2 collecte une `frequency`.
Mapping documenté dans le composant. Phase 2 : table partagée
`user_notification_settings`.

#### Help (formulaire contact)

- Titre "Tu as une question ?" + description
- Dropdown Sujet (5 options) — custom (pas `<select>` natif) avec
  hover/selected primary-light, fermeture au click outside
- Textarea Ton message (min 20 chars)
- Boutons Annuler + Envoyer

#### License (5 sections texte légal)

- Utilisation des contenus
- Droits sur les photos partagées
- Données issues de sources tierces (lien Taxref INPN)
- Respect des droits d'auteur
- Besoin d'en savoir plus ? (lien CGU disabled Phase 1)

### Séparateur 4px edge-to-edge

Cohérence avec le séparateur entre 2 FeedPost mobile (FeedPost.tsx:293
`border-b-4 border-border`). Appliqué entre toutes les sections des
sub-views Settings (`h-1 bg-border`).

### Modals — ConfirmModal générique

- Composant réutilisable `<ConfirmModal>` (`src/components/ui/`)
- Variants : `'default'` (primary) / `'danger'` (red)
- Layout : bottom-sheet mobile, centrée desktop
- Focus initial sur Annuler (a11y — anti-clic accidentel sur Confirmer)
- Escape ferme + click backdrop ferme
- Utilisé par :
  - `DeleteAccountModal` (variant danger — wrapper avec copy)
  - `LogoutModal` direct dans SettingsPanel (variant default)

### Hover violet (sans bg)

Items list : pas de background hover, seul `text-action-default` change
(icon + label + chevron via `currentColor`). Plus subtil et cool, demande
Nicolas 2026-05-02.

### Activation depuis ProfileMenu (avatar dropdown)

Bouton "Paramètres" du `ProfileMenu` (navbar) ouvre directement le
SettingsPanel — accessible depuis toutes les pages, pas seulement le profil
owner. Cohérence avec les autres apps (Twitter, Instagram).

## 🔧 Modifications

### Composants nouveaux

- `src/components/settings/SettingsPanel.tsx` (panel + liste + sub-views internes)
- `src/components/settings/SettingsSecurityView.tsx`
- `src/components/settings/SettingsNotificationsView.tsx`
- `src/components/settings/SettingsHelpView.tsx`
- `src/components/settings/DeleteAccountModal.tsx` (wrapper sur ConfirmModal)
- `src/components/ui/ConfirmModal.tsx` (générique)
- `src/components/ui/ToggleSwitch.tsx` (réutilisable)

### Branchement

- `src/pages/Profile.tsx` — `onSettings` ouvre SettingsPanel (mock + prod)
- `src/components/home/ProfileMenu.tsx` — item Paramètres → ouvre SettingsPanel
  (plus de "Bientôt" disabled)

## ✅ Validation Nicolas (chronologie)

- 2026-05-02 : _"c'est partie quand on clique sur paramètre dans un profil
  on peut ouvrir ce panneau avec l'ensemble des items"_ + Figma
- _"si cela peut aider pour la structure ... cela donne une base"_ (specs CSS Frame 1171276250)
- _"ok ne pas mettre de hover finalement background mais mettre plutôt le
  changement icon, texte et chevron en violet plus cool"_
- _"ceci doit être dynamique en fonction de la maj du produit par la suite"_ (version)
- _"pour le moment ne rien ouvrir ici, on le fera plus tard"_ (CGU / Politique)
- _"ici on ajoute le lien vers le discord"_ (feedback URL)
- _"Voici la modal pour supprimer le compte avec double confirmation,
  pixel perfect et mettre des notes backend sur le fonctionnement"_
- _"Maintenant on va continuer maintenant avec l'onglet sécurité au pixel perfect"_
- _"il va falloir tout connecter ici après avec le backend, on peut cacher
  mot de passe car on a un lien magique"_
- _"Maintenant l'onglet notifications, ne pas oublier que nous appliquons
  déjà des choix en fonction de l'onboarding donc il faudra tout connecter ici"_
- _"une fois par semaine en dernier"_ (fréquence ordre)
- _"mettre le bon séparateur plus gros ici comme feed en mobile"_
- _"Maintenant besoin d'aide au pixel perfect, tu as liste des choix en mobile"_
- _"Et on termine avec licence et droits d'auteur au complet maintenant
  mettre le bon texte"_
- _"ici idem bien déconnecter l'utilisateur avec la modal de confirmation
  pour son départ comme nous avons ailleurs"_
- _"du coup ceci ouvre les paramètres aussi dans le produit même si je ne
  suis pas dans mon profil, on affiche les panneaux tout simplement"_

## 🔁 TODO côté backend (Phase 2 — détail dans 03-profil-backend-notes.md)

### §15 Tables à créer

```sql
-- Préférences de notification globales (méthode + fréquence + product updates)
CREATE TABLE user_notification_settings (
  user_id    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  delivery   TEXT NOT NULL DEFAULT 'in_app'
                  CHECK (delivery IN ('in_app','email','none')),
  frequency  TEXT NOT NULL DEFAULT 'realtime'
                  CHECK (frequency IN ('realtime','daily','weekly')),
  product_updates BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Demandes de suppression de compte (délai 30j)
CREATE TABLE account_deletion_requests (
  user_id        UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for  TIMESTAMPTZ NOT NULL,  -- now() + INTERVAL '30 days'
  reason         TEXT,
  cancelled_at   TIMESTAMPTZ,
  ip_address     INET,
  user_agent     TEXT
);

-- Tickets support (Phase 3 — Phase 2 utilise Discord webhook)
CREATE TABLE support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  subject     TEXT NOT NULL CHECK (subject IN ('technical','help','suggestion','report','other')),
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Audit trail sécurité (changements email, password, suppression compte)
CREATE TABLE security_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL CHECK (event_type IN
                  ('email_change','password_change','account_deletion_request',
                   'account_deletion_cancel','signin','signout_all')),
  ip_address  INET,
  user_agent  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### RPCs / Edge Functions

| Action                 | Endpoint                                | Notes                                                   |
| ---------------------- | --------------------------------------- | ------------------------------------------------------- |
| Changement email       | `supabase.auth.updateUser({ email })`   | 2 magic links auto envoyés                              |
| Suppression compte     | RPC `request_account_deletion(reason?)` | UNIQUE user_id active, anti spam-account 24h, cron J+30 |
| Annulation suppression | RPC `cancel_account_deletion()`         | UPDATE cancelled_at = now()                             |
| Submit help            | Edge Function → Discord webhook         | Anti-spam 3/24h/user, sanitize message                  |
| Update notif settings  | UPSERT user_notification_settings       | Optimistic update React Query                           |

### Hooks React Query à créer

- `useUpdateEmail()` — mutation `supabase.auth.updateUser({ email })`
- `useNotificationSettings()` / `useUpdateNotificationSettings()` — settings globaux
- `useRequestAccountDeletion()` / `useCancelAccountDeletion()`
- `useSubmitHelpRequest()` — Discord webhook

### i18n — ~50 clés à intégrer

`fr.json` / `en.json` (toutes les `defaultValue:` actuelles) — voir audit
agent dans `04-onglets-profil-visiteur.md` pour la liste exhaustive.

## 📋 Checklist Phase 2

- [ ] Appliquer 4 migrations SQL (tables ci-dessus)
- [ ] RLS policies (user own settings + audit owner read)
- [ ] Brancher hooks React Query dans chaque sub-view
- [ ] Toasts via `useToast()` pour erreurs/succès (remplacer `console.warn`)
- [ ] Edge Function Discord webhook + secrets `DISCORD_WEBHOOK_URL`
- [ ] Cron Function `process_pending_deletions` (Supabase Cron daily)
- [ ] Email templates (Supabase Auth + Resend) :
  - Confirmation changement email
  - Demande de suppression reçue + lien d'annulation
  - Rappels J+7, J+15, J+25
  - Confirmation suppression effective
- [ ] Tests E2E Playwright (changement email, logout, suppression flow)
- [ ] ~50 clés i18n complétées dans fr.json / en.json
- [ ] Focus trap dans modals (a11y) — utilisation de focus-trap-react
- [ ] Navigation clavier flèches dans dropdown Help (WAI-ARIA listbox)

## 📂 Fichiers touchés

```
src/components/settings/SettingsPanel.tsx          (panel + liste + sub-views)
src/components/settings/SettingsSecurityView.tsx   (changement email)
src/components/settings/SettingsNotificationsView.tsx (3 sections)
src/components/settings/SettingsHelpView.tsx       (form contact + dropdown)
src/components/settings/DeleteAccountModal.tsx     (wrapper ConfirmModal danger)
src/components/ui/ConfirmModal.tsx                 (NOUVEAU générique)
src/components/ui/ToggleSwitch.tsx                 (NOUVEAU réutilisable)
src/components/home/ProfileMenu.tsx                (active item Paramètres)
src/pages/Profile.tsx                              (state + render SettingsPanel)
second-agent/03-profil-backend-notes.md            (§14-15 EditPanel + Settings)
second-agent/07-settings-panel-pixel-perfect.md    (cette doc)
```
