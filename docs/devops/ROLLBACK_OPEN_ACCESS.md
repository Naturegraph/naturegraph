# Rollback de l'acces ouvert (kill switch inscriptions), NG-037

> Objectif : couper ou limiter les nouvelles inscriptions en moins de 5 minutes
> en cas d'incident (afflux de bots, abus, faille, surcharge). Ce document dit
> quoi faire, ou, et en combien de temps.
>
> Contexte : l'acces ouvert (NG-029) rend l'app accessible sans cle et
> l'inscription libre. Le flag `OPEN_ACCESS_ENABLED` (`src/lib/featureFlags.ts`)
> est une **constante hardcodee**, pas une variable d'environnement. Et l'ecran
> `/welcome` (beta fermee) a ete physiquement supprime du repo : repasser le flag
> a `false` ne restaure donc PAS la beta fermee complete. Le vrai levier rapide
> est cote Supabase Auth, pas cote flag frontend.

## Niveau 1 : couper les inscriptions immediatement (< 1 min, sans deploiement)

C'est le kill switch a utiliser en priorite en cas d'urgence.

Dashboard Supabase (projet **naturegraph-prod** = `hrxgduvworofnrjmgpcj`) :

1. **Authentication** > **Sign In / Providers** > **Email**.
2. Desactiver **"Allow new users to sign up"** (toggle OFF) > **Save**.

Effet : toute nouvelle inscription (OTP avec creation de compte) est refusee
immediatement. Les comptes existants ne sont pas affectes, la connexion des
membres actuels continue de fonctionner. Reversible en un clic (remettre ON).

Complement possible (si on veut ralentir plutot que couper net) :
**Authentication** > **Rate Limits** > baisser fortement **"Sign-ups and
sign-ins"** (ex: 1 / 5 min par IP) et **"Rate limit for sending emails"**.

## Niveau 2 : messaging / garde-fous frontend (2 a 4 min, redeploiement)

A faire si on veut aussi changer ce que voit l'utilisateur (bandeau, textes,
guards). Ne PAS compter dessus pour l'urgence : c'est plus lent et incomplet.

1. Editer `src/lib/featureFlags.ts` : `export const OPEN_ACCESS_ENABLED = false`.
2. Commit + merge vers `main` (ou `hotfix/xxx` depuis `main` si urgence).
3. Vercel redeploie automatiquement la prod (`naturegraph.ca`) en ~2-3 min.

Limite connue : l'ecran `/welcome` ayant ete supprime, ce retour a `false` ne
recree pas le flux de beta fermee (saisie de cle). Il ajuste les guards et le
messaging cote code, mais une vraie beta fermee exigerait de restaurer
`Welcome.tsx` et sa route (chantier a part, pas un rollback d'urgence).

## Niveau 3 : mettre l'app hors ligne (dernier recours)

Si un incident grave impose de tout stopper :

- **Vercel** > projet prod > Deployments > "Instant Rollback" vers un
  deploiement anterieur sain, ou "Redeploy" / pause du projet.
- En ultime recours seulement : basculer le DNS (Hostinger) hors du site.

## Verification apres rollback

- Tenter une inscription avec une adresse neuve : elle doit etre refusee
  (Niveau 1) ou aboutir a l'etat voulu (Niveau 2).
- Verifier les logs Supabase Auth et le panel admin (volume d'inscriptions).

## Aide-memoire

| Besoin                  | Action                                  | Ou                                            | Delai   |
| ----------------------- | --------------------------------------- | --------------------------------------------- | ------- |
| Couper les inscriptions | Toggle "Allow new users to sign up" OFF | Supabase > Auth > Sign In / Providers > Email | < 1 min |
| Ralentir sans couper    | Baisser les rate limits inscription     | Supabase > Auth > Rate Limits                 | < 1 min |
| Changer le messaging    | `OPEN_ACCESS_ENABLED = false` + deploy  | `src/lib/featureFlags.ts` -> `main` -> Vercel | 2-4 min |
| Tout stopper            | Instant Rollback / pause                | Vercel (puis DNS Hostinger)                   | 2-5 min |
