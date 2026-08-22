# Database Architecture : Naturegraph

> **Auteurs (table ronde)** : Database Architect (DBA), DevOps, Backend Developer (BE)
> **Statut** : v1.0 : socle MVP, vision long terme
> **Stack** : PostgreSQL 15 + PostGIS 3.3 (Supabase Hosted, région `eu-west-3` / Paris)
>
> ⚠️ **Schéma cible vs schéma actuel** : ce document décrit le schéma **cible** v1.0 consolidé. La base `naturegraph-dev` actuelle utilise le schéma initial (legacy) issu des migrations historiques. **Le code TypeScript (`src/services/`) suit le schéma réel, pas le schéma cible.** La source de vérité runtime est `src/types/supabase.ts` (généré via `npx supabase gen types typescript`).
>
> **Mapping schéma cible (docs) → schéma réel (DB) :**
>
> | Table cible | Colonne cible        | Colonne réelle (DB actuelle) |
> | ----------- | -------------------- | ---------------------------- |
> | posts       | `author_id`          | `user_id`                    |
> | posts       | `species_id`         | `taxref_id`                  |
> | posts       | `location` (geog)    | `location_point` (geog)      |
> | posts       | `location_precision` | `location_hidden` (bool)     |
> | follows     | `followed_id`        | `following_id`               |
> | comments    | `author_id`          | `user_id`                    |
> | notebooks   | `owner_id`           | `author_id`                  |
> | (jointure)  | `notebook_entries`   | `notebook_observations`      |
>
> Une convergence vers le schéma cible se fera par migrations successives : voir `supabase/migrations/`.

---

## 1. Vision & principes directeurs

**DBA** : On conçoit pour 3 horizons : MVP (10k users), V1 (100k users), V2 (1M+ users). Toutes les décisions ci-dessous doivent rester valides à 1M users sans refonte structurelle. Ce qui change à l'échelle : les index, le partitioning, le cache : pas le modèle.

**BE** : D'accord, mais on reste pragmatique : pas de sur-engineering (pas de sharding ni partitioning au MVP). On prépare juste les **points de découpe**.

**DevOps** : Mon non-négociable : tout est versionné en migrations SQL idempotentes, tout est reproductible sur un projet Supabase vide en < 5 minutes.

### Principes adoptés

| #   | Principe                                        | Justification                                                                                                                                                 |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | **Single source of truth = SQL**                | Le schéma SQL est canonique. `src/types/database.ts` et `src/types/supabase.ts` en découlent (générés via `supabase gen types typescript`).                   |
| P2  | **RLS systématique**                            | Aucune table publique sans RLS activée. Le frontend utilise la `anon key`, donc toute la sécurité repose sur Postgres.                                        |
| P3  | **Compteurs dénormalisés via triggers**         | `posts_count`, `followers_count`, `likes_count` maintenus côté DB, jamais côté client. Évite les race conditions et économise des `COUNT(*)`.                 |
| P4  | **Soft delete pour le contenu utilisateur**     | Suppression compte = `deleted_at` + anonymisation, pas `DELETE`. RGPD compatible (cf. `data-protection.md`).                                                  |
| P5  | **PostGIS dès le départ**                       | Coordonnées en `GEOGRAPHY(POINT, 4326)`. Permet `ST_DWithin` (« observations à 5 km »). Coût marginal nul tant qu'on a un index GiST.                         |
| P6  | **Pagination keyset > offset**                  | Pour le feed, on utilise `(published_at, id)` en cursor. Offset pagination réservé aux listes courtes (< 1000 items).                                         |
| P7  | **Pas de FK vers `auth.users` en cascade dure** | On référence `auth.users(id)` mais avec `ON DELETE SET NULL` ou via trigger d'anonymisation. RGPD : on doit pouvoir effacer un user sans casser l'historique. |
| P8  | **UUID v4 partout**                             | Pas d'IDs séquentiels exposés (énumération). Supabase utilise déjà UUID nativement.                                                                           |
| P9  | **`created_at` / `updated_at` automatiques**    | Triggers `set_updated_at()` sur toutes les tables mutables.                                                                                                   |
| P10 | **Validation côté serveur**                     | CHECK constraints + triggers `validate_*`. Le frontend valide pour l'UX, le backend valide pour la sécurité.                                                  |

---

## 2. Vue d'ensemble : domaines fonctionnels

```
┌─────────────────────────────────────────────────────────────────┐
│                          IDENTITÉ                               │
│   auth.users (Supabase) ──▶ profiles ──▶ user_settings          │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   SOCIAL     │      │  CONTENU     │      │  RÉFÉRENCE   │
│              │      │              │      │              │
│  follows     │      │  posts       │      │  taxref      │
│  blocks      │◀────▶│  post_media  │      │  (CC-BY      │
│  reports     │      │  reactions   │      │   INPN/MNHN) │
│              │      │  comments    │      │              │
└──────────────┘      │  notebooks   │      └──────────────┘
                      │  notebook_   │
                      │   entries    │
                      └──────────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │   NOTIFICATIONS       │
                   │   (Realtime channel)  │
                   └──────────────────────┘
```

**DBA** : 5 domaines, ~14 tables. Au-delà, on bascule vers un schéma logique séparé (`analytics`, `audit`).

**BE** : Pour le MVP on reste sur `public`. Si on ajoute de l'analytics lourd plus tard (vues matérialisées, agrégats), on créera un schéma `analytics` dédié pour ne pas polluer `public` et pour pouvoir donner des droits différents.

---

## 3. Tables : détail et justifications

### 3.1 `profiles`

```sql
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        CITEXT UNIQUE NOT NULL CHECK (length(username) BETWEEN 3 AND 30),
  display_name    TEXT,
  bio             TEXT CHECK (length(bio) <= 280),
  avatar_url      TEXT,
  banner_url      TEXT,
  city            TEXT,
  region          TEXT,
  country         TEXT DEFAULT 'FR',
  location        GEOGRAPHY(POINT, 4326),  -- centre approximatif (ville)
  interests       TEXT[] DEFAULT '{}',     -- ids de catégories
  instagram       TEXT,
  website         TEXT,
  language        TEXT DEFAULT 'fr' CHECK (language IN ('fr','en')),
  -- compteurs dénormalisés (maintenus par triggers)
  posts_count     INTEGER NOT NULL DEFAULT 0,
  followers_count INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0,
  -- modération / RGPD
  is_verified     BOOLEAN NOT NULL DEFAULT false,
  is_suspended    BOOLEAN NOT NULL DEFAULT false,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Pourquoi `CITEXT` sur `username`** : Recherche case-insensitive native, sans `LOWER(username)` partout. **DBA** : « si tu indexes `LOWER(username)` tu doubles l'index, et tu rates les jointures naïves. CITEXT règle ça pour de bon. »

**Pourquoi `interests TEXT[]`** : Tags légers, < 10 items, lecture simple. **BE** : « pas besoin d'une table de jointure tant qu'on n'a pas de stats par tag. Si on veut ça, on migrera vers `profile_interests(profile_id, interest_id)`. »

**DevOps** : index requis (cf. `relations.md`).

### 3.2 `posts`

```sql
CREATE TABLE posts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN (
                    'observation','story','question','identification','event'
                 )),
  title          TEXT,
  body           TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 5000),
  -- Localisation (peut être floutée pour espèces sensibles, cf. media-security.md)
  location       GEOGRAPHY(POINT, 4326),
  location_name  TEXT,
  location_precision SMALLINT DEFAULT 0,  -- 0 = exact, 1 = ~1km, 2 = ~10km
  -- Lien taxonomique optionnel
  species_id     INTEGER REFERENCES taxref(cd_nom),
  -- Visibilité
  visibility     TEXT NOT NULL DEFAULT 'public'
                 CHECK (visibility IN ('public','followers','private')),
  -- Compteurs
  likes_count    INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  -- Cycle de vie
  published_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at      TIMESTAMPTZ,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Discussion `location_precision`** :

- **DBA** voulait stocker une bounding box.
- **BE** a poussé pour un simple `SMALLINT` : « 99% des cas c'est exact/flou-1km/flou-10km. Une bbox c'est du sur-engineering. On floutte côté serveur via une `SECURITY DEFINER` function qui renvoie un point aléatoire dans le rayon. »
- **Décision** : `SMALLINT`, le floutage est calculé à la volée par une view `posts_public` (cf. `security/media-security.md`).

### 3.3 `post_media`

```sql
CREATE TABLE post_media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  storage_path    TEXT NOT NULL,           -- chemin dans le bucket Supabase Storage
  mime_type       TEXT NOT NULL,
  width           INTEGER,
  height          INTEGER,
  size_bytes      INTEGER,
  -- Métadonnées EXIF nettoyées (on retire GPS/timestamps avant upload)
  alt_text        TEXT,
  -- Copyright (obligatoire : TAXREF/INPN si applicable)
  copyright_notice TEXT NOT NULL,
  license         TEXT NOT NULL DEFAULT 'CC-BY-NC-SA-4.0'
                  CHECK (license IN (
                    'CC-BY-4.0','CC-BY-SA-4.0','CC-BY-NC-4.0',
                    'CC-BY-NC-SA-4.0','CC0-1.0','all-rights-reserved'
                  )),
  position        SMALLINT NOT NULL DEFAULT 0,  -- ordre dans le carrousel
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**DevOps** : pas de blob en DB. Tout passe par Supabase Storage. La DB ne stocke que le `storage_path`. Voir `security/media-security.md` pour la politique de bucket.

### 3.4 `reactions`

```sql
CREATE TABLE reactions (
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
                'love','admire','fire','wow','curious','disappointed'
              )),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)  -- 1 réaction par user par post
);
```

**DBA** : PK composite = pas besoin de UNIQUE supplémentaire, et la PK sert d'index pour les jointures `posts ◀── reactions`. **Important** : on ne permet **qu'une réaction par user/post**. Changer de réaction = `UPDATE`, pas un nouvel insert.

**BE** : Trigger `update_post_likes_count()` AFTER INSERT/UPDATE/DELETE met à jour `posts.likes_count`. On évite tout `COUNT(*)` au runtime.

### 3.5 `comments`

```sql
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE,  -- threads
  body        TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Discussion threads** :

- **BE** : Adjacency list (`parent_id`) suffit au MVP. Profondeur max 2 (réponses, pas de réponses-de-réponses) appliquée par trigger.
- **DBA** : Si on veut un jour des arbres profonds avec requêtes « tout le sous-arbre », on basculera vers `ltree`. Pas avant.

### 3.6 `follows`

```sql
CREATE TABLE follows (
  follower_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followed_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);
```

Index inverse `(followed_id, follower_id)` pour « qui me suit ».

### 3.7 `notebooks` & `notebook_entries`

```sql
CREATE TABLE notebooks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  description  TEXT CHECK (length(description) <= 500),
  visibility   TEXT NOT NULL DEFAULT 'private'
               CHECK (visibility IN ('public','followers','private')),
  cover_url    TEXT,
  entries_count INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notebook_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id  UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  post_id      UUID REFERENCES posts(id) ON DELETE CASCADE,
  note         TEXT,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (notebook_id, post_id)
);
```

### 3.8 `notifications`

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN (
                'follow','like','comment','mention','identification','system'
              )),
  entity_type TEXT,    -- 'post','comment','profile'
  entity_id   UUID,
  payload     JSONB DEFAULT '{}'::jsonb,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**BE** : Réalisation côté client via Supabase Realtime (channel `notifications:user_id=eq.${uid}`). Pas besoin de WebSocket custom.

### 3.9 `reports` (modération)

```sql
CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('post','comment','profile')),
  entity_id     UUID NOT NULL,
  reason        TEXT NOT NULL,
  details       TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','reviewing','resolved','dismissed')),
  resolved_by   UUID REFERENCES profiles(id),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.10 `blocks`

```sql
CREATE TABLE blocks (
  blocker_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
```

Utilisé par les fonctions `can_see_post()` / `can_see_profile()` pour filtrer le feed.

### 3.11 `taxref` (référentiel TAXREF : INPN/MNHN, CC-BY)

```sql
CREATE TABLE taxref (
  cd_nom        INTEGER PRIMARY KEY,
  cd_ref        INTEGER,
  rang          TEXT,
  nom_complet   TEXT NOT NULL,
  nom_vern      TEXT,
  nom_vern_eng  TEXT,
  group1_inpn   TEXT,
  group2_inpn   TEXT,
  classe        TEXT,
  ordre         TEXT,
  famille       TEXT,
  -- Sensibilité (espèces protégées → coordonnées floutées)
  is_sensitive  BOOLEAN NOT NULL DEFAULT false,
  -- Recherche full-text
  search_vector TSVECTOR
);
```

**DBA** : Table en lecture seule, rechargée par script ETL depuis le dump INPN. ~600k lignes. Index GIN sur `search_vector` pour l'autocomplete.

**Attribution obligatoire** : toute UI affichant TAXREF doit créditer « TAXREF v17 : INPN/MNHN, CC-BY 4.0 ».

### 3.12 `user_settings`

```sql
CREATE TABLE user_settings (
  user_id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_notifications  BOOLEAN NOT NULL DEFAULT true,
  push_notifications   BOOLEAN NOT NULL DEFAULT false,
  newsletter           BOOLEAN NOT NULL DEFAULT false,
  theme                TEXT NOT NULL DEFAULT 'system'
                       CHECK (theme IN ('light','dark','system')),
  reduced_motion       BOOLEAN NOT NULL DEFAULT false,
  show_sensitive_data  BOOLEAN NOT NULL DEFAULT false,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 4. Triggers & fonctions

### Compteurs (extrait, voir `schema.sql` pour le détail)

```sql
CREATE OR REPLACE FUNCTION update_post_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET posts_count = posts_count + 1 WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET posts_count = posts_count - 1 WHERE id = OLD.author_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Sécurité** : `SET search_path = public` est obligatoire sur toute fonction `SECURITY DEFINER` (warning Supabase Advisor). Voir migration `20260403_security_hardening`.

### Auto-création profil sur signup

```sql
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, 'user_' || substring(NEW.id::text, 1, 8))
  ON CONFLICT DO NOTHING;
  INSERT INTO user_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
```

**BE** : Indispensable. Sinon le client doit créer le profil après signup, et on a un trou de cohérence si l'app crashe entre les deux.

### Fil : dernière visite & contenus manqués (migration `20260821204509`)

Repères "fil orienté découverte" (séparateurs temporels + contenus manqués) :

- `profiles.last_feed_visit_at` (`timestamptz`, nullable) : dernière consultation du **fil** (distincte de `last_login_at`/`last_active_at`). `NULL` = première visite.
- `mark_feed_visit()` → `timestamptz` : renvoie la visite **précédente** (référence figée pour la session) puis pose `now()`, atomiquement. `SECURITY DEFINER`, scopée à `auth.uid()`. Grant `authenticated`.
- `count_new_feed_posts(p_since timestamptz)` → `int` : nombre d'observations **publiques publiées** depuis `p_since` (mêmes filtres que le feed public : `published` + `public` + hors comptes internes). `SECURITY DEFINER` `STABLE` (ne lit que du public). Grant `authenticated`. Index `idx_posts_published_public_created_at`.

Pas de tracking par post : « vu » = `created_at <= last_feed_visit_at`. Logique client pure dans `feedTimeline.ts` (séparateurs + frontière « déjà vu »), état de visite via `useFeedVisit`.

---

## 5. Décisions différées (V1+)

| Décision                                | Quand y revenir       | Pourquoi pas maintenant                                   |
| --------------------------------------- | --------------------- | --------------------------------------------------------- |
| Partitioning `posts` par `published_at` | > 10M posts           | Inutile sous 1M, complique les FK                         |
| Vues matérialisées pour `trending`      | > 100k posts/jour     | `ORDER BY likes_count DESC LIMIT 20` est suffisant en MVP |
| Schéma `analytics` séparé               | Quand on a un PM data | Pas de besoin tant qu'on n'a pas d'event tracking         |
| Read replicas                           | > 50k req/min         | Supabase pro propose ça en 1 clic                         |
| Audit log (table `audit_events`)        | Avant V1 publique     | Important pour la modération mais pas bloquant MVP        |

---

## 6. Conclusion table ronde

**DBA** : « Le modèle est solide, dénormalisations contrôlées, RLS partout, PostGIS prêt. Je signe. »

**BE** : « Les types TS sont alignés (`supabase.ts` généré), les services sont déjà branchés sur ce schéma. Cohérent. »

**DevOps** : « Tout est en migration SQL versionnée, reproductible. Je signe à condition que `schema.sql` soit toujours synchro avec les migrations : ce sera vérifié en CI. »

→ **Validé**. Voir `schema.sql` pour le SQL canonique consolidé et `relations.md` pour les diagrammes ER + index.
