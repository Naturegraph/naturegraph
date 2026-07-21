# Templates Email Naturegraph : Supabase Auth

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

| Template Supabase        | Fichier               | Subject                                                |
| ------------------------ | --------------------- | ------------------------------------------------------ |
| **Confirm signup**       | `confirm-signup.html` | `Bienvenue sur Naturegraph : ton code de vérification` |
| **Magic Link**           | `magic-link.html`     | `Ton code de connexion Naturegraph`                    |
| **Change Email Address** | `change-email.html`   | `Confirme ton nouveau courriel Naturegraph`            |
| **Invite user**          | `invite-user.html`    | `Ton invitation à la beta Naturegraph`                 |

> **Change Email Address** : déclenché depuis Réglages → Sécurité
> (`SettingsSecurityView`, appel `supabase.auth.updateUser({ email })`).
> Sans ce template, l'utilisateur reçoit le template Supabase par défaut,
> **en anglais et sans marque**, ce qui ressemble à du hameçonnage juste après
> une action sensible.
>
> Si l'option **Secure email change** est active (Authentication → Sign In /
> Providers), le même template part sur l'ancienne ET la nouvelle adresse, et
> les deux doivent confirmer. Le texte est rédigé pour rester juste dans les
> deux cas. À noter : dans cette configuration, un changement d'email consomme
> **2 emails** du quota Resend journalier.

> **Invite user** : phase d'invitation **close** (décision 2026-07-21, on ne
> relance plus). Template conservé pour mémoire, il n'est plus utilisé.

## Variables Supabase utilisées

- `{{ .Token }}` : Code OTP à 6 chiffres (obligatoire pour notre flow)
- `{{ .Email }}` : Email de l'utilisateur (optionnel)
- `{{ .SiteURL }}` : URL de l'app (optionnel)

- `{{ .NewEmail }}` : nouvelle adresse demandée (template Change Email uniquement)
- `{{ .ConfirmationURL }}` : lien de confirmation

⚠️ **Ne pas utiliser `{{ .ConfirmationURL }}` pour Confirm signup ni Magic Link** :
ça enverrait un lien au lieu d'un code, alors que ces deux écrans attendent la
saisie d'un code à 6 chiffres.

En revanche, **Change Email Address fonctionne bien par lien** : l'interface
affiche « clique sur le lien pour valider » et aucun écran ne permet de saisir
un code de changement d'email. Ce template doit donc utiliser
`{{ .ConfirmationURL }}`, et surtout pas `{{ .Token }}`. La règle ci-dessus
dépend de l'écran, elle n'est pas globale.

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
