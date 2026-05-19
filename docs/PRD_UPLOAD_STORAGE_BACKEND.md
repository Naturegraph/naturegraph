# PRD — Upload Storage Backend (compléments Phase 2)

> **Statut :** Draft Phase 2 — pas encore validé Nicolas.
> **Date :** 2026-05-15 (post V1.0.0).
> **Auteur :** Équipe produit Naturegraph.
> **Pré-requis :** V1 livrée (`mediaService.uploadAvatar` + `uploadPostMedia`, EXIF strip, 4 buckets Supabase, RLS owner-only).

---

## 1. Contexte

La V1 expose un upload **fonctionnel** : `mediaService.ts` côté front re-encode chaque image via `stripImageExif()` (RGPD), pousse sur Supabase Storage (`avatars` / `post-media` / `notebook-covers`), puis insère une ligne `media` rattachée au post. Les buckets sont configurés (`20260407_storage_buckets_and_rls.sql`) avec RLS owner-only + lecture publique.

**Mais le pipeline est incomplet pour un usage prod soutenu :**

- **Pas de thumbnails** : on sert l'image originale (souvent 1-3 Mo) même en vignette feed → gros gâchis de bande passante + LCP dégradé.
- **Pas de validation magic number** côté upload : un attaquant peut renommer un `.exe` en `.jpg` et le poster. La RLS Storage ne contrôle pas le contenu binaire.
- **Pas de downscale automatique côté client** avant strip EXIF — on uploade des 12 MP inutiles.
- **Pas de progress UI** ni de **retry** : un upload qui échoue à 70 % redemande tout depuis zéro.
- **Pas d'orphan cleanup** : si l'insert `media` échoue après l'upload Storage, le fichier reste dans le bucket sans référence DB.
- **MediaUploader.tsx** (composant UI) garde encore des `TODO [BACKEND]` non honorés (cf. lignes 10-23 du fichier).

---

## 2. User stories

| #     | En tant que…          | Je veux…                                                           | Pour…                                                       |
| ----- | --------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| US-01 | Utilisateur mobile 4G | Que ma photo de 8 Mo s'uploade en quelques secondes même hors WiFi | Publier sur le terrain sans frustration                     |
| US-02 | Visiteur du feed      | Que les vignettes des posts chargent quasi-instantanément          | Scroller sans attendre / sans data mobile cramée            |
| US-03 | Contributeur          | Voir une barre de progression pendant l'upload                     | Savoir que ça avance / pouvoir annuler proprement           |
| US-04 | Admin sécurité        | Garantir qu'aucun fichier non-image n'arrive dans `post-media`     | Bloquer la malveillance (XSS via SVG, exécutables déguisés) |
| US-05 | Owner du compte       | Si l'upload échoue à 90 %, pouvoir réessayer sans tout recommencer | Robustesse offline / réseau instable                        |

---

## 3. Périmètre

### In scope (Phase 2)

- Génération de **3 variantes thumbnail** via Supabase Image Transform (`?width=400` / `800` / `1600`).
- Validation **magic number** (4 premiers octets binaires) avant upload.
- **Downscale client** intelligent : long-edge > 2400 px → re-sample canvas avant strip EXIF.
- **Progress UI** dans `MediaUploader.tsx` (event `onUploadProgress` du XHR / `tus-js-client`).
- **Retry** automatique 2× exponential backoff + bouton retry manuel sur échec final.
- **Orphan cleanup** : trigger Postgres OU Edge Function cron qui supprime du Storage les fichiers sans `media` row > 24h.
- Logger upload errors dans `audit_logs` (table existante).

### Out of scope (Phase 3+)

- Resumable upload via TUS protocol (`tus-js-client` ~15 kB) — sauf si feedback beta confirme le besoin.
- Vidéo (MP4) — déjà dans MIME types autorisés du bucket mais aucun composant front ne l'exploite encore.
- Édition pixel post-upload (crop, rotation) — voir PRD_PHOTO_MANAGEMENT v4.
- CDN dédié (Cloudflare Images) — voir ROADMAP Phase 3.

---

## 4. Modèle de données / Storage

**Pas de nouvelle table** — on enrichit `media` :

```sql
-- Migration YYYYMMDD_media_thumbnails_phase2.sql
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS thumb_400_url text,
  ADD COLUMN IF NOT EXISTS thumb_800_url text,
  ADD COLUMN IF NOT EXISTS thumb_1600_url text,
  ADD COLUMN IF NOT EXISTS upload_status text NOT NULL DEFAULT 'ready'
    CHECK (upload_status IN ('pending', 'uploading', 'ready', 'failed'));

-- Index pour le cron orphan cleanup
CREATE INDEX IF NOT EXISTS idx_media_pending_old
  ON public.media (created_at)
  WHERE upload_status IN ('pending', 'uploading');
```

**Image Transform** : les 3 URLs ne sont pas stockées en dur — on les **dérive** via helper `getThumbnailUrl(url, width)` qui ajoute `?width=...&quality=80` à l'URL Supabase. Stocker en DB uniquement si on doit override (cas rare). Les colonnes ci-dessus servent de fallback / CDN-cache plus tard.

**Bucket RLS** : inchangé. La validation magic number se fait **côté client** (UX immédiate) + **côté Edge Function** post-upload pour cas critique (à n'activer que si on observe des abus).

**Cron orphan cleanup** : Edge Function `cleanup-orphan-media` (existante côté patterns — voir `weekly-species-digest`), planifiée toutes les 6 h via `pg_cron`.

```sql
SELECT cron.schedule(
  'cleanup-orphan-media',
  '0 */6 * * *',
  $$
  DELETE FROM storage.objects o
  WHERE o.bucket_id = 'post-media'
    AND o.created_at < now() - interval '24 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.media m
      WHERE m.url LIKE '%' || o.name
    );
  $$
);
```

---

## 5. Étapes d'implémentation

| #    | Tâche                                                                                                 | Estimation |
| ---- | ----------------------------------------------------------------------------------------------------- | ---------- |
| T-01 | Migration SQL `YYYYMMDD_media_thumbnails_phase2.sql` (4 colonnes + 1 index)                           | 0,25 j     |
| T-02 | Helper `getThumbnailUrl(url, width)` dans `utils/imageUrl.ts` + usage dans `FeedPost` / `FeedGallery` | 0,5 j      |
| T-03 | `validateMagicNumber(file)` dans `utils/fileValidation.ts` (signatures JPEG/PNG/WebP)                 | 0,5 j      |
| T-04 | Downscale client (`utils/downscaleImage.ts`) intégré dans `stripImageExif`                            | 0,75 j     |
| T-05 | `mediaService.uploadPostMedia` → callback `onProgress` via XHR (Supabase JS v2 le supporte)           | 0,5 j      |
| T-06 | `MediaUploader.tsx` : barre de progression + bouton retry + état `failed`                             | 1 j        |
| T-07 | Retry exponential backoff (2 essais auto avant état `failed`)                                         | 0,5 j      |
| T-08 | Edge Function `cleanup-orphan-media` + cron `pg_cron`                                                 | 0,75 j     |
| T-09 | Logger erreurs upload dans `audit_logs` (event `media_upload_failed`)                                 | 0,25 j     |
| T-10 | i18n FR/EN (~10 clés : progression, retry, format invalide, magic number)                             | 0,25 j     |
| T-11 | Tests unitaires (vitest) + tests Edge Function (Deno)                                                 | 0,75 j     |

**Total estimé : ~6 jours dev.**

---

## 6. Tests à prévoir

### Unitaires (vitest)

- `validateMagicNumber` rejette un `.exe` renommé `.jpg` (bytes `MZ`).
- `validateMagicNumber` accepte JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), WebP (`52 49 46 46`).
- `downscaleImage(file, 2400)` retourne un fichier ≤ 2400 px côté long sans déformation.
- `getThumbnailUrl(url, 400)` reconstruit correctement les URLs Supabase Image Transform.
- Retry : 2 échecs réseau → 3ᵉ tentative déclenchée ; 3 échecs → état `failed`.

### Intégration

- Upload réel sur projet Supabase local : 5 Mo JPEG → strip EXIF → progress 0-100 % → media row OK.
- Coupure réseau simulée à 50 % → retry auto → succès.
- Coupure réseau définitive → état `failed` → bouton retry → succès.
- Insert `media` échoue → fichier Storage supprimé automatiquement (rollback).

### Sécurité

- Tentative upload SVG avec `<script>` → bloqué par MIME whitelist + magic number.
- Tentative upload 50 Mo → bloqué par taille bucket + UI.
- Tentative upload sur path `/${otherUserId}/...` → RLS rejette (403).

### Cron orphan

- Insérer manuellement un fichier `post-media` sans row `media`, attendre 24 h (ou trigger manuel) → fichier supprimé.

---

## 7. Risques & mitigations

| Risque                                                          | Probabilité | Impact       | Mitigation                                                                                    |
| --------------------------------------------------------------- | ----------- | ------------ | --------------------------------------------------------------------------------------------- |
| Supabase Image Transform absent ou rate-limité sur free plan    | Moyenne     | **Élevé**    | Vérifier quota avant migration ; fallback `<img srcset>` sans transformation.                 |
| Downscale canvas tue iOS Safari sur très grandes images (12 MP) | Moyenne     | Moyen        | Limiter à 2400 px ; surveiller perf via `performance.mark` ; fallback "trop gros".            |
| Magic number check ralentit l'upload de plusieurs photos        | Faible      | Faible       | Lecture des 4 premiers octets uniquement via `Blob.slice(0, 4)` — coût négligeable.           |
| Cron orphan supprime un fichier en cours d'upload long          | Faible      | **Critique** | Fenêtre 24 h très large ; check `upload_status IN ('pending', 'uploading')` exclus du DELETE. |
| Progress UI trompe l'utilisateur si XHR ne fournit pas d'event  | Faible      | Faible       | Fallback "Indéterminé" + spinner ; tester sur Safari (event partiel).                         |
| Retry crée des duplicates si insert DB partiel                  | Moyenne     | Moyen        | Path déterministe (UUID) + INSERT … ON CONFLICT DO NOTHING.                                   |

---

## 8. Performance & éco-conception

| Métrique                              | Avant V1 | Cible Phase 2 |
| ------------------------------------- | -------- | ------------- |
| Poids photo feed (vignette feed list) | 1-3 Mo   | ≤ 80 kB       |
| Poids photo feed (gallery masonry)    | 1-3 Mo   | ≤ 40 kB       |
| LCP feed mobile 4G                    | ~3,5 s   | < 2,5 s       |
| Bande passante feed (20 posts × 2 ph) | ~50 Mo   | ≤ 5 Mo        |
| Temps upload médian (5 Mo JPEG)       | 8-12 s   | 3-5 s         |

Conformité **GUIDELINES.md** : downscale + thumbnails = baisse drastique de l'empreinte carbone du feed (mesurée via EcoIndex). Budget JS supplémentaire : ≤ 4 kB gzip (magic-number-table + downscale helper).

---

## 9. Done when

- [ ] Migration + Edge Function + cron déployés sur dev + staging + prod.
- [ ] `FeedPost` / `FeedGallery` chargent les thumbnails 400 px / 800 px selon viewport.
- [ ] Upload réel testé sur iOS Safari 14, Android Chrome, Firefox ESR : progress + retry fonctionnent.
- [ ] Magic number bloque un faux JPEG (test rouge avant fix, vert après).
- [ ] Aucun fichier orphelin présent après 24 h dans le bucket `post-media`.
- [ ] Lighthouse mobile feed : LCP < 2,5 s.
- [ ] `npm run lint && npm run test && npm run build` au vert.

---

## Annexe — Décisions clés

**ADR-001 : Supabase Image Transform plutôt que stockage explicite des thumbs.** Évite la duplication Storage, le ré-encoding manuel, et la migration des photos existantes. Risque : dépendance plateforme (mitigé par colonnes fallback `thumb_*_url`).

**ADR-002 : Magic number côté client only en Phase 2.** Suffisant pour 99 % des cas + RLS Storage pour le reste. Validation serveur (Edge Function pré-upload) reportée si abus observés.

**ADR-003 : Downscale 2400 px côté long.** Couvre 100 % des écrans HDPI desktop + zoom lightbox sans coût stockage déraisonnable. Originaux > 2400 px sont rares en usage réel (terrain ≠ studio).

**ADR-004 : Orphan cleanup via cron, pas via trigger sync.** Trigger DB ne peut pas appeler `storage.objects.delete()` directement de manière atomique ; cron asynchrone est plus simple et tolère mieux les pannes Storage.
