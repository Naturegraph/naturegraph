# Registre C — Commentaires / TODO (Lot 2 du chantier qualité)

> Preuve de couverture du Lot 2. Chaque TODO a un **verdict** après vérification
> que la feature existe (ou non) en prod. Mis à jour 2026-08-19.
> Statut : **parties 1 et 2 faites** ; reste 2 gros blocs de spec (Settings) + les sweeps.

## Corrigés / supprimés (TODO « backend » déjà branché en prod)

| Fichier                                | TODO retiré/corrigé                                 | Preuve                                            |
| -------------------------------------- | --------------------------------------------------- | ------------------------------------------------- |
| `contribute/ContributeInstantForm.tsx` | header « Brancher création de post »                | utilise useCreatePost + uploadPostMedia           |
| `contribute/MediaUploader.tsx`         | header « Upload Storage »                           | upload fait par le pipeline parent                |
| `contribute/MediaUploader.tsx`         | « magic number côté serveur »                       | edge `validate-media`/`mediaMagic.ts` existe      |
| `home/DeleteConfirmModal.tsx`          | « DELETE /posts/:id »                               | suppression réelle via onConfirm (marche en prod) |
| `home/PostOptionsMenu.tsx`             | header « Actions TODO [BACKEND] » + `handleDelete`  | toutes les actions câblées (mutations/services)   |
| `home/ContributeModal.tsx`             | « Instant nature = bientôt » + TODO activation      | `nature_instant` est `disabled: false` (actif)    |
| `profile/tabs/ProfileFeed.tsx`         | « mocks » x2 + « getPostsByUser »                   | query réelle ['posts','by-user']                  |
| `profile/tabs/ProfileInspirations.tsx` | « getSavedPostsByUser »                             | savedPosts réels fournis par le parent            |
| `services/index.ts`                    | « Services à créer » (stats/notif/media/identif...) | les 9 services existent et sont exportés          |
| `services/profileService.ts`           | `toggleFollow` « à implémenter »                    | implémenté juste sous le TODO (table follows)     |

## Gardés (TODO réels ou notes légitimes)

| Fichier                                    | Raison                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `profile/tabs/ProfileStats.tsx`            | onglet stats = placeholder « Bientôt », RPC `get_profile_stats` vraiment à faire     |
| `home/GuestSidebar.tsx`                    | suggestions invité non câblées (composant statique)                                  |
| `contribute/LocationPicker.tsx`            | champ Instant reste texte simple (autocomplete villes existe ailleurs via fr_cities) |
| `home/PostOptionsMenu.tsx:300`             | « toast global » sur erreur silencieuse : vrai petit TODO                            |
| `contexts/AuthContext.tsx:829/840`         | Google OAuth réellement non branché (cf. AUTH_ROADMAP)                               |
| `types/database.ts:68`                     | retirer `disappointed` de l'enum reaction_type : vrai TODO DB                        |
| `home/MobileBottomNav.tsx:102`             | idée UX (drawer latéral) : à garder                                                  |
| `components/settings/SettingsPanel.tsx:80` | exposer Discord via env : petit TODO                                                 |
| `ui/SpeciesResultsList.tsx:15`             | explicitement « hors périmètre NG-049 »                                              |

## Partie 2 — traités

Corrigés (obsolètes, feature vérifiée présente) :

| Fichier                                     | TODO retiré/corrigé                                | Preuve                                                                  |
| ------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| `contribute/ContributeEncounterForm.tsx:11` | header « Upload/POST »                             | création câblée via useContributePostSubmit                             |
| `profile/EditPrefsTab.tsx:13`               | « Phase 2 useUpdateProfile »                       | useUpdateProfile existe (useProfile.ts:81) et utilisé (Profile.tsx:166) |
| `home/FeedPost.tsx:1147`                    | « État optimiste local, câbler saved_posts »       | déjà câblé (useToggleSavedPost, ligne 1159)                             |
| `components/settings/SettingsPanel.tsx:23`  | pointeur mort vers `second-agent/…` (doc supprimé) | dossier second-agent absent                                             |

Gardés (vrais TODO confirmés) :

| Fichier                                                           | Raison                                                                           |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `home/ProfileMenu.tsx:34`, `contexts/AccessibilityContext.tsx:20` | préférences en localStorage, sync `profiles.preferences` vraiment à faire        |
| `onboarding/OnboardingStep4.tsx:45`                               | table serveur `banned_usernames` + validation DB non faite (durcissement)        |
| `onboarding/OnboardingInterests.tsx:25`, `OnboardingStep2.tsx:27` | validation serveur / mapping notifications à confirmer plus tard                 |
| `contexts/LocationContext.tsx:14`                                 | `locationDistance` pas encore lié à `location_radius_km`                         |
| `Admin/AdminAnalytics.tsx:601`                                    | note de calibration des seuils (prod scalera)                                    |
| `components/auth/AuthForm.tsx:279/285`                            | décision OAuth valide (non configuré) ; seul le cadrage « beta privée » est daté |

## Reste (à faire avant clôture Lot 2)

- [ ] `settings/SettingsHelpView.tsx:20` + `SettingsSecurityView.tsx:20` : **gros blocs
      de spec** référençant le doc supprimé `second-agent/03…`. Les features (support,
      changement d'email) semblent faites -> relecture ciblée pour retirer les specs
      obsolètes en gardant les vraies notes. Non fait ici (éviter de couper un bloc à l'aveugle).
- [ ] `home/FeedPost.tsx:56` (TODO refactor) -> traité au **Lot 4** (factorisation FeedPost).
- [ ] Références mortes `second-agent/NN` restantes (ex. FeedPost share) : nettoyage au sweep.
- [ ] Sweeps : `mock`, `provisoire`, `pour la beta`, dates passées ; en-têtes + JSDoc dossier par dossier.
