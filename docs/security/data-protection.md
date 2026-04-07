# Data Protection — RGPD & confidentialité

## Cadre légal

Naturegraph traite des données personnelles d'utilisateurs européens : **RGPD** s'applique pleinement. Les principes :

1. **Minimisation** — on ne collecte que le strict nécessaire
2. **Finalité** — chaque donnée a une raison documentée
3. **Consentement** — opt-in explicite pour tout ce qui n'est pas indispensable
4. **Droit d'accès** — export JSON complet à la demande
5. **Droit à l'oubli** — suppression effective sous 30 jours
6. **Portabilité** — export dans un format réutilisable
7. **Sécurité** — chiffrement, accès restreint, audit log

## Données collectées — registre

| Catégorie | Champ | Finalité | Base légale | Rétention |
|---|---|---|---|---|
| Identité | `email` (auth.users) | Authentification, comm | Contrat | Durée du compte + 30j |
| Identité | `username`, `display_name` | Affichage public | Contrat | Durée du compte |
| Profil | `bio`, `avatar_url`, `interests` | Affichage public | Consentement | Durée du compte |
| Localisation | `city`, `region`, `location` | Pertinence feed local | Consentement | Durée du compte |
| Localisation | `posts.location` | Carte des observations | Consentement | Durée du post |
| Contenu | `posts.body`, `comments.body` | Fonctionnalité produit | Contrat | Durée du post |
| Médias | `post_media.storage_path` | Affichage observations | Contrat | Durée du post |
| Métadonnées | `created_at`, `updated_at` | Audit | Intérêt légitime | Durée du compte + 30j |
| Modération | `reports` | Sécurité plateforme | Intérêt légitime | 1 an après résolution |

**EXIF nettoyés avant upload** : GPS, timestamps, device info supprimés côté client par `mediaService` (cf. `media-security.md`). Le user choisit explicitement la localisation à attacher.

## Droits utilisateur — implémentation

### Accès & portabilité

Page `/settings/data` :
- Bouton « Télécharger mes données » → Edge Function `export-data`
  - Récupère : profile, settings, posts, comments, reactions, follows, notebooks
  - Génère un ZIP : `profile.json`, `posts.json`, `media/*.webp`
  - Email avec lien de téléchargement valide 24h

```ts
// supabase/functions/export-data/index.ts
import { createClient } from 'jsr:@supabase/supabase-js'
Deno.serve(async (req) => {
  const jwt = req.headers.get('Authorization')!.replace('Bearer ', '')
  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  )
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  // ... fetch all owned data, build ZIP, upload to private bucket, return signed URL
})
```

### Rectification

Page `/settings/profile` → `useUpdateProfile()`. RLS garantit que seul le user lui-même peut modifier son profil.

### Suppression

Page `/settings/account` → modal de confirmation avec choix :
- **Supprimer tout** (posts, comments, médias) → hard delete
- **Anonymiser** → username devient `deleted_<id8>`, contenu conservé sans auteur identifié

```ts
// supabase/functions/delete-account/index.ts
Deno.serve(async (req) => {
  const { mode } = await req.json()  // 'hard' | 'anonymize'
  const user = await getAuthenticatedUser(req)
  if (!user) return new Response('Unauthorized', { status: 401 })

  const admin = createClient(URL, SERVICE_ROLE_KEY)

  if (mode === 'hard') {
    // CASCADE supprimera profile, posts, media, follows, etc.
    await admin.auth.admin.deleteUser(user.id)
    await deleteStorageFiles(`avatars/${user.id}/`)
    await deleteStorageFiles(`post-media/${user.id}/`)
  } else {
    await admin.from('profiles').update({
      username: `deleted_${user.id.slice(0,8)}`,
      display_name: null, bio: null, avatar_url: null, banner_url: null,
      city: null, region: null, location: null,
      instagram: null, website: null,
      deleted_at: new Date().toISOString(),
    }).eq('id', user.id)
    await admin.auth.admin.deleteUser(user.id)
  }
  return new Response('OK')
})
```

**Délai** : effectif immédiat. Backups Supabase rotent sous 7-30 jours → la donnée disparaît totalement dans ce délai.

### Opposition / consentement

`user_settings` :
- `email_notifications` (default true — service)
- `push_notifications` (default false — opt-in)
- `newsletter` (default false — opt-in explicite)

Pas de profilage publicitaire. Pas de partage tiers. Pas de tracking inter-sites.

## Chiffrement

| Donnée | Au repos | En transit |
|---|---|---|
| DB Postgres | AES-256 (Supabase managed) | TLS 1.3 |
| Storage objets | AES-256 (Supabase managed) | TLS 1.3 |
| Backups | chiffrés | TLS 1.3 |
| Sessions client | localStorage (non chiffré) | TLS 1.3 |
| Mots de passe | bcrypt (Supabase Auth) | TLS 1.3 |

**Note localStorage** : les JWT y sont stockés en clair. Si XSS, ils sont vulnérables. Mitigation : CSP stricte (cf. `devops/deployment.md`) + rotation 1h des access tokens. Pour V1.5 envisager `httpOnly` cookies via un proxy edge.

## Sous-traitants (Article 28 RGPD)

| Sous-traitant | Donnée | Localisation | DPA signé |
|---|---|---|---|
| Supabase Inc. | DB, Auth, Storage | EU (Frankfurt/Paris) | ✅ inclus dans ToS |
| Vercel Inc. | Hébergement frontend | EU edge | ✅ DPA |
| Sentry GmbH | Error tracking | EU (Frankfurt) | ✅ DPA |

**Tous les services principaux sont hébergés en UE.** Aucun transfert hors UE.

## Politique de confidentialité

Document légal séparé à publier sur `/legal/privacy`. Doit être maintenu cohérent avec ce fichier. Mise à jour notifiée aux users (banner + email).

## Audit log

Table `audit_events` (à créer en V1) :
```sql
CREATE TABLE audit_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,        -- 'login','delete_account','export_data','admin_*'
  target_type TEXT,
  target_id   UUID,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Loggé pour : login, logout, signup, export, delete, modifs admin, modération.
