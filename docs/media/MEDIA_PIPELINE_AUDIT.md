# NG-025 Phase 1, Audit complet pipeline d'images Naturegraph

Document de référence : état actuel du pipeline d'upload + traitement +
affichage des images dans Naturegraph (Rencontre nature + Instant nature).
Base : code en prod sur `main` au 2026-06-03 (post PR #382 NG-024 v5).

## 1. Vue d'ensemble du pipeline

```
[1] Utilisateur sélectionne photo (file picker / drag drop / camera)
    └─→ <input type="file" accept="image/*"> dans EncounterStep1
[2] Validation côté UI (validateFile)
    └─→ MIME ∈ ALLOWED_MIME_TYPES ? sinon rejet local
[3] state local form.files: File[] (max 4)
[4] Click "Mettre à jour" / "Partager"
[5] Pipeline useContributePostSubmit, par fichier :
    a. detectPhotoFormat (lecture dimensions)
    b. compressPhoto (resize, AVIF/WebP/JPEG, multi-pass qualité)
    c. stripExif (re-encode canvas, suppression métadata)
    d. uploadPostMedia :
       i.   stripImageExif (3ème passe canvas si pas déjà compressé)
       ii.  validateFile MIME (ACCEPTED_IMAGE_MIME)
       iii. Storage POST /post-media/{userId}/{postId}/{uuid}.{ext}
       iv.  INSERT row media (post_id, url, display_order, ...)
[6] Affichage feed / profil / détail
    └─→ ImageSlider, ImagePresets (variants Supabase /render/image/)
```

## 2. Étapes détaillées + risques

### Étape 1, Sélection

| Composant     | Code                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input         | `<input type="file" accept="image/*" multiple>`                                                                                                     |
| Drag-drop     | géré dans `EncounterStep1.tsx` (handleDrop)                                                                                                         |
| Caméra mobile | `accept="image/*"` ne déclenche PAS automatiquement la caméra. `accept="image/*;capture=environment"` pour caméra direct (non utilisé actuellement) |

**Risques identifiés** :

- `accept="image/*"` : iOS Safari convertit normalement HEIC → JPEG à la sélection, mais sélection multiple parfois renvoie HEIC brut.
- Android : extension exotique (.tiff, .dng) acceptée par `image/*` mais bloquée à l'étape suivante.
- Sur iPad PWA installée : sélection depuis Files.app peut renvoyer extension étrange (CR2, RAF, NEF reflex).

### Étape 2, Validation `validateFile` (EncounterStep1)

```ts
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
])
function validateFile(file: File): string | null {
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return `Format non supporté : ${file.type}`
  }
  return null
}
```

**Risques** :

- `file.type` peut être vide sur Android Chrome ancien (la lib renvoie `""`) → la fonction accepte par défaut, mais le pipeline plante en aval.
- Pas de check magic numbers ici (deléguée à `validateImageMagic` mais NON appelée dans le pipeline d'upload actuel).
- Pas de cap taille fichier en entrée → photo 50 Mo passe la validation.
- RAW (CR2, NEF, ARW, RAF) ont des MIME inconnus → bloquées correctement mais avec message non explicite.

### Étape 3, Compression `compressPhoto`

```
Tier FREE :
  maxDimension: 2048 px
  qualityStart: 0.85
  qualityFloor: 0.65
  targetBytes: 500 KB
  codec: AVIF (Chrome) > WebP (Firefox) > JPEG (Safari < 14 / Edge)
```

**Risques** :

- HEIC/HEIF early return pass-through : aucune compression appliquée, fichier monstrueux uploadé brut (5-15 Mo typique iPhone).
- `loadImage()` via `URL.createObjectURL` + `<Image>` natif : sur iOS Safari, peut échouer sur très grandes photos (> 12000 px côté long) avec OOM silencieux. Le `catch` retombe sur l'original.
- `canvas.toBlob()` peut retourner null sur Safari < 14 pour AVIF/WebP (heureusement `pickCodec` détecte support, mais cas exotique macOS Safari 13).
- ICC profile : ignoré → photos AdobeRGB perdent leurs couleurs (basculées en sRGB par canvas).
- EXIF orientation : ignoré → photos prises portrait sur certains appareils (Sony A7) affichées tournées 90°.
- Multi-pass : 4 itérations canvas.toBlob max → peut prendre 3-8s sur mobile bas de gamme.

### Étape 4, Strip EXIF `stripExif`

```
STRIPPABLE_MIMES = jpeg, jpg, png, webp
maxLongEdge: 2400 px
quality: 0.92
```

**Risques** :

- HEIC, AVIF pass-through → pas strippé.
- Double-traitement avec compressPhoto : si compressPhoto a déjà produit du WebP < 500 KB, stripExif fait une 2ème passe canvas inutile.
- `createImageBitmap` peut échouer sur JPEG CMYK → fallback sur original = EXIF non strippé (faille RGPD).

### Étape 5, Upload `uploadPostMedia` (mediaService)

```ts
ACCEPTED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
]
MAX_POST_MEDIA_BYTES = 10 * 1024 * 1024 // 10 MB
```

Puis :

1. `stripImageExif(file)` : **3ème passe canvas** si pas déjà AVIF/WebP < 2 Mo
2. Si `stripped.size > 10 Mo` → throw "Photo trop complexe à compresser"
3. `supabase.storage.from('post-media').upload(...)` avec timeout 45s + retry 3x
4. `supabase.from('media').insert(...)`

**Risques** :

- **Triple-pass canvas** confirmé : compressPhoto → stripExif → stripImageExif (sauf shortcut webp/avif < 2 Mo). Mémoire mobile saturée, latence cumulée.
- Bucket Supabase `post-media` `allowed_mime_types: ['image/webp', 'image/jpeg', 'image/png', 'video/mp4']` → **HEIC rejeté par le bucket** (file size limit 100 Mo OK mais MIME refusé).
- Pas de fallback HEIC conversion → user voit erreur server obscure.
- Si toutes les uploads échouent : throw global (fix NG-024 v2) avec rollback storage.
- INSERT media : a déjà subi 4 couches de bug NG-024 (BIGINT overflow, check constraint, etc.).

### Étape 6, Stockage Supabase

| Param                | Valeur                                               |
| -------------------- | ---------------------------------------------------- |
| Bucket               | `post-media`                                         |
| public               | true                                                 |
| file_size_limit      | 104857600 (100 Mo)                                   |
| allowed_mime_types   | `image/webp`, `image/jpeg`, `image/png`, `video/mp4` |
| cache-control upload | 31536000 (1 an immutable)                            |
| RLS                  | owner-only INSERT/DELETE, lecture publique           |
| Path                 | `{userId}/{postId}/{uuid}.{ext}`                     |

**Risques** :

- **HEIC, AVIF refusés** par `allowed_mime_types` du bucket alors que `ACCEPTED_IMAGE_MIME` côté code les accepte. Décalage critique.
- Cache 1 an immutable : si on update une photo avec même URL (cas hypothétique), navigateur sert l'ancien. Mais URL contient UUID unique donc OK en pratique.

### Étape 7, Affichage

| Composant                                   | Rôle                                                   |
| ------------------------------------------- | ------------------------------------------------------ |
| `ImageSlider.tsx`                           | Slider feed (swipe mobile, flèches desktop)            |
| `ImagePresets` (`src/lib/supabaseImage.ts`) | Variants taille via `?width=N&resize=cover&quality=80` |
| `lazy loading`                              | `loading="lazy"` natif sur les images du feed          |

**Risques** :

- Si `media.url` est un HEIC mal uploadé : navigateurs ≠ Safari ne savent pas l'afficher → image cassée.
- Si `width/height` manquants dans `media` row : pas de réservation espace → layout shift.
- iOS Safari : variants Supabase `?width=1000&resize=cover&quality=80` retournent JPEG par défaut, OK.

## 3. Grille de compatibilité actuelle vs cible

### Formats à l'entrée

| Format                    | Sélection               | Validation MIME             | compressPhoto             | stripExif              | stripImageExif        | Bucket Storage   | Statut actuel                | Cible NG-025           |
| ------------------------- | ----------------------- | --------------------------- | ------------------------- | ---------------------- | --------------------- | ---------------- | ---------------------------- | ---------------------- |
| JPEG                      | ✅                      | ✅                          | ✅                        | ✅                     | ✅                    | ✅               | ✅ Fonctionnel               | ✅                     |
| PNG                       | ✅                      | ✅                          | ✅                        | ✅                     | ✅ (output JPEG)      | ✅               | ✅ Fonctionnel               | ✅                     |
| WebP                      | ✅                      | ✅                          | ✅                        | ✅                     | ✅                    | ✅               | ✅ Fonctionnel               | ✅                     |
| AVIF                      | ✅                      | ✅                          | ⚠️ pass-through si < skip | ❌ pas dans STRIPPABLE | ⚠️ shortcut si < 2 Mo | ❌ refusé bucket | ❌ **Cassé**                 | ✅                     |
| HEIC                      | ⚠️ iOS converti parfois | ✅                          | ❌ pass-through           | ❌                     | ❌ pass-through       | ❌ refusé bucket | ❌ **Cassé silencieusement** | ✅ via heic2any        |
| HEIF                      | ⚠️ iOS converti parfois | ✅                          | ❌ pass-through           | ❌                     | ❌ pass-through       | ❌ refusé bucket | ❌ **Cassé silencieusement** | ✅ via heic2any        |
| RAW (CR2/NEF/ARW/RAF/DNG) | possible Files.app      | ❌ MIME inconnu             | n/a                       | n/a                    | n/a                   | n/a              | ✅ Rejet, message peu clair  | ✅ Rejet message clair |
| TIFF                      | possible Files.app      | ❌ MIME `image/tiff` rejeté | n/a                       | n/a                    | n/a                   | n/a              | ✅ Rejet, message peu clair  | ✅ Rejet message clair |
| GIF                       | possible                | ❌ MIME `image/gif` rejeté  | n/a                       | n/a                    | n/a                   | n/a              | ✅ Rejet, message peu clair  | ✅ Rejet message clair |

### Tailles à l'entrée

| Taille originale | compressPhoto OK ?                   | stripExif OK ?                  | stripImageExif OK ?          | Upload OK ?              | Statut              |
| ---------------- | ------------------------------------ | ------------------------------- | ---------------------------- | ------------------------ | ------------------- |
| 500 KB           | skip si dim < 2048                   | re-encode                       | shortcut                     | < 10 Mo OK               | ✅                  |
| 2 Mo             | resize                               | re-encode                       | shortcut (si webp/avif déjà) | OK                       | ✅                  |
| 5 Mo             | resize → ~500 KB                     | re-encode                       | shortcut                     | OK                       | ✅                  |
| 10 Mo            | resize                               | re-encode                       | re-encode (4 passes)         | OK                       | ✅ mais lent mobile |
| 15 Mo            | resize                               | re-encode (canvas OOM possible) | re-encode                    | OK                       | ⚠️                  |
| 20 Mo            | risque OOM canvas iPhone 11 et avant | ❌ OOM probable                 | n/a                          | ❌ throw "trop complexe" | ⚠️                  |
| 30 Mo            | risque OOM majeur                    | ❌                              | n/a                          | ❌                       | ❌                  |
| 50 Mo            | OOM quasi certain                    | ❌                              | n/a                          | ❌                       | ❌                  |

### Cas réels appareils

| Appareil                   | Format default | Taille typique | Statut                          |
| -------------------------- | -------------- | -------------- | ------------------------------- |
| iPhone (iOS 11+)           | HEIC           | 2-4 Mo         | ❌ refusé bucket, erreur server |
| iPhone "Compatibilité max" | JPEG           | 3-5 Mo         | ✅                              |
| Android Samsung/Pixel      | JPEG           | 3-6 Mo         | ✅                              |
| Canon EOS R                | JPEG ou CR3    | 8-15 Mo        | ✅ JPEG, ❌ CR3                 |
| Nikon Z series             | JPEG ou NEF    | 10-20 Mo       | ✅ JPEG, ❌ NEF                 |
| Sony A7                    | JPEG ou ARW    | 12-25 Mo       | ⚠️ JPEG (latence), ❌ ARW       |
| Fujifilm X                 | JPEG ou RAF    | 8-15 Mo        | ✅ JPEG, ❌ RAF                 |
| OM System / Olympus        | JPEG ou ORF    | 6-12 Mo        | ✅ JPEG, ❌ ORF                 |

### Plateformes (navigateurs)

| Plateforme            | compressPhoto                       | stripExif | createImageBitmap | canvas.toBlob (AVIF) | canvas.toBlob (WebP) | Statut                 |
| --------------------- | ----------------------------------- | --------- | ----------------- | -------------------- | -------------------- | ---------------------- |
| Chrome Desktop        | ✅ AVIF                             | ✅        | ✅                | ✅                   | ✅                   | ✅                     |
| Firefox Desktop       | ✅ WebP (pas AVIF encode)           | ✅        | ✅                | ❌                   | ✅                   | ✅                     |
| Edge Desktop          | ✅ AVIF                             | ✅        | ✅                | ✅                   | ✅                   | ✅                     |
| Safari Desktop        | ✅ JPEG (pas AVIF/WebP encode < 14) | ✅        | ✅ Safari 15+     | ❌                   | ✅ Safari 14+        | ⚠️ Safari < 15 fragile |
| Chrome Android        | ✅ AVIF                             | ✅        | ✅                | ✅                   | ✅                   | ✅                     |
| Firefox Android       | ✅ WebP                             | ✅        | ✅                | ❌                   | ✅                   | ✅                     |
| Safari iOS 15+        | ✅ JPEG                             | ✅        | ✅                | ❌                   | ✅                   | ⚠️ HEIC sélection      |
| Safari iOS 14         | ✅ JPEG                             | ✅        | ⚠️ instable       | ❌                   | ⚠️                   | ⚠️                     |
| Samsung Internet      | ✅ WebP                             | ✅        | ✅                | ❌                   | ✅                   | ✅                     |
| PWA installée iOS     | identique Safari iOS                | identique | identique         | identique            | identique            | ⚠️                     |
| PWA installée Android | identique Chrome                    | identique | identique         | identique            | identique            | ✅                     |

## 4. Risques majeurs identifiés (synthèse)

| #   | Risque                                                                                            | Impact user                                                                    | Priorité fix |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------ |
| R1  | **HEIC rejeté par bucket Storage** alors qu'accepté côté code                                     | iPhone user voit erreur server obscure à chaque upload non-converti            | 🔴 Critique  |
| R2  | **Triple-pass canvas** (compress + stripExif + stripImageExif)                                    | Mémoire mobile saturée sur photos lourdes, latence cumulée 5-10s               | 🔴 Critique  |
| R3  | **Pas de cap entrée explicite** : photo 50 Mo lancée dans compression                             | OOM canvas mobile, erreur silencieuse → kind=unknown → toast "Erreur inconnue" | 🔴 Critique  |
| R4  | **AVIF refusé par bucket** alors qu'accepté côté code                                             | Si compressPhoto produit AVIF → upload rejeté                                  | 🔴 Critique  |
| R5  | **EXIF orientation ignoré**                                                                       | Photos certains Sony/Olympus affichées tournées 90°                            | 🟠 Important |
| R6  | **ICC profile forcé sRGB sans warning**                                                           | Photographes pro AdobeRGB perdent leurs couleurs                               | 🟡 Mineur    |
| R7  | **`createImageBitmap` peut échouer silencieusement** sur CMYK / ICC invalide                      | Strip EXIF skip → faille RGPD (GPS conservé)                                   | 🟠 Important |
| R8  | **Messages erreur génériques**                                                                    | User ne comprend pas le bloc, recommence en boucle                             | 🟠 Important |
| R9  | **Pas de validation magic numbers** dans le pipeline d'upload (lib existe mais pas appelée)       | RAW renommé en .jpg accepté à la sélection, plante à l'upload                  | 🟡 Mineur    |
| R10 | **iOS Safari `canvas.toBlob` retourne null sur très grosses photos**                              | échec silencieux, classifyError → unknown                                      | 🟠 Important |
| R11 | **Pas de feedback compression**                                                                   | User pense que ça plante sur mobile lent                                       | 🟡 Mineur    |
| R12 | **3 fichiers utilitaires qui font 90 % la même chose** (compressPhoto, stripExif, stripImageExif) | Dette technique, bugs cumulés                                                  | 🟠 Important |

## 5. Causes plausibles des bugs users rapportés (ticket NG-025)

> "Image affichée brisée, image absente du preview, erreur d'import, impossibilité de terminer la publication, publication refusée, comportement différent selon les appareils, problème principalement avec photos provenant directement de galeries photo ou d'appareils photographiques."

| Symptôme                                   | Cause technique probable                                                    | Référence  |
| ------------------------------------------ | --------------------------------------------------------------------------- | ---------- |
| Image affichée brisée dans le feed         | HEIC uploadé brut (R1) → Chrome/Firefox ne sait pas l'afficher              | R1         |
| Image absente du preview avant publication | Erreur silencieuse dans compressPhoto pour HEIC ou photo géante (R3 + R10)  | R3, R10    |
| Erreur d'import                            | Photo > 20 Mo qui plante stripImageExif (R3) ou bucket refuse MIME (R1, R4) | R1, R3, R4 |
| Impossibilité de terminer la publication   | NG-024 v2-v5 (corrigé) OU bug HEIC silent (R1)                              | R1         |
| Publication refusée                        | Bucket allowed_mime_types refuse HEIC/AVIF (R1, R4)                         | R1, R4     |
| Comportement différent selon les appareils | Triple-pass canvas + OOM sur mobile bas de gamme (R2 + R3)                  | R2, R3     |
| Photos appareils photographiques           | RAW non détecté magic numbers (R9), photos lourdes (R3)                     | R3, R9     |

## 6. Recommandations Phase 2 (refactor) et Phase 3 (UX)

### Phase 2, Refactor cœur unifié `processMediaForUpload`

Remplacer les 3 fonctions (compressPhoto, stripExif, stripImageExif) par une seule
`processMediaForUpload(file)` qui :

1. **Pré-validation forte** :
   - Cap entrée 40 Mo (rejet immédiat si > avec message clair)
   - Magic numbers étendus (lib `validateImageMagic` + détection AVIF + HEIC)
   - Détection EXIF orientation (lib EXIF.js zero-dep ou regex sur APP1 marker)

2. **Conversion HEIC** :
   - Lazy import `heic2any` si MIME HEIC/HEIF détecté
   - Décodage HEIC → JPEG en mémoire avant pipeline canvas

3. **Single-pass canvas** :
   - 1 seul `loadImage()`
   - 1 seul `canvas.drawImage()` avec rotation EXIF appliquée
   - 1 seul `canvas.toBlob()` multi-pass qualité
   - Output : WebP si supporté, JPEG sinon (AVIF retiré car bucket le refuse)

4. **Output guarantee** :
   - Toujours JPEG ou WebP (formats acceptés par bucket)
   - Toujours sans EXIF (strip par construction du re-encode)
   - Toujours < cap configurable (default 2 Mo)

5. **Update bucket Supabase** :
   - Migration : étendre `allowed_mime_types` à `image/avif` (pour future migration) OU retirer AVIF du `pickCodec`. Décision : retirer AVIF du pickCodec (simplification).

### Phase 3, Messages erreur clairs

Tableau des messages cibles :

| Cause                         | Message actuel                          | Message cible                                                                                                                         |
| ----------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| File > 40 Mo                  | (pas de message, plante en aval)        | `Cette photo est trop volumineuse (X Mo). Taille maximale : 40 Mo. Essaye une version réduite.`                                       |
| HEIC sans conversion possible | `Format non supporté (jpeg, png, webp)` | `Format HEIC détecté. La conversion automatique a échoué. Sur iPhone : Réglages > Appareil photo > Formats > Compatibilité maximale.` |
| RAW (CR2, NEF, etc.)          | `Format non supporté (jpeg, png, webp)` | `Fichier RAW non supporté. Convertis en JPEG dans ton logiciel photo, puis réessaye.`                                                 |
| Canvas OOM (toBlob null)      | `Photo trop complexe à compresser`      | `Cette photo est trop grande pour être traitée sur ton appareil. Essaye une version réduite (< 10 Mo).`                               |
| Timeout upload                | `Timeout upload photo X`                | `L'upload prend trop de temps (réseau lent). Réessaye sur une meilleure connexion.`                                                   |
| Bucket refuse MIME            | `Erreur server Supabase`                | `Format converti automatiquement. Si tu vois ce message, contacte le support.`                                                        |
| Toutes les uploads échouent   | `Erreur inconnue`                       | `Aucune photo n'a pu être envoyée. Vérifie ta connexion ou essaye une photo plus petite.`                                             |

Plus : panneau "Photos rejetées" dans Step1 avec icône + nom + raison par photo.

### Phase 4, QA matrice priorisée

Grille focalisée sur cas réels haute fréquence :

| Plateforme         | Format                | Tailles | Tests     |
| ------------------ | --------------------- | ------- | --------- |
| iOS Safari PWA     | HEIC + JPEG           | 3-15 Mo | 10 photos |
| Android Chrome PWA | JPEG                  | 3-10 Mo | 10 photos |
| Desktop Chrome     | JPEG, PNG, WebP, AVIF | 1-25 Mo | 8 cas     |
| Desktop Safari     | JPEG, PNG             | 1-25 Mo | 6 cas     |
| Desktop Firefox    | JPEG, PNG, WebP       | 1-25 Mo | 6 cas     |
| Desktop Edge       | JPEG, PNG, WebP, AVIF | 1-25 Mo | 6 cas     |

Total : ~46 cas testés manuellement, documentés dans `MEDIA_QA_MATRIX.md`.

## 7. Décisions actées Nicolas (2026-06-03)

- ✅ **heic2any** lazy-loaded (~150 KB chargé seulement si HEIC détecté)
- ✅ **Cap entrée 40 Mo** explicite avec rejet clair
- ✅ **Ordre** : audit (ce doc) → refactor cœur → messages → QA

## 8. Prochaines étapes immédiates

1. **Valider ce doc avec Nicolas** (revue rapide)
2. **Démarrer Phase 2** : créer `src/utils/processMediaForUpload.ts` (single-pass unifié)
3. **Migration bucket** : retirer AVIF du `pickCodec` OU étendre `allowed_mime_types`
4. **Lazy heic2any** dans le module
5. **Refactor pipeline submit** pour appeler la nouvelle fonction unique
6. **Drop des 3 anciens utils** (compressPhoto, stripExif, stripImageExif)
7. **Tests vitest** sur le module unifié

---

_Document rédigé par Claude Code sur la branche `feat/ng-025-media-audit`._
_Sources : lecture intégrale code prod main au 2026-06-03 (commit `bfa3ec9`)._

## 10. État après Phases 2-4 (mise à jour 2026-06-03 fin de cycle)

### Pipeline final livré

```
[1] Selection (input file + drag/drop + multiple)
[2] Validation rapide (validateFile EncounterStep1 + MediaUploader)
    - RAW detection prioritaire par extension (CR2/CR3/NEF/ARW/RAF/DNG/ORF/RW2/PEF/SRW/X3F)
    - Cap 40 Mo aligne avec MAX_INPUT_BYTES
    - MIME whitelist
    - Messages user-friendly (panneau ambre + icone)
[3] State local form.files: File[] (max 4 par post, voir MAX_FILES)
[4] Click Mettre a jour / Partager
[5] Pipeline submit (useContributePostSubmit OU ContributeInstantForm) :
    a. processMediaForUpload(file) UNIFIE
       - readMagic (detection vraie identite formats)
       - Cap 40 Mo strict
       - HEIC: decode via heic2any LAZY
       - readExifOrientation via exifr
       - Single-pass canvas (resize + rotate + re-encode JPEG/WebP)
       - Erreurs structurees (7 codes + messages)
    b. uploadPostMedia: MIME check + Storage upload + INSERT media
[6] Affichage feed/profil/detail
    - Refetch toutes queries impactees (NG-024 v5)
    - URL Supabase Storage UUID unique (cache 1 an OK)
```

### Risques Phase 1 résolus

| #   | Risque Phase 1                  | Resolution Phase 2-4                                                                       |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------ |
| R1  | HEIC rejete par bucket          | ✅ heic2any decode HEIC -> JPEG avant upload                                               |
| R2  | Triple-pass canvas              | ✅ Single-pass dans processMediaForUpload                                                  |
| R3  | Pas de cap entree               | ✅ Cap 40 Mo explicite avec rejet clair                                                    |
| R4  | AVIF refuse par bucket          | ✅ pickOutputFormat exclut AVIF                                                            |
| R5  | EXIF orientation ignoree        | ✅ Lue via exifr + applyOrientation au canvas                                              |
| R6  | ICC profile force sans warning  | ⚠️ Toujours forced sRGB (acceptable pour MVP)                                              |
| R7  | createImageBitmap fail silent   | ✅ Erreur image_load_failed avec message clair                                             |
| R8  | Messages generiques             | ✅ 7 codes structures ProcessMediaError + panneau ambre                                    |
| R9  | Pas de validation magic numbers | ✅ readMagic dans processMediaForUpload                                                    |
| R10 | Safari canvas.toBlob null       | ✅ Erreur reencode_failed avec message                                                     |
| R11 | Pas de feedback compression     | ⚠️ Spinner global, pas de % par photo (acceptable)                                         |
| R12 | 3 utils dupliques               | ✅ Drop stripExif.ts + compressPhoto.ts + stripImageExif.ts (NG-025 cleanup avatar/banner) |

### Périmètre : ce qui est COUVERT par NG-025

- ✅ Création post Rencontre nature (ContributeEncounterForm → useContributePostSubmit)
- ✅ Création post Instant nature **panel slide-over** (ContributeInstantPanel → useContributePostSubmit)
- ✅ Création post Instant nature **page legacy** `/contribute?type=nature_instant` (ContributeInstantForm + MediaUploader → processMediaForUpload directement)
- ✅ Édition post (mêmes pipelines avec mode edit)
- ✅ **Avatar profil** (EditPhotoTab → storageService.uploadImage('avatars') → processMediaForUpload)
- ✅ **Banner profil** (EditPhotoTab → storageService.uploadImage('banners') → processMediaForUpload)

Decision Nicolas 2026-06-03 : "pas de flows differents jamais". Un seul
pipeline `processMediaForUpload` pour TOUS les uploads d'image du projet.
Les anciens helpers `compressPhoto.ts`, `stripImageExif.ts`, `stripExif.ts`
ont ete supprimes (zero consommateur).

### Périmètre : ce qui reste hors scope

| Flow                                  | Pipeline                                  | Statut                        |
| ------------------------------------- | ----------------------------------------- | ----------------------------- |
| **Photos communautaires (héro auth)** | Fixtures admin, pas d'upload user en prod | 🟡 N/A                        |
| **Exports CSV** (futur)               | Bucket `exports`, generation backend      | 🟡 Hors perimetre media-image |

### Note sur MAX_FILES = 4

Le ticket Notion mentionne des tests "5 photos" et "10 photos". Naturegraph plafonne actuellement à **4 photos par post** (MAX_FILES = 4 dans EncounterStep1 + MediaUploader). Cette limite est une décision produit (cf. Figma 6385:47535), pas une contrainte technique.

Si le besoin de tester 5/10 photos vient, il faut d'abord décider d'augmenter MAX_FILES côté UI.

### Commits livrés (develop local, non pushé)

| Commit         | Phase    | Contenu                                                                                     |
| -------------- | -------- | ------------------------------------------------------------------------------------------- |
| `0810ffc`      | Phase 1  | docs/media/MEDIA_PIPELINE_AUDIT.md (ce doc)                                                 |
| `73b50c4`      | Phase 2  | src/utils/processMediaForUpload.ts + branchements useContributePostSubmit + mediaService    |
| `096ed2e`      | Phase 3  | EncounterStep1 messages + panneau ambre                                                     |
| `9ba5aef`      | Phase 4  | docs/media/MEDIA_QA_MATRIX.md                                                               |
| `5c4bd6f`      | Phase 4  | Drop stripExif.ts + tests vitest processMediaForUpload                                      |
| `6468760`      | Phase 4+ | Alignement ContributeInstantForm + MediaUploader.tsx (legacy page route)                    |
| TBD (en cours) | Phase 5  | Unification avatar + banner sur processMediaForUpload (drop compressPhoto + stripImageExif) |
