# 06 — EditProfilePanel pixel-perfect (3 onglets)

**Statut :** 🟢 Validé 100%
**Date création :** 2026-05-02
**Date validation :** 2026-05-02
**Auteur :** agent front-end (Safe Local Mode)
**Figma nodes :**

- Informations : 6385:75440 (desktop) / 6385:73687 (mobile)
- Réseaux sociaux : 6385:73715 (rounded-lg 8px)
- Préférences : 6385:75887 (desktop) / 6385:73873 (mobile) / 6385:75904 (tile détail) / 6385:75941 (Frame 4243 specs complètes)
- Photo de profil : 6385:76303 (desktop) / 6385:73995 (mobile, état défaut)

## 🎯 Contexte

Itération pixel-perfect du panneau "Modifier le profil" (owner only) accessible
via le bouton "Modifier" du `ProfileHeader`. 3 onglets : Informations / Préférences
/ Photo de profil — chacun aligné aux specs Figma fournies.

## 🤔 Décisions clés

### Mobile = full page (plus de bottom sheet)

Demande Nicolas 2026-05-02 : _"full page en mobile les panneaux comme celui-ci"_.

- Avant : `fixed bottom-0` avec rounded-top-2xl + handle bar + max-h-90dvh
- Après : `fixed inset-0` plein écran sur mobile, panneau latéral 420px sur desktop (md+)
- Safe-area-inset-top pris en compte pour le notch iPhone

### Footer sticky avec submit form-attribute (HTML5)

- Bouton "Sauvegarder les modifications" rendu une seule fois dans `EditProfilePanel`
- Lié au form actif via `form="edit-{tab}-form"` HTML5 standard
- Pas de Context, pas de ref — pattern propre et minimal
- **Footer masqué quand `activeTab === 'photo'`** (auto-save sans validation explicite)

### Onglet Photo : auto-save

Demande Nicolas 2026-05-02 : _"ne pas avoir de footer dans cet onglet car le
changement de photos doit se sauvegarder automatiquement dès que l'utilisateur
change ou supprime"_.

- Plus de form HTML5 (juste `<div>`)
- Chaque action Changer/Supprimer appelle `onSave()` immédiatement
- Inputs file cachés (refs) déclenchés par les boutons
- Validation côté client (MIME image/\* + taille 1/2 MB)
- Cleanup `URL.revokeObjectURL` au unmount via ref miroir (évite révocation
  d'URL active à chaque re-render)

### Tabs sur 1 ligne

Demande Nicolas 2026-05-02 : _"essayer d'avoir l'ensemble des labels sur une
ligne pas 2"_.

- `whitespace-nowrap` + `text-sm md:text-base` + `gap-5`
- "Informations | Préférences | Photo de profil" tient sur 375px

### Tuiles Préférences alignées sur OnboardingInterests

Demande Nicolas 2026-05-02 : _"on peut remettre comme dans l'onboarding meme style"_.

- Source unique des emojis : `CATEGORY_EMOJIS` de `badgeHelpers.ts`
  (avec variation selectors corrects : 🐿️, 🕷️ etc.)
- Ordre identique à l'onboarding : birds → mammals → insects → reptiles →
  amphibians → arachnids → mollusks → fish → plants
- Labels via clé i18n partagée `onboarding.interests.categories.{id}`

### Tuile Préférences pixel-perfect (Frame 4251)

Specs complètes fournies par Nicolas — appliquées à l'identique :

- `h-[104px]` (104px, pas h-24=96px)
- `rounded-md` (12px = `--radius-md` Naturegraph, **PAS rounded-xl** qui vaut 32px ici)
- Border 1px (pas 2px) — épaisseur identique sélectionné/non-sélectionné
- Sélectionné : `bg-[var(--color-action-light)]` + `border-[var(--color-action-default)]`
- Emoji : 32px Quicksand bold (Title/H3)
- Label sélectionné : 16px Mulish **bold** + violet primary
- Label non-sélectionné : 16px Mulish **regular** + foreground
- Badge top-right : 20×20 cercle bg `#FFFDF8` (Background/Neutral/Primary) +
  texte foreground regular 12px + `tracking-[0.04em]`

### Photo de profil : avatar 112×112, banner 160×128

- Avatar circle 112px (pas 80px initial)
- Banner box 160×128 rounded-lg (pas full ratio 3:1 — preview compact)
- Buttons stackés verticalement, **largeur fixe 160px** collés à droite
  (justify-between avec preview à gauche)
- État défaut nouveau user : avatar hermine sur lavande border-primary,
  banner box vide bg-primary-light

### Réseaux sociaux : icon container détaché 8px

Demande Nicolas 2026-05-02 : _"pas 100% arrondies ici pour les items mais 8px"_.

- Icon container 40×40 `rounded-lg` (8px) bordured
- Input field `rounded-lg` (8px)
- Bouton X clear circulaire à droite (visible si valeur saisie)

### Pas d'état "filled actif" sur le champ requis

Demande Nicolas 2026-05-02 : _"ne pas appliquer un style actif par défaut,
c'était dans l'exemple des maquettes"_.

- Username input garde le style normal (border standard)
- Le style `bg-primary-light + border-primary` du Figma était illustratif

### Séparateur Photo : 4px solid bg-border edge-to-edge

Demande Nicolas 2026-05-02 : _"plus gros séparateur comme dans feed post mobile"_.

- `-mx-5 h-1 bg-border` reproduit `border-b-4 border-border` de FeedPost mobile.

## 🔧 Modifications

### Composants

- `src/components/profile/EditProfilePanel.tsx` — full page mobile, header big title,
  tabs underline alignés gauche + whitespace-nowrap, footer conditionnel selon tab actif
- `src/components/profile/EditInfoTab.tsx` — form HTML5 + INPUT_PILL_CLASS / TEXTAREA_CLASS
  partagés, `<SocialInput>` (icon-container + input + X clear), focus state cohérent
- `src/components/profile/EditPrefsTab.tsx` — INTERESTS depuis CATEGORY_EMOJIS,
  type union strict `InterestId`, tile Frame 4251 pixel-perfect
- `src/components/profile/EditPhotoTab.tsx` — auto-save, refs file inputs, validation
  client, cleanup blob URLs au unmount uniquement, état défaut nouveau user

### Notes backend

- `second-agent/03-profil-backend-notes.md` §14 (EditProfilePanel) + §15 (Settings)

## ✅ Validation Nicolas (chronologie)

- "ensuite on va travailler la partie modifier mon profil maintenant au complet,
  ici on doit faire aussi du pixel perfect complète"
- "mettre le bouton tout en bas comme l'ensemble des panneaux"
- "ne pas appliquer un style actif par défaut, c'était dans l'exemple des maquettes"
- "appliquer le bon style pour tous, il me semble que nous avons un background
  light en plus normalement au state actif ?" (focus state)
- "pas 100% arrondies ici pour les items mais 8px plus conforme" (réseaux sociaux)
- "full page en mobile les panneaux comme celui-ci"
- "ne pas avoir de footer dans cet onglet car le changement de photos doit se
  sauvegarder automatiquement"
- "112px / 112px" (avatar)
- "taille 160px / 128px en desktop, border radius 8px" (banner preview)
- "space between toujours afficher les boutons collé à droite ici et dans bannière"
- "toujours bien centré avec la photo idem bannière"
- "le bouton déborde en mobile attention, il doit faire max width : 160px desktop et mobile"
- "plus gros séparateur comme dans feed post par exemple (mobile)"
- "faire en sorte que les boutons fonctionne ou mettre des notes backend pour le fonctionnement ensuite"
- "essayer d'avoir l'ensemble des labels sur une ligne pas 2, sinon cela décale tout"
- "on peut remettre comme dans l'onboarding meme style, arrondies moins fort,
  numéro identique"
- "regarde la taille des icons et les icons ici" (Figma 6385:75904)
- "tu n'arrives pas à appliquer le bon style pour les numéros ?" (badge cream + foreground)
- "le bon style ici" (specs Frame 4251 complètes fournies)
- "l'arrondie est toujours immense ici attention" (rounded-md vs rounded-xl)

## 🔁 TODO côté backend (Phase 2)

Voir `03-profil-backend-notes.md` §14 pour tous les détails :

- §14.1 — `useUpdateProfile()` mutation pour Informations
- §14.2 — `profiles.interests TEXT[]` (3 IDs ordonnés)
- §14.3 — Buckets Supabase Storage `avatars` + `banners` + RLS owner-only
- §14.4 — Toasts via ToastContext (remplace les console.warn actuels)

Et §15 pour la page Settings à créer (dernier point MVP).

## 📂 Fichiers touchés

```
src/components/profile/EditProfilePanel.tsx     (header + tabs + footer conditionnel)
src/components/profile/EditInfoTab.tsx          (form + SocialInput + INPUT_PILL_CLASS)
src/components/profile/EditPrefsTab.tsx         (INTERESTS + tile Frame 4251)
src/components/profile/EditPhotoTab.tsx         (auto-save + refs file inputs)
second-agent/03-profil-backend-notes.md         (§14 + §15 ajoutés)
```
