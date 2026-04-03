# Naturegraph — Politique & Roadmap Sécurité

> Audit réalisé le 2026-03-26. À réviser à chaque déploiement majeur.

---

## 1. Philosophie

Naturegraph gère des données sensibles à plusieurs niveaux :

- **Données utilisateurs** : email, localisation, habitudes de sortie
- **Contenus créatifs** : photos, descriptions, observations → **droits d'auteur des utilisateurs**
- **Données biodiversité** : espèces observées (potentiellement sensibles pour la conservation)
- **Données TAXREF** (INPN/MNHN) : attribution CC-BY obligatoire

La sécurité est donc non négociable et doit couvrir : authentification, données, fichiers, API, droits et conformité légale.

---

## 2. État actuel — Corrections appliquées

### ✅ Corrigé (2026-03-26)

| #   | Sévérité    | Fichier                                          | Problème                                                  | Fix                                                                       |
| --- | ----------- | ------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | 🔴 Critique | `src/lib/demoAuth.ts`                            | OTP bypass : tout code 6 chiffres accepté                 | Validation stricte : format + correspondance exacte + expiration          |
| 2   | 🔴 Critique | `supabase/migrations/003_rls_security_fixes.sql` | Media, reactions, comments visibles même sur posts privés | Nouvelle migration avec fonction `can_see_post()` et `can_see_notebook()` |
| 3   | 🟠 Haut     | `src/components/home/HomeNavbar.tsx`             | Injection URL via lat/lon (concat de chaîne)              | API `URL` + validation de bornes WGS84                                    |
| 4   | 🟠 Haut     | `src/components/contribute/MediaUploader.tsx`    | Aucune vérification de taille ou type MIME réel           | Validation MIME whitelist + limite 10 Mo + feedback utilisateur           |
| 5   | 🟡 Moyen    | `src/components/contribute/TagInput.tsx`         | Tags sans limite de longueur ni validation de caractères  | Regex Unicode + limite 32 chars                                           |
| 6   | 🟡 Moyen    | `src/contexts/AuthContext.tsx`                   | Erreurs Supabase exposées brutes à l'utilisateur          | `sanitizeAuthError()` : mapping vers messages génériques                  |
| 7   | 🟡 Moyen    | `src/contexts/AuthContext.tsx`                   | Pas de rate limiting sur signUp/signIn                    | Rate limiting côté client : 30s OTP, 5s login                             |
| 8   | 🟡 Moyen    | `src/contexts/AuthContext.tsx`                   | Session jamais rafraîchie après expiration serveur        | Refresh automatique toutes les 30 min                                     |
| 9   | 🟡 Moyen    | `src/contexts/AuthContext.tsx`                   | signOut ne gère pas les erreurs réseau                    | Force la déconnexion locale en cas d'échec                                |
| 10  | 🟡 Moyen    | `index.html`                                     | Pas de Content Security Policy                            | CSP + X-Frame-Options ajoutés                                             |

---

## 3. Roadmap sécurité — À implémenter avant production

### 3.1 Infrastructure (Priorité P0 — Bloquant pour prod)

#### Rate Limiting serveur

```
Supabase Edge Function ou Cloudflare Workers :
  - Max 5 tentatives OTP par email / 10 min
  - Max 10 signIn par IP / heure
  - Max 100 requêtes API par user / minute
```

#### HTTPS + HSTS

```nginx
# Nginx / Vercel config
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
add_header X-Content-Type-Options "nosniff";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Permissions-Policy "geolocation=(self), camera=(), microphone=()";
```

#### CSP en headers HTTP (remplacer le meta)

```
# En production, les headers HTTP > meta CSP
# Activer via vercel.json ou Nginx
Content-Security-Policy: default-src 'self'; ...
```

#### Supabase Storage — bucket policies

```sql
-- bucket "post-media" : authentifié seulement
-- bucket "avatars"    : public en lecture, authentifié en écriture
-- Taille max : 10 Mo
-- Types autorisés : image/jpeg, image/png, image/webp
-- Configurer dans la console Supabase → Storage → Policies
```

### 3.2 Validation côté serveur (P0)

> **Règle absolue** : Ne jamais faire confiance aux validations client uniquement.
> Tout ce qui est validé en JS doit aussi l'être côté serveur (Supabase functions ou triggers).

#### Validation des uploads (magic number)

```typescript
// Supabase Storage Hook (Edge Function)
// Vérifier les en-têtes binaires du fichier (pas juste le MIME type)
// JPEG : FF D8 FF
// PNG  : 89 50 4E 47
// WebP : 52 49 46 46 ... 57 45 42 50
```

#### Validation du contenu textuel

```sql
-- Trigger PostgreSQL sur posts.description
CREATE OR REPLACE FUNCTION validate_post_content()
RETURNS TRIGGER AS $$
BEGIN
  IF LENGTH(NEW.description) > 5000 THEN
    RAISE EXCEPTION 'Description trop longue';
  END IF;
  -- Autres validations...
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3.3 Protection des droits d'auteur utilisateurs (P1)

C'est un point critique pour Naturegraph : les photos/observations appartiennent à leurs auteurs.

#### Métadonnées de propriété

```sql
-- Déjà en place via user_id + RLS
-- À ajouter dans media : copyright_notice, license
ALTER TABLE public.media
  ADD COLUMN copyright_notice TEXT,    -- Ex: "© 2026 Alice Martin"
  ADD COLUMN license TEXT DEFAULT 'all-rights-reserved';
  -- Valeurs possibles : 'all-rights-reserved', 'cc-by', 'cc-by-nc', etc.
```

#### Mentions légales dans l'UI

- Afficher "© Auteur" sous chaque photo dans le feed
- CGU claire : "tes photos t'appartiennent, tu accordes à Naturegraph une licence d'affichage"
- Export des données utilisateur (RGPD Art. 20 — portabilité)
- Droit à l'effacement (RGPD Art. 17) : suppression compte = suppression médias

#### Watermarking (optionnel, futur)

```
Pour les photos dans le feed public : watermark discret "via Naturegraph"
Ne pas watermarker les exports utilisateur (leurs propres données)
```

### 3.4 Protection des données espèces sensibles (P1)

Certaines espèces sont sensibles : coordonnées GPS exactes ne doivent pas être publiques
(risque de braconnage, de perturbation des nids/terriers).

```sql
-- Floutage automatique des coordonnées pour espèces protégées
-- À implémenter via trigger + table de référence TAXREF
CREATE TABLE public.sensitive_species (
  cd_nom INTEGER PRIMARY KEY,  -- ID TAXREF
  protection_level TEXT,       -- 'national', 'regional', 'uicn_cr', etc.
  coordinate_precision INTEGER DEFAULT 10000  -- Précision en mètres (10 km par défaut)
);

-- Trigger sur posts : flouter les coordonnées si espèce sensible
CREATE OR REPLACE FUNCTION blur_sensitive_coordinates()
RETURNS TRIGGER AS $$
DECLARE
  precision_m INTEGER;
BEGIN
  SELECT coordinate_precision INTO precision_m
  FROM public.sensitive_species
  WHERE cd_nom = NEW.taxref_cd_nom;

  IF FOUND THEN
    -- Arrondir lat/lon à la précision définie
    NEW.latitude  := ROUND(NEW.latitude::numeric,
      CASE WHEN precision_m >= 10000 THEN 1 ELSE 3 END);
    NEW.longitude := ROUND(NEW.longitude::numeric,
      CASE WHEN precision_m >= 10000 THEN 1 ELSE 3 END);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3.5 RGPD (P1)

| Obligation                     | État          | Action                                           |
| ------------------------------ | ------------- | ------------------------------------------------ |
| Consentement cookies           | ❌            | Ajouter bannière cookies                         |
| Politique de confidentialité   | ✅ `/privacy` | Vérifier exhaustivité                            |
| Droit d'accès (Art. 15)        | ❌            | Page "Mes données" dans le profil                |
| Droit à l'effacement (Art. 17) | ❌            | Bouton "Supprimer mon compte" + cascade SQL      |
| Portabilité (Art. 20)          | ❌            | Export JSON de toutes les données utilisateur    |
| Délégué protection données     | ❌            | Désigner ou documenter l'absence (TPE exemption) |
| Registre des traitements       | ❌            | Document interne obligatoire                     |

### 3.6 Monitoring & Alertes (P2)

```
À configurer dans Supabase ou via un service externe (Sentry, Datadog) :
  - Alertes : > 50 tentatives OTP échouées / heure / IP
  - Alertes : signIn avec des IPs géographiquement incohérentes
  - Logs : toutes les actions de modération (bannissement, suppression)
  - Logs : accès aux données sensibles (espèces protégées)
  - Rétention des logs : 90 jours minimum (recommandation CNIL)
```

### 3.7 Nonce CSP pour supprimer 'unsafe-inline' (P2)

Le script d'init thème dans `index.html` (anti-FOUC) nécessite actuellement `'unsafe-inline'`.

```
Solution : générer un nonce côté serveur et l'injecter dans le script tag.
Vite (production) : utiliser vite-plugin-csp ou Vercel Edge Middleware.
```

---

## 4. Tableau de bord sécurité

### Score actuel (estimation OWASP Top 10)

| Catégorie OWASP               | Statut       | Notes                                             |
| ----------------------------- | ------------ | ------------------------------------------------- |
| A01 Broken Access Control     | 🟡 Partiel   | RLS en place, floutage espèces manquant           |
| A02 Cryptographic Failures    | 🟢 OK        | Supabase gère TLS + chiffrement at-rest           |
| A03 Injection                 | 🟢 OK        | React échappe, Supabase paramétrisé, tags validés |
| A04 Insecure Design           | 🟡 Partiel   | Rate limiting côté client seulement               |
| A05 Security Misconfiguration | 🟡 Partiel   | CSP ajouté, headers HTTP à configurer en prod     |
| A06 Vulnerable Components     | ❓ À auditer | `npm audit` à exécuter régulièrement              |
| A07 Auth Failures             | 🟢 OK        | OTP strict, rate limiting, session refresh        |
| A08 Software Integrity        | 🟡 Partiel   | Pas de SRI sur les assets externes                |
| A09 Logging/Monitoring        | 🔴 Manquant  | Aucun monitoring en place                         |
| A10 SSRF                      | 🟢 OK        | URL Nominatim construite via API URL + validation |

### Actions prioritaires

```
P0 (Bloquant prod) :
  [ ] Rate limiting serveur (Supabase Edge Functions)
  [ ] Headers HTTP sécurité (Vercel/Nginx)
  [ ] Bucket policies Supabase Storage
  [ ] Validation magic number côté serveur

P1 (Avant lancement public) :
  [ ] Mentions © dans l'UI (photos, posts)
  [ ] Floutage coordonnées espèces sensibles
  [ ] Page "Supprimer mon compte" (RGPD Art. 17)
  [ ] Export données utilisateur (RGPD Art. 20)
  [ ] Bannière cookies + consentement

P2 (Post-lancement) :
  [ ] Monitoring alertes (Sentry / Supabase logs)
  [ ] Nonce CSP (supprimer 'unsafe-inline')
  [ ] Audit de sécurité externe (pentest)
  [ ] Bug bounty program
  [ ] npm audit automatisé en CI/CD
```

---

## 5. Gestion des droits TAXREF / INPN

Les données taxonomiques proviennent du TAXREF (Muséum National d'Histoire Naturelle).

**Obligations légales :**

- Attribution obligatoire : _"Données issues du TAXREF, © INPN/MNHN, licence CC-BY"_
- Ne pas modifier les identifiants `cd_nom` — ils sont la source de vérité
- Mise à jour annuelle recommandée (nouvelle version TAXREF chaque année)
- Ne pas redistribuer TAXREF comme base de données autonome

**Implémentation actuelle :**

- Attribution affichée dans `SpeciesSearch.tsx` ✅
- `cd_nom` préservés dans les mocks ✅
- Lien vers INPN en production à ajouter dans les fiches espèce ❌

---

## 6. Contacts & Responsabilités

| Rôle                 | Contact                           |
| -------------------- | --------------------------------- |
| Responsable sécurité | Nicolas (fondateur)               |
| DPO (si désigné)     | À définir                         |
| Signalement faille   | security@naturegraph.fr (à créer) |

**En cas de faille détectée :**

1. Ne pas divulguer publiquement avant correction
2. Contacter security@naturegraph.fr
3. Délai de correction : 72h pour critique, 7j pour haute, 30j pour moyenne
4. Notification CNIL si brèche affectant des données personnelles (obligation RGPD dans les 72h)

---

_Document maintenu par l'équipe technique Naturegraph. Dernière mise à jour : 2026-03-26._
