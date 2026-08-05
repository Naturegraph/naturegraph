# Passe complète des tickets Notion, 2026-08-04

> Revue ticket par ticket de NG-001 à NG-074 : analyse vs code/prod réel, verdict,
> mise à jour du statut + note datée dans Notion. Cette passe met la base Notion au
> niveau de la réalité pour attaquer ensuite le vrai travail sur ce qui reste.

## Bilan des changements de statut

**Passés en Résolu ce jour (6)** : NG-009 (identification, livré par NG-049),
NG-010 (commentaires, livré par NG-049), NG-023 (fichier présent au repo),
NG-031 (campagne cohorte close par décision + outillage 100%), NG-044 (livré via
NG-045 E8), NG-045 (8 emails live en prod).

**Avancés Analyse → En cours (2, gros progrès session)** : NG-060 (refresh manuel :
cause racine corrigée V0.6.9), NG-061 (Sentry observabilité active : ~80% fait,
reste alertes/dashboard différés).

**Nouveau → Analyse (1)** : NG-052 (bug publication : symptôme de NG-060,
probablement corrigé + désormais capturé Sentry, à vérifier).

## Reste ouvert = le VRAI backlog (pour la phase de travail)

| Ticket          | Titre court                           | Statut   | Nature                                         |
| --------------- | ------------------------------------- | -------- | ---------------------------------------------- |
| NG-007          | Hardening CI/CD                       | En cours | bloquant = Preview→base prod (dépend NG-059)   |
| NG-009          | Infra Email Pro                       | En cours | transac livré ; MailerLite = août              |
| NG-010          | Documents légaux                      | En cours | Fondateur (contenu) ; technique en place       |
| NG-011          | Comm Instagram/Discord                | En cours | plan créé ; exécution Fondateur                |
| NG-013          | SEO                                   | En cours | reste og:image dynamique + Search Console      |
| NG-014 / NG-020 | Analytics/métriques                   | Analyse  | pivot Vercel Analytics ; goals custom à faire  |
| NG-016          | Plan de crise                         | Analyse  | runbook rédigé ; tests Fondateur               |
| NG-017          | Audit a11y                            | Analyse  | audit partiel fait ; audit complet reste       |
| NG-018          | Éco-conception                        | Analyse  | audit technique OK ; page publique + doc       |
| NG-019          | Panel Admin                           | En cours | construit ; test-pass Fondateur                |
| NG-022          | Page maintenance                      | Analyse  | **à construire** (rien en code)                |
| NG-027 / NG-028 | Séparation /app + francisation routes | Analyse  | gros chantier navigation, Post-août            |
| NG-033          | Epic E stabilité                      | Analyse  | épic de suivi soft launch (actif)              |
| NG-034          | Epic F lancement public               | Analyse  | jalon Post-août (gated)                        |
| NG-035          | Observabilité Resend                  | En cours | webhooks OK ; Postmaster Fondateur             |
| NG-038          | Support & légal                       | En cours | consentement prod OK ; reste Fondateur         |
| NG-050          | Backup hors site 3-2-1                | Analyse  | miroir local OK ; copie R2 à faire (Post-août) |
| NG-051          | Traductions 224 clés                  | Analyse  | vrai bug i18n ; avant comm EN                  |
| NG-052          | Bug publication                       | Analyse  | symptôme NG-060, à vérifier Sentry             |
| NG-053          | Viewer images mobile                  | Nouveau  | quick-win UI                                   |
| NG-054          | Lien partagé public                   | Nouveau  | retirer guard auth sur obs/profil              |
| NG-055          | Types habitat                         | Nouveau  | quick-win select + décisions Fondateur         |
| NG-056          | Localisation parcs                    | Analyse  | data + décisions Fondateur                     |
| NG-057          | Espèces marines GBIF                  | Analyse  | import data + décisions Fondateur              |
| NG-059          | Migrations doublons                   | Analyse  | **dette clé** : bloque CI Preview + tests      |
| NG-060          | Refresh manuel                        | En cours | cause corrigée ; validation terrain 30j        |
| NG-061          | Sentry actif                          | En cours | ~80% ; reste alertes + dashboard               |
| NG-062          | Suite de tests                        | Analyse  | infra partielle ; bloqué NG-059                |
| NG-063          | Onboarding reprise                    | Analyse  | abandon/zombies à gérer                        |
| NG-064          | Recherche espèces                     | Analyse  | cœur livré V0.4.5 ; reste UX zéro-résultat     |
| NG-065          | Qualité données                       | Analyse  | validations naturalistes à la publication      |
| NG-070          | Dependabot react-router               | Analyse  | **N/A** (SPA, pas de RSC) ; Post-août          |
| NG-071          | Régénérer types Supabase              | Nouveau  | dette-technique (retirer as any)               |
| NG-072          | Purger code mort helpOnly             | Nouveau  | dette-technique                                |
| NG-073          | Resync staging                        | Nouveau  | **reset requis** (historique divergé)          |
| NG-074          | CI Supabase Preview                   | Nouveau  | confirmé KO ; dépend NG-059                    |

## Résolu confirmés (statut conforme, aucune action)

NG-001 à NG-006, NG-007 (refonte auth), NG-008 (x2), NG-011 (stabilisation),
NG-012, NG-021, NG-024, NG-025, NG-026, NG-029, NG-030, NG-032, NG-036, NG-037,
NG-039, NG-041, NG-042, NG-043, NG-046, NG-047, NG-048, NG-049, NG-058,
NG-066, NG-067, NG-068, NG-069.

## Fils rouges qui ressortent de la passe

1. **NG-059 (migrations à versions uniques)** est le nœud : il bloque NG-062
   (tests RLS), NG-074 (CI Preview) et le cloisonnement Preview→dev de NG-007.
   C'est le premier vrai chantier technique à débloquer.
2. **NG-060 / NG-052 (refresh manuel)** : gros progrès cette session, à valider
   en conditions réelles via Sentry avant de clore.
3. Beaucoup d'items ouverts sont **action-fondateur** (contenu légal, Postmaster,
   Instagram, décisions produit) : à séparer du travail code.
