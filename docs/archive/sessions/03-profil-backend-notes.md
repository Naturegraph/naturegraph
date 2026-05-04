# Profil — Notes backend (Phase 2)

> Itération MVP UI : tout le profil tourne sur des mocks (`src/data/mock/profileMock.ts`)
> via le flag `VITE_USE_PROFILE_MOCK=true`. Aucune lecture / écriture Supabase
> pour le moment (économie d'egress sur le Free Plan pendant le refactor UI).
>
> Cette note recense **TOUT** ce qui devra être branché côté backend quand on
> bascule en mode "full Supabase" — par composant, avec table / colonne / RPC cibles.

---

## 1. Schéma SQL à enrichir

### 1.1 Table `profiles` (existante — colonnes à ajouter)

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram        TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website          TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio              TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city             TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region           TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badges           TEXT[]   DEFAULT '{}';

-- Compteurs dénormalisés (maintenus via triggers — voir §3)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers_count  INTEGER  DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count  INTEGER  DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS posts_count      INTEGER  DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS species_count    INTEGER  DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_days      INTEGER  DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS week_progress    INTEGER  DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS week_goal        INTEGER  DEFAULT 5;
```

### 1.2 Nouvelles tables

```sql
-- Followers / Following (Migrateurs / Migrations)
CREATE TABLE follows (
  follower_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX follows_follower_idx  ON follows(follower_id);
CREATE INDEX follows_following_idx ON follows(following_id);

-- Inspirations / Bookmarks (collection sauvegardée)
CREATE TABLE saved_posts (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX saved_posts_user_idx ON saved_posts(user_id);

-- Blocages (utilisé par ProfileOptionsMenu > "Bloquer cet utilisateur")
CREATE TABLE blocks (
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- Signalements (utilisé par ProfileOptionsMenu > "Signaler ce profil")
CREATE TABLE reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type  TEXT NOT NULL CHECK (target_type IN ('profile', 'post', 'comment')),
  target_id    UUID NOT NULL,
  reason       TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 1.3 Table `posts` — colonne à ajouter

```sql
-- Compte d'individus observés (remplace `multipleObservations: boolean`)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS individuals_count INTEGER;
COMMENT ON COLUMN posts.individuals_count IS
  'Nombre d''individus observés sur le post. NULL = non précisé.';
```

---

## 2. RLS (Row-Level Security)

```sql
-- profiles : lecture publique, update self only
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_public"  ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_self"    ON profiles FOR UPDATE USING (auth.uid() = id);

-- follows : public read, insert/delete self only
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_select_public"  ON follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_self"    ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_self"    ON follows FOR DELETE USING (auth.uid() = follower_id);

-- saved_posts : private (only owner can read/write)
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_posts_owner_all"  ON saved_posts FOR ALL USING (auth.uid() = user_id);

-- blocks / reports : private
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_owner_all"  ON blocks FOR ALL USING (auth.uid() = blocker_id);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert_self"   ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select_self"   ON reports FOR SELECT USING (auth.uid() = reporter_id);
-- Pas de policy UPDATE/DELETE — modération via service role uniquement
```

---

## 3. Triggers compteurs dénormalisés

Pour éviter les `COUNT(*)` à chaque affichage profil — pattern aligné avec le
reste du schéma (cf. `docs/backend/database-architecture.md` §"Compteurs").

```sql
-- followers_count / following_count
CREATE OR REPLACE FUNCTION update_follow_counts() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    UPDATE profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_follows_counts
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- posts_count / species_count maintenus via triggers similaires sur `posts`
```

---

## 4. RPCs (Postgres functions)

### 4.1 `get_observer_dna(profile_id UUID) → JSON`

ADN observateur — % par groupe taxonomique. Affiché par `ProfileDNACard`.

```sql
CREATE OR REPLACE FUNCTION get_observer_dna(profile_id UUID)
RETURNS TABLE (taxonomic_group TEXT, percent NUMERIC) AS $$
  SELECT
    taxonomic_group,
    ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS percent
  FROM posts
  WHERE author_id = profile_id
    AND deleted_at IS NULL
  GROUP BY taxonomic_group
  ORDER BY percent DESC
  LIMIT 5;
$$ LANGUAGE sql STABLE;
```

### 4.2 `get_profile_stats(profile_id UUID) → JSON`

Stats agrégées (observations / espèces / streak / week_progress).

```sql
CREATE OR REPLACE FUNCTION get_profile_stats(profile_id UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'observations', COUNT(*),
    'species',      COUNT(DISTINCT taxref_id) FILTER (WHERE taxref_id IS NOT NULL),
    'streak_days',  -- calcul via window function sur dates consécutives
    'week_progress', COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')
  )
  FROM posts
  WHERE author_id = profile_id AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE;
```

---

## 5. Services TypeScript à créer

`src/services/profileService.ts` :

```ts
// GET /profile/:username  →  ProfileDisplayData
getProfileByUsername(username: string)

// PATCH /profile  →  ProfileDisplayData  (own only)
updateOwnProfile(patch: Partial<ProfileDisplayData>)

// POST /profile/:id/follow  /  DELETE  →  { followers_count }
toggleFollow(targetId: string)

// GET /profile/:id/followers?cursor&limit=20  →  page
getFollowers(profileId: string, opts?)
getFollowing(profileId: string, opts?)
```

`src/services/postService.ts` (extension) :

```ts
// GET /posts?author_id&sort=recent|popular&cursor&limit=20
getPostsByUser(userId: string, opts?: { sort: 'recent'|'popular' })
```

`src/services/savedPostService.ts` (nouveau) :

```ts
// GET /saved_posts?cursor&limit=20  →  Post[]  (own only)
getSavedPostsByUser(userId: string)

// POST /saved_posts/:postId  /  DELETE  →  { saved: boolean }
toggleSave(postId: string)
```

`src/services/moderationService.ts` (nouveau) :

```ts
blockUser(targetId: string, reason?: string)
unblockUser(targetId: string)
reportProfile(targetId: string, reason: string, description?: string)
```

---

## 6. React Query — hooks à créer

`src/hooks/useProfile.ts` (existant — étendre) :

- `useProfile(username)` — query `['profile', username]`
- `useUpdateProfile()` — mutation invalide `['profile', currentUsername]`
- `useToggleFollow()` — optimistic update sur `followers_count`
- `useFollowers(profileId)` — infinite query, pagination 20
- `useFollowing(profileId)` — idem

`src/hooks/useSavedPosts.ts` (nouveau) :

- `useSavedPosts()` — infinite query (page 20)
- `useToggleSave()` — mutation optimistic update

`src/hooks/useObserverDNA.ts` (nouveau) :

- `useObserverDNA(profileId)` — RPC `get_observer_dna`, cache 1h (peu volatile)

---

## 7. Mapping composants UI → endpoints backend

| Composant                          | Donnée                  | Source backend                    |
| ---------------------------------- | ----------------------- | --------------------------------- |
| `ProfileHeader`                    | profil + compteurs      | `getProfileByUsername`            |
| `ProfileAboutCard`                 | bio, city, dates, links | `profiles.*`                      |
| `ProfileDNACard`                   | % par taxon             | RPC `get_observer_dna`            |
| `ProfileFeed` (Journal nature)     | posts utilisateur       | `getPostsByUser(userId, sort)`    |
| `ProfileInspirations` (Collection) | posts sauvegardés       | `getSavedPostsByUser(userId)`     |
| `ProfileCommunity`                 | followers / following   | `useFollowers` / `useFollowing`   |
| `ProfileStats` (Bientôt)           | stats observateur       | RPC `get_profile_stats` (Phase 3) |
| `ProfileOptionsMenu` > Bloquer     | block toggle            | `moderationService.blockUser`     |
| `ProfileOptionsMenu` > Signaler    | report submit           | `moderationService.reportProfile` |
| `ProfileOptionsMenu` > Modifier    | edit panel              | `useUpdateProfile`                |
| `EditProfilePanel`                 | save profile            | `useUpdateProfile`                |
| `ProfileHeader > Migrer button`    | follow toggle           | `useToggleFollow`                 |

---

## 8. À faire côté frontend lors du switch backend

1. **Retirer le flag mock** dans `Profile.tsx` : la branche `if (USE_PROFILE_MOCK)` early return.
2. **Brancher les hooks** : remplacer `userPosts: []` et `savedPosts: []` par les
   infinite queries correspondantes.
3. **Pagination** : tous les feeds utilisateur paginés à 20 (cf. `GUIDELINES.md`).
4. **Storage Supabase** : `avatar_url` et `banner_url` doivent passer par
   `supabase.storage.from('avatars'|'banners')` avec compression côté client
   (max 1MB, WebP) avant upload — éco-conception.
5. **Optimistic updates** sur `Migrer` (follow) et `Bookmark` (save) — pour
   éviter le délai perçu par l'utilisateur.
6. **Internationalisation** : toutes les `defaultValue:` actuelles doivent être
   ajoutées dans `src/i18n/fr.json` + `en.json` (clés sous `profile.*`).
7. **Champ `individuals_count`** : retirer `multipleObservations: boolean` de
   `MockPost` une fois la colonne SQL ajoutée et exposée par les types Supabase.

---

## 9. Sécurité / privacy

- `ProfileOptionsMenu > Bloquer` : doit retirer toutes les interactions de la
  cible (commentaires, réactions filtrés via une vue ou un RLS spécifique).
- `ProfileOptionsMenu > Signaler` : envoyer aussi un email `staff@naturegraph.fr`
  via Edge Function pour notification modération en quasi-temps-réel.
- `EditProfilePanel` : valider que le username demandé est unique (case insensitive)
  côté serveur (contrainte `UNIQUE LOWER(username)`).
- `EditProfilePanel` : sanitizer la bio contre l'XSS (DOMPurify ou markdown only).
- Avatar upload : validation MIME type + taille côté Edge Function, pas
  uniquement côté client.

---

## 10. Performance & éco-conception (rappels GUIDELINES.md)

- **Pagination obligatoire** sur Journal, Inspirations, Followers, Following (20/page)
- **Images** : avatar 96×96 servi en WebP, banner 1600×400 en AVIF avec fallback WebP
- **Compteurs dénormalisés** (followers_count etc.) — JAMAIS de `SELECT COUNT(*)` à chaque vue
- **Cache React Query** : `staleTime` agressif sur les profils visités (5 min)
- **Lazy load** des onglets Communauté / Statistiques (tabs non chargés tant que pas cliqués)
- **Index obligatoires** : `posts(author_id, created_at DESC)`, `saved_posts(user_id, created_at DESC)`,
  `follows(follower_id)` et `follows(following_id)`

---

## Récapitulatif migrations SQL à créer

```
supabase/migrations/
├── YYYYMMDD_profile_columns.sql        (§1.1 — ALTER profiles)
├── YYYYMMDD_follows_table.sql          (§1.2 — CREATE TABLE follows + RLS + trigger)
├── YYYYMMDD_saved_posts_table.sql      (§1.2 — CREATE TABLE saved_posts + RLS)
├── YYYYMMDD_blocks_reports_tables.sql  (§1.2 — moderation tables + RLS)
├── YYYYMMDD_posts_individuals_count.sql (§1.3 — ALTER posts)
└── YYYYMMDD_profile_rpcs.sql           (§4 — get_observer_dna + get_profile_stats)
```

À appliquer dans l'ordre sur `naturegraph-dev` avant de basculer le flag mock.

---

## 11. Owner profile — actions spécifiques (ajout 2026-05-02)

Le ProfileHeader a 2 modes distincts (cf. `ProfileHeader.tsx`) :

- **Owner** (`isOwnProfile: true`) : boutons `[Modifier] + [Paramètres]`
- **Visiteur** (`isOwnProfile: false`) : boutons `[Migrer] + [Share] + [Options]`

### 11.1 Bouton "Paramètres" (owner)

Action : navigation vers `/settings` (page paramètres compte — notifs, langue,
confidentialité, suppression compte, etc.). Pour l'instant en mock le callback
`onSettings` ouvre temporairement le panel de modification du profil.

**Backend cible Phase 2 :**

- Créer `src/pages/Settings.tsx` (lazy-loaded)
- Sections : Compte, Notifications, Confidentialité, Données, Sécurité
- Hook `useUpdateAccountSettings()` pour persistance via `profiles` + `user_preferences`

### 11.2 Suppression de posts depuis Journal nature (owner)

`ProfileFeed` propage `isOwnProfile` → `FeedPost.isOwnPost`. Quand `true`,
`PostOptionsMenu` expose les actions `Modifier` et `Supprimer` (déjà câblés
dans `PostOptionsMenu.tsx` avec confirmation modal).

**Backend cible Phase 2 :**

- `postService.deletePost(postId)` → soft delete via `posts.deleted_at = now()`
- RLS policy : `auth.uid() = author_id` (un user ne peut supprimer que ses posts)
- React Query : `useDeletePost()` mutation invalide les caches
  `['posts', 'feed']` + `['posts', 'user', profileId]`
- Trigger SQL : décrémenter `profiles.posts_count` au delete (souvent pas
  pertinent en soft-delete, mais à décider)

### 11.3 Détection `isOwnProfile` côté client

```ts
// Profile.tsx — sécurité : un user déconnecté ne doit JAMAIS être owner
const isOwnProfile = Boolean(authProfile && (!username || authProfile.username === username))
```

Avant la correction (2026-05-02), `!username` seul suffisait → tout visiteur
non-authentifié sur `/profile` (sans params) était considéré owner.
**Risque éliminé** mais à compléter côté backend par RLS sur les mutations
profile (UPDATE profiles WHERE id = auth.uid()).

### 11.4 Toggle "Migrer" (visiteur)

Le bouton Migrer du ProfileHeader (visiteur uniquement) est dupliqué dans
`ProfileCommunity.UserCard` (chaque ligne de la liste Migrateurs/Migrations).

**Refactor recommandé Phase 2 :**
Extraire un composant `<FollowButton variant="pill"|"icon" userId initialFollowing />`
qui :

1. Encapsule le state `isFollowing`
2. Appelle `useToggleFollow(userId)` (mutation optimistic update)
3. Met à jour le compteur `followers_count` du profil cible

---

## 12. Refactors UI completés (2026-05-02)

Ces points de l'audit ont été corrigés et n'ont plus besoin de TODO backend
spécifique côté UI :

| Sujet                                  | Fix                                                        |
| -------------------------------------- | ---------------------------------------------------------- | --- | ---- |
| Empty state dupliqué 5×                | Factorisé en `<ProfileEmptyState />`                       |
| Branche non-mock cassée (max-w-2xl)    | Aligned avec branche mock — cards About/DNA + md:px-12     |
| `isOwnProfile` faux quand déconnecté   | `Boolean(authProfile && ...)` au lieu de `!username        |     | ...` |
| Banner + avatar `loading="lazy"`       | Passés en `eager` + `fetchPriority="high"` (LCP)           |
| `isFirstDesktop = index === 1` fragile | Remplacé par `tab.id === 'journal'`                        |
| `multipleObservations` deprecated      | Supprimé des 9 mocks + FeedSection ; type `never` en garde |

---

## 13. À NE PAS oublier au switch backend

- [ ] Retirer `VITE_USE_PROFILE_MOCK` du `.env` et la branche correspondante dans `Profile.tsx`
- [ ] Retirer le mock URL param `?own=1` (utilisé seulement pour tester l'UI owner sans auth)
- [ ] Retirer `MockPost.multipleObservations` complètement (+ `posts.multiple_observations` côté DB)
- [ ] Migrer `src/data/mock/profileMock.ts` vers `src/test/fixtures/` (tests uniquement)
- [ ] Brancher les hooks React Query listés §6 sur les services §5
- [ ] Implémenter focus trap dans EditProfilePanel + ProfileOptionsMenu (a11y bloquant)
- [ ] Implémenter navigation flèches dans ProfileTabs (WAI-ARIA tablist pattern)
- [ ] Ajouter ~30 clés i18n manquantes dans `fr.json` / `en.json` (toutes les `defaultValue:` actuelles)

---

## 14. EditProfilePanel — backend (ajout 2026-05-02)

Le panel d'édition (3 onglets : Informations / Préférences / Photo de profil)
fonctionne entièrement en mock. Au switch backend :

### 14.1 Onglet "Informations"

```ts
// EditInfoTab.tsx :: handleSave()
onSave({
  username, // → UPDATE profiles SET username (validation unicité)
  bio: bio || null, // → UPDATE profiles SET bio
  website: website || null, // → UPDATE profiles SET website
  instagram: stripPrefix(instagram) || null,
  // facebook: TODO — ajouter `profiles.facebook TEXT NULL` dans le schéma
  weekProgress: { current, goal: weekGoal }, // → UPDATE profiles SET week_goal
})
```

**Validation côté serveur (Edge Function avant UPDATE)** :

- `username` : unique case-insensitive, 3-20 caractères, `[a-zA-Z0-9_.-]+`
- `bio` : max 500 caractères + sanitization (DOMPurify, pas de HTML)
- URLs : regex stricte
- `week_goal` : INTEGER 1-50

### 14.2 Onglet "Préférences"

```ts
// EditPrefsTab.tsx :: handleSave()
onSave({
  interests: selectedInterests.map((id, i) => ({
    id,
    percent: i === 0 ? 50 : i === 1 ? 35 : 15, // mock — à remplacer
  })),
})
```

**Backend** :

- `profiles.interests TEXT[]` (3 IDs ordonnés) — pas de % stocké côté DB
- Les % d'ADN observateur viennent de la RPC `get_observer_dna` (calcul réel
  basé sur `posts.taxonomic_group`), pas de la sélection manuelle.
- La sélection manuelle sert à orienter le feed "Pour vous".

### 14.3 Onglet "Photo de profil" (auto-save)

Pas de bouton Sauvegarder — chaque action persiste immédiatement. Footer du
panel masqué quand `activeTab === 'photo'`.

```ts
function handleFileChange(file, kind) {
  // Phase 1 : URL.createObjectURL() → preview locale + onSave
  // Phase 2 :
  //   1. Compression côté client (canvas → toBlob WebP, qualité 0.85)
  //   2. storageService.uploadAvatar(compressedBlob)
  //   3. URL Supabase publique → UPDATE profiles SET avatar_url
  //   4. Toast succès via ToastContext
}
```

**Buckets Supabase Storage** :

```sql
-- avatars (max 1MB) + banners (max 2MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 1048576, ARRAY['image/jpeg','image/png','image/webp']),
  ('banners', 'banners', true, 2097152, ARRAY['image/jpeg','image/png','image/webp']);

-- RLS : owner uniquement pour write, public read
CREATE POLICY "owner_write_avatars" ON storage.objects FOR ALL
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "public_read_avatars" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
```

**Convention nommage** : `{user_id}/{timestamp}.{ext}` — collision-free + delete atomique.

### 14.4 Toasts (Phase 2)

Erreurs validation MIME/taille actuellement en `console.warn`. À brancher
sur `useToast().error(...)` (`src/contexts/ToastContext.tsx`).

---

## 15. Page Settings (Phase 3 — dernier point MVP)

> PRD à créer : `docs/PRD_SETTINGS.md`.

### 15.1 Sections prévues

1. **Compte** : email (2FA optionnel), changement mot de passe, langue UI (fr/en)
2. **Notifications** : opt-in/out par type (réactions, commentaires, follows…)
3. **Confidentialité** : profil public/privé, géoloc par défaut
4. **Données** : export RGPD (.zip JSON), historique connexions
5. **Sécurité** : sessions actives, déconnexion globale
6. **Suppression compte** : flux 2 étapes (confirmation email + délai 30 jours)

### 15.2 Tables à ajouter

```sql
CREATE TABLE user_preferences (
  user_id      UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  language     TEXT NOT NULL DEFAULT 'fr',
  is_public    BOOLEAN NOT NULL DEFAULT true,
  notifs_email BOOLEAN NOT NULL DEFAULT true,
  notifs_push  BOOLEAN NOT NULL DEFAULT true,
  notifs_reactions BOOLEAN NOT NULL DEFAULT true,
  notifs_comments  BOOLEAN NOT NULL DEFAULT true,
  notifs_follows   BOOLEAN NOT NULL DEFAULT true,
  notifs_mentions  BOOLEAN NOT NULL DEFAULT true,
  default_post_visibility TEXT NOT NULL DEFAULT 'public',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE account_deletion_requests (
  user_id        UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  requested_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for  TIMESTAMPTZ NOT NULL,  -- now() + INTERVAL '30 days'
  reason         TEXT,
  cancelled_at   TIMESTAMPTZ
);
```

### 15.3 RPCs / Edge Functions

- `request_account_deletion(reason TEXT?)` — INSERT + email confirmation
  - Limit 1 demande active par user (UNIQUE (user_id) WHERE cancelled_at IS NULL)
  - Refuse si compte créé < 24h (anti spam-account)
  - Logge IP + user-agent dans une table `audit_log` séparée
  - Sign out tous devices via `signout_all_devices` puis email avec lien d'annulation
- `cancel_account_deletion()` — UPDATE cancelled_at = now()
  - Auth requise (user qui annule = user qui avait demandé)
- `export_user_data()` — Edge Function génère .zip JSON
  - Contenu : profile + posts + comments + reactions + follows + saved_posts
  - Téléchargement via signed URL Supabase Storage (expire 24h)
  - Recommandé AVANT suppression (lien dans la modal "Avant de supprimer,
    télécharge tes données")
- `change_password(old, new)` — via supabase.auth.updateUser
- `signout_all_devices()` — Edge Function : invalide toutes les sessions Auth

### 15.4 Cron Function quotidien (suppression effective J+30)

```sql
-- Edge Function `process_pending_deletions` (Supabase Cron : daily at 03:00 UTC)
-- 1. Sélectionne les demandes scheduled_for <= now() AND cancelled_at IS NULL
-- 2. Pour chaque user_id :
--    a. DELETE FROM profiles WHERE id = user_id (cascade vers posts, comments, etc.)
--    b. Boucle suppression objets Storage (avatars/{user_id}/* + banners/{user_id}/*)
--    c. Anonymise les logs : UPDATE audit_log SET user_id = NULL WHERE user_id = user_id
--    d. Email final "votre compte a été supprimé"
-- 3. Conserve la ligne dans `account_deletion_requests` (audit RGPD)
```

### 15.5 Modal de confirmation (DeleteAccountModal)

Component `src/components/settings/DeleteAccountModal.tsx` (Phase 1 mock).

Phase 2 modifications nécessaires :

- Bouton "Confirmer" → `await rpcClient.requestAccountDeletion()` au lieu de
  `onConfirm()` direct
- Ajouter un **lien "Télécharger mes données" (export RGPD)** au-dessus des
  boutons (recommandation pré-suppression)
- Afficher un **délai 30 jours** explicite dans la description : _"Tu pourras
  annuler cette demande pendant les 30 prochains jours via le lien envoyé
  par email"_
- Phase 3 : ajouter une étape de re-auth (mot de passe / 2FA) avant l'envoi
  de la demande

### 15.4 Liens depuis le profil

Bouton "Paramètres" du `ProfileHeader` (owner) doit naviguer vers `/settings`.
Actuellement (Phase 1 mock) il ouvre `EditProfilePanel` — à corriger Phase 3.
