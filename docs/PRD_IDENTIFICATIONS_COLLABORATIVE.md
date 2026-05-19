# PRD — Identifications collaboratives (Phase 2)

> **Statut :** Draft Phase 2 — pas encore validé Nicolas.
> **Date :** 2026-05-15 (post V1.0.0).
> **Auteur :** Équipe produit Naturegraph.
> **Pré-requis :** V1 livrée (table `identification_proposals` + service basique `create/list/delete`).

---

## 1. Contexte

La V1 livre une **base squelettique** : la table `identification_proposals` existe (`post_id`, `author_id`, `species_name`, `scientific_name`, `taxref_id`, `confidence`, `notes`, `votes_up`, `votes_down`) avec un `identificationService.ts` exposant `createProposal` / `listProposals` / `deleteProposal`. **Aucune UI côté front ne consomme ces endpoints.**

**Manques structurants pour transformer cette base en feature vivante :**

- **Pas de table `identification_votes`** — les colonnes `votes_up` / `votes_down` sont des nombres dans le vide, sans audit ni anti-fraude (1 user peut voter 10 fois).
- **Pas de workflow consensus** : pas de logique "espèce confirmée après N votes positifs et X% de consensus".
- **Pas de hook React Query** ni de composant `<IdentificationPanel />` côté front.
- **RLS incomplet** sur `identification_proposals` (à vérifier — la migration initiale ne couvre que les tables principales).
- **Pas de notification** quand quelqu'un propose une identification sur ton post.
- **Pas de badge "expert"** ni système de réputation (un naturaliste pro propose ≠ un débutant).

Cette feature est **différenciante** pour Naturegraph (la valeur écologique du contenu dépend de la qualité des identifications). Elle distingue le projet d'un simple feed photo.

---

## 2. User stories

| #     | En tant que…                       | Je veux…                                                                  | Pour…                                                              |
| ----- | ---------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| US-01 | Contributeur incertain de l'espèce | Poster une observation sans nom d'espèce et laisser la communauté aider   | Ne pas bloquer ma publication faute de certitude                   |
| US-02 | Naturaliste expérimenté            | Proposer une identification sur un post non-identifié                     | Apporter ma connaissance à la communauté                           |
| US-03 | Tout utilisateur connecté          | Voter pour ou contre une proposition d'identification                     | Contribuer au consensus collectif                                  |
| US-04 | Auteur du post                     | Accepter une proposition comme "officielle" en un clic                    | Trancher quand le consensus penche clairement                      |
| US-05 | Visiteur du post                   | Voir l'identification consensuelle si elle existe, sinon les propositions | Comprendre quelle espèce a été identifiée et avec quelle certitude |
| US-06 | Auteur du post                     | Recevoir une notification quand quelqu'un propose ou vote                 | Suivre la dynamique de mon observation                             |

---

## 3. Périmètre

### In scope (Phase 2)

- Création table `identification_votes` (1 vote par user par proposition, valeur up/down).
- Workflow consensus côté serveur : une proposition devient `accepted` automatiquement si `votes_up ≥ 3 AND votes_up / (votes_up + votes_down) ≥ 0,7` **OU** si l'auteur du post l'accepte explicitement.
- Quand une proposition passe `accepted`, `posts.taxref_id` est mis à jour automatiquement (trigger).
- Composant `<IdentificationPanel />` dans le `FeedPost` étendu : liste les propositions + vote + bouton "accepter" (owner only).
- Notification "X a proposé une identification sur ton post" + "X a accepté l'identification de Y".
- RLS complet sur `identification_proposals` + `identification_votes`.

### Out of scope (Phase 3+)

- **Badges expert / réputation** (système calculé à partir de l'historique d'identifications acceptées). Reporté Phase 3 car nécessite un seed de données réelles.
- Identification visuelle automatique (IA / Pl@ntNet / iNaturalist Vision).
- Contestation d'identification acceptée par un tiers (l'auteur peut toujours rebasculer).
- Multi-langues pour `species_name` (TAXREF FR/EN sera traité dans PRD_LOCALIZATION v2).

---

## 4. Modèle de données

```sql
-- Migration YYYYMMDD_identification_phase2.sql

-- 4.1 Statut consensus sur la proposition
ALTER TABLE public.identification_proposals
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_id_proposals_post_status
  ON public.identification_proposals (post_id, status);

-- 4.2 Table votes (1 par user par proposition)
CREATE TABLE IF NOT EXISTS public.identification_votes (
  proposal_id uuid NOT NULL REFERENCES public.identification_proposals(id) ON DELETE CASCADE,
  voter_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote        smallint NOT NULL CHECK (vote IN (-1, 1)),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (proposal_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_id_votes_voter
  ON public.identification_votes (voter_id);

-- 4.3 Trigger compteurs votes_up / votes_down
CREATE OR REPLACE FUNCTION public.update_proposal_vote_counters()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote = 1 THEN
      UPDATE public.identification_proposals
        SET votes_up = votes_up + 1 WHERE id = NEW.proposal_id;
    ELSE
      UPDATE public.identification_proposals
        SET votes_down = votes_down + 1 WHERE id = NEW.proposal_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote = 1 THEN
      UPDATE public.identification_proposals
        SET votes_up = GREATEST(votes_up - 1, 0) WHERE id = OLD.proposal_id;
    ELSE
      UPDATE public.identification_proposals
        SET votes_down = GREATEST(votes_down - 1, 0) WHERE id = OLD.proposal_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_id_votes_counters
  AFTER INSERT OR DELETE ON public.identification_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_proposal_vote_counters();

-- 4.4 Auto-acceptation par consensus
CREATE OR REPLACE FUNCTION public.check_proposal_consensus()
RETURNS trigger AS $$
DECLARE
  total int;
BEGIN
  total := NEW.votes_up + NEW.votes_down;
  IF NEW.status = 'pending' AND NEW.votes_up >= 3 AND total > 0
     AND (NEW.votes_up::numeric / total) >= 0.7 THEN
    NEW.status := 'accepted';
    NEW.accepted_at := now();
    -- accepted_by reste NULL pour signaler "consensus auto"
    UPDATE public.posts SET taxref_id = NEW.taxref_id WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_id_proposal_consensus
  BEFORE UPDATE OF votes_up, votes_down ON public.identification_proposals
  FOR EACH ROW EXECUTE FUNCTION public.check_proposal_consensus();

-- 4.5 RLS
ALTER TABLE public.identification_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identification_votes      ENABLE ROW LEVEL SECURITY;

-- Lecture publique des propositions sur posts publics
CREATE POLICY id_proposals_select ON public.identification_proposals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.posts p
            WHERE p.id = post_id AND p.visibility = 'public' AND p.deleted_at IS NULL)
  );

-- Insert : authentifié, et auth.uid() = author_id
CREATE POLICY id_proposals_insert ON public.identification_proposals
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Update : seulement l'auteur du post (pour accepter manuellement) ou super_admin
CREATE POLICY id_proposals_update_accept ON public.identification_proposals
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.posts p
            WHERE p.id = post_id AND p.user_id = auth.uid())
  );

-- Delete : auteur de la proposition uniquement
CREATE POLICY id_proposals_delete_own ON public.identification_proposals
  FOR DELETE USING (author_id = auth.uid());

-- Votes : 1 vote par user par proposition, modifiable, supprimable
CREATE POLICY id_votes_select ON public.identification_votes
  FOR SELECT USING (true);
CREATE POLICY id_votes_insert ON public.identification_votes
  FOR INSERT WITH CHECK (voter_id = auth.uid());
CREATE POLICY id_votes_update ON public.identification_votes
  FOR UPDATE USING (voter_id = auth.uid());
CREATE POLICY id_votes_delete ON public.identification_votes
  FOR DELETE USING (voter_id = auth.uid());
```

---

## 5. Étapes d'implémentation

| #    | Tâche                                                                                         | Estimation |
| ---- | --------------------------------------------------------------------------------------------- | ---------- |
| T-01 | Migration SQL `YYYYMMDD_identification_phase2.sql` (table votes + triggers + RLS)             | 1 j        |
| T-02 | Regen `src/types/supabase.ts` + types `IdentificationVote`, `IdentificationStatus`            | 0,25 j     |
| T-03 | Étendre `identificationService.ts` : `voteForProposal`, `unvoteForProposal`, `acceptProposal` | 0,5 j      |
| T-04 | Hooks `useIdentifications(postId)`, `useVoteProposal`, `useAcceptProposal`                    | 0,5 j      |
| T-05 | Composant `<IdentificationPanel />` (liste + form propose + boutons vote + accept)            | 2 j        |
| T-06 | Intégration `IdentificationPanel` dans `FeedPost` (tab/section sous photos)                   | 0,5 j      |
| T-07 | Form `<ProposeIdentificationForm />` avec autocomplete TAXREF (réutilise `SpeciesSearch`)     | 1 j        |
| T-08 | Notifications : trigger DB sur insert `identification_proposals` + acceptation                | 0,5 j      |
| T-09 | NotifItem type `identification_proposal` + `identification_accepted` (UI)                     | 0,5 j      |
| T-10 | i18n FR/EN (~25 clés)                                                                         | 0,5 j      |
| T-11 | Tests vitest services + composants (10-15 cas)                                                | 1 j        |
| T-12 | Test E2E Playwright : propose → vote (3 users) → consensus → post mis à jour                  | 0,5 j      |

**Total estimé : ~9 jours dev.**

---

## 6. Tests à prévoir

### Unitaires (vitest)

- `voteForProposal` : `INSERT … ON CONFLICT (proposal_id, voter_id) DO UPDATE` permet de changer son vote.
- `acceptProposal` : seul l'auteur du post peut accepter (RLS rejette les autres).
- Trigger consensus : 3 votes up + 0 down → `status = 'accepted'` automatiquement.
- Trigger consensus : 3 up + 2 down → ratio 60 % → reste `pending`.
- Trigger consensus : si `accepted`, `posts.taxref_id` reflète bien la proposition.

### Intégration

- Insert proposition → notification reçue par l'auteur du post.
- 3 votes up → notification "Ton observation a été identifiée par consensus" + tag espèce visible.
- Auteur supprime sa proposition → votes en cascade supprimés (FK).

### Sécurité (RLS)

- User A crée proposition sur post de B → OK.
- User C tente d'accepter cette proposition → 403.
- User D tente de voter 2 fois pour la même proposition → 2ᵉ insert rejeté (PK).
- Visiteur déconnecté tente de voter → 401.

### E2E (Playwright)

- Scénario complet : poster sans espèce → 3 users proposent + votent → un atteint le consensus → tag espèce s'affiche dans la card feed.

---

## 7. Risques & mitigations

| Risque                                                            | Probabilité | Impact    | Mitigation                                                                                               |
| ----------------------------------------------------------------- | ----------- | --------- | -------------------------------------------------------------------------------------------------------- |
| Brigading (X amis votent en masse pour une fausse identification) | Moyenne     | **Élevé** | Seuil 3 votes minimum + ratio 70 % + log dans `audit_logs` ; review modération admin si abus signalé.    |
| Auto-acceptation déclenchée sur compteur dénormalisé corrompu     | Faible      | Moyen     | Trigger `BEFORE UPDATE OF votes_up, votes_down` recalcule depuis `identification_votes` en cas de doute. |
| Notifications trop bruyantes pour gros contributeur               | Moyenne     | Moyen     | Groupement par post (1 notif "3 nouvelles propositions sur ton post") au lieu de 3 individuelles.        |
| Acceptation manuelle écrase un consensus auto antérieur           | Faible      | Faible    | Accepté = idempotent ; pas de rétractation auto en cas de votes ultérieurs.                              |
| Conflit d'identifications acceptées multiples sur un même post    | Faible      | Moyen     | Trigger : si une proposition passe `accepted`, les autres `pending` de ce post passent `rejected`.       |
| `posts.taxref_id` mis à jour silencieusement sans notif auteur    | Élevée      | Faible    | Trigger d'acceptation déclenche aussi une notification dédiée.                                           |

---

## 8. Performance & éco-conception

| Métrique                               | Cible                                              |
| -------------------------------------- | -------------------------------------------------- |
| Listing propositions d'un post         | < 80 ms p95                                        |
| Vote (insert / delete)                 | < 60 ms p95                                        |
| Bundle JS `<IdentificationPanel />`    | ≤ 8 kB gzip                                        |
| Notifications générées par proposition | 1 (auteur post) + 1 par voteur, groupées à l'heure |

Pas d'animation gratuite, pas de polling — invalidation React Query au vote. Realtime Supabase `subscribe` envisageable Phase 3 si engagement le justifie.

---

## 9. Done when

- [ ] Migration + triggers + RLS testés sur dev + staging.
- [ ] `<IdentificationPanel />` intégré dans `FeedPost`, mock state vert.
- [ ] Workflow E2E complet vert (propose → 3 votes → accept auto → tag espèce visible).
- [ ] Notifications de proposition / acceptation reçues + affichées dans `NotificationsPanel`.
- [ ] Test sécurité : user non-auteur ne peut pas accepter une proposition.
- [ ] i18n FR/EN à parité (~25 clés ajoutées).
- [ ] `npm run lint && npm run test && npm run build` au vert.

---

## Annexe — Décisions clés

**ADR-001 : Consensus = 3 votes up + ratio 70 %.** Compromise entre fluidité (3 votes accessibles dès une vingtaine de users actifs/jour) et fiabilité. Ajustable via constants serveur si la dynamique communautaire le demande.

**ADR-002 : Auteur du post peut accepter manuellement, pas un tiers.** Préserve le contrôle de l'auteur sur sa propre observation. Un admin peut toujours intervenir via `super_admin` RLS bypass.

**ADR-003 : Pas de badge expert en Phase 2.** Nécessiterait un seed de données + un algorithme de réputation justifié. Reporté Phase 3 quand on aura des centaines d'identifications acceptées en base.

**ADR-004 : Une seule proposition acceptée par post.** L'acceptation `auto` ou `manuel` met les autres `pending` en `rejected`. Cohérent avec `posts.taxref_id` unique.

**ADR-005 : Vote = ±1, modifiable.** Évite la complexité d'un système 1-5 étoiles ; modèle Reddit-like familier. Changer son vote = update (pas delete+insert) pour préserver `created_at` initial.
