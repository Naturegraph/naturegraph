# Kickoff — Phase Prélancement V0.0.1 & Stabilisation totale

> Document de démarrage de session. À lire en premier.
> Rôle de la session : **développeur full-stack expert (back, front, devops) + intégration d'outils externes**.
> Sources de vérité : ce fichier + Notion (Bugs & Correctifs, Architecture Overview, Security Architecture) + `PROJECT_MASTER.md`.
> Devise : **Stabilité > Croissance > Communication**. En cas de doute : faire moins, faire simple, demander confirmation.

---

## 0. Règles absolues

- **Un ticket à la fois** — terminer + valider avant le suivant.
- **Jamais inventer une feature** non documentée dans le backlog.
- **Jamais bypasser la RLS** ni une règle de sécurité existante.
- **Migrations forward-only** — ne jamais modifier une migration existante.
- **Confirmation explicite avant toute action irréversible** : DNS, rotation de clé, suppression de données, modification de config externe.
- **Mobile-first non négociable** — tester sur mobile d'abord.
- **TypeScript strict, pas de `any`** ; LCP < 2.5s maintenu ; pas de dépendance JS injustifiée.
- **Style FR** : pas d'em-dash (—) nulle part (règle permanente Nicolas).
- **Flux git** : `develop` → `staging` → `main`. PR + squash. Tag à chaque release. Sync `staging` (ff) + `develop` (ours/read-tree) après merge main.

---

## 1. État du projet au démarrage (2026-06-17)

- **Prod = V1.2.25**. `main = staging = develop` alignés. Migrations appliquées prod + dev.
- **Supabase** : prod `hrxgduvworofnrjmgpcj`, dev `nkgdgxwejqqnqmwqwegy`. Stratégie 3 env (cf. CLAUDE.md).
- **Sécurité données : solide et auditée** (session du 2026-06-16) :
  - RLS active sur toutes les tables `public` (sauf `spatial_ref_sys`, référence PostGIS read-only).
  - Toutes les écritures scellées par `auth.uid()` ou rôle admin (seule exception voulue : insertion waitlist publique).
  - Lectures publiques = référentiel/contenu publié uniquement, aucune donnée perso exposée.
  - Fonctions admin (`is_admin`/`is_super_admin`/`can_moderate`/`current_admin_role`/`admin_set_user_role`) **non appelables par anon**.
  - Liens profil : `https` only + domaine imposé par champ (instagram.com / facebook.com / …) + blocage IDN punycode (`xn--`), front + backend trigger.
- **RBAC** : rôles `super_admin`, `moderator`, `support`, `equipe_produit`, `developpeur` (ce dernier = tag technique, AUCUN accès panneau). Seul Admin.naturegraph (Nicolas) a l'accès admin.

### Déjà livré cette session (réf. tags V1.2.x)

- V1.2.12 crash cloche notifs · V1.2.13 RBAC · V1.2.14 fix RLS anon (feed invité) · V1.2.15 filtre rôle admin/users
- V1.2.16→21 chip espèce long + Tooltip réutilisable · V1.2.22 anti-XSS liens + label · V1.2.23 liens par domaine
- V1.2.24 lock fonctions admin (anon) · V1.2.25 blocage IDN + message "session expirée"

### Bugs & Correctifs (Notion) — tous Résolu

- NG-001 file spoofing : **résidu accepté** (buckets n'autorisent que jpeg/png/webp/mp4 → pas d'exécution de script ; plan edge function magic-bytes prêt pour post-beta).
- NG-002 label « Venteux » : fait. NG-004 XSS / NG-005 RLS cross-profil : fermés.
- NG-003 session : **message "session expirée" livré** ; diagnostic fin du sablier en attente d'une repro (onglet veille/actif ? erreur ~10-16s ou infini ?).

---

## 2. Backlog de lancement — ordre d'exécution

### 🔴 BLOC 1 — Sécurité & Infra (à faire EN PREMIER)

1. **DNS Hostinger** (.ca + .fr) — propagation 24-48h, donc démarrer tôt. A `@ 76.76.21.21`, CNAME `www`, redirect 301 `.fr → .ca`, SPF + DKIM + DMARC + CAA. ⚠️ Action externe = **confirmation Nicolas** (dashboard Hostinger).
2. **Headers de sécurité Vercel** (`vercel.json`) : CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, HSTS, Referrer-Policy, Permissions-Policy. Valider sur securityheaders.com. **(NON fait — bon premier chantier code.)**
3. **File spoofing magic-bytes** (NG-001) : edge function de validation post-upload (fail-open). Chantier testé dédié.
4. **Sécurité GitHub / Vercel / Supabase** : branch protection main+staging, 2FA, Secret Scanning/Dependabot/CodeQL, audit env vars (aucune clé sensible en `VITE_*`, `service_role` serveur only), buckets en signed URLs.

### 🟠 BLOC 2 — Email & Légal (dépend du DNS)

- **NG-009 Email** : Resend (SMTP custom Supabase Auth, sender noreply@naturegraph.ca) + MailerLite (marketing, 4 groupes, séquence J0/J+3/J+7). Templates React Email.
- **NG-010 Légal** : CGU, confidentialité (mentionner Plausible sans cookie), mentions légales v1.0.

### 🟠 BLOC 3 — Produit & Admin

- **Panel admin** complet (7 sections, RLS strict, toute action loggée dans audit_logs + confirmation si irréversible).
- **Pages erreur** 404 / 403 / 500 (noindex, ErrorBoundary + Sentry sur 500).
- **Page maintenance** via flag `app_config.maintenance_mode` (503 + Retry-After ; `/admin` reste accessible).
- **SEO & Open Graph** : og:image dynamique sur les observations (priorité), sitemap, robots.txt.
- **Plausible** analytics (1 script, ~12 events, funnel ; pas de bannière cookie).

### 🟠 BLOC 4 — Validation & Communication

- Test onboarding à froid (5 testeurs), runbooks/plan de crise, com Instagram & Discord, dashboard métriques Notion.

### ⚪ BLOC 5 — Post-lancement

- Audit fonctionnel complet, accessibilité WCAG AA, doc éco-conception.

---

## 3. Contexte technique

```
Front   : React 19 + TS strict + Vite + React Router 7 + Tailwind 4 + SCSS
Back    : Supabase (Postgres + RLS + Storage + Edge Functions)
Auth    : Supabase Auth (OTP + magic link, email-first), JWT 1h (NE PAS modifier)
Hosting : Vercel (main → prod / staging → preview)
DNS     : Hostinger (naturegraph.ca + naturegraph.fr)
Email   : Resend (transactionnel) + MailerLite (marketing)
Analytics: Plausible (privacy-first) · Monitoring : Sentry EU
Pattern : Service (Supabase) → Hook (React Query) → Composant (UI only). Aucun composant ne touche Supabase directement.
```

## 4. Critères de validation (avant de clore un ticket)

- [ ] Testé mobile iOS + Android, Chrome + Safari desktop
- [ ] Aucun `any` TS · RLS non bypassée · pas de dépendance inutile
- [ ] LCP < 2.5s maintenu · Sentry sans nouvelle erreur
- [ ] Revu vs sources de vérité Notion · build + lint + tests verts

## 5. Commandes clés

```bash
npm run build && npx vite-bundle-visualizer
dig naturegraph.ca A +short ; curl -IL https://naturegraph.fr
curl -I https://naturegraph.ca   # headers sécurité
# Test RLS direct : PATCH /rest/v1/profiles?id=eq.<autre_uuid> -> doit échouer
```
