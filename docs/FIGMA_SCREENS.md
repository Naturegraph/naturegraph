# Figma Screens — Index de référence

> Fichier Figma maître : `YNnsWRi3hSp5hWsUa0Tjr6`
> URL : https://www.figma.com/design/YNnsWRi3hSp5hWsUa0Tjr6/
> Mis à jour : 2026-04-01
>
> Ce fichier recense tous les node IDs Figma par flow et breakpoint.
> Usage : passer le node ID dans l'URL Figma `?node-id=XXXX-YYYY` pour accéder directement à l'écran.
> Chaque agent peut s'y référer pour faire un audit pixel-perfect ciblé sans devoir naviguer manuellement.

---

## Structure des pages Figma

| Page             | ID               | Contenu                            |
| ---------------- | ---------------- | ---------------------------------- |
| Cover            | `0:1`            | Couverture du projet               |
| V1 MVP ESSENTIAL | `6382:65787`     | Vue globale MVP                    |
| Landing page     | `6095:2`         | Landing page complète              |
| **Web app**      | **`6381:65040`** | **Tous les flows app connectée**   |
| Style guide      | `3:10`           | Couleurs, typographie, espacements |
| Components       | `2044:1064`      | Bibliothèque de composants         |

---

## Web App — Sections

La page Web App contient une section maître `6381:65041` ("Web app 2026") avec 7 sous-sections :

| Section                  | ID            | Frames | Breakpoints              | Mode  |
| ------------------------ | ------------- | ------ | ------------------------ | ----- |
| Homepage App             | `6381:117916` | 75     | XL/Desktop/Tablet/Mobile | Light |
| Profil utilisateur       | `6381:98451`  | 73     | XL/Desktop/Tablet/Mobile | Light |
| Partager une observation | `6381:73071`  | 75     | XL/Desktop/Tablet/Mobile | Light |
| Onboarding Web App       | `6381:67389`  | 30     | XL/Desktop/Tablet/Mobile | Light |
| Types de partage         | `6381:92719`  | 20     | XL/Desktop/Tablet/Mobile | Light |
| Format des photos        | `6381:89904`  | 8      | XL/Desktop/Tablet/Mobile | Light |
| Homepage App (Dark)      | `6381:65042`  | 8      | XL/Desktop/Tablet/Mobile | Dark  |

---

## 1. Homepage App — Light (`6381:117916`)

### 1.1 Breakpoints de référence

| Breakpoint | Dimensions  | Exemples de nodes |
| ---------- | ----------- | ----------------- |
| XL Desktop | 1920 × 1024 | `6381:117917`     |
| Desktop    | 1440 × 960  | `6381:131258`     |
| Tablet     | 768 × 960   | `6381:124346`     |
| Mobile     | 402 × 874   | `6381:127455`     |

### 1.2 États — XL Desktop (1920 × 1024)

| Node ID       | Écran                                      | Notes                                  |
| ------------- | ------------------------------------------ | -------------------------------------- |
| `6381:117917` | Default — état 1 (feed connecté)           | Sidebar gauche profil visible          |
| `6381:118308` | Default — état 2                           | Scroll / contenu différent             |
| `6381:118644` | Default — état 3                           |                                        |
| `6381:118916` | Default — état 4                           |                                        |
| `6381:119328` | Post → Lightbox image plein écran          | `PhotoLightbox`                        |
| `6381:119765` | Feed vide (filtres actifs sans résultat)   | `FeedEmptyState` — 1 CTA uniquement    |
| `6381:120036` | Overlay Localisation                       | `LocationModal` — input + slider rayon |
| `6381:120563` | Overlay Recherche                          | `SearchPanel`                          |
| `6381:121049` | Overlay Notifications                      | `NotificationsPanel`                   |
| `6381:121593` | Overlay Contribuer                         | `ContributeModal`                      |
| `6381:122018` | Menu Profil ouvert                         | `ProfileMenu`                          |
| `6381:122512` | Post → Menu Actions (publication d'autrui) | `PostOptionsMenu` — 6 items            |
| `6381:122971` | Post → Signaler — étape 1                  | `ReportModal` — dropdown select        |
| `6381:123445` | Post → Signaler — étape 2                  | `ReportModal` — confirmation           |
| `6381:123917` | Post → Réactions picker ouvert             | `FeedPost` — picker ligne inline       |
| `6381:137886` | Post → Partager                            | `ShareModal` — 4 icônes + copier lien  |
| `6381:139201` | Post → Commentaires                        | `CommentsSection`                      |
| `6381:140393` | Panel Filtres ouvert                       | `FeedFilterPanel`                      |

### 1.3 États — Desktop (1440 × 960)

| Node ID       | Écran                             | Notes             |
| ------------- | --------------------------------- | ----------------- |
| `6381:131258` | Default — état 1 (feed connecté)  | Sidebars visibles |
| `6381:131648` | Default — état 2                  |                   |
| `6381:131984` | Default — état 3                  |                   |
| `6381:132404` | Default — état 4                  |                   |
| `6381:132816` | Post → Lightbox image plein écran |                   |
| `6381:133253` | Default — état 5                  |                   |
| `6381:133524` | Overlay Localisation              |                   |
| `6381:134050` | Overlay Recherche                 |                   |
| `6381:134589` | Post → Signaler — étape 1         |                   |
| `6381:135063` | Overlay Notifications             |                   |
| `6381:135607` | Overlay Contribuer                |                   |
| `6381:136032` | Menu Profil ouvert                |                   |
| `6381:136526` | Post → Menu Actions (autrui)      |                   |
| `6381:136985` | Post → Signaler — étape 2         |                   |
| `6381:137457` | Post → Réactions picker           |                   |
| `6381:138329` | Post → Partager                   |                   |
| `6381:139613` | Post → Commentaires               |                   |
| `6381:141415` | Panel Filtres ouvert              |                   |

### 1.4 États — Tablet (768 × 960)

| Node ID       | Écran                             | Notes                          |
| ------------- | --------------------------------- | ------------------------------ |
| `6381:124346` | Default — état 1                  |                                |
| `6381:124519` | Default — état 2                  |                                |
| `6381:124703` | Default — état 3                  |                                |
| `6381:124907` | Default — état 4                  |                                |
| `6381:125080` | Post → Lightbox image plein écran |                                |
| `6381:125269` | Default — état 5                  |                                |
| `6381:125301` | Overlay Localisation              |                                |
| `6381:125600` | Overlay Recherche                 |                                |
| `6381:125848` | Overlay Notifications             |                                |
| `6381:126153` | Overlay Contribuer                |                                |
| `6381:126339` | Menu Profil ouvert                |                                |
| `6381:126594` | Post → Signaler — étape 1         |                                |
| `6381:126829` | Post → Menu Actions (autrui)      |                                |
| `6381:127049` | Post → Signaler — étape 2         |                                |
| `6381:127282` | Post → Réactions picker           |                                |
| `6381:138772` | Post → Partager                   |                                |
| `6381:140025` | Post → Commentaires               |                                |
| `6381:140885` | Panel Filtres                     | Pas de tabs → dropdown "Trier" |

### 1.5 États — Mobile (402 × 874)

| Node ID       | Écran                                | Notes                   |
| ------------- | ------------------------------------ | ----------------------- |
| `6381:127455` | Default — état 1                     | Pas de tabs, bottom nav |
| `6381:127627` | Default — état 2                     |                         |
| `6381:127801` | Default — état 3                     |                         |
| `6381:127985` | Default — état 4                     |                         |
| `6381:128181` | Post → Lightbox image plein écran    |                         |
| `6381:128393` | Default — état 5                     |                         |
| `6381:128446` | Overlay Localisation                 |                         |
| `6381:128758` | Overlay Recherche                    |                         |
| `6381:129078` | Overlay Notifications                |                         |
| `6381:129406` | Overlay Contribuer                   |                         |
| `6381:129626` | Post → Signaler — étape 1            |                         |
| `6381:129836` | Post → Signaler — étape 2            |                         |
| `6381:130057` | Menu Profil ouvert                   |                         |
| `6381:130370` | Post → Menu Actions (autrui)         |                         |
| `6381:130615` | Post → Signaler — étape 3            |                         |
| `6381:130823` | Post → Menu Actions (ma publication) | 3 items seulement       |
| `6381:131046` | Post → Réactions picker              |                         |
| `6381:138976` | Post → Partager                      |                         |
| `6381:140198` | Post → Commentaires                  |                         |
| `6381:141138` | Panel Filtres                        |                         |

---

## 2. Homepage App — Dark (`6381:65042`)

> Dark mode reporté. Specs conservées pour référence future.

| Node ID      | Breakpoint          | Dimensions  |
| ------------ | ------------------- | ----------- |
| `6381:65043` | XL Desktop — état 1 | 1920 × 1024 |
| `6381:65433` | XL Desktop — état 2 | 1920 × 1024 |
| `6381:65845` | Tablet — état 1     | 768 × 960   |
| `6381:66018` | Tablet — état 2     | 768 × 960   |
| `6381:66230` | Mobile — état 1     | 402 × 874   |
| `6381:66400` | Mobile — état 2     | 402 × 874   |
| `6381:66594` | Desktop — état 1    | 1440 × 960  |
| `6381:66978` | Desktop — état 2    | 1440 × 960  |

---

## 3. Onboarding Web App — Light (`6381:67389`)

| Node ID      | Écran                | Breakpoint |
| ------------ | -------------------- | ---------- |
| `6381:67390` | Signup               | XL Desktop |
| `6381:67432` | Code OTP             | XL Desktop |
| `6381:67472` | Onboarding — étape 1 | XL Desktop |
| `6381:67528` | Onboarding — étape 2 | XL Desktop |
| `6381:67578` | Onboarding — étape 3 | XL Desktop |
| `6381:67612` | Onboarding — étape 4 | XL Desktop |
| `6381:68393` | Login                | XL Desktop |
| `6381:67653` | Code OTP             | Tablet     |
| `6381:67682` | Signup               | Tablet     |
| `6381:67712` | Onboarding — étape 1 | Tablet     |
| `6381:67768` | Onboarding — étape 2 | Tablet     |
| `6381:67845` | Onboarding — étape 3 | Tablet     |
| `6381:67879` | Onboarding — étape 4 | Tablet     |
| `6381:68450` | Login                | Tablet     |
| `6381:67818` | Code OTP             | Mobile     |
| `6381:67921` | Onboarding — étape 1 | Mobile     |
| `6381:68017` | Onboarding — étape 2 | Mobile     |
| `6381:68173` | Signup               | Mobile     |
| `6381:68202` | Onboarding — étape 3 | Mobile     |
| `6381:68235` | Onboarding — étape 4 | Mobile     |
| `6381:68496` | Login                | Mobile     |
| `6381:67977` | Code OTP             | Desktop    |
| `6381:68067` | Onboarding — étape 1 | Desktop    |
| `6381:68123` | Onboarding — étape 2 | Desktop    |
| `6381:68276` | Signup               | Desktop    |
| `6381:68317` | Onboarding — étape 3 | Desktop    |
| `6381:68351` | Onboarding — étape 4 | Desktop    |
| `6381:68541` | Login                | Desktop    |

---

## 4. Profil utilisateur — Light (`6381:98451`)

### 4.1 XL Desktop (1920 × ~1024-1345)

| Node ID       | Écran                            |
| ------------- | -------------------------------- |
| `6381:98452`  | Profil visiteur                  |
| `6383:30147`  | Profil visiteur → Inspirations   |
| `6383:31724`  | Profil visiteur → Communauté     |
| `6383:25149`  | Profil visiteur (variante)       |
| `6383:58537`  | Mon profil                       |
| `6383:20770`  | Profil visiteur (compact)        |
| `6383:18739`  | Mon profil (variante)            |
| `6383:60011`  | Modifier le profil — étape 1     |
| `6383:63118`  | Modifier le profil — étape 2     |
| `6383:65037`  | Modifier le profil — étape 3     |
| `6384:67299`  | Paramètres                       |
| `6384:76915`  | Paramètres → Supprimer le compte |
| `6384:72591`  | Paramètres → Sécurité            |
| `6385:171481` | Paramètres → Notifications       |
| `6384:74123`  | Paramètres → Assistance          |
| `6384:75550`  | Paramètres → Licences            |

### 4.2 Tablet (768 × ~960-1345)

| Node ID       | Écran                            |
| ------------- | -------------------------------- |
| `6381:98712`  | Profil visiteur                  |
| `6383:21030`  | Profil visiteur (compact)        |
| `6383:30407`  | Profil visiteur → Inspirations   |
| `6383:31861`  | Profil visiteur → Communauté     |
| `6383:27142`  | Profil visiteur (variante)       |
| `6383:58661`  | Mon profil                       |
| `6383:60270`  | Modifier le profil — étape 1     |
| `6383:63564`  | Modifier le profil — étape 2     |
| `6383:65483`  | Modifier le profil — étape 3     |
| `6383:18999`  | Mon profil (variante)            |
| `6384:68426`  | Paramètres                       |
| `6384:77240`  | Paramètres → Supprimer le compte |
| `6384:72916`  | Paramètres → Sécurité            |
| `6385:171784` | Paramètres → Notifications       |
| `6384:74425`  | Paramètres → Assistance          |
| `6384:75838`  | Paramètres → Licences            |

### 4.3 Mobile (402 × ~874-1036)

| Node ID       | Écran                            |
| ------------- | -------------------------------- |
| `6381:98908`  | Profil visiteur                  |
| `6383:59614`  | Profil visiteur (variante)       |
| `6383:21226`  | Profil visiteur (compact)        |
| `6383:30603`  | Profil visiteur → Inspirations   |
| `6383:60465`  | Modifier le profil — étape 1     |
| `6383:63946`  | Modifier le profil — étape 2     |
| `6383:65865`  | Modifier le profil — étape 3     |
| `6383:31997`  | Profil visiteur → Communauté     |
| `6383:27338`  | Profil visiteur (variante 2)     |
| `6383:58784`  | Mon profil                       |
| `6383:19195`  | Mon profil (variante)            |
| `6384:69431`  | Paramètres                       |
| `6384:77501`  | Paramètres → Supprimer le compte |
| `6384:73177`  | Paramètres → Sécurité            |
| `6385:172023` | Paramètres → Notifications       |
| `6384:74663`  | Paramètres → Assistance          |
| `6384:76073`  | Paramètres → Licences            |

### 4.4 Desktop (1440 × ~960-1340)

| Node ID       | Écran                            |
| ------------- | -------------------------------- |
| `6381:99062`  | Profil visiteur                  |
| `6383:21411`  | Profil visiteur (compact)        |
| `6383:30788`  | Profil visiteur → Inspirations   |
| `6383:32106`  | Profil visiteur → Communauté     |
| `6383:27523`  | Profil visiteur (variante)       |
| `6383:58897`  | Mon profil                       |
| `6383:19349`  | Mon profil (variante)            |
| `6383:60619`  | Modifier le profil — étape 1     |
| `6383:64132`  | Modifier le profil — étape 2     |
| `6383:66051`  | Modifier le profil — étape 3     |
| `6384:69848`  | Paramètres                       |
| `6384:77566`  | Paramètres → Supprimer le compte |
| `6384:73242`  | Paramètres → Sécurité            |
| `6385:172066` | Paramètres → Notifications       |
| `6384:74705`  | Paramètres → Assistance          |
| `6384:76112`  | Paramètres → Licences            |

---

## 5. Partager une observation — Light (`6381:73071`)

> 75 frames couvrant l'intégralité du flow de contribution en 4 breakpoints.
> Frames XL Desktop : `6381:73072` à `6381:89569`
> Pour un audit ciblé, utiliser les frames XL Desktop + Mobile comme référence principale.

| Node ID      | Breakpoint | Notes                         |
| ------------ | ---------- | ----------------------------- |
| `6381:73072` | XL Desktop | Étape 1 — type de partage     |
| `6381:73475` | XL Desktop | Étape 2 — photos              |
| `6381:73932` | XL Desktop | Étape 3 — identification      |
| `6381:74388` | XL Desktop | Étape 4 — contexte (scroll)   |
| `6381:74919` | XL Desktop | Étape 5 — localisation        |
| `6381:75355` | XL Desktop | Étape 6 — description         |
| `6381:75832` | XL Desktop | Étape 7 — récapitulatif       |
| `6381:76288` | XL Desktop | Étape récap (scroll)          |
| `6381:77234` | XL Desktop | Étape variante                |
| `6381:87944` | XL Desktop | Publication réussie (toaster) |
| `6381:88355` | XL Desktop | Variante                      |
| `6381:80728` | Desktop    | Étape 1                       |
| `6381:76808` | Tablet     | Étape 1                       |
| `6381:78431` | Mobile     | Étape 1                       |

---

## 6. Types de partage — Light (`6381:92719`)

| Node ID      | Écran                   | Breakpoint |
| ------------ | ----------------------- | ---------- |
| `6381:92720` | Rencontre nature        | XL Desktop |
| `6381:93036` | Instant nature          | XL Desktop |
| `6381:93341` | Collaboration           | XL Desktop |
| `6381:95162` | Multi observations      | XL Desktop |
| `6381:96160` | Aide à l'identification | XL Desktop |
| `6381:94226` | Rencontre nature        | Desktop    |
| `6381:94541` | Instant nature          | Desktop    |
| `6381:94845` | Collaboration           | Desktop    |
| `6381:95514` | Multi observations      | Desktop    |
| `6381:96420` | Aide à l'identification | Desktop    |
| `6381:93659` | Rencontre nature        | Tablet     |
| `6381:93757` | Instant nature          | Tablet     |
| `6381:93844` | Collaboration           | Tablet     |
| `6381:95884` | Multi observations      | Tablet     |
| `6381:96679` | Aide à l'identification | Tablet     |
| `6381:93944` | Rencontre nature        | Mobile     |
| `6381:94040` | Instant nature          | Mobile     |
| `6381:94125` | Collaboration           | Mobile     |
| `6381:96037` | Multi observations      | Mobile     |
| `6381:96721` | Aide à l'identification | Mobile     |

---

## 7. Format des photos — Light (`6381:89904`)

| Node ID      | Breakpoint | Contenu                        |
| ------------ | ---------- | ------------------------------ |
| `6381:89905` | XL Desktop | Tous les formats (scroll long) |
| `6381:90371` | XL Desktop | Variante                       |
| `6381:90828` | Tablet     | Tous les formats               |
| `6381:91076` | Tablet     | Variante                       |
| `6381:91315` | Mobile     | Tous les formats               |
| `6381:91561` | Mobile     | Variante                       |
| `6381:91798` | Desktop    | Tous les formats               |
| `6381:92263` | Desktop    | Variante                       |

---

## Comment utiliser ce fichier

### Accéder à un écran directement

```
https://www.figma.com/design/YNnsWRi3hSp5hWsUa0Tjr6/?node-id=6381-117917
```

Remplacer `6381-117917` par le node ID souhaité (format `XXXX-YYYY`).

### Dans les outils MCP Figma

Passer le node ID avec deux-points : `6381:117917`

### Conventions de nommage Figma

- `XL Desktop` = 1920px
- `Desktop` = 1440px
- `Tablet` = 768px
- `Mobile` = 402px

---

> Dernière synchronisation : 2026-04-01
> Source : Figma Plugin API — exploration complète de la page "Web app"
