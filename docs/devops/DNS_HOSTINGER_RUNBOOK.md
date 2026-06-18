# Runbook DNS Hostinger (NG-008)

> Ticket NG-008. Objectif : naturegraph.ca stable en HTTPS, naturegraph.fr redirige
> en 301 vers .ca, et sécurisation DNS (CAA, DNSSEC, DMARC ; SPF/DKIM avec NG-009).
>
> **Action externe** : ce runbook se applique dans le dashboard Hostinger (et Vercel).
> Claude prepare et verifie, Nicolas applique. Confirmation explicite avant chaque
> changement irreversible. Propagation DNS : 1 a 48h, donc demarrer tot.

## Etat actuel constate (diagnostic 2026-06-17)

| Element                 | Valeur observee              | Lecture                                          |
| ----------------------- | ---------------------------- | ------------------------------------------------ |
| `naturegraph.ca` apex A | `216.198.79.1`               | deja sur Vercel, HTTPS repond 200 OK             |
| `www.naturegraph.ca`    | CNAME `cname.vercel-dns.com` | deja correct                                     |
| `naturegraph.fr` apex A | `2.57.91.91`                 | parking Hostinger, PAS de redirection (chantier) |
| MX `naturegraph.ca`     | `dns.hostinger.com` (defaut) | pas d'email pro encore                           |
| SPF / DKIM / DMARC      | absents                      | a configurer (phase 2 avec NG-009)               |

**Consequence importante** : `.ca` est deja branche et fonctionnel. Le ticket NG-008
mentionne l'IP `76.76.21.21` mais Vercel utilise desormais `216.198.79.1` pour ce projet.
**Ne pas modifier l'apex `.ca` qui fonctionne.** Toujours confirmer la valeur exacte dans
Vercel : Settings, Domains (Vercel affiche les enregistrements attendus pour le projet).

---

## Phase 1 : web (a faire maintenant, ne depend de rien)

### 1.1 Confirmer .ca (aucune action si OK)

- [ ] Vercel : Settings, Domains : verifier que `naturegraph.ca` et `www.naturegraph.ca`
      sont listes et "Valid Configuration".
- [ ] Verifier que l'apex A affiche par Vercel correspond bien a la valeur en place
      (`216.198.79.1`). Si Vercel demande une autre valeur, l'aligner ; sinon ne rien toucher.
- [ ] Confirmer le certificat SSL `.ca` valide (cadenas, auto-renouvele).

### 1.2 Rediriger naturegraph.fr vers naturegraph.ca (301)

Deux options. **Recommandee : Option B (via Vercel)** pour un SSL automatique et fiable,
coherent avec l'hebergement Vercel.

**Option B : redirection via Vercel**

- [ ] Vercel : Settings, Domains : ajouter `naturegraph.fr` (et `www.naturegraph.fr`).
- [ ] Configurer la redirection vers `naturegraph.ca` (Redirect to, 308/301 permanent)
      dans Vercel pour `naturegraph.fr`.
- [ ] Hostinger : pointer le DNS de `.fr` vers Vercel, valeurs exactes affichees par Vercel : - `@` (apex) : enregistrement A vers l'IP Vercel indiquee (probablement `216.198.79.1`) - `www` : CNAME vers `cname.vercel-dns.com`
- [ ] Attendre la propagation + emission du certificat SSL `.fr` par Vercel.

**Option A : redirection via Hostinger (fallback, si Option B indisponible)**

- [ ] Hostinger : section Redirects pour `naturegraph.fr` - Source : `naturegraph.fr/*` -> Destination : `https://naturegraph.ca/$1`, type 301 - Idem pour `www.naturegraph.fr`

### 1.3 CAA (les deux domaines)

Limite l'emission de certificats a l'autorite utilisee par Vercel (Let's Encrypt).

- [ ] `naturegraph.ca` : `Type CAA`, `Nom @`, `Valeur : 0 issue "letsencrypt.org"`
- [ ] Idem `naturegraph.fr`
- [ ] Optionnel : ajouter `0 issuewild "letsencrypt.org"` si wildcard un jour.

### 1.4 DNSSEC

- [ ] Verifier si Hostinger propose DNSSEC pour ces TLD (.ca, .fr).
- [ ] Activer sur `.ca` en priorite. Verifier ensuite la chaine (dnssec-analyzer).

### 1.5 DMARC (squelette, ramp progressif)

Commencer en mode observation (`p=none`) pour ne casser aucun mail legitime, puis
durcir vers `quarantine` une fois SPF/DKIM valides en phase 2.

- [ ] `naturegraph.ca` : `Type TXT`, `Nom _dmarc`,
      `Valeur : v=DMARC1; p=none; rua=mailto:dmarc@naturegraph.ca`
- [ ] Idem `naturegraph.fr` (recommande : `p=reject` car aucun mail legitime ne part de .fr).

---

## Phase 2 : email (a faire avec NG-009, depend du choix Resend + MailerLite)

A ne configurer qu'une fois les comptes Resend / MailerLite crees, sinon le SPF sera faux.

- [ ] MX : selon la boite pro retenue (Google Workspace ou Zoho), valeurs fournies par eux.
- [ ] SPF (un seul enregistrement TXT, fusionne) :
      `v=spf1 include:_spf.resend.com include:_spf.mlsend.com ~all`
      (adapter selon les providers finaux ; ne jamais avoir deux TXT SPF separes).
- [ ] DKIM : enregistrements fournis par Resend et MailerLite (TXT/CNAME dedies).
- [ ] Une fois SPF + DKIM verts, passer DMARC `.ca` de `p=none` a `p=quarantine`.

---

## Verification (apres propagation)

```bash
# Resolution
nslookup -type=A naturegraph.ca
nslookup -type=A naturegraph.fr
nslookup -type=CNAME www.naturegraph.ca
nslookup -type=TXT _dmarc.naturegraph.ca

# Redirection .fr -> .ca (doit renvoyer 301/308 + Location https://naturegraph.ca)
curl -I https://naturegraph.fr
curl -I https://www.naturegraph.fr

# HTTPS .ca
curl -I https://naturegraph.ca
```

Outils web : dnschecker.org (propagation mondiale), mail-tester.com (SPF/DKIM/DMARC en phase 2).

---

## Definition of Done (NG-008)

- [ ] `naturegraph.ca` HTTPS, certificat valide (deja OK au diagnostic)
- [ ] `naturegraph.fr` et `www.naturegraph.fr` : 301/308 vers `https://naturegraph.ca`
- [ ] CAA sur les deux domaines
- [ ] DNSSEC active (au moins `.ca`)
- [ ] DMARC en place (`p=none` puis ramp)
- [ ] SPF + DKIM : reportes en phase 2 (NG-009)
- [ ] Renouvellement automatique des domaines actif dans Hostinger
- [ ] Propagation confirmee (dnschecker.org)
