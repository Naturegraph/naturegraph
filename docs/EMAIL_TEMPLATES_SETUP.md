# Configuration des emails Naturegraph (BATCH 75-76)

> ⚠️ **CES CONFIGURATIONS SONT MANUELLES — À FAIRE DANS LE DASHBOARD SUPABASE**  
> Tant qu'elles ne sont pas appliquées, les utilisateurs reçoivent le template Supabase par défaut (gradient violet, 10 min, contact@naturegraph.fr — tout faux).
>
> Date : 2026-05-15 · Auteur : Nicolas + Claude  
> Statut : à appliquer manuellement dans le Supabase Dashboard

## Pourquoi ce document

Les emails OTP partent actuellement depuis `noreply@mail.supabase.co`, perçu comme spam ou non identifiable. L'utilisateur ne sait pas si c'est vraiment Naturegraph. Le template inclut aussi un gradient violet hors DS, un délai annoncé incorrect (10 min au lieu de 2), et un email de contact obsolète.

Ce document liste **tout** ce qu'il faut configurer dans le Supabase Dashboard pour avoir :

1. Un OTP qui expire en 2 minutes (valeur affichée et appliquée)
2. Un template HTML moderne respectant la DA (cream + violet + slogan)
3. Un sender `Naturegraph <naturegraph.fr@gmail.com>` pour rassurer l'utilisateur
4. Un email de confirmation après inscription waitlist (place + total)

---

## 1. Réduire l'OTP expiry à 2 minutes

**Chemin :** Supabase Dashboard → Project → **Authentication** → **Sign In / Up** → **Email** → onglet **Email OTP**.

| Champ                | Avant                      | Après               |
| -------------------- | -------------------------- | ------------------- |
| Email OTP Expiration | 3600 (1 h) ou 600 (10 min) | **120** (2 minutes) |

Appliquer **sur les 2 projets** : `naturegraph-dev` ET `naturegraph-prod`.

> Le code dans `src/components/auth/VerificationForm.tsx` doit déjà afficher un timer cohérent. Si le timer affiche encore 10 min côté UI, chercher la constante `OTP_EXPIRY_SECONDS` ou similaire et la passer à 120.

---

## 2. SMTP custom — sender `Naturegraph <naturegraph.fr@gmail.com>`

### Pourquoi

Sans SMTP custom, Supabase envoie depuis `noreply@mail.supabase.co`. Avec le SMTP custom, le `From` devient `Naturegraph <naturegraph.fr@gmail.com>` — l'utilisateur voit immédiatement qui lui écrit et est rassuré.

### Option A — Gmail SMTP (gratuit, suffisant pour la beta)

**Prérequis :** un App Password Gmail (pas le mot de passe principal).

1. Connecte-toi sur https://myaccount.google.com/security
2. Active la 2FA si pas déjà fait
3. Va dans **App passwords** → génère un mot de passe pour "Naturegraph SMTP"
4. Copie le mot de passe (16 caractères) — il ne sera plus affiché

**Chemin :** Supabase Dashboard → **Project Settings** → **Authentication** → onglet **SMTP Settings** → **Enable custom SMTP**.

| Champ                       | Valeur                               |
| --------------------------- | ------------------------------------ |
| Sender email                | `naturegraph.fr@gmail.com`           |
| Sender name                 | `Naturegraph`                        |
| Host                        | `smtp.gmail.com`                     |
| Port                        | `587`                                |
| Username                    | `naturegraph.fr@gmail.com`           |
| Password                    | _(le App Password généré ci-dessus)_ |
| Min interval between emails | `60` (anti-spam)                     |

**Limites Gmail :** 2 000 emails/jour, suffisant pour la beta. Au-delà → migrer vers Resend.

### Option B — Resend (recommandé production)

- 3 000 emails/mois gratuit, illimité scaling, DKIM/SPF/DMARC auto
- Nécessite un domaine vérifié (`naturegraph.fr` quand DNS sera transféré sur Hostinger)
- Setup : créer un compte sur https://resend.com, vérifier le domaine, générer une API key
- Dans Supabase SMTP : Host `smtp.resend.com`, Port `465`, User `resend`, Password = API key

---

## 3. Template email — Magic Link / OTP (BATCH 75)

**Chemin :** Supabase Dashboard → **Authentication** → **Email Templates** → **Magic Link**.

Le template suivant remplace l'ancien (gradient violet, "10 minutes", email obsolète). Il :

- ✅ Pas de gradient — fond cream uniforme + bordure violet
- ✅ Délai correct : "2 minutes"
- ✅ Email contact : `naturegraph.fr@gmail.com`
- ✅ Texte fluide sans saut ligne brutal
- ✅ Slogan en footer
- ✅ Tailles + couleurs DS Naturegraph

### Subject

```
Ton code Naturegraph : {{ .Token }}
```

### HTML body (à coller dans Supabase)

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ton code Naturegraph</title>
  </head>
  <body
    style="
      margin: 0;
      padding: 24px 12px;
      background-color: #f9f6ef;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1f1d36;
    "
  >
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="max-width: 560px; margin: 0 auto;"
    >
      <!-- Header — fond cream + nom + slogan -->
      <tr>
        <td
          style="
            background-color: #ffffff;
            border-radius: 24px 24px 0 0;
            padding: 32px 32px 16px;
            text-align: center;
            border: 1px solid #e9e6dc;
            border-bottom: none;
          "
        >
          <h1
            style="
              margin: 0 0 8px;
              font-size: 28px;
              font-weight: 700;
              color: #1f1d36;
              letter-spacing: -0.5px;
            "
          >
            Naturegraph
          </h1>
          <p
            style="
              margin: 0;
              font-size: 14px;
              color: #6b6982;
              font-style: italic;
            "
          >
            Partageons nos émotions
          </p>
        </td>
      </tr>

      <!-- Corps -->
      <tr>
        <td
          style="
            background-color: #ffffff;
            padding: 24px 32px 32px;
            border-left: 1px solid #e9e6dc;
            border-right: 1px solid #e9e6dc;
          "
        >
          <h2
            style="
              margin: 0 0 16px;
              font-size: 20px;
              font-weight: 700;
              color: #1f1d36;
              text-align: center;
            "
          >
            Bienvenue parmi les migrateurs !
          </h2>
          <p
            style="
              margin: 0 0 24px;
              font-size: 15px;
              line-height: 1.55;
              color: #4a4869;
              text-align: center;
            "
          >
            Pour finaliser ta connexion, entre le code ci-dessous dans l'application.
          </p>

          <!-- Code OTP -->
          <div
            style="
              text-align: center;
              padding: 28px 16px;
              background-color: #f9f6ef;
              border: 1.5px solid #5f5dd8;
              border-radius: 20px;
              margin: 0 auto 20px;
            "
          >
            <p
              style="
                margin: 0 0 12px;
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 1.5px;
                color: #5f5dd8;
                text-transform: uppercase;
              "
            >
              Ton code de vérification
            </p>
            <p
              style="
                margin: 0;
                font-size: 36px;
                font-weight: 700;
                letter-spacing: 12px;
                color: #1f1d36;
                font-family: 'SF Mono', Consolas, 'Liberation Mono', monospace;
              "
            >
              {{ .Token }}
            </p>
          </div>

          <p
            style="
              margin: 0 0 24px;
              font-size: 13px;
              color: #6b6982;
              text-align: center;
            "
          >
            Ce code expire dans <strong>2 minutes</strong>.
          </p>

          <!-- Bloc sécurité -->
          <div
            style="
              background-color: #e7f5ee;
              border-left: 3px solid #2a8e60;
              padding: 14px 16px;
              border-radius: 8px;
              margin: 0 0 24px;
            "
          >
            <p
              style="
                margin: 0 0 4px;
                font-size: 13px;
                font-weight: 700;
                color: #2a8e60;
              "
            >
              🔒 Sécurité
            </p>
            <p
              style="
                margin: 0;
                font-size: 13px;
                color: #1f1d36;
                line-height: 1.5;
              "
            >
              Ne partage jamais ce code. L'équipe Naturegraph ne te le demandera jamais. Si tu n'es
              pas à l'origine de cette demande, ignore simplement cet email.
            </p>
          </div>

          <p
            style="
              margin: 0;
              font-size: 13px;
              color: #6b6982;
              text-align: center;
              line-height: 1.55;
            "
          >
            Naturegraph est un espace pour observer, partager et célébrer la biodiversité. Chaque
            sortie devient un souvenir.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td
          style="
            background-color: #f1eee4;
            padding: 20px 32px;
            border-radius: 0 0 24px 24px;
            text-align: center;
            border: 1px solid #e9e6dc;
            border-top: none;
          "
        >
          <p
            style="
              margin: 0 0 6px;
              font-size: 13px;
              color: #4a4869;
            "
          >
            Besoin d'aide ?
            <a
              href="mailto:naturegraph.fr@gmail.com"
              style="color: #5f5dd8; text-decoration: none; font-weight: 600;"
            >
              naturegraph.fr@gmail.com
            </a>
          </p>
          <p
            style="
              margin: 0;
              font-size: 12px;
              color: #8a8898;
            "
          >
            © 2026 Naturegraph · Plateforme citoyenne biodiversité
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 4. Template email — Confirmation waitlist (BATCH 75)

**Architecture :** la table `beta_waitlist` n'envoie pas d'email automatiquement. Il faut créer une **edge function** déclenchée via webhook DB, qui appelle l'API SMTP (ou Resend) pour envoyer la confirmation.

### Étape 1 — Créer l'edge function

```bash
# Dans le repo
npx supabase functions new send-waitlist-confirmation
```

Coller le code dans `supabase/functions/send-waitlist-confirmation/index.ts` :

```ts
// Triggered par webhook Supabase Database -> INSERT sur beta_waitlist
// Envoie un email de confirmation au nouvel inscrit avec sa position dans la file.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// Option A : envoyer via SMTP Gmail (nodemailer-equivalent en Deno)
// Option B (recommande) : envoyer via Resend
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM = 'Naturegraph <naturegraph.fr@gmail.com>'

Deno.serve(async (req) => {
  const payload = await req.json()
  // payload depuis Supabase Database Webhook (event INSERT beta_waitlist)
  // { type, table, record: { id, email, ... }, schema, old_record }
  const email = payload.record?.email
  if (!email) return new Response('No email', { status: 400 })

  // 1. Recuperer la position dans la waitlist (par ordre d'inscription)
  const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: counts } = await supa
    .from('beta_waitlist')
    .select('id, created_at', { count: 'exact', head: false })
    .order('created_at', { ascending: true })

  const total = counts?.length ?? 0
  const position = counts?.findIndex((r: any) => r.id === payload.record.id) ?? -1
  const rank = position + 1 // index 0 -> position 1

  // 2. Construire le HTML email
  const html = buildWaitlistEmailHtml({ email, rank, total })

  // 3. Envoyer via Resend
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: email,
      subject: 'Tu es sur la waitlist Naturegraph 🌿',
      html,
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    return new Response(`Resend error: ${err}`, { status: 500 })
  }

  return new Response(JSON.stringify({ rank, total }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

function buildWaitlistEmailHtml({
  email,
  rank,
  total,
}: {
  email: string
  rank: number
  total: number
}) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:24px 12px;background-color:#f9f6ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f1d36;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td style="background:#fff;border-radius:24px 24px 0 0;padding:32px 32px 16px;text-align:center;border:1px solid #e9e6dc;border-bottom:none;">
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#1f1d36;">Naturegraph</h1>
      <p style="margin:0;font-size:14px;color:#6b6982;font-style:italic;">Partageons nos émotions</p>
    </td></tr>
    <tr><td style="background:#fff;padding:28px 32px;border-left:1px solid #e9e6dc;border-right:1px solid #e9e6dc;text-align:center;">
      <div style="font-size:48px;margin:0 0 16px;">🌿</div>
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1f1d36;">Tu es sur la waitlist !</h2>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#4a4869;">
        Merci de ton intérêt pour Naturegraph. Tu fais partie des explorateurs qui rejoignent l'aventure.
      </p>

      <div style="background:#f9f6ef;border:1.5px solid #5f5dd8;border-radius:20px;padding:24px 16px;margin:0 0 24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:1.5px;color:#5f5dd8;text-transform:uppercase;">Ta position</p>
        <p style="margin:0 0 4px;font-size:42px;font-weight:700;color:#1f1d36;">
          #${rank}
        </p>
        <p style="margin:0;font-size:13px;color:#6b6982;">
          sur ${total} inscrit${total > 1 ? 's' : ''}
        </p>
      </div>

      <p style="margin:0 0 8px;font-size:14px;color:#1f1d36;line-height:1.55;">
        On t'enverra un email avec ta clé d'accès dès qu'une place se libère.
      </p>
      <p style="margin:0;font-size:13px;color:#6b6982;line-height:1.55;">
        En attendant, retrouve-nous sur Discord pour suivre l'aventure !
      </p>
    </td></tr>
    <tr><td style="background:#f1eee4;padding:20px 32px;border-radius:0 0 24px 24px;text-align:center;border:1px solid #e9e6dc;border-top:none;">
      <p style="margin:0 0 6px;font-size:13px;color:#4a4869;">
        Une question ? <a href="mailto:naturegraph.fr@gmail.com" style="color:#5f5dd8;text-decoration:none;font-weight:600;">naturegraph.fr@gmail.com</a>
      </p>
      <p style="margin:0;font-size:12px;color:#8a8898;">© 2026 Naturegraph · Plateforme citoyenne biodiversité</p>
    </td></tr>
  </table>
</body></html>`
}
```

### Étape 2 — Déployer la function

```bash
npx supabase functions deploy send-waitlist-confirmation --no-verify-jwt
```

### Étape 3 — Configurer le webhook DB

Dashboard → **Database** → **Webhooks** → **Create a new hook** :

| Champ   | Valeur                                                                  |
| ------- | ----------------------------------------------------------------------- |
| Name    | `send_waitlist_confirmation`                                            |
| Schema  | `public`                                                                |
| Table   | `beta_waitlist`                                                         |
| Events  | `INSERT`                                                                |
| Type    | HTTP Request                                                            |
| URL     | `https://<project>.supabase.co/functions/v1/send-waitlist-confirmation` |
| Method  | `POST`                                                                  |
| Headers | `Authorization: Bearer <anon_key>`                                      |

### Étape 4 — Variables d'env de la function

Dashboard → **Edge Functions** → `send-waitlist-confirmation` → **Secrets** :

| Secret           | Valeur              |
| ---------------- | ------------------- |
| `RESEND_API_KEY` | (depuis resend.com) |

---

## 5. Tester end-to-end

1. **OTP** : tester un signup → vérifier que le timer affiche 2 min et que l'email arrive avec le nouveau template
2. **Waitlist** : inscrire un email sur `/waitlist` → vérifier que l'email de confirmation arrive avec la bonne position

---

## Récap des actions Nicolas

- [ ] Dashboard naturegraph-dev → Auth → OTP expiry à 120 s
- [ ] Dashboard naturegraph-prod → idem 120 s
- [ ] Dashboard → Auth → SMTP custom Gmail (App Password + valeurs ci-dessus)
- [ ] Dashboard → Email Templates → Magic Link → coller le HTML ci-dessus
- [ ] (Phase 2) Créer compte Resend + déployer edge function waitlist + créer webhook DB
