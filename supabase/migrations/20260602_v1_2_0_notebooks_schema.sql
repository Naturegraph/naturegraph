-- ============================================================================
-- V1.2.0 - Carnets d observations (NG-005 + NG-006)
-- ============================================================================
-- Objectif :
--   Refonte des tables "notebooks" + "notebook_observations" pour supporter
--   le concept de carnet d observations persistant tel que decrit dans :
--     - NG-005 : multi-especes par sortie terrain, 1 carnet = 1 post enrichi
--     - NG-006 : mode terrain dedie, sauvegarde permanente, statuts (brouillon,
--                actif, termine, publie, archive), reutilisation intelligente
--
-- Le schema existant (preliminaire, 0 lignes en dev/prod) ne correspondait pas
-- a la cible : il modelisait "carnet = collection de POSTS existants" alors que
-- NG-005/006 imposent "carnet = collection d especes (count + classe taxo) qui
-- produit 1 seul post unifie a la publication".
--
-- Cette migration :
--   1. Drop les 2 tables vides existantes (notebooks + notebook_observations)
--   2. Recree les 2 tables avec le schema cible (timer, status, location,
--      compteurs denormalises, metadata jsonb extensible V1.3.0)
--   3. Ajoute la colonne posts.notebook_id (nullable, FK SET NULL)
--   4. Active RLS owner-only sur les 2 tables
--   5. GRANT EXECUTE / SELECT minimal pour anon/authenticated
--   6. Triggers PostgreSQL pour maintenir notebooks.species_count +
--      observations_count (jamais cote client, regle d arch projet)
--   7. Index de perf pour les lookups frequents (user_id+status, post_id)
--
-- A appliquer manuellement sur naturegraph-dev d abord. Jamais en prod tant
-- que Nicolas n a pas valide la V1.2.0 complete.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop tables existantes (vides, aucune dependance externe verifiee)
-- ---------------------------------------------------------------------------
drop table if exists public.notebook_observations cascade;
drop table if exists public.notebooks cascade;

-- ---------------------------------------------------------------------------
-- 2. Table notebooks : 1 ligne = 1 carnet / 1 sortie terrain
-- ---------------------------------------------------------------------------
create table public.notebooks (
  id uuid primary key default gen_random_uuid(),

  -- Auteur du carnet (RLS : owner-only en lecture/ecriture sauf si publie)
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- Titre libre (ex : "Foret du Mont-Royal"). Saisi a la publication
  -- (peut etre null en mode brouillon).
  title varchar(120),

  -- Description courte optionnelle (recap de la sortie).
  description text,

  -- Statut du carnet (NG-006) :
  --   draft     : en cours de saisie, brouillon local + sync
  --   active    : sortie en cours sur le terrain (timer demarre)
  --   finished  : sortie finalisee, en attente de publication
  --   published : carnet publie, un post existe (post_id non null)
  --   archived  : conservation historique, ne s affiche plus dans le feed
  status varchar(20) not null default 'draft'
    check (status in ('draft','active','finished','published','archived')),

  -- Timer mode terrain (NG-006 exemple "Debut : 08h14")
  started_at timestamptz,
  finished_at timestamptz,

  -- Localisation (denormalisee comme posts pour requetes geo directes)
  latitude numeric(10,7),
  longitude numeric(10,7),
  location_name varchar(255),
  city varchar(100),
  region varchar(100),
  country varchar(100),

  -- Lien vers le post publie (1 carnet -> 1 post). SET NULL si le post est
  -- supprime, on conserve le carnet (l user peut republier).
  post_id uuid references public.posts(id) on delete set null,

  -- Compteurs denormalises maintenus par triggers (regle CLAUDE.md)
  species_count int not null default 0,         -- nb d especes uniques
  observations_count int not null default 0,    -- somme des individuals_count

  -- Extensibilite V1.3.0 (sexe, stade vie, comportement, certitude...)
  -- Stocke en jsonb pour eviter une migration de schema future.
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notebooks is
  'Carnets d observations (NG-005/006). 1 carnet = 1 sortie terrain multi-especes. Publication produit 1 post unique avec posts.notebook_id non null. Statuts : draft, active, finished, published, archived.';

comment on column public.notebooks.metadata is
  'Champ extensible pour fonctionnalites Premium V1.3.0+ (meteo, duree, donnees avancees).';

-- ---------------------------------------------------------------------------
-- 3. Table notebook_observations : 1 ligne = 1 espece dans un carnet
--    (avec count individus + classe taxo pour regroupement UI)
-- ---------------------------------------------------------------------------
create table public.notebook_observations (
  id uuid primary key default gen_random_uuid(),

  notebook_id uuid not null references public.notebooks(id) on delete cascade,

  -- Reference espece via TAXREF/iNat (deja le pattern utilise sur posts)
  taxref_id varchar(50) not null,
  species_name varchar(255) not null,     -- nom vernaculaire affiche
  scientific_name varchar(255),           -- nom scientifique (Capreolus capreolus)

  -- Classe taxonomique pour regroupement automatique (NG-005)
  -- Ex : "Mammiferes", "Oiseaux", "Insectes", "Reptiles"...
  -- Source : taxonomy_nodes.vernacular_name niveau "Classe" via lookup au moment
  -- de l ajout. Stocke en denormalise pour eviter un join au render du feed.
  vernacular_class varchar(100),

  -- Nombre d individus de l espece observee (default 1, min 1)
  individuals_count int not null default 1 check (individuals_count >= 1),

  -- Horodatage de l observation (NG-006 : sortie progressive). Default = now()
  -- pour les ajouts en mode actif. Peut etre edite par l user en post-prod.
  observed_at timestamptz not null default now(),

  -- Notes libres optionnelles (comportement, lieu precis, contexte...)
  notes text,

  -- Ordre d ajout dans le carnet (pour conservation de l ordre chronologique
  -- ET pour reordonner manuellement dans l UI si besoin)
  rank int not null default 0,

  created_at timestamptz not null default now(),

  -- Une espece n apparait qu une fois par carnet (on incremente individuals_count
  -- au lieu de creer une 2eme ligne). Garantit la coherence des compteurs.
  unique (notebook_id, taxref_id)
);

comment on table public.notebook_observations is
  'Observations d especes attachees a un carnet. 1 ligne par espece (avec count individus). Categorisation automatique via vernacular_class.';

-- ---------------------------------------------------------------------------
-- 4. Ajout posts.notebook_id (lien post <- carnet d origine)
-- ---------------------------------------------------------------------------
alter table public.posts
  add column if not exists notebook_id uuid
    references public.notebooks(id) on delete set null;

comment on column public.posts.notebook_id is
  'Si non null, ce post est issu de la publication d un carnet d observations (V1.2.0). Le feed affiche alors une carte enrichie avec la liste categorisee des especes via JOIN notebook_observations.';

-- ---------------------------------------------------------------------------
-- 5. Index de performance
-- ---------------------------------------------------------------------------
-- Lookup principal : "mes carnets en cours" sur l onglet Profil > Carnets
create index notebooks_user_status_idx
  on public.notebooks (user_id, status, updated_at desc);

-- Lookup du carnet actif au boot (recovery NG-006)
create index notebooks_active_per_user_idx
  on public.notebooks (user_id)
  where status in ('draft','active');

-- Lookup feed : retrouver le carnet d un post publie
create index notebooks_post_id_idx
  on public.notebooks (post_id)
  where post_id is not null;

-- Lookup observations d un carnet (affichage liste)
create index notebook_observations_notebook_idx
  on public.notebook_observations (notebook_id, rank);

-- Lookup post -> carnet (PostCard feed)
create index posts_notebook_id_idx
  on public.posts (notebook_id)
  where notebook_id is not null;

-- ---------------------------------------------------------------------------
-- 6. Triggers : maintien compteurs denormalises + updated_at
-- ---------------------------------------------------------------------------

-- updated_at automatique sur notebooks
create or replace function public.notebooks_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger notebooks_set_updated_at_trg
  before update on public.notebooks
  for each row execute function public.notebooks_set_updated_at();

-- Recalcul species_count + observations_count apres mutation des observations
create or replace function public.notebooks_recalc_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  -- Cible : nouvelle ligne si INSERT/UPDATE, ancienne si DELETE
  if tg_op = 'DELETE' then
    target_id := old.notebook_id;
  else
    target_id := new.notebook_id;
  end if;

  update public.notebooks n
     set species_count = (
           select count(*)::int
             from public.notebook_observations
            where notebook_id = target_id
         ),
         observations_count = coalesce((
           select sum(individuals_count)::int
             from public.notebook_observations
            where notebook_id = target_id
         ), 0),
         updated_at = now()
   where n.id = target_id;

  -- Cas particulier UPDATE qui change le notebook_id (rare mais safe)
  if tg_op = 'UPDATE' and new.notebook_id <> old.notebook_id then
    update public.notebooks n
       set species_count = (
             select count(*)::int
               from public.notebook_observations
              where notebook_id = old.notebook_id
           ),
           observations_count = coalesce((
             select sum(individuals_count)::int
               from public.notebook_observations
              where notebook_id = old.notebook_id
           ), 0),
           updated_at = now()
     where n.id = old.notebook_id;
  end if;

  return null;
end;
$$;

create trigger notebook_observations_recalc_trg
  after insert or update or delete on public.notebook_observations
  for each row execute function public.notebooks_recalc_counts();

-- ---------------------------------------------------------------------------
-- 7. RLS owner-only (sauf lecture publique des carnets publies via posts)
-- ---------------------------------------------------------------------------
alter table public.notebooks enable row level security;
alter table public.notebook_observations enable row level security;

-- notebooks : owner peut tout faire sur ses carnets
create policy notebooks_owner_all
  on public.notebooks
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- notebooks : lecture publique uniquement si le carnet est publie
-- (utilise par le feed pour afficher la carte enrichie sur un post notebook)
create policy notebooks_public_read_published
  on public.notebooks
  for select
  to anon, authenticated
  using (status = 'published' and post_id is not null);

-- notebook_observations : owner peut tout faire sur ses observations
create policy notebook_observations_owner_all
  on public.notebook_observations
  for all
  to authenticated
  using (
    exists (
      select 1 from public.notebooks n
       where n.id = notebook_observations.notebook_id
         and n.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.notebooks n
       where n.id = notebook_observations.notebook_id
         and n.user_id = (select auth.uid())
    )
  );

-- notebook_observations : lecture publique des observations d un carnet publie
-- (necessaire pour afficher la liste categorisee dans la carte feed)
create policy notebook_observations_public_read_published
  on public.notebook_observations
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.notebooks n
       where n.id = notebook_observations.notebook_id
         and n.status = 'published'
         and n.post_id is not null
    )
  );

-- ---------------------------------------------------------------------------
-- 8. GRANTs minimaux
-- ---------------------------------------------------------------------------
grant select on public.notebooks to anon, authenticated;
grant insert, update, delete on public.notebooks to authenticated;

grant select on public.notebook_observations to anon, authenticated;
grant insert, update, delete on public.notebook_observations to authenticated;

-- Sequence USAGE n est pas necessaire ici (uuid via gen_random_uuid).

-- Fin migration V1.2.0 carnets
