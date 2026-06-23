# Auth flow

> Email-only. Pas de SMS. Pas de OAuth en MVP (ajout V1 si besoin).

## Méthodes activées dans Supabase

| Méthode                | Statut    | Usage                                           |
| ---------------------- | --------- | ----------------------------------------------- |
| Email + mot de passe   | ✅ MVP    | Signup / Login standard                         |
| Email OTP (magic link) | ✅ MVP    | Récupération mot de passe + login sans password |
| Google OAuth           | 🔒 V1     | Désactivé tant que la base utilisateurs < 1k    |
| Apple OAuth            | 🔒 V1     | idem                                            |
| Phone / SMS            | ❌ jamais | décision produit                                |

## Diagrammes de flux

### 1. Signup

```
[SignupForm]
   │  email + password
   ▼
supabase.auth.signUp()
   │
   ▼
auth.users (INSERT)        ◀── Supabase
   │
   │  TRIGGER on_auth_user_created
   ▼
public.profiles (INSERT)   ◀── handle_new_auth_user()
public.user_settings       ◀── idem
   │
   ▼
Email de confirmation envoyé
   │
   │  user clique le lien
   ▼
auth.users.email_confirmed_at = now()
   │
   ▼
Session active → redirect /onboarding
```

**Note** : le profil est créé immédiatement avec un `username` provisoire `user_<8chars>`. L'onboarding force la modification dans les premières étapes.

### 2. Login (password)

```
[LoginForm] → supabase.auth.signInWithPassword()
   → JWT stocké dans localStorage (storageKey 'naturegraph-auth')
   → AuthContext déclenche un fetch /profile
   → Redirect /home
```

### 3. Login (magic link)

```
[Login] → supabase.auth.signInWithOtp({ email })
   → email envoyé
   → user clique le lien
   → /auth/callback récupère la session via detectSessionInUrl
   → Redirect /home (ou /onboarding si profil incomplet)
```

### 4. Reset password

```
supabase.auth.resetPasswordForEmail(email, { redirectTo: '/auth/reset' })
   → email magic link
   → user atterrit sur /auth/reset (session temporaire)
   → supabase.auth.updateUser({ password: newPassword })
   → Redirect /login
```

### 5. Logout

```
supabase.auth.signOut()
   → AuthContext clear
   → React Query cache invalidé (queryClient.clear())
   → Redirect /
```

### 6. Suppression de compte (RGPD)

```
[Settings] → confirm modal
   → Edge Function `delete-account` (service_role)
        ├─ supprime auth.users (CASCADE → profiles)
        ├─ anonymise les contenus à conserver (posts gardés sans auteur si user a opté)
        └─ supprime les médias dans Storage
   → Email de confirmation envoyé
   → Session locale clear
```

> **Pourquoi une Edge Function** : `auth.users` ne peut pas être muté depuis le client (anon key). On délègue à une Edge Function authentifiée par JWT du user demandeur, qui appelle `auth.admin.deleteUser()` après vérification. Voir `security/data-protection.md`.

## AuthContext (côté React)

`src/contexts/AuthContext.tsx` :

```ts
const AuthContext = createContext<{
  user: User | null
  profile: Profile | null
  isLoading: boolean
  signOut: () => Promise<void>
}>(...)
```

- Source : `supabase.auth.onAuthStateChange()` + un fetch initial du profil.
- Le profil est aussi cacheable via `useProfile(user.id)` mais le contexte garde une copie pour l'accès synchrone (sidebar, navbar).
- Au logout, `queryClient.clear()` purge tout.

## Sécurité : checklist

- [x] **Email confirmation obligatoire** (Supabase setting `mailer_autoconfirm = false`)
- [x] **Rate limit** sur `/signup`, `/signin`, `/recover` (Supabase built-in : 30 req/h par IP)
- [x] **Politique de mot de passe** : 8+ caractères, vérifiée côté client + Supabase
- [x] **Tokens JWT** : durée 1h (access) + refresh token 30 jours, rotation automatique
- [x] **CAPTCHA hCaptcha** : à activer en V1 sur signup public (option Supabase Auth)
- [ ] **2FA TOTP** : V1.5 (Supabase l'expose nativement)
- [x] **Session storage** : `localStorage` (persistence offline) ; cookies `httpOnly` non utilisables car SPA pure
- [x] **CORS** : restreint aux domaines `localhost:5173`, preview Vercel staging, `naturegraph.ca`
