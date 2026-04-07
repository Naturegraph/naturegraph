# RLS Policies

> RLS = **Row Level Security**. Le frontend utilise la `anon key`, donc TOUTE la sécurité est appliquée par Postgres. Aucune table publique ne doit avoir RLS désactivée.

## Principes

1. **Default deny** : `ENABLE ROW LEVEL SECURITY` + aucune policy = personne ne lit/écrit.
2. **Une policy par opération** (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) — pas de policy fourre-tout.
3. **`auth.uid()`** est la fonction Supabase qui retourne l'UUID du user authentifié, ou `NULL` si anonymous.
4. **Helpers `STABLE SECURITY DEFINER`** (cf. `schema.sql` §4.7) pour les checks complexes (visibilité, blocks).
5. **Tester chaque policy** en se connectant comme 2 users différents + en anon.

---

## `profiles`

```sql
-- SELECT : tout le monde voit les profils non supprimés et non bloqués
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    deleted_at IS NULL
    AND is_suspended = false
    AND can_see_profile(id)   -- false si bloqué dans un sens ou l'autre
  );

-- UPDATE : seul le user lui-même
CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT : impossible côté client (création via trigger handle_new_auth_user)
-- DELETE : impossible côté client (passer par Edge Function delete-account)
```

## `user_settings`

```sql
CREATE POLICY user_settings_select ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_settings_update ON user_settings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

## `posts`

```sql
-- SELECT : tout post visible selon visibility + blocks
CREATE POLICY posts_select ON posts
  FOR SELECT USING (can_see_post(posts));

-- INSERT : user authentifié seulement, comme lui-même
CREATE POLICY posts_insert ON posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- UPDATE : seul l'auteur
CREATE POLICY posts_update ON posts
  FOR UPDATE USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- DELETE : seul l'auteur
CREATE POLICY posts_delete ON posts
  FOR DELETE USING (auth.uid() = author_id);
```

## `post_media`

```sql
-- SELECT : si on peut voir le post parent
CREATE POLICY post_media_select ON post_media
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND can_see_post(p))
  );

-- INSERT : si on est l'auteur du post parent
CREATE POLICY post_media_insert ON post_media
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.author_id = auth.uid())
  );

CREATE POLICY post_media_delete ON post_media
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.author_id = auth.uid())
  );
```

## `reactions`

```sql
CREATE POLICY reactions_select ON reactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND can_see_post(p))
  );

CREATE POLICY reactions_insert ON reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND can_see_post(p))
  );

CREATE POLICY reactions_delete ON reactions
  FOR DELETE USING (auth.uid() = user_id);
```

## `comments`

```sql
CREATE POLICY comments_select ON comments
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND can_see_post(p))
  );

CREATE POLICY comments_insert ON comments
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND can_see_post(p))
  );

CREATE POLICY comments_update ON comments
  FOR UPDATE USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY comments_delete ON comments
  FOR DELETE USING (auth.uid() = author_id);
```

## `follows`

```sql
CREATE POLICY follows_select ON follows
  FOR SELECT USING (
    can_see_profile(follower_id) AND can_see_profile(followed_id)
  );

CREATE POLICY follows_insert ON follows
  FOR INSERT WITH CHECK (
    auth.uid() = follower_id
    AND can_see_profile(followed_id)
  );

CREATE POLICY follows_delete ON follows
  FOR DELETE USING (auth.uid() = follower_id);
```

## `blocks`

```sql
CREATE POLICY blocks_all_self ON blocks
  FOR ALL USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);
```

## `notebooks` & `notebook_entries`

```sql
CREATE POLICY notebooks_select ON notebooks
  FOR SELECT USING (
    CASE visibility
      WHEN 'public'    THEN can_see_profile(owner_id)
      WHEN 'followers' THEN owner_id = auth.uid()
                         OR EXISTS (SELECT 1 FROM follows
                                     WHERE follower_id = auth.uid() AND followed_id = owner_id)
      WHEN 'private'   THEN owner_id = auth.uid()
    END
  );

CREATE POLICY notebooks_cud ON notebooks
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY notebook_entries_select ON notebook_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM notebooks n WHERE n.id = notebook_id
            AND (n.owner_id = auth.uid()
                 OR (n.visibility = 'public' AND can_see_profile(n.owner_id))))
  );

CREATE POLICY notebook_entries_cud ON notebook_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM notebooks n WHERE n.id = notebook_id AND n.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM notebooks n WHERE n.id = notebook_id AND n.owner_id = auth.uid())
  );
```

## `notifications`

```sql
CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY notifications_update_read ON notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- INSERT : impossible côté client (toutes les notifications sont créées
-- par triggers serveur ou par Edge Functions)
```

## `reports`

```sql
CREATE POLICY reports_insert ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- SELECT : seuls les modérateurs (rôle custom — V1)
-- pour MVP : aucun SELECT côté client
```

## `taxref`

```sql
-- Référentiel public, lecture libre
CREATE POLICY taxref_select ON taxref FOR SELECT USING (true);
-- Pas d'INSERT/UPDATE/DELETE depuis le client. Mises à jour par job ETL avec service_role.
```

---

## Tests obligatoires

Pour chaque table, écrire un test SQL (ou Vitest avec 2 sessions) qui vérifie :

1. Anon ne peut rien lire (sauf `taxref` et `posts.public`)
2. User A ne peut pas modifier les données de User B
3. User A bloqué par User B ne voit ni profil ni posts de B
4. `service_role` bypass tout (pour les jobs serveur)

Template :
```sql
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"<uuid-A>"}';
SELECT * FROM posts;  -- doit voir uniquement ce qui est autorisé
```
