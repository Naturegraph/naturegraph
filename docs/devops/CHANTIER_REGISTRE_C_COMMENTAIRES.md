# Registre C — Commentaires / TODO (Lot 2 du chantier qualité)

> Preuve de couverture du Lot 2. Chaque TODO a un **verdict** après vérification
> que la feature existe (ou non) en prod. Mis à jour 2026-08-19.
> Statut : **partie 1 faite** (obsolètes mock-data traités) ; reste une 2e passe tracée.

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

## Reste à vérifier (Lot 2, 2e passe)

Non encore tranchés (chacun exige de confirmer si la feature « Phase 2/3 » est faite) :

- `contribute/ContributeEncounterForm.tsx:11` (header TODO [BACKEND])
- `home/ProfileMenu.tsx:34` (sync textSize -> profiles.preferences)
- `onboarding/OnboardingInterests.tsx:25`, `OnboardingStep2.tsx:27`, `OnboardingStep4.tsx:45`
- `profile/EditPrefsTab.tsx:13`, `contexts/AccessibilityContext.tsx:20` (sync préférences)
- `settings/SettingsHelpView.tsx:20`, `SettingsPanel.tsx:23`, `SettingsSecurityView.tsx:20`
  (« Phase 2 : voir second-agent/03-profil-backend-notes.md » : vérifier si le doc existe encore)
- `contexts/LocationContext.tsx:14`, `Admin/AdminAnalytics.tsx:601`
- `home/FeedPost.tsx:56` (refactor -> **Lot 4**), `:843` (individuals_count Phase 2), `:1147` (saved_posts)
- `components/auth/AuthForm.tsx:279/285` (liés au TODO OAuth réel)

## Sweeps restants (avant clôture Lot 2)

- [ ] `mock`, `provisoire`, `pour la beta`, dates passées (au-delà des TODO).
- [ ] En-têtes de fichiers + JSDoc exports, dossier par dossier.
