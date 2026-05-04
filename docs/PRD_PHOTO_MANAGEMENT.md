# PRD — Gestion des photos (v3)

> **Statut :** v3 — refonte complète (remplace v2).
> **Date :** 2026-04-22
> **Auteur :** Équipe produit Naturegraph
> **Inspiration :** Strava, Apple Photos, Instagram "feed natif" — simplicité radicale.

---

## 0. Changelog & positionnement

La v2 imposait un **format unique par post** (paysage OU portrait OU carré), un recadrage explicite obligatoire en cas de mismatch, et une pipeline d'édition non-destructive complexe (crop_data, transforms). En pratique, cette logique :

- ajoutait une étape cognitive lourde en contribution (badge rouge "Adapter", modal édition, décisions format) ;
- compliquait le feed (slider à format unique) sans bénéfice visuel mesurable ;
- freinait la publication rapide depuis mobile, en contradiction avec P1 (sobriété) et l'esprit "citoyen" de la plateforme.

**Décision produit :** on pivote vers une logique **simple, flexible, MVP-first** inspirée de Strava, où l'utilisateur poste ses photos telles quelles et où le feed s'adapte intelligemment au nombre et aux formats.

### Ce qu'on supprime de la v2

| Élément v2                                     | Décision v3                                        |
| ---------------------------------------------- | -------------------------------------------------- |
| P3 "un seul format par post"                   | ❌ Supprimé — formats mixtes autorisés             |
| Détection + badge mismatch "Adapter"           | ❌ Supprimé                                        |
| Modal d'édition crop/zoom/rotation obligatoire | ❌ Supprimé en MVP (reportée v4)                   |
| `crop_data` JSONB + transforms feed            | ❌ Supprimé — photos affichées telles quelles      |
| `posts.media_format` (format de post)          | ❌ Supprimé                                        |
| Slider à format unique                         | ❌ Supprimé — feed adaptatif par count             |
| Re-encode systématique canvas pour crop        | ✅ Conservé uniquement pour strip EXIF + downscale |

### Ce qu'on introduit

- Formats mixtes tolérés dans un même post (paysage + portrait + carré cohabitent).
- Max **4 photos par post** (MVP strict).
- **Cover = première photo** par défaut (modifiable via "mettre en premier").
- Réorganisation simple : ◀ ▶ ★ ✕ (gauche / droite / mettre en cover / supprimer).
- Feed **adaptatif par count** : 1, 2, 3, 4 → layouts dédiés, sans déformation.
- Viewer plein écran avec pinch-zoom + swipe (photo originale, non recadrée).
- Strip EXIF + downscale conservés (privacy + éco-conception — inchangés v2).

---

## 1. Contexte

Naturegraph est une plateforme citoyenne de partage d'observations naturalistes. Les contributions (rencontres nature, identifications, carnets) s'appuient massivement sur la photo : c'est le premier vecteur de reconnaissance d'espèce et d'engagement social.

En v2, le parcours photo a été conçu comme une chaîne de production éditoriale (un post = une identité visuelle forte, un format homogène). Les tests internes et la review UX de mars 2026 ont montré que cette approche :

- ralentit la publication (2 à 3 étapes cognitives en plus vs un post instantané) ;
- exclut les usages naturels du terrain (rafale mixte paysage/portrait) ;
- ne reflète pas la valeur réelle du contenu (la photo compte pour sa donnée écologique, pas pour sa cohérence graphique).

Strava résout ce problème en laissant l'utilisateur coller 1 à N photos de formats variés, puis en les organisant automatiquement selon leur nombre. C'est cette logique qu'on adopte.

---

## 2. Objectifs

### Objectifs produit (OKR Q2 2026)

- **O1 — Réduire la friction de publication.** Temps médian étape "Photos" < 20 s pour 3 photos (vs ~60 s en v2 avec édition).
- **O2 — Augmenter le nombre moyen de photos par post.** Cible ≥ 2,2 photos / post (vs 1,4 en v2).
- **O3 — Préserver la qualité visuelle du feed.** NPS visuel interne ≥ 7/10 sur panel beta.
- **O4 — Rester sobre.** Budget photo ≤ 300 kB par photo affichée en feed (hors viewer).

### Non-objectifs (explicites)

- Pas d'édition avancée (filtres, crop manuel, rotation) en MVP.
- Pas de cover personnalisée autre que "réordonner".
- Pas de reconnaissance d'espèce automatique (voir PRD séparé).
- Pas de carrousel algorithmique (ordre = choix utilisateur, point).

---

## 3. Principes directeurs

| #      | Principe                    | Implication concrète                                                                                                                                                            |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1** | **Non-destruction**         | On ne modifie jamais les pixels au-delà du strip EXIF + downscale. L'original (au sens "ce que l'utilisateur a uploadé") est toujours récupérable pour la preuve d'observation. |
| **P2** | **Zéro décision inutile**   | Aucune question posée à l'utilisateur sur le format, le cadrage, l'orientation. Il sélectionne, il publie.                                                                      |
| **P3** | **Respect du format natif** | Le feed ne rogne jamais une photo en aveugle. `object-contain` partout où le ratio n'est pas maîtrisé, grille adaptative ailleurs.                                              |
| **P4** | **Sobriété**                | Pas d'animation gratuite, pas de JS pour ce que le CSS sait faire, pas de transformation pixel si elle n'apporte pas de valeur.                                                 |
| **P5** | **Accessibilité**           | Alt-text encouragé (pas bloquant), navigation clavier complète, respect `prefers-reduced-motion`, focus visible.                                                                |
| **P6** | **Privacy by default**      | Strip EXIF systématique (GPS retiré avant upload), indépendamment du toggle "localisation publique".                                                                            |

---

## 4. Périmètre MVP

### In scope

- Upload 1 à 4 photos par post (JPEG, PNG, WebP ; HEIC toléré → fallback sans re-encode).
- Strip EXIF + downscale (`maxLongEdge = 2400 px`, qualité 0.92).
- Réorganisation : boutons `◀` / `▶` / `★ mettre en cover` / `✕ supprimer`.
- Cover implicite = photo #1 (l'utilisateur la modifie via "mettre en premier").
- Feed : 4 layouts `.feed-layout-1 / -2 / -3 / -4` selon le nombre de photos.
- Lightbox plein écran : swipe, pinch-zoom (mobile), flèches clavier, fermeture Escape.
- Lazy loading (natif `loading="lazy"`), dimensions explicites (CLS = 0).
- Compression côté client non-destructive (canvas JPEG q=0.92).

### Out of scope MVP (reportés v4+)

- Édition manuelle (crop, rotation, filtres).
- Cover custom (sélection sans réordonner).
- Vidéo (clip court terrain).
- Carrousel partagé multi-posts (carnet).
- Reconnaissance espèce visuelle.
- Watermark / signature automatique.

---

## 5. UX / UI

### 5.1 Étape 1 — Contribution

**Panneau photo simplifié :**

```
┌──────────────────────────────────────────────┐
│  [ + Ajouter une photo ]   (1/4)             │
│                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│  │  ★     │ │        │ │        │ │        ││
│  │ photo1 │ │ photo2 │ │ photo3 │ │ photo4 ││
│  │  ◀ ▶ ✕│ │ ◀ ★ ▶ ✕│ │...     │ │...     ││
│  └────────┘ └────────┘ └────────┘ └────────┘│
└──────────────────────────────────────────────┘
```

**Règles :**

- Pas de hero slot : toutes les vignettes ont la même taille visuelle (le statut "cover" est signifié par un badge `★` discret en haut-gauche).
- Pas de badge format, pas de pastille mismatch, pas de CTA "Adapter".
- Toutes les vignettes sont en `object-cover` **sur la vignette seulement** (la vignette est un aperçu carré standardisé). En feed et en lightbox, on affiche le vrai ratio.
- Tap / clic sur une vignette → lightbox preview (pas de modal d'édition).

**Contrôles par vignette (hover desktop / tap mobile) :**

| Bouton | Action                                | Visible si               |
| ------ | ------------------------------------- | ------------------------ |
| `◀`    | Décale d'une position vers la gauche  | pas en position 1        |
| `▶`    | Décale d'une position vers la droite  | pas en dernière position |
| `★`    | Met cette photo en position 1 (cover) | pas déjà cover           |
| `✕`    | Supprime                              | toujours                 |

Accessibles au clavier (`Tab` + `Enter/Space`), `aria-label` explicite ("Déplacer vers la gauche", "Mettre en photo de couverture", etc.).

### 5.2 Feed — Layout adaptatif

Basé purement sur le **nombre de photos** du post, pas sur leur format. Aucune photo n'est rognée en aveugle : on utilise `object-cover` dans des cadres au **ratio figé** calculé pour accueillir dignement tous les formats courants.

| Count | Layout           | Cadre(s)                                                                   |
| ----- | ---------------- | -------------------------------------------------------------------------- |
| 1     | `.feed-layout-1` | Pleine largeur, ratio **4:3** (letterboxing `bg-muted` si portrait serré). |
| 2     | `.feed-layout-2` | 2 colonnes égales, ratio **1:1** chaque.                                   |
| 3     | `.feed-layout-3` | 1 grande gauche ratio **4:5** + 2 petites droite empilées ratio **1:1**.   |
| 4     | `.feed-layout-4` | Grille **2×2**, ratio **1:1** chaque.                                      |

**Rationale cadres :**

- **1 photo** : le 4:3 est le plus inclusif (accueille paysage natif et portrait avec léger letterbox sans paraître absurde).
- **2/4 photos** : carré simplifie le code et l'alignement, et les portraits/paysages restent lisibles en thumbnail.
- **3 photos** : le 4:5 de la grande photo met en valeur les portraits (fréquents en macro nature), les petites carrées font office de teasers.

**Letterboxing :** quand une photo portrait est placée dans un cadre 4:3, on utilise `object-contain` + `background: var(--color-muted)`. Pas d'étirement, pas de blur-background (sobriété).

**Indicateur de count :** si ≥ 2 photos, afficher un badge `1/N` en overlay bas-droite de la première.

### 5.3 Lightbox (viewer plein écran)

Inchangée par rapport à la v2 (déjà alignée avec la nouvelle vision), **+ 2 ajouts MVP** :

- **Pinch-zoom** mobile via `touch-action: pinch-zoom` sur le conteneur image + fallback gesture handler JS (zoom 1× → 4× max). Double-tap = zoom 2×.
- **Swipe horizontal** pour naviguer (déjà supporté par flèches ; on ajoute le geste).

Le reste est conforme : `object-contain`, navigation clavier (← → Esc), focus piégé, `prefers-reduced-motion` respecté, miniatures navigation.

### 5.4 États d'erreur

| Cas                              | UX                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| Upload d'un 5ᵉ fichier           | Toast "Maximum 4 photos. Supprime-en une pour en ajouter une autre." Bouton `+` désactivé. |
| Fichier > 20 Mo brut             | Toast "Photo trop lourde (max 20 Mo)."                                                     |
| Format non supporté (ex : .tiff) | Toast "Format non supporté. JPEG, PNG ou WebP."                                            |
| HEIC                             | Accepté, strip EXIF skip, warning console dev uniquement.                                  |
| Perte réseau pendant upload      | Retry auto 2×, puis état `error` sur vignette + bouton retry manuel.                       |

---

## 6. Modèle de données

### 6.1 Table `media` (existante, simplifiée)

```sql
-- Colonnes conservées / ajoutées en v3
id              uuid pk
post_id         uuid fk posts(id) on delete cascade
url             text        -- URL Supabase Storage (original strippé + downscalé)
width           int         -- pixels après downscale
height          int         -- pixels après downscale
ratio           numeric     -- width / height (stored generated)
display_order   smallint    -- 0, 1, 2, 3
is_cover        boolean     -- default false ; exactly one true per post_id (trigger)
mime            text        -- 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic'
file_size       int         -- bytes, pour métriques
created_at      timestamptz
```

### 6.2 Colonnes supprimées (vs v2)

- `media.crop_data` — supprimé (pas de crop non-destructif côté feed).
- `media.format` (enum landscape/portrait/square) — supprimé, déduit du `ratio`.
- `posts.media_format` — supprimé (un post n'a plus de format unique).

### 6.3 Contraintes

- `CHECK (display_order BETWEEN 0 AND 3)` — max 4 photos.
- Trigger `BEFORE INSERT OR UPDATE` garantissant **exactement une cover par post** (auto-cover = display_order min si aucune).
- Cascade delete sur `posts`.

### 6.4 URL de thumbnail (v4+)

Reporté : en MVP on sert la même URL partout (Supabase Storage, CDN Vercel). Les largeurs dérivées (`?width=400`, `?width=800`) seront introduites via Supabase Image Transform quand le volume le justifie.

---

## 7. Technique

### 7.1 Pipeline upload

```
1. User sélectionne fichier(s) via <input type="file" accept="image/*" multiple>
2. Pour chaque fichier (client) :
   a. Validation MIME + taille < 20 MB
   b. detectPhotoFormat(file) → { width, height }  (déjà implémenté)
   c. stripExif(file, { maxLongEdge: 2400, quality: 0.92 })
      → File sans EXIF, downscalé si > 2400 px côté long
   d. uploadPostMedia(cleanFile, { display_order, is_cover })
      → Supabase Storage + INSERT media
3. Server (RLS) :
   - Vérifie post_id appartient à auth.uid()
   - Trigger auto-cover si aucune cover
```

### 7.2 Composants touchés

| Composant                     | Changement                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `EncounterStep1.tsx`          | Simplifié : grille 4 slots uniformes, boutons réordonner, plus de hero, plus de badge format/mismatch.              |
| `PhotoEditModal.tsx`          | **Supprimé** (MVP). Fichier conservé commenté dans une branche d'archive pour v4.                                   |
| `photoEdits.ts`               | **Supprimé** (MVP).                                                                                                 |
| `ContributeEncounterForm.tsx` | Retire `aspectRatio`, `photoEdits`. Pipeline upload = detect → strip → upload. Ajoute `displayOrder`, `coverIndex`. |
| `ImageSlider.tsx`             | **Remplacé** par `FeedPhotoLayout.tsx` (4 variantes CSS pures).                                                     |
| `FeedPost.tsx`                | `images[]` simplifié : `{ url, alt, width, height, ratio }`. Drop `cropData`, drop `format`.                        |
| `PhotoLightbox.tsx`           | +Pinch-zoom, +swipe. Retire `cropData` (déjà inutilisé côté render).                                                |
| `mediaService.ts`             | `uploadPostMedia` : retire `cropData`, retire `format`. Ajoute `isCover`.                                           |
| `postService.ts`              | Retire `CreatePostPayload.media_format`.                                                                            |

### 7.3 Migration SQL

```sql
-- supabase/migrations/20260422_photo_management_v3.sql
BEGIN;

-- Drop v2 columns
ALTER TABLE public.media DROP COLUMN IF EXISTS crop_data;
ALTER TABLE public.media DROP COLUMN IF EXISTS format;
ALTER TABLE public.posts DROP COLUMN IF EXISTS media_format;

-- Add v3 columns
ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS ratio numeric GENERATED ALWAYS AS (
    CASE WHEN height > 0 THEN width::numeric / height ELSE NULL END
  ) STORED,
  ADD COLUMN IF NOT EXISTS is_cover boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS file_size int;

-- Max 4 photos per post
ALTER TABLE public.media
  ADD CONSTRAINT media_display_order_range
  CHECK (display_order BETWEEN 0 AND 3);

-- Exactly one cover per post
CREATE OR REPLACE FUNCTION ensure_single_cover()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_cover THEN
    UPDATE public.media
       SET is_cover = false
     WHERE post_id = NEW.post_id AND id <> NEW.id AND is_cover;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER media_single_cover
  BEFORE INSERT OR UPDATE OF is_cover ON public.media
  FOR EACH ROW EXECUTE FUNCTION ensure_single_cover();

COMMIT;
```

### 7.4 Re-générer les types TS

```
npx supabase gen types typescript --project-id <DEV_ID> > src/types/supabase.ts
```

Puis retirer les `as any` résiduels.

---

## 8. Performance & éco-conception

### 8.1 Budgets

| Métrique                                                | Budget       | Mesure                                |
| ------------------------------------------------------- | ------------ | ------------------------------------- |
| Poids photo feed (après downscale + q=0.92)             | ≤ 300 kB     | `file_size` en DB                     |
| JS photo-management (après tree-shake)                  | ≤ 15 kB gzip | `vite build --report`                 |
| LCP page feed                                           | < 2.5 s      | Lighthouse mobile 4G                  |
| CLS feed                                                | = 0          | `width`/`height` attributs explicites |
| Requêtes images par scroll feed (20 posts × 2,2 photos) | ≤ 44         | DevTools Network                      |

### 8.2 Optimisations

- Downscale côté client (2400 px max) **avant** upload → évite 3× de bande passante serveur.
- `loading="lazy"` natif sur toutes les `<img>` hors viewport initial.
- `decoding="async"` sur toutes les photos feed.
- Hauteur/largeur explicites via les cadres CSS au ratio fixé → zéro CLS.
- Pas de JS pour le layout feed (CSS Grid pure, 4 classes).
- Strip EXIF = seule transformation pixel ; pas de filtrage/compression agressive.

### 8.3 Dépendances

Aucune nouvelle dépendance JS. Le pinch-zoom mobile est implémenté en ~40 lignes (PointerEvents + transform CSS). Si le besoin dépasse ça, on évalue `react-zoom-pan-pinch` (≈ 8 kB gzip) contre un rewrite natif.

---

## 9. KPI & instrumentation

| KPI                                           | Source                                                               | Cible      |
| --------------------------------------------- | -------------------------------------------------------------------- | ---------- |
| Temps médian étape 1 (sélection → validation) | Analytics funnel                                                     | < 20 s     |
| Nombre moyen de photos / post                 | `SELECT avg(c) FROM (SELECT count(*) c FROM media GROUP BY post_id)` | ≥ 2,2      |
| % posts avec ≥ 2 photos                       | SQL                                                                  | ≥ 55 %     |
| % posts où cover ≠ photo 1 d'origine          | Event `photo_set_as_cover`                                           | observable |
| Taille médiane photo uploadée                 | `median(file_size)`                                                  | 200-400 kB |
| Taux d'échec upload                           | Erreurs Supabase Storage / total                                     | < 1 %      |
| Pinch-zoom usage lightbox                     | Event `lightbox_zoom`                                                | observable |
| NPS visuel feed beta                          | Form in-app                                                          | ≥ 7/10     |

Events analytics à ajouter (Plausible custom events) : `photo_added`, `photo_removed`, `photo_reordered`, `photo_set_as_cover`, `lightbox_opened`, `lightbox_zoom`, `lightbox_swipe`.

---

## 10. Risques & mitigations

| Risque                                                                  | Probabilité | Impact       | Mitigation                                                                                                   |
| ----------------------------------------------------------------------- | ----------- | ------------ | ------------------------------------------------------------------------------------------------------------ |
| Feed visuellement hétérogène (portraits letterboxés à côté de paysages) | Moyenne     | Moyen        | Choix des ratios validé sur échantillon 100 posts ; letterbox `bg-muted` discret ; ajustable avant Sprint 2. |
| HEIC mal géré sur Android anciens                                       | Faible      | Faible       | Fallback : upload tel quel sans strip (warning FAQ).                                                         |
| Perte du contrôle éditorial "power users"                               | Faible      | Faible       | v4 rouvre l'édition en opt-in.                                                                               |
| Oubli du strip EXIF → fuite GPS                                         | Faible      | **Critique** | `stripExif` appelé systématiquement avant `uploadPostMedia` ; test unitaire ; revue sécu avant merge.        |
| Migration casse des posts v2                                            | Moyenne     | Moyen        | Dev only en MVP ; pas de données prod v2 à migrer ; documenter dans release notes.                           |
| Pinch-zoom buggy iOS Safari                                             | Moyenne     | Faible       | Feature-flag `VITE_ENABLE_PINCH_ZOOM` + fallback boutons `+/-`.                                              |
| User veut uploader > 4 photos                                           | Faible      | Faible       | Toast clair, roadmap v4 référencée.                                                                          |

---

## 11. Vision long terme

**v3 (ce PRD — Sprint 1-2, Q2 2026)** : simplicité radicale, MVP photo-first, sortie beta.

**v4 (Sprint 3-4, Q3 2026) — édition opt-in :**

- Modal édition simple : crop libre, rotation 90°, alt-text.
- Persistance non-destructive (réintroduction éventuelle de `crop_data` si usage justifié).
- Filtres légers (luminosité/contraste uniquement, pas de style Instagram).

**v5 (Q4 2026) — multimédia :**

- Vidéo courte (≤ 15 s, WebM/MP4).
- Séries chronologiques (burst terrain).
- EXIF sélectif (date opt-in, GPS toujours retiré).

**v6+ — intelligence :**

- Suggestion de cover basée sur netteté/saillance (offline, client-side).
- Clustering visuel pour carnets (regrouper photos d'une même sortie).
- Reconnaissance d'espèce visuelle (PRD séparé, modèles INPN/Pl@ntNet).

---

## 12. Roadmap & découpage

### Sprint 1 — Refonte contribution (2 semaines)

- [ ] **T1** — Migration SQL `20260422_photo_management_v3.sql` (drop v2, add v3, trigger cover).
- [ ] **T2** — Regen `src/types/supabase.ts`, retirer les `as any`.
- [ ] **T3** — Refactor `EncounterStep1.tsx` : grille uniforme 4 slots, boutons réordonner, badge cover, plus de détection format ni hero.
- [ ] **T4** — Simplifier `ContributeEncounterForm.tsx` : retirer `aspectRatio`, `photoEdits`. Pipeline = detect → strip → upload + `displayOrder` + `isCover`.
- [ ] **T5** — Supprimer `PhotoEditModal.tsx` + `photoEdits.ts`.
- [ ] **T6** — Mettre à jour `mediaService.ts` + `postService.ts`.
- [ ] **T7** — Finir `stripExif.ts` : intégrer `computeDownscale` dans le canvas (chantier en cours).

### Sprint 2 — Feed & viewer (2 semaines)

- [ ] **T8** — Créer `FeedPhotoLayout.tsx` + 4 variantes CSS (`.feed-layout-1/2/3/4`).
- [ ] **T9** — Remplacer `ImageSlider.tsx` par `FeedPhotoLayout` dans `FeedPost.tsx`.
- [ ] **T10** — Adapter `FeedGallery.tsx` (mosaïque galerie).
- [ ] **T11** — Ajouter pinch-zoom + swipe dans `PhotoLightbox.tsx`.
- [ ] **T12** — Retirer `cropData` de `LightboxImage`, `MockPost.images`, `mediaService`.
- [ ] **T13** — Instrumenter les 7 events Plausible.

### Sprint 3 — Polish & validation (1 semaine)

- [ ] **T14** — Test matrix : iOS Safari, Android Chrome, Firefox ESR, desktop.
- [ ] **T15** — Audit a11y (axe-core sur Step1 + Lightbox + Feed).
- [ ] **T16** — Audit perf (Lighthouse mobile 4G, `vite build --report`).
- [ ] **T17** — Revue sécu strip EXIF (photo GPS connue → vérifier Storage).
- [ ] **T18** — Release notes v3 + communication beta testers.

### Done when

- Tous les points Sprint 1+2+3 cochés.
- Budgets performance respectés (Section 8.1).
- Zéro `any` ajouté, `npm run build` green.
- `docs/DATA_ARCHITECTURE.md` reflète la nouvelle table `media` ; changelog ajouté à `docs/CHANGELOG.md`.

---

## Annexe A — Décisions architecturales (ADR abrégés)

**ADR-001 : Pas de `crop_data` en MVP.** Rationale : aucun usage validé ; complexité backend + rendering pour valeur incertaine. Réversible (v4 peut le réintroduire).

**ADR-002 : Max 4 photos par post.** Rationale : couvre 95 % des usages observés sur le legacy (médiane = 2, p95 = 4) ; contraint le design feed à 4 layouts gérables. Extension v5 via "série".

**ADR-003 : Cover = `is_cover` en DB vs calculée côté client.** Rationale : simplifie les requêtes feed (SELECT + `WHERE is_cover`), permet les futures requêtes "cover-only" (homepage, recherche) sans re-tri.

**ADR-004 : Layout feed par CSS pur (pas de JS).** Rationale : P4 (sobriété), perf, a11y. 4 classes = maintenance triviale.

**ADR-005 : Ratios cadres figés (4:3, 1:1, 4:5).** Rationale : cohérence visuelle sans déformation. Ratios choisis pour minimiser le letterbox moyen sur échantillon 200 photos nature (60 % paysage, 35 % portrait, 5 % carré).
