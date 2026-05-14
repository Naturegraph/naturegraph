# Audit Advisors Supabase — 2026-05-13

> **Cycle** : BATCH 12 (consolidation)
> **Methode** : MCP Supabase `get_advisors security` + `get_advisors performance`
> **Project ref** : `hrxgduvworofnrjmgpcj`
> **Verdict** : 🟢 Etat coherent avec AUDIT_DB_LIVE.md (2026-05-03), pas de nouveau probleme critique.

---

## Securite — 63 lints

| Niveau    | Count | Detail                                                                                                                                |
| --------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **ERROR** | 1     | `rls_disabled_in_public` sur `spatial_ref_sys` (table PostGIS legacy — **faux positif**, table systeme read-only fournie par PostGIS) |
| **WARN**  | 62    | (voir ci-dessous)                                                                                                                     |

### Repartition WARN

| Lint                                                 | Count | Severite reelle | Action                                                                                                               |
| ---------------------------------------------------- | ----- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `anon_security_definer_function_executable`          | 27    | 🟡 normale      | RPC functions exposees a anon — comportement intentionnel (auth flow, public reads)                                  |
| `authenticated_security_definer_function_executable` | 27    | 🟡 normale      | RPC functions exposees a authenticated — idem                                                                        |
| `public_bucket_allows_listing`                       | 4     | 🟠 a verifier   | 4 buckets storage publics autorisent listing — limiter aux operations needed (cf. T-061)                             |
| `extension_in_public`                                | 3     | 🟡 cosmetique   | `postgis` + `unaccent` + (1 autre) installes dans `public` — bonnes pratiques recommande schema dedie (low priority) |
| `auth_leaked_password_protection`                    | 1     | 🟠 important    | HaveIBeenPwned check desactive — a activer via Auth settings (1 clic)                                                |

---

## Performance — 146 lints

| Niveau   | Count | Detail                                                                           |
| -------- | ----- | -------------------------------------------------------------------------------- |
| **WARN** | 109   | 55 `auth_rls_initplan` + 50 `multiple_permissive_policies` + 4 `duplicate_index` |
| **INFO** | 37    | 37 `unused_index`                                                                |

### Repartition

| Lint                           | Count | Tache MASTER_TODO | Action                                                                                                                            |
| ------------------------------ | ----- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `auth_rls_initplan`            | 55    | **T-067**         | Wrap `auth.uid()` → `(SELECT auth.uid())` dans les policies RLS — optimisation classique Postgres                                 |
| `multiple_permissive_policies` | 50    | **T-065**         | Cleanup 50 policies dupliquees (legacy + nouvelles cohabitent)                                                                    |
| `duplicate_index`              | 4     | **T-066**         | DROP les doublons                                                                                                                 |
| `unused_index`                 | 37    | (a documenter)    | Audit needed — certains indexes sont peut-etre utilises occasionnellement (recherche admin) ou en attente d'usage (tables jeunes) |

---

## Conclusion

L'audit confirme les taches deja documentees dans MASTER_TODO (T-064 = check, T-065 / T-066 / T-067 = restent a faire). Pas de surprise.

**Prochain cycle DB recommande** :

1. T-067 (55 policies) — gros gain perf, migration SQL droite
2. T-065 (50 policies) — cleanup, plus complexe (analyse contextuelle requise)
3. T-066 (4 indexes) — DROP simple, gain marginal mais propre
4. Auth settings : activer HaveIBeenPwned (1 clic UI Supabase, non SQL)

Refs : T-064 (MASTER_TODO) + cycle BATCH 12.
