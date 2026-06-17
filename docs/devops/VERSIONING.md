# Norme de Versioning Naturegraph

> Ticket NG-025 (lie a NG-024). Decision fondateur, en vigueur a partir de V0.0.1.
> Source de verite pour la numerotation des versions, les commits, les tags et les releases.
> Complete le `RELEASE_PROCESS.md` (workflow de mise en prod) : ici = la norme, la-bas = le process.

---

## 1. Semantic Versioning (SemVer)

```
V MAJEUR . MINEUR . PATCH
```

| Segment | Quand l'incrementer                                      | Exemple          |
| ------- | -------------------------------------------------------- | ---------------- |
| MAJEUR  | Refonte majeure, rupture de compatibilite, pivot produit | V1.0.0 -> V2.0.0 |
| MINEUR  | Nouvelle fonctionnalite stable, ajout significatif       | V0.1.0 -> V0.2.0 |
| PATCH   | Bug fix, correctif, quick win, contenu                   | V0.0.1 -> V0.0.2 |

Regle simple :

- Un bug corrige -> PATCH
- Une feature ajoutee -> MINEUR
- Une refonte ou rupture -> MAJEUR

### Note sur la renumerotation V0.0.x (2026-06-17)

Le projet a porte des tags internes `v1.x` (jusqu'a `v1.2.25`) durant la phase de
construction. Ces tags restent dans l'historique git a titre de trace du churn de
developpement. La phase de prelancement public repart volontairement a **V0.0.1**
(MVP valide, base propre) pour donner une numerotation lisible orientee lancement :
`V0.0.x` (prelancement) -> `V0.1.0` (lancement public) -> `V1.0.0` (produit stable).
Le `package.json` est la source de verite affichee (footer des reglages).

---

## 2. Jalons prevus

| Version | Contenu cible                                                     |
| ------- | ----------------------------------------------------------------- |
| V0.0.1  | MVP valide, base propre (actuel)                                  |
| V0.0.2  | Correctifs securite (NG-003, NG-006, NG-007)                      |
| V0.0.3  | Infrastructure email + DNS + legal (NG-008, NG-009, NG-010)       |
| V0.0.4  | Admin panel + pages erreur + maintenance (NG-019, NG-021, NG-022) |
| V0.0.5  | SEO + Analytics + Open Graph (NG-013, NG-020)                     |
| V0.1.0  | Lancement public (tous les tickets bloquants resolus)             |
| V0.2.0  | Post-lancement : accessibilite + eco-conception + metriques       |
| V1.0.0  | Produit stable et etabli (a definir)                              |

---

## 3. Conventional Commits

Format :

```
type(scope): description courte
```

Exemples :

```
fix(auth): corriger le renouvellement du refresh_token
feat(admin): ajouter la gestion des signalements
security(upload): valider les magic bytes cote backend
docs(legal): mettre a jour la politique de confidentialite v1.0
chore(deps): mettre a jour les dependances
perf(feed): optimiser la pagination des observations
```

| Type       | Usage                                       |
| ---------- | ------------------------------------------- |
| `fix`      | Correction de bug                           |
| `feat`     | Nouvelle fonctionnalite                     |
| `security` | Correctif securite                          |
| `perf`     | Amelioration de performance                 |
| `docs`     | Documentation                               |
| `chore`    | Maintenance, dependances                    |
| `style`    | UI, design, tokens                          |
| `refactor` | Refactoring sans changement de comportement |
| `test`     | Ajout ou modification de tests              |

Adopte des la prochaine session Claude Code.

---

## 4. Tags Git

```bash
# Creer un tag de version
git tag -a v0.0.1 -m "MVP valide, version officielle"
git push origin v0.0.1

# Lister les tags
git tag -l

# Voir le detail d'un tag
git show v0.0.1
```

Le tag rend la version traceable et permet de retrouver l'etat exact du code a tout moment.

---

## 5. Releases GitHub

Pour chaque version MINEURE ou MAJEURE, creer une Release GitHub avec :

- Titre : `v0.1.0 : Lancement public`
- Description : ce qui change (oriente utilisateur, pas technique)
- Tag associe
- Marquee comme **Latest** si version prod

Pour les PATCH : tag git suffisant, Release GitHub optionnelle.

---

## 6. Suivi dans Notion

- Chaque ticket a un champ **Version cible** (en place).
- Creer une entree dans la base **Releases** pour chaque version deployee.
- La base Releases contient : version, date, statut, tickets inclus.

---

## 7. Checklist de release (a suivre a chaque version)

- [ ] Tous les tickets de la version sont en statut Resolu
- [ ] `package.json` mis a jour avec la nouvelle version
- [ ] Tag git cree et pushe
- [ ] Release GitHub creee (si version MINEURE ou MAJEURE)
- [ ] Entree dans la base Releases Notion
- [ ] Release notes technique + user redigees (cf. `RELEASE_PROCESS.md`)
- [ ] Communication Discord si changement visible utilisateur

---

## 8. Criteres de validation NG-025

- [x] Norme documentee et accessible (ce fichier + Notion)
- [x] `package.json` a V0.0.1 (NG-024)
- [ ] Premier tag `v0.0.1` cree sur le repo (en attente OK fondateur)
- [ ] Jalons V0.0.x -> V0.1.0 valides par le fondateur
- [ ] Conventional Commits adoptes des la prochaine session Claude Code
