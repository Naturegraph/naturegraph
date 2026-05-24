# Auth Roadmap, Reduction des OTP par mail

Date : 2026-05-24
Statut : Backlog, a planifier apres stabilisation beta

## Probleme constate (beta photographes)

Les 4 photographes beta se plaignent d etre systematiquement deconnectes et de devoir redemander un code OTP par mail a chaque retour sur Naturegraph. Friction UX majeure + cout SMTP + risque rate limit Gmail App Password.

## Diagnostic du systeme actuel

Audite le 2026-05-24 dans `src/contexts/AuthContext.tsx`, `src/lib/authStorage.ts`, `src/lib/supabase.ts`.

| Element                      | Etat                                                    | Verdict           |
| ---------------------------- | ------------------------------------------------------- | ----------------- |
| Methode                      | OTP email seul (code 6 chiffres)                        | Pas d alternative |
| persistSession               | true                                                    | OK                |
| autoRefreshToken             | true                                                    | OK                |
| Storage                      | localStorage si Se souvenir coche, sessionStorage sinon | OK                |
| Se souvenir de moi           | Coche par defaut (useState(true))                       | OK                |
| Refresh interval app ouverte | 30 min                                                  | OK                |
| Refresh token lifetime       | Supabase default 30 jours                               | A allonger        |
| OAuth Google / Apple         | Stubbe dans signInWithSocial (ligne 468), jamais active | Le gros levier    |

### Causes des reconnexions forcees

1. Pas d alternative a l OTP (pas de mot de passe, pas de Google, pas de passkey).
2. Refresh token 30j par defaut, un user qui revient apres J+30 = OTP force.
3. Safari iOS ITP, purge localStorage apres 7 jours sans visite si non installe en PWA.
4. Multi device, chaque nouveau navigateur = nouvel OTP inevitable sans OAuth.

## Plan de mitigation par ROI

### 1. Allonger refresh token Supabase (5 min, impact 50%)

Supabase Dashboard, Auth, Sessions.

- JWT expiry : 3600 (1h, default).
- Refresh token lifetime : passer de 30j a 90j.
- Refresh token reuse interval : 10s (default).

Resultat : un user qui revient a J+60 reste connecte. Zero code.

### 2. Activer Google Sign-In (2h, impact 80%)

Le code est deja stubbe dans `AuthContext.tsx` ligne 468 (`signInWithSocial`). Etapes :

a. Supabase Dashboard, Auth, Providers, activer Google, recuperer Client ID + Secret depuis Google Cloud Console (OAuth 2.0 Credentials).
b. Creer la route `/auth/callback` qui capture le hash retourne par Google et appelle `supabase.auth.getSession()`.
c. Brancher le bouton existant dans `src/components/auth/AuthForm.tsx` (deja UI faite, juste appeler `signInWithSocial('google')`).
d. Configurer redirect URLs dans Google Cloud : `https://naturegraph.ca/auth/callback` + preview Vercel.

Resultat : 1 clic, jamais d OTP, Google gere le refresh ~6 mois.

### 3. Apple Sign-In (3h + 99$/an, iOS only)

Idem mais requiert Apple Developer account. A faire seulement si beta iPhone forte.

### 4. Mot de passe optionnel (1 journee)

Apres onboarding, etape facultative Definir un mot de passe. Active `signInWithPassword` deja cable dans `AuthContext.signIn`.

Pour les users qui ne veulent ni OAuth ni OTP.

### 5. PWA install prompt (deja en backlog tache #37)

Safari iOS preserve le storage des PWA installees. Eliminerait la purge ITP 7 jours.

### 6. Passkeys / WebAuthn (2-3 jours)

Face ID, Touch ID, Windows Hello. Etat de l art 2026.
Supabase ne supporte pas nativement, necessite edge function custom + `@simplewebauthn/server`.

## Estimation economie mails

| Setup                       | Mails OTP / mois (100 users) | A 1000 users |
| --------------------------- | ---------------------------- | ------------ |
| Actuel                      | 300-500                      | 3000-5000    |
| + Refresh token 90j         | 150-250                      | 1500-2500    |
| + Google OAuth 80% adoption | 30-50                        | 300-500      |
| + Passkeys                  | 5-10                         | 50-100       |

## Ordre recommande

1. Refresh token 90j (5 min) immediat des que possible.
2. Google OAuth (2h) sprint suivant.
3. PWA install (deja roadmappe).
4. Mot de passe optionnel ou Passkeys selon retour user.

## Fichiers a toucher pour Google OAuth

- `src/contexts/AuthContext.tsx`, remplacer le stub ligne 468.
- `src/router.tsx` ou equivalent, ajouter route `/auth/callback`.
- Nouveau composant `src/pages/AuthCallback.tsx`.
- `src/components/auth/AuthForm.tsx`, brancher les boutons sociaux deja stylises.
- Variables d env Vercel, GOOGLE_CLIENT_ID (cote Supabase pas cote app, donc rien a ajouter cote Vercel).

## References

- Supabase Auth, https://supabase.com/docs/guides/auth
- Refresh token rotation, https://supabase.com/docs/guides/auth/sessions
- Google OAuth setup Supabase, https://supabase.com/docs/guides/auth/social-login/auth-google
