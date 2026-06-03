# NG-025 Phase 4, Matrice QA multi-plateformes

Document de check-list pour la validation manuelle du pipeline d'images
refactoré (Phase 2 `processMediaForUpload`).

À remplir au fil des tests par Nicolas + Patrice (ou tout testeur). Format :
✅ OK, ⚠️ OK avec réserve, ❌ KO, ⬜ non testé.

Statut au début : tout en ⬜.

## 1. Tests automatisés disponibles

À exécuter avant les tests manuels :

```bash
npm run typecheck   # TypeScript: 0 erreur attendue
npm run lint        # ESLint: 0 erreur, 0 warning attendu
npm run test        # Vitest: tests existants doivent toujours passer
```

## 2. Matrice par flow utilisateur

### Test 1, Création post Rencontre nature

Utiliser un compte test. Aller dans Contribuer > Rencontre nature.

| Cas  | Format                          | Taille    | Plateforme     | Statut | Notes                                                        |
| ---- | ------------------------------- | --------- | -------------- | ------ | ------------------------------------------------------------ |
| 1.1  | JPEG                            | 2 Mo      | Chrome Desktop | ⬜     |                                                              |
| 1.2  | JPEG                            | 8 Mo      | Chrome Desktop | ⬜     |                                                              |
| 1.3  | JPEG                            | 20 Mo     | Chrome Desktop | ⬜     | Doit passer (< 40 Mo)                                        |
| 1.4  | JPEG                            | 45 Mo     | Chrome Desktop | ⬜     | Doit REJETER avec message "Cette photo est trop volumineuse" |
| 1.5  | PNG                             | 5 Mo      | Chrome Desktop | ⬜     |                                                              |
| 1.6  | WebP                            | 2 Mo      | Chrome Desktop | ⬜     |                                                              |
| 1.7  | AVIF                            | 1 Mo      | Chrome Desktop | ⬜     |                                                              |
| 1.8  | HEIC                            | 3 Mo      | Chrome Desktop | ⬜     | Doit décoder via heic2any → JPEG                             |
| 1.9  | HEIC                            | 5 Mo      | Chrome Desktop | ⬜     |                                                              |
| 1.10 | RAW CR2                         | 30 Mo     | Chrome Desktop | ⬜     | Doit REJETER avec message RAW spécifique                     |
| 1.11 | RAW NEF                         | 25 Mo     | Chrome Desktop | ⬜     |                                                              |
| 1.12 | TIFF                            | 10 Mo     | Chrome Desktop | ⬜     | Doit REJETER avec message clair                              |
| 1.13 | GIF                             | 1 Mo      | Chrome Desktop | ⬜     | Doit REJETER                                                 |
| 1.14 | Photo orientée portrait Sony A7 | 8 Mo JPEG | Chrome Desktop | ⬜     | Doit afficher dans le bon sens (EXIF orientation appliquée)  |

### Test 2, Édition post (replace photos)

Sur un post existant, cliquer Modifier > Étape 1, supprimer toutes les photos, ajouter de nouvelles, Mettre à jour.

| Cas | Format nouvelles photos     | Plateforme     | Statut | Notes                                                                  |
| --- | --------------------------- | -------------- | ------ | ---------------------------------------------------------------------- |
| 2.1 | 2 JPEG                      | Chrome Desktop | ⬜     | Anciennes effacées après save réussi, nouvelles visibles immédiatement |
| 2.2 | 1 HEIC iPhone               | Safari Desktop | ⬜     |                                                                        |
| 2.3 | 4 JPEG                      | Chrome Desktop | ⬜     | Multi-photos OK                                                        |
| 2.4 | Mix HEIC + JPEG             | Chrome Desktop | ⬜     |                                                                        |
| 2.5 | 1 JPEG, upload réseau coupé | Chrome Desktop | ⬜     | Toast erreur clair, anciennes intactes                                 |

### Test 3, Création post Instant nature

Idem Rencontre, sur le panel Instant.

| Cas | Format        | Plateforme     | Statut | Notes |
| --- | ------------- | -------------- | ------ | ----- |
| 3.1 | 1 JPEG        | Chrome Desktop | ⬜     |       |
| 3.2 | 1 HEIC iPhone | Safari Desktop | ⬜     |       |

### Test 4, Multi-photos par post

| Cas | Plateforme              | Statut         | Notes |
| --- | ----------------------- | -------------- | ----- | ------------------------------- |
| 4.1 | 1 photo                 | Chrome Desktop | ⬜    |                                 |
| 4.2 | 4 photos (max)          | Chrome Desktop | ⬜    |                                 |
| 4.3 | Tentative 5e photo      | Chrome Desktop | ⬜    | Doit être bloquée à 4 par UI    |
| 4.4 | 4 photos mixtes formats | Chrome Desktop | ⬜    | Tous passent au pipeline unifié |

## 3. Matrice par navigateur (Desktop)

Avec 1 JPEG 5 Mo (cas standard) puis 1 HEIC 3 Mo (cas iPhone).

| Navigateur | Version | JPEG 5 Mo | HEIC 3 Mo | Notes                              |
| ---------- | ------- | --------- | --------- | ---------------------------------- |
| Chrome     | latest  | ⬜        | ⬜        | AVIF/WebP encode supportés         |
| Firefox    | latest  | ⬜        | ⬜        | WebP encode oui, AVIF non          |
| Edge       | latest  | ⬜        | ⬜        | Identique Chrome                   |
| Safari     | latest  | ⬜        | ⬜        | iOS Safari particulièrement scruté |

## 4. Matrice par appareil mobile

| Appareil                   | OS          | Navigateur    | Format natif | JPEG | HEIC | Notes                      |
| -------------------------- | ----------- | ------------- | ------------ | ---- | ---- | -------------------------- |
| iPhone (récent)            | iOS 17+     | Safari        | HEIC         | ⬜   | ⬜   | Cas le plus important      |
| iPhone (récent)            | iOS 17+     | PWA installée | HEIC         | ⬜   | ⬜   |                            |
| iPhone "Compatibilité max" | iOS 17+     | Safari        | JPEG         | ⬜   | n/a  | Photo iPhone en JPEG natif |
| iPhone ancien              | iOS 14-15   | Safari        | HEIC         | ⬜   | ⬜   | Safari moins stable        |
| Android Samsung            | Android 13+ | Chrome        | JPEG         | ⬜   | n/a  |                            |
| Android Samsung            | Android 13+ | PWA installée | JPEG         | ⬜   | n/a  |                            |
| Android Pixel              | Android 14+ | Chrome        | JPEG         | ⬜   | n/a  |                            |
| Android Pixel              | Android 14+ | Firefox       | JPEG         | ⬜   | n/a  |                            |

## 5. Tests photographes (cas réels appareils photo)

Demander à Nicolas + Patrice ou autre photographe d'exporter en JPEG depuis leur logiciel et de tester.

| Appareil            | Format JPEG export | Taille typique | Statut | Notes |
| ------------------- | ------------------ | -------------- | ------ | ----- |
| Canon EOS R         | JPEG               | 8-15 Mo        | ⬜     |       |
| Nikon Z series      | JPEG               | 10-20 Mo       | ⬜     |       |
| Sony A7 series      | JPEG               | 12-25 Mo       | ⬜     |       |
| Fujifilm X          | JPEG               | 8-15 Mo        | ⬜     |       |
| OM System / Olympus | JPEG               | 6-12 Mo        | ⬜     |       |

Bonus : tester directement un RAW pour vérifier que le rejet est clair :

| Appareil  | Format RAW | Statut | Message attendu                     |
| --------- | ---------- | ------ | ----------------------------------- |
| Canon     | CR2        | ⬜     | "Fichier RAW (CR2) non supporté..." |
| Canon     | CR3        | ⬜     | "Fichier RAW (CR3) non supporté..." |
| Nikon     | NEF        | ⬜     | "Fichier RAW (NEF) non supporté..." |
| Sony      | ARW        | ⬜     | "Fichier RAW (ARW) non supporté..." |
| Fujifilm  | RAF        | ⬜     | "Fichier RAW (RAF) non supporté..." |
| OM System | ORF        | ⬜     | "Fichier RAW (ORF) non supporté..." |

## 6. Tests UX

| Cas                                                   | Statut | Notes                                                    |
| ----------------------------------------------------- | ------ | -------------------------------------------------------- |
| 6.1 Panneau "Photos rejetées" visible et lisible      | ⬜     | Encart ambre + icône, pas juste du texte rouge minuscule |
| 6.2 Message rejet RAW spécifique au format détecté    | ⬜     | CR2 affiche CR2, NEF affiche NEF, etc.                   |
| 6.3 Toast d'erreur upload partiel donne le bon nombre | ⬜     | "X photos sur Y n'ont pas pu être ajoutées"              |
| 6.4 Toast d'erreur upload complet bloque le panel     | ⬜     | User reste sur le panel pour réessayer                   |
| 6.5 Pas de "Erreur inconnue" ni de message brut SQL   | ⬜     | Tous les messages sont user-friendly                     |
| 6.6 Compression photo lente : pas de freeze UI        | ⬜     | Spinner + progress visible                               |
| 6.7 Annulation pendant compression                    | ⬜     | Fermer panel pendant compression ne plante pas           |

## 7. Tests régression NG-024 (toutes couches)

Vérifier que les fixes précédents tiennent toujours après le refactor Phase 2.

| Cas                                                                               | Statut | Notes              |
| --------------------------------------------------------------------------------- | ------ | ------------------ |
| 7.1 Edit + supprime photos via croix + ferme panel sans save → anciennes intactes | ⬜     | NG-024 v2          |
| 7.2 Edit + remplace + save OK → nouvelles visibles immédiatement sans F5          | ⬜     | NG-024 v5          |
| 7.3 Pas d'overflow INTEGER `display_order`                                        | ⬜     | NG-024 v3 (BIGINT) |
| 7.4 Pas de violation CHECK constraint                                             | ⬜     | NG-024 v4          |
| 7.5 Plus de "Erreur serveur Supabase" sur upload normal                           | ⬜     |                    |

## 8. Résultats globaux

À remplir en fin de session QA :

- Cas testés : ** / **
- ✅ OK : \_\_
- ⚠️ OK avec réserve : \_\_
- ❌ KO : \_\_
- Blocages avant ship : \_\_

## 9. Décisions ship

| Critère                                                           | Statut |
| ----------------------------------------------------------------- | ------ |
| Tous les cas critiques Test 1 (création JPEG/PNG/HEIC) passent    | ⬜     |
| Test 7 régression NG-024 OK                                       | ⬜     |
| Aucun KO sur iOS Safari et Android Chrome                         | ⬜     |
| Tous les messages d'erreur sont clairs (pas de "Erreur inconnue") | ⬜     |
| Photo Sony A7 en portrait s'affiche dans le bon sens              | ⬜     |

**Ship NG-025 en prod si et seulement si les 5 critères ci-dessus sont ✅.**

---

_Document de référence : `docs/media/MEDIA_PIPELINE_AUDIT.md` (Phase 1)._
_Code refactor : commit `73b50c4` (Phase 2) + `096ed2e` (Phase 3)._
