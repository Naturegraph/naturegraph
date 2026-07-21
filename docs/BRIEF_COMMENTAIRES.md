# Brief chantier : Commentaires sous les publications

> Document autoportant : il doit permettre a une session Claude Code demarrant
> a froid (sans historique de conversation) de prendre le chantier en main.
> Redige le 2026-07-06. Etat existant VERIFIE en base de prod a cette date.

---

## 1. Contexte projet

**Naturegraph** : plateforme web citoyenne de biodiversite (React 19 + TypeScript
strict + Vite + Tailwind + SCSS + React Router 7 + TanStack Query 5 + i18next).
Backend Supabase (Postgres + RLS + Auth + Storage + Edge Functions Deno + pg_cron).

**Phase actuelle** : pre-lancement ete 2026, plateforme en **acces libre** (la beta
fermee a code a ete supprimee). Prod = V0.1.2. Pas de communication publique
avant ~septembre : on consolide le socle avec de vrais testeurs.

**Lire en premier** : `PROJECT_MASTER.md` (etat, roadmap, workflow), `CLAUDE.md`
(regles obligatoires), `GUIDELINES.md` (seuils eco-conception et accessibilite).

---

## 2. Role attendu

Developpeur full-stack produit sur le chantier commentaires : de la couche
service jusqu a l UI, en respectant l existant (design system, RLS, systeme de
notifications) plutot qu en reconstruisant a cote.

---

## 3. Objectif du chantier

Livrer les **commentaires v1 sous les publications** : permettre a un membre
authentifie de commenter une observation, lire les commentaires, editer et
supprimer les siens, etre notifie quand on commente sa publication, et signaler
un commentaire abusif.

**Enjeu produit** : c est le principal levier d engagement manquant. Le feed
permet aujourd hui de reagir (emojis), sauvegarder, partager, mais pas de
converser. L identification collaborative existe deja de son cote.

---

## 4. Etat existant (VERIFIE en prod le 2026-07-06)

### 4.1 La fondation base de donnees est DEJA POSEE

Ne pas recreer la table : elle existe et elle est complete.

**Table `comments`**

| Colonne      | Type        | Null | Defaut              |
| ------------ | ----------- | ---- | ------------------- |
| `id`         | uuid        | NO   | `gen_random_uuid()` |
| `post_id`    | uuid        | NO   | :                   |
| `user_id`    | uuid        | NO   | :                   |
| `content`    | text        | NO   | :                   |
| `created_at` | timestamptz | YES  | `now()`             |
| `updated_at` | timestamptz | YES  | `now()`             |

**Triggers actifs**

- `validate_comment_before_save` (BEFORE INSERT OR UPDATE) : refuse un contenu
  de plus de **1000 caracteres**. La validation longueur existe donc DEJA cote
  backend (SECURITY DEFINER, `search_path` fixe). Le front doit s aligner sur
  cette limite, pas en inventer une autre.
- `update_posts_comments_count` (AFTER INSERT OR DELETE) : maintient
  `posts.comments_count`. Volontairement pas sur UPDATE (editer un commentaire
  ne change pas le compteur). **Ne jamais recalculer ce compteur cote client.**
- `update_comments_updated_at` (BEFORE UPDATE) : met a jour `updated_at`.

**RLS : 4 policies, deja completes et correctes**

| Operation | Policy                                 | Regle                                                     |
| --------- | -------------------------------------- | --------------------------------------------------------- |
| INSERT    | `Authenticated users can comment`      | `auth.uid() = user_id`                                    |
| SELECT    | `Comments visible on accessible posts` | `can_see_post(post_id) AND NOT is_internal_user(user_id)` |
| UPDATE    | `Users can edit own comments`          | `auth.uid() = user_id`                                    |
| DELETE    | `Users can delete own comments`        | `auth.uid() = user_id`                                    |

La visibilite suit donc automatiquement celle du post (`can_see_post`) et masque
les comptes internes (`is_internal_user`). Rien a durcir cote RLS a priori :
verifier, ne pas refaire.

### 4.2 Le systeme de notifications est deja en place

- `NotificationType` (dans `src/services/notificationService.ts`) contient
  **deja** la valeur `'comment'`. Rien a ajouter au type.
- Table `notifications` : `id, user_id, type, title, body, reference_id,
reference_type, read, created_at`. Vue enrichie `notifications_with_actor`
  (ajoute `actor_id`, `actor_username`, `actor_avatar_url`).
- Realtime : channel `notif:${userId}` sur les INSERT. Wiring React Query dans
  `useNotifications()`.
- **MANQUE** : aucun trigger de notification sur `comments`. C est a construire
  (cf. perimetre C).
- Emails : dispatcher unique `supabase/functions/send-notification-email`
  (garde-fous deja verrouilles : profil onboarde, `is_email_enabled`, anti-spam
  via `email_send_log`, desabonnement signe + `List-Unsubscribe`, `x-cron-secret`).
  Le dispatcher ne decide JAMAIS s il faut envoyer : c est l appelant qui decide.

### 4.3 L UI a deja ses emplacements reserves

Dans `src/components/home/FeedPost.tsx` :

- ligne ~132 : champ `comments: number` **conserve mais non affiche en MVP**.
- ligne ~848 : slot du **compteur commentaires** (a droite de la rangee des
  compteurs de reactions, Figma node `6385:60468`).
- ligne ~886 : slot de l **action "Commentaires"** (entre le bouton Reagir et le
  groupe de droite, Figma node `6385:60494`).

Les maquettes Figma existent donc deja : recuperer les specs avant de designer.

### 4.4 La moderation est branchable sans migration

- `moderation_reports` est **generique** : `target_type` (varchar) + `target_id`
  (uuid). Un signalement de commentaire = `target_type = 'comment'`. Pas de
  changement de schema necessaire.
- `src/services/reportService.ts` n expose aujourd hui que `postId` / `profileId`
  (cf. NG-033 : les signalements doivent aller dans `moderation_reports`, PAS
  dans la table orpheline `reports`). A etendre pour accepter un commentaire.
- `src/pages/Admin/AdminModeration.tsx` lit `moderation_reports` : verifier que
  la cible `comment` s y affiche correctement.

### 4.5 Ce qui manque totalement

**Tout le frontend.** Aucun `commentService.ts`, aucun composant, aucun hook.
C est exactement le perimetre de ce chantier.

---

## 5. Perimetre

### A. Service (`src/services/commentService.ts`)

- `listComments(postId, { limit, before })` : pagination par curseur
  `created_at`, **max 20 items par requete** (regle projet). S inspirer de
  `listNotificationsPage()` dans `notificationService.ts` (meme pattern curseur).
- `createComment(postId, content)`, `updateComment(id, content)`,
  `deleteComment(id)`.
- Validation cote service : longueur **1000 max** (alignee sur le trigger),
  contenu non vide apres `trim()`.
- Erreurs assainies via `sanitizeError` (regle securite projet), pas de fuite de
  message Postgres brut vers l UI.
- Joindre l auteur (username, avatar) : privilegier une vue enrichie cote SQL
  (comme `notifications_with_actor`) plutot qu un N+1 cote client.

### B. UI

- Composants dans `src/components/comments/`, chacun **< 200 lignes**.
- Liste + formulaire de saisie + item (auteur, avatar, date relative, contenu,
  menu actions si auteur).
- Brancher le **compteur** et l **action** dans les slots deja reserves de
  `FeedPost.tsx` (cf. 4.3), en suivant les nodes Figma cites.
- Hook `useComments()` avec TanStack Query (invalidation du post apres
  mutation pour rafraichir `comments_count`).
- i18n FR/EN obligatoire (`src/i18n/locales/`), aucun texte en dur.

### C. Notification "commentaire sur ta publication"

- Ne pas notifier l auteur quand il commente sa propre publication.
- **In-app** : creer la notification `type: 'comment'` avec
  `reference_id = post_id`, `reference_type = 'post'`. Un trigger Postgres est
  preferable a une insertion cote client (coherent avec le reste du systeme, et
  non contournable). Se rattacher a la vue `notifications_with_actor`.
- **Email** : passer par le dispatcher `send-notification-email` uniquement, avec
  `category: 'event'` et une `reference_key` de dedup. **Ne pas dupliquer les
  garde-fous** : ils sont deja dans le dispatcher.
- **Coordination obligatoire** : un agent travaille sur la branche
  `feat/ng045-phase0-email-foundation` (systeme email E1-E8). Se synchroniser
  avec lui avant de toucher au dispatcher ou aux preferences de notification.

### D. Moderation (peut etre une 2e iteration, cf. decisions en attente)

- Etendre `reportService.createReport()` pour accepter une cible commentaire
  (`target_type = 'comment'`).
- Reutiliser `ReportModal` plutot que d ecrire une modale dediee.
- Verifier l affichage dans `AdminModeration`.
- Se rattache au ticket **NG-036** (moderation a l echelle).

---

## 6. Contraintes non negociables

### 6.1 CRITIQUE : Supabase MCP pointe sur la PRODUCTION

Le projet `hrxgduvworofnrjmgpcj` est la **base de PROD**. Dev et prod partagent
la meme base (ticket **NG-007**, separation volontairement differee apres le
pre-lancement). **Toute ecriture via MCP est une ecriture en prod, sur de vraies
donnees de vrais utilisateurs.** Lectures et inspections : sans risque. Ecritures,
migrations, suppressions : prudence maximale, annoncer avant d agir.

### 6.2 Style d ecriture

**Interdiction absolue du tiret cadratin et du tiret demi-cadratin** (em dash et
en dash) partout : code, commentaires, JSDoc, strings UI, messages d erreur,
commits, docs, reponses de chat. Remplacer par virgule, deux-points, parentheses
ou point.

### 6.3 Code

- TypeScript strict, **jamais de `any`**.
- Composants **< 200 lignes**.
- **Commentaires obligatoires** : en-tete de fichier, JSDoc sur les fonctions et
  composants, logique metier expliquee. Commenter le "pourquoi", pas le "quoi".
- Design system : **jamais de couleur en dur**, toujours `var(--color-*)`.
  Fonts Quicksand (titres) + Mulish (body).
- Commits : `feat:`, `fix:`, `refactor:`, `perf:`, `docs:`.

### 6.4 Eco-conception et accessibilite (piliers du projet)

- Pas de dependance JS sans justification, preferer CSS a JS.
- Pagination obligatoire (max 20 items), `loading="lazy"` + dimensions explicites
  sur les images, pas d animation superflue, respecter `prefers-reduced-motion`.
- WCAG AA : contraste >= 4.5:1, navigation clavier complete, focus visible, HTML
  semantique, aria-labels, formulaires accessibles.
- Auditer selon les checklists de `GUIDELINES.md` apres implementation.

### 6.5 Git et releases

- Travailler sur `develop`. **Verifier `git branch --show-current` avant chaque
  commit** : le repo est partage avec d autres agents (un commit a deja atterri
  par erreur sur la branche d un autre agent). En cas de doute, utiliser un
  `git worktree` isole.
- Flux obligatoire `develop` vers `staging` vers `main`, sans raccourci.
- **Aucun merge vers `main` sans accord explicite de Nicolas.** Pas de push prod
  systematique : on release par grappe coherente, avec 2 release notes
  (technique + user-friendly, cf. `docs/devops/RELEASE_PROCESS.md`).

---

## 7. Decisions produit en attente (a trancher avec Nicolas avant de coder l UI)

1. **Fil plat ou reponses imbriquees (threads)** ? Le schema actuel n a pas de
   `parent_id` : un fil plat ne demande aucune migration, les threads si.
2. **Edition autorisee ou suppression seule** ? La RLS UPDATE existe et le
   trigger `updated_at` est pret, mais c est un choix produit (afficher un
   marqueur "modifie" ?).
3. **Moderation des le v1 ou iteration suivante** ?
4. **Notification commentaire : in-app seule, ou in-app + email** ? (le dispatcher
   email est pret, mais chaque email ajoute de la pression sur la delivrabilite).
5. **Mentions (@user)** dans les commentaires : le type de notification
   `'mention'` existe deja. Dans le perimetre v1 ou non ?

---

## 8. Premiers pas suggeres

1. Lire `PROJECT_MASTER.md`, `CLAUDE.md`, `GUIDELINES.md`.
2. Verifier l etat decrit ici (il date du 2026-07-06) : schema, triggers, RLS.
3. Recuperer les specs Figma des nodes `6385:60468` et `6385:60494`.
4. Faire trancher les decisions de la section 7.
5. Commencer par le service + les tests, puis l UI, puis la notification.

---

## 9. Definition of Done

- [ ] Poster, lister (pagine), editer, supprimer un commentaire fonctionnent.
- [ ] `posts.comments_count` reste juste (verifie apres insert et delete).
- [ ] RLS verifiee : impossible d editer ou supprimer le commentaire d autrui,
      commentaires invisibles sur un post non accessible, test en role anon.
- [ ] Notification in-app recue par l auteur du post, jamais d auto-notification.
- [ ] i18n FR + EN complete, aucun texte en dur.
- [ ] Accessibilite : clavier, focus visible, aria-labels, contraste.
- [ ] Eco-conception : pas de N+1, pagination respectee, budget JS tenu.
- [ ] Composants < 200 lignes, JSDoc et en-tetes presents, zero `any`.
- [ ] Aucun tiret cadratin nulle part.
- [ ] `npm run build` + `npm run lint` + `npm run test` verts.
- [ ] Release notes redigees, validation de Nicolas obtenue avant `main`.

---

## 10. Ce qu il ne faut PAS faire

- Recreer la table `comments` ou ses RLS : elles existent et sont correctes.
- Recalculer `comments_count` cote client : c est le role du trigger.
- Reimplementer les garde-fous email : ils sont dans le dispatcher.
- Inventer une limite de longueur differente de 1000 caracteres.
- Ecrire dans `reports` : la seule table exploitee par l admin est
  `moderation_reports` (cf. NG-033).
- Toucher au dispatcher ou aux preferences sans se coordonner avec l agent
  notifications (`feat/ng045-phase0-email-foundation`).
- Merger vers `main` sans le go explicite de Nicolas.

---

## 11. Fichiers de reference

| Fichier                                       | Pourquoi                                    |
| --------------------------------------------- | ------------------------------------------- |
| `src/services/notificationService.ts`         | Pattern service + pagination curseur        |
| `src/services/reportService.ts`               | Signalement (a etendre), lecons NG-033      |
| `src/components/home/FeedPost.tsx`            | Slots UI reserves (lignes ~132, ~848, ~886) |
| `src/components/notifications/NotifItem.tsx`  | Rendu d un item de notification             |
| `supabase/functions/send-notification-email/` | Dispatcher email et ses garde-fous          |
| `src/pages/Admin/AdminModeration.tsx`         | Dashboard moderation                        |
| `docs/backend/database-architecture.md`       | Source de verite du schema                  |
| `docs/devops/RELEASE_PROCESS.md`              | Process de release                          |
