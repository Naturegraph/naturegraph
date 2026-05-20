# Templates Email Naturegraph — Supabase Auth

Templates HTML aux couleurs Naturegraph pour les emails d'authentification Supabase.

## Pourquoi ces templates

Le template par défaut Supabase :

- Utilise `{{ .ConfirmationURL }}` (magic link) au lieu de `{{ .Token }}` (code OTP à 6 chiffres)
- N'a aucune identité visuelle
- Ne rassure pas les nouveaux utilisateurs

L'app Naturegraph utilise `supabase.auth.signInWithOtp()` qui attend que l'utilisateur entre un **code**, pas qu'il clique un lien. Il faut donc forcer l'affichage du token.

## Comment les appliquer

1. Ouvre le dashboard Supabase : https://supabase.com/dashboard/project/hrxgduvworofnrjmgpcj
2. Va dans **Authentication → Email Templates**
3. Pour chaque template listé ci-dessous :
   - Sélectionne le type (`Confirm signup` ou `Magic Link`)
   - Copie-colle le contenu HTML du fichier correspondant
   - Change le **Subject** suivant le tableau ci-dessous
   - Clique **Save**

## Templates à configurer

| Template Supabase  | Fichier               | Subject                                                |
| ------------------ | --------------------- | ------------------------------------------------------ |
| **Confirm signup** | `confirm-signup.html` | `Bienvenue sur Naturegraph — ton code de vérification` |
| **Magic Link**     | `magic-link.html`     | `Ton code de connexion Naturegraph`                    |
| **Invite user**    | `invite-user.html`    | `Ton invitation à la beta Naturegraph`                 |

> **Invite user** : utilisé par l'invitation beta depuis l'admin (waitlist →
> bouton « Inviter »). Variable `{{ .ConfirmationURL }}` = lien d'activation du
> compte. Tant que ce template n'est pas appliqué, l'invité reçoit le template
> Supabase par défaut (fonctionnel mais non brandé).

## Variables Supabase utilisées

- `{{ .Token }}` — Code OTP à 6 chiffres (obligatoire pour notre flow)
- `{{ .Email }}` — Email de l'utilisateur (optionnel)
- `{{ .SiteURL }}` — URL de l'app (optionnel)

⚠️ **Ne pas utiliser `{{ .ConfirmationURL }}`** — ça enverrait un magic link au lieu d'un code.

## Design system appliqué

- **Couleurs** : violet `#5f5dd8` (primary), teal `#006666` (accent), warm `#fffaf0` (bg)
- **Typo** : fallback système (Quicksand/Mulish pas disponibles en email)
- **Layout** : carte centrée, max 560px, coins arrondis 20px
- **Code OTP** : gros, letter-spaced, monospace, encadré violet
- **Bandeau sécurité** : teal, rassure l'utilisateur

## Tests

Après avoir sauvegardé les templates, teste :

1. Inscription nouveau compte → doit recevoir `confirm-signup.html` avec un code à 6 chiffres
2. Login compte existant → doit recevoir `magic-link.html` avec un code à 6 chiffres

Si le code n'apparaît pas dans l'email, vérifie que le template contient bien `{{ .Token }}` et non `{{ .ConfirmationURL }}`.
