# Force Logout Runbook

> Procedure pour invalider les sessions auth sans casser le produit. A utiliser pour les MAJ critiques (refonte auth, schema DB cassant, fuite suspectée). Nicolas 2026-05-25.

---

## Quand l utiliser

| Cas                                           | Force tous | Force un user | Eviter                    |
| --------------------------------------------- | ---------- | ------------- | ------------------------- |
| Refonte AuthContext / changement de storage   | ✅ Oui     |               |                           |
| Migration auth schema (rotation JWT secret)   | ✅ Oui     |               |                           |
| Compte compromis (mot de passe, token leak)   |            | ✅ Oui        |                           |
| Photographe coince avec session morte cliente |            | ✅ Oui        |                           |
| User signale un bug random                    |            |               | ✅ Eviter, c est intrusif |
| Refactor de feature non auth (UI, perf, etc.) |            |               | ✅ Eviter                 |

**Regle d or** : a utiliser avec parcimonie. Chaque force-logout = +1 mail OTP a renvoyer = friction users. Si moins de 10 users impactes, prefere les contacter individuellement.

---

## Comment ca marche techniquement

L auth Supabase repose sur 2 elements :

- **Access JWT** : 1h de vie, signe par le project_jwt_secret
- **Refresh token** : 30j de vie, ligne dans `auth.refresh_tokens`

Pour invalider une session, on revoque le **refresh token**. L access JWT actuel reste valide jusqu a expiration (max 1h), mais des qu il expire, le refresh fait `revoked = true` et echoue → l user est deconnecte.

Cote app, notre `assertActiveSession()` dans `src/lib/authGuard.ts` detecte le `getUser()` qui retourne null et redirige proprement vers `/welcome` avec un toast.

---

## Script SQL prêt a l emploi

### Option A : Un user precis

```sql
-- Remplace <USER_ID> par l UUID du user (table profiles ou auth.users)
UPDATE auth.refresh_tokens
SET revoked = true, updated_at = NOW()
WHERE user_id = '<USER_ID>'
  AND revoked = false;
```

### Option B : Tous les users (MAJ critique)

```sql
-- ATTENTION : tous les users seront deconnectes a leur prochaine action
-- Estimer le nombre AVANT
SELECT COUNT(DISTINCT user_id) AS users_a_dec FROM auth.refresh_tokens WHERE revoked = false;

-- Si OK, execute :
UPDATE auth.refresh_tokens
SET revoked = true, updated_at = NOW()
WHERE revoked = false;

-- Verif post-exec
SELECT COUNT(*) AS tokens_actifs_restants FROM auth.refresh_tokens WHERE revoked = false;
-- Doit retourner 0
```

### Option C : Users inactifs depuis N jours (cleanup proactif)

```sql
-- Deconnecte les sessions creees il y a plus de 60 jours
-- (utilise pour proteger les comptes oublies)
UPDATE auth.refresh_tokens rt
SET revoked = true, updated_at = NOW()
FROM auth.users u
WHERE rt.user_id = u.id
  AND rt.revoked = false
  AND COALESCE(u.last_sign_in_at, u.created_at) < NOW() - INTERVAL '60 days';
```

---

## Procedure complete pour une MAJ critique

### 1. Pre-flight (5 min avant la MAJ)

- [ ] Annonce sur Discord beta : "MAJ technique a HH:MM, reconnexion requise apres"
- [ ] Verifie que `assertActiveSession()` est en place (sinon les users verront des erreurs cryptiques au lieu d un redirect propre)
- [ ] Compte les users impactes via la requete d estimation

### 2. Deploiement

- [ ] Merge la PR sur main, attends que Vercel deploie (verifie sur naturegraph.ca avec hard refresh)
- [ ] Lance le SQL `Option B` via MCP Supabase ou Dashboard SQL Editor
- [ ] Verif post-exec : 0 token actif

### 3. Surveillance (30 min apres)

- [ ] Check les logs Supabase pour les erreurs auth anormales
- [ ] Garde un oeil sur le Discord beta pour les retours users
- [ ] Si quelqu un signale un bug "je n arrive plus a me reconnecter", regarde son user_id et son auth.users.banned_until (ne devrait pas etre set)

### 4. Post-mortem (24h apres)

- [ ] Compte les reconnexions reussies vs failures
- [ ] Documente l incident si > 5% des users ont eu un probleme

---

## Cas particuliers

### Si un user est bloque apres force-logout

Il n arrive plus a recevoir son OTP par mail :

1. Verifie `auth.users.email_confirmed_at` (doit etre rempli)
2. Verifie `auth.users.banned_until` (doit etre null)
3. Verifie qu il n est pas dans `auth.identities` avec un provider tiers
4. En dernier recours : reset password manuel via Supabase Dashboard

### Si tu veux exclure les admins

```sql
UPDATE auth.refresh_tokens rt
SET revoked = true, updated_at = NOW()
FROM profiles p
WHERE rt.user_id = p.id
  AND rt.revoked = false
  AND COALESCE(p.is_admin, false) = false;
```

(necessite la colonne `profiles.is_admin` ou equivalent)

### Force logout SANS toast pour l user

Si tu veux une deco "discrete" (par ex pour les comptes inactifs), il suffit de revoquer les tokens. L user verra juste un redirect vers /welcome a sa prochaine visite. Le toast "Session expirée" est declenche cote client par `assertActiveSession()` mais pas pour les redirects via beta gate / boot session check (qui sont silencieux).

---

## Historique

| Date       | Cas                            | Users impactes                     | Raison                                                                                       |
| ---------- | ------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------- |
| 2026-05-25 | Flo.d                          | 1                                  | Session locale corrompue Android Chrome, fix authGuard deploye en //                         |
| 2026-05-25 | Force-deco globale post V1.0.0 | 6 (5 photographes + Nicolas admin) | Repartir d une base stable apres stabilisation V1.0.0, alignement complet pre nouvelle norme |
