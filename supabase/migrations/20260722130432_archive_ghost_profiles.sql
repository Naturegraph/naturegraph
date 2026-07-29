-- Archive des profils fantomes supprimes (invitations jamais activees)
-- =============================================================================
-- Nom de fichier au format horodate complet (YYYYMMDDHHMMSS) et non YYYYMMDD :
-- il correspond exactement a la version enregistree en production, ce qui evite
-- tout rejeu. C'est aussi la convention cible de NG-059, la convention par date
-- seule ayant produit 26 collisions de prefixe.
--
-- Contexte : 71 profils avaient ete crees automatiquement lors de la phase
-- d'invitation (close definitivement le 2026-07-21). Leurs destinataires n'ont
-- JAMAIS active leur compte : aucune connexion, aucune publication, aucune
-- reaction, aucun abonnement, aucun media. Ils apparaissaient pourtant comme
-- profils publics consultables sans connexion, avec bouton d'abonnement.
-- Personne n'avait consenti a cette presence publique.
--
-- Pourquoi archiver AVANT de supprimer : `email_send_log.user_id` est en
-- ON DELETE CASCADE vers profiles. Supprimer les profils effacait 71 lignes du
-- journal d'envois, soit 35 % de l'historique. Or ce journal est la preuve de ce
-- qui a ete envoye et a qui : c'est lui qui protege en cas de plainte au titre
-- de la Loi 25 ou de CASL. On le sort donc du cascade.
--
-- Trois profils au pseudo auto-genere ont ete VOLONTAIREMENT EPARGNES : ils
-- s'etaient reellement authentifies (email confirme, connexion effective) et
-- avaient seulement abandonne l'onboarding. Ce sont de vraies personnes.
--
-- Table interne : RLS active SANS policy = tout refuse sauf service_role.
-- Elle contient des adresses email, elle ne doit jamais etre lisible par l'app.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ghost_profiles_archive (
  id uuid PRIMARY KEY,
  email text,
  username text,
  profile_created_at timestamptz,
  emails_envoyes jsonb,
  archived_at timestamptz NOT NULL DEFAULT now(),
  motif text NOT NULL DEFAULT 'Invitation jamais activee, suppression 2026-07-22'
);

ALTER TABLE public.ghost_profiles_archive ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.ghost_profiles_archive IS
  'Trace des profils fantomes supprimes le 2026-07-22. Conserve le journal des emails envoyes, sinon perdu par le CASCADE sur email_send_log. Ne jamais exposer a l app.';

-- Note : le remplissage de la table et la suppression des 71 profils (dans
-- public.profiles ET auth.users, qui ne sont lies par AUCUNE cle etrangere) ont
-- ete effectues comme operation de donnees ponctuelle, pas dans cette migration.
-- Resultat verifie : 122 -> 51 profils non internes, 0 orphelin des deux cotes.
