# Release V0.4.0 — Échanges, mode sombre & finitions

> Prod précédente : V0.3.1 (2026-07-21). Cette release : 2026-07-28.
> Flux : `develop → main` (fast-forward propre, `origin/main` ancêtre de develop).
> Base de données : les 34 migrations depuis le 9 juillet sont **déjà appliquées
> en prod** (dont les 8 de cette MAJ, posées manuellement). Rien à appliquer au
> merge.

---

## 📣 Release note USER (grand public)

**Nouveautés**

- **Les Échanges** arrivent sous chaque observation : pose une question, propose
  une identification d'espèce, encourage, et réagis aux messages. Une vraie
  discussion naturaliste sous chaque publication.
- **Mode sombre** disponible dans l'application (l'accueil reste toujours clair).

**Améliorations**

- Meilleure lisibilité partout (liens, alertes, logo soigné en sombre).
- Notifications d'échange et de proposition d'espèce, avec un rappel quotidien
  par e-mail de ce que tu as manqué.
- Cartes de contribution repensées en mode sombre.

---

## 🔧 Release note TECHNIQUE (interne)

### Fonctionnalités

- **NG-049 Échanges** (fil de discussion sous les posts) :
  - Publier / répondre (1 niveau) / réagir (cœur) / proposer une espèce.
  - **Suppression tombstone** : supprimer un échange qui porte des réponses le
    remplace par « Échange supprimé » (garde les réponses des autres) ; sans
    réponse → suppression définitive ; tombstone orphelin nettoyé.
  - Compteur d'échanges cliquable, excluant les tombstones.
  - Une espèce par personne et par publication (index unique).
  - **Instant nature (paysage)** : pas de proposition d'espèce (UI + garde-fou DB).
- **Notifications** : types `comment` / `identification` (in-app + e-mail digest
  quotidien `check-social-digest` couvrant réactions, follows, échanges, espèces).
  Couleurs des pastilles harmonisées (échange = social, identification = teal via
  `--color-highlight-bg`).
- **Mode sombre** : activé, avec accueil (landing/login/signup/onboarding) forcé
  en clair (`data-theme="light"`) ; token `--color-link` AA ; logo sombre
  (lettres crème + « g » menthe) ; cartes Contribuer thème-aware.
- **E-mail E2** « Cette semaine sur Naturegraph » : digest hebdomadaire du
  dimanche (catégorie `event`, hors cap marketing).

### Sécurité (RLS / migrations, déjà en prod)

- `comments` : l'auteur voit toujours son propre échange (corrige un blocage
  `INSERT...RETURNING` pour comptes internes) ; `comment_reactions` idem.
- `supprimer_echange(uuid)` SECURITY DEFINER, `search_path` figé, réservé aux
  `authenticated`.
- Garde-fou serveur : pas de `species_label` sur un post `nature_instant`.

### Qualité

- `npm run build` (tsc -b + vite) ✅ · 147 tests ✅ · lint ✅.
- Chantiers en cours **masqués sur prod** via feature flags robustes (hostname) :
  Carnet d'observations (`NOTEBOOKS_ENABLED`), aide identification NG-039 (code
  mort), route `dev-echanges` (`LABS_ENABLED`). Vérifié.

### Points de suivi (non bloquants)

- Régénérer les types Supabase (retirer le cast `(supabase as any).rpc`).
- Purger le code mort `helpOnly` (NG-039, 5 fichiers).
- 5 vulnérabilités Dependabot signalées (2 high, 3 moderate) — à traiter à part.
