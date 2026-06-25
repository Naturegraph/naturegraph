# Brief de suivi Naturegraph — Prelancement vers entree libre

> Document de handoff pour generer la suite des tickets (agent IA Notion).
> Autonome : tout le contexte necessaire est ici. Date : 2026-06-25.

---

## 1. Contexte produit (etat reel)

- Naturegraph : plateforme web citoyenne de biodiversite. React 19 + TypeScript +
  Vite + Tailwind + SCSS + Supabase (Postgres/RLS/Auth/Storage/Edge Functions).
- **Version prod actuelle : V0.0.4** (tag v0.0.4). Phase : prelancement (soft launch).
- 3 environnements, flux obligatoire `develop -> staging -> main` (PR + squash, sans
  raccourci). Supabase : projet dev (partage develop+staging) + projet prod separe.
- 2 domaines : **naturegraph.ca** (prod publique) ; **naturegraph.fr** redirige en
  HTTPS 308 vers .ca.
- Regles permanentes : TS strict (pas de any), RLS obligatoire, migrations
  forward-only `YYYYMMDD_nom.sql` appliquees manuellement par environnement,
  eco-conception + WCAG AA, pas de tiret cadratin/demi-cadratin, releases avec 2
  notes (technique + user) + validation fondateur avant merge main.
- Pattern feature flags existant : `src/lib/featureFlags.ts` (ex
  `MARKETING_CONSENT_ENABLED=false`, `LABS_ENABLED` hostname-based). A reutiliser
  pour tout changement reversible.

## 2. Ce qui a ete livre (juin 2026, deja en prod sauf mention)

- **Infrastructure email PRO conforme (chemin critique resolu)** :
  - Resend en SMTP custom sur Supabase Auth (prod) : OTP login + invitations partent
    en inbox (DKIM resend.\_domainkey + MX/SPF sous-domaine `send`, coexiste avec le
    DNS MailerLite existant). Rate limit emails 100/h.
  - Reception : boites Hostinger `nicolas@naturegraph.ca` + `support@naturegraph.ca`
    (+ 4 alias) actives.
  - Templates Auth brandes (en-tete violet + logo hermine, footer support@) :
    Magic Link (OTP), Confirm signup, Invite user. Footer ancien gmail corrige.
  - MailerLite : reporte (campagnes marketing post-aout, pas utilise pour le prelancement).
- **Cohorte prelancement 2024** : 104 emails dedupliques (early-birds inscrits il y a
  un an), conserves hors repo (PII, fichier local gitignore). Email d'invitation
  "lettre du fondateur" (excuses pour le delai, sans code) teste et valide.
- **Admin cohorte prelancement** (V0.0.4) : tag `source` (organic/prelaunch) + `wave`
  sur beta_waitlist, import d'emails (dedup + exclusion des comptes existants),
  bascule des inscriptions non terminees, envoi par vagues de 20.
- **RGPD** : consentement marketing (colonnes + trigger horodatage) actuellement
  MASQUE (flag, a reactiver pour le mailing) ; sous-traitants email declares en
  politique de confidentialite ; honeypot anti-bot sur le formulaire waitlist.
- **Securite** : Edge Functions auditees ; `send-waitlist-confirmation` durcie par
  secret partage (code livre, secret a poser en prod) ; advisors prod by-design.
- Releases V0.0.1 -> V0.0.4 documentees dans `docs/devops/releases/`.

## 3. Decision strategique structurante (le coeur de la suite)

**Supprimer totalement la notion de "beta fermee + code d'acces".** On passe a
l'**entree libre** : visiteur sans compte autorise + inscription libre depuis la
landing. Mais en **soft launch** :

- PAS de communication ouverte sur les reseaux sociaux maintenant.
- Base de communication naturelle = la cohorte 2024 (invitations par mail) + les
  curieux qui arrivent organiquement sur naturegraph.ca.
- Vrai lancement public (Instagram + contenu) **apres aout**, apres ~2 mois de test
  facile et d'evolution produit.
- Objectif immediat : **reduire la friction** (un curieux doit pouvoir s'inscrire
  sans code), tout en gardant la **securite conforme** et une coherence de
  messaging (on ne montre plus "test / beta fermee" cote public).

## 4. Roadmap a decliner en tickets avances (epics)

### EPIC A — Ouverture de l'acces (beta fermee -> entree libre)

Objectif : retirer le gate code, ouvrir l'inscription, sans casser la securite.
Implementation reversible via feature flag (ex `OPEN_ACCESS_ENABLED`).
Tickets a prevoir :

- A1. Routing d'entree : naturegraph.ca (non connecte) -> landing page (et non
  l'ecran code `/welcome`). Conserver un acces connexion/inscription clair.
- A2. Desactiver `BetaAccessGuard` (acces app sans code) derriere le flag.
- A3. Signup libre : retirer l'exigence de cle beta au signup (le claim de cle
  devient optionnel ou supprime).
- A4. Quota : ouvrir `accepting_new_signups` ; decider d'un cap de securite ou non
  (cf. decisions). Retirer la redirection automatique vers waitlist si plein.
- A5. Mode visiteur sans compte (guest browsing) : verifier le perimetre lisible
  sans connexion + RLS coherente (lectures publiques uniquement).
- A6. Nettoyage messaging public : retirer "beta privee / fermee / test /
  prelancement" du parcours (welcome, BetaStatusCallout, copies). Garder une
  mention legale "early access, service fourni tel quel" dans CGU/Confidentialite.
- A7. Sort de la waitlist : decider de son role en entree libre (la garder en
  fallback si cap atteint, ou la retirer du parcours public).
- A8. Tests + release prod (flux develop->staging->main, 2 release notes).

### EPIC B — Emails coherents avec la nouvelle phase

- B1. Template d'invitation GENERIQUE (sans le "desole pour le delai d'un an",
  reserve a la cohorte 2024) pour les invitations futures.
- B2. Email de bienvenue post-inscription (onboarding reussi, 1re observation).
- B3. Sequence de relance douce pour invites non convertis (ex J+3, J+7) — a
  cadrer avec MailerLite ou via Supabase selon le volume.
- B4. Templates Change Email + Reauthentication : passer en FR + DA brandee
  (actuellement en anglais/non brandes).
- B5. Coherence de ton : tous les emails alignes sur "early access ouvert", plus
  de "beta fermee".

### EPIC C — Cohorte 2024 + admin a 100%

- C1. Import des 104 + envoi par vagues de 20 (toutes les 2 jours), suivi des
  conversions (invite -> inscrit -> actif).
- C2. Admin cohorte avance (actuellement ~50%) : source distincte (ex `early_2024`)
  pour ne pas melanger, template par cohorte, tableau de suivi avance, relances
  ciblees, export.
- C3. Metriques prelancement : taux d'ouverture/inscription/activation par vague.

### EPIC D — Securite conforme en mode ouvert

- D1. `send-waitlist-confirmation` : poser le secret (Vault `waitlist_trigger_secret`
  - env `WAITLIST_TRIGGER_SECRET`) sur dev ET prod, appliquer la migration trigger
    en prod (remplacer v_url/v_anon_key par prod), redeployer la fonction.
- D2. Anti-abus signup ouvert : rate limiting, honeypot ou captcha leger sur le
  signup public (maintenant qu'il n'y a plus le filtre code).
- D3. Re-audit RLS pour le mode visiteur/guest + inscription ouverte (aucune fuite,
  lectures publiques maitrisees).
- D4. Toggle leaked-password protection (Auth prod, 1 clic).
- D5. Verifier que la policy notifications DELETE est bien appliquee en prod.
- D6. REVOKE EXECUTE sur les fonctions de trigger (reduction de surface, repo public).

### EPIC E — Stabilite MVP & evolution produit (fenetre 2 mois)

- E1. Boucle de feedback : collecter et trier les retours des premiers users.
- E2. Audits eco-conception + accessibilite (budget perf, WCAG AA) sur les parcours cles.
- E3. Corrections de bugs remontes + dette technique (ex nettoyage migrations,
  check Supabase Preview CI qui echoue).

### EPIC F — Preparation du lancement public (post-aout)

- F1. Landing optimisee (conversion, SEO, indexation).
- F2. Onboarding fluide et engageant.
- F3. Reactiver le consentement marketing + MailerLite (campagnes, newsletter).
- F4. Contenu Instagram / strategie de communication.

## 5. Decisions produit a trancher (a integrer dans les tickets)

1. Garde-fou quota en entree libre : cap de securite (ex 500) ou illimite ?
2. Saisie de code d'acces : retrait total, ou conservee en option discrete (VIP/presse) ?
3. Mention legale : conserver une clause "early access / service tel quel" en
   CGU/Confidentialite meme sans la mettre en avant ? (recommande : oui)
4. Waitlist en entree libre : fallback si cap atteint, ou retiree du parcours public ?
5. Sequence de relance (J+3/J+7) : via MailerLite (post-aout) ou via Supabase maintenant ?

## 6. Contraintes techniques a respecter (rappel pour les tickets)

- Changements reversibles via feature flag quand c'est structurel (pattern existant).
- Securite : RLS obligatoire, jamais de service_role cote client, secret jamais
  committe (repo public), PII jamais versionnee.
- Flux release develop -> staging -> main, 2 release notes + validation fondateur.
- Migrations forward-only, appliquees manuellement par environnement (dev puis prod).
- Pas de tiret cadratin/demi-cadratin. TS strict. Eco-conception + WCAG AA.
- Mon MCP technique ne touche que le projet Supabase dev : toute action prod
  (migrations, secrets, toggles Auth) est faite manuellement cote fondateur.
