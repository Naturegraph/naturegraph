# Release Process Naturegraph

> Decision Nicolas 2026-05-25, mis a jour 2026-06-17 (NG-025).
> S applique a TOUTES les MAJ qui partent en prod (main).
>
> **Numerotation** : la norme de versioning (SemVer, Conventional Commits, tags,
> Releases, suivi Notion, jalons) vit dans `VERSIONING.md`. La phase de prelancement
> repart a V0.0.1 (cf. NG-025). Les exemples `V1.X.Y` ci-dessous illustrent le
> mecanisme PATCH/MINOR/MAJOR ; transposer au track courant `V0.0.x`.

---

## Principes

1. **Pas de push prod systematique** : on accumule plusieurs fixes / ameliorations puis on release groupe.
2. **Double release note obligatoire** : technique + user-friendly. Nicolas valide les deux avant merge sur main.
3. **Workflow obligatoire** : develop -> staging (beta) -> main (prod), sans raccourci.
4. **Force-logout users seulement de temps en temps**, pas a chaque release.
5. **Production = sanctuaire** : jamais de test, jamais de debug, jamais de fake data.

---

## Types de releases (semver type SaaS)

### PATCH (V1.0.1, V1.0.2, ...)

**Contient** : bugfix, responsive, optimisation, stabilite, securite mineure, UX mineure.

**Process** :

- QA interne rapide suffit
- Beta privee optionnelle (si fix simple) ou rapide (1-2h)
- Pas d annonce in-app necessaire (sauf bug critique resolu)
- Pas de deconnexion utilisateurs sauf cas particulier
- Release note technique courte + user-friendly minimaliste

### MINOR (V1.1.0, V1.2.0, ...)

**Contient** : nouvelles fonctionnalites importantes, amelioration UX majeure, nouveaux modules, evolutions visibles produit.

**Process** :

- QA interne complete obligatoire
- Beta privee obligatoire (3-7 jours minimum)
- Annonce in-app obligatoire avant deploy prod
- Monitoring renforce 24-48h post-deploy
- Release note technique detaillee + user-friendly chaleureuse

### MAJOR (V2.0.0, V3.0.0, ...)

**Contient** : refonte importante, changement architecture, gros changement produit, evolution business.

**Process** :

- Plan QA complet (responsive + cross-browser + perf + securite + accessibilite)
- Beta privee etendue (1-3 semaines, plusieurs iterations)
- Communication utilisateurs en amont (annonce 1 semaine avant)
- Migration eventuelle preparee et testee
- Monitoring renforce 1 semaine post-deploy
- Support renforce (FAQ, Discord beta)
- Release note technique exhaustive + user-friendly orientee value
- Possible necessite de force-logout (auth refacto) ou changement schema DB

---

## Workflow obligatoire en 5 etapes

```
1. DEVELOPMENT     develop branche, push libre, experimentation
2. QA INTERNE      tests Nicolas sur preview Vercel develop
3. BETA PRIVEE     staging -> beta.naturegraph.ca, testeurs autorises
4. VALIDATION      checklist obligatoire + release note Nicolas valide
5. PRODUCTION      merge main, tag git, surveillance post-deploy
```

### Etape 1, Developpement

**Branche** : `develop`
Push libre, autant de commits / PRs intermediaires que necessaire. Vercel deploie automatiquement les previews. Tests locaux ou sur preview branch.

### Etape 2, QA interne

Tests effectues par Nicolas (ou collaborateurs) sur la branche `develop` via le preview Vercel :

- [ ] Responsive (mobile, tablette, desktop)
- [ ] Cross-browser (Chrome, Safari iOS, Firefox)
- [ ] Flows critiques (auth, publication, profil, recherche)
- [ ] Supabase OK (pas d erreurs RLS, requetes propres)
- [ ] Auth OK (signin, signout, refresh)
- [ ] Performance (LCP, bundle size, pas de re-render excessif)
- [ ] Stabilite (pas d erreurs console, pas de fuites memoire)

### Etape 3, Beta privee

**Branche** : `staging`
**Domaine** : `beta.naturegraph.ca` (a configurer)

PR `develop -> staging`, merge automatique. Les testeurs autorises iterent sur le code en conditions reelles avant la prod. Duree : 1-2 jours minimum (PATCH), 3-7 jours (MINOR), 1-3 semaines (MAJOR).

### Etape 4, Validation release

Checklist obligatoire avant merge `staging -> main` :

- [ ] Zero bug critique signale en beta
- [ ] Build stable (CI green : lint, TypeScript, build, bundle budget)
- [ ] Monitoring OK (logs Supabase, Vercel)
- [ ] Securite validee (RLS, secrets, callbacks auth)
- [ ] Migration validee si applicable (schema DB testee en beta)
- [ ] Release note technique redigee dans `docs/devops/releases/V[X.Y.Z]_TECHNICAL.md`
- [ ] Release note user-friendly redigee dans `docs/devops/releases/V[X.Y.Z]_USER.md`
- [ ] Nicolas valide les deux notes (date, heure, force-logout, notif, etc.)

### Etape 5, Production

PR `staging -> main` avec les release notes en body.

1. Merge admin squash
2. Vercel deploie automatiquement
3. Tag git : `git tag -a v1.X.Y -m "Release v1.X.Y"` + `git push origin v1.X.Y`
4. Si force-logout requis : exec SQL via runbook `FORCE_LOGOUT_RUNBOOK.md`
5. Si notif in-app : INSERT batch via script valide par Nicolas
6. Surveillance 30-60 min minimum
7. Documenter dans `releases/README.md` (historique des versions)

---

## Deux niveaux de release note

Chaque release produit DEUX documents archives dans `docs/devops/releases/` :

### 1. Note technique (interne)

- Fichier : `V[X.Y.Z]_TECHNICAL.md`
- Public : Nicolas + collaborateurs futurs
- Contenu : changements complets, PRs referencees, risques, rollback plan, tests internes, validation Nicolas
- But : tracabilite, audit, debug si bug remonte

### 2. Note user-friendly (communication)

- Fichier : `V[X.Y.Z]_USER.md`
- Public : users de la beta (notif in-app, Discord, mail)
- Contenu : ce qui change pour l user, ton chaleureux, sans jargon
- But : informer + rassurer + remercier

---

## Maintenance utilisateur

Certaines releases peuvent necessiter cote user :

- Refresh session
- Reconnexion (force-logout)
- Refresh cache (hard reload)
- Maintenance courte (downtime < 5 min)

**Regle absolue** : toujours prevenir les utilisateurs AVANT.

### Process annonce maintenance

1. Decision : la release necessite-t-elle une maintenance ?
2. Si oui : redaction d une notif in-app type `maintenance`, validation Nicolas
3. Envoi de la notif 24h-48h avant le deploy (pour MAJOR/MINOR), 1-2h avant (pour PATCH critique)
4. Le jour J : deploy + force-logout si necessaire
5. Notif post-maintenance : confirmer que tout est rentre dans l ordre

### Force-logout cas d usage

Cf. `FORCE_LOGOUT_RUNBOOK.md`. Cas types :

| Cas                                        | Force-logout      |
| ------------------------------------------ | ----------------- |
| Refonte auth (Google OAuth, Passkeys)      | OUI               |
| Migration schema DB cassant                | OUI               |
| Rotation JWT secret                        | OUI               |
| Bug critique session corrompue (cas isole) | Un user seulement |
| MAJ purement code (UI, perf, fix mineur)   | NON               |
| Nouvelle feature non-auth                  | NON               |

---

## Rollback plan

Toute release DOIT pouvoir etre rollback proprement. Aucun changement irreversible sans backup et plan de retour.

### Rollback code

```bash
# Identifier le commit a revert (le merge sur main)
git log origin/main -5

# Revert via PR
git revert <merge-commit-hash>
git push origin main
# OU rollback Vercel via dashboard si urgent
```

### Rollback DB

- Schema : migration descending obligatoire pour les migrations cassantes
- Donnees : PITR Supabase Pro permet restore 7 jours en arriere
- Cas particulier (force-logout via SQL) : tracer le UPDATE avec un WHERE assez precis pour pouvoir cibler ce qui a ete change

### Rollback notif

- Marquer les notifs envoyees a tort comme `read=true` + ajouter une notif corrective
- OU DELETE si erreur grossiere

---

## Stabilite production

La production doit etre un sanctuaire :

✅ **AUTORISE** :

- Code valide en beta
- Code passe par les 5 etapes du workflow
- Hotfix dans la branche `hotfix/x` depuis main, remonte ensuite vers staging + develop
- Tag git v1.X.Y a chaque deploy

❌ **INTERDIT** :

- Push direct sur main
- Tests en prod
- Fake data
- Console.log oublies
- Feature flags actives par oubli
- Branches non validees

### Si bug critique decouvert en prod

1. Communiquer immediatement avec les users impactes (Discord beta, mail)
2. Decider : rollback rapide (revert PR) OU hotfix (\`hotfix/x\` branche)
3. Si rollback : revert + verif prod redevient stable + post-mortem
4. Si hotfix : `hotfix/x` depuis main, fix minimal, PR direct vers main (process accelere mais Nicolas valide), puis remonter dans staging + develop
5. Documenter l incident dans `releases/INCIDENTS.md` (a creer si premier incident)

---

## Versioning officiel

> Norme detaillee : `VERSIONING.md` (NG-025). Resume ci-dessous.

```
V[MAJOR].[MINOR].[PATCH]
```

| Type  | Quand                                            | Exemples       |
| ----- | ------------------------------------------------ | -------------- |
| PATCH | Bugfix, optimisations, securite mineure          | V1.0.1, V1.0.2 |
| MINOR | Nouvelles features, UX majeure, nouveaux modules | V1.1.0, V1.2.0 |
| MAJOR | Refonte architecture, business majeur            | V2.0.0, V3.0.0 |

### Bump package.json (obligatoire avant chaque release)

Le bandeau "App version X.Y.Z" du ProfileMenu lit `__APP_VERSION__` injecte
depuis `pkg.version`. Si on oublie le bump, les users voient une vieille version.

Trois scripts npm pour automatiser :

```bash
npm run release:patch   # 1.1.2 -> 1.1.3
npm run release:minor   # 1.1.2 -> 1.2.0
npm run release:major   # 1.1.2 -> 2.0.0
```

Les scripts utilisent `npm version` avec `--no-git-tag-version` (pas de tag auto)
puis affichent les prochaines etapes a executer manuellement.

### Tag git

```bash
git tag -a v1.X.Y -m "Release v1.X.Y, [resume une ligne]"
git push origin v1.X.Y
```

Le tag rend la version traceable et permet de retrouver l etat exact du code a tout moment.

---

## Historique

Index dans `releases/README.md`.

| Version                         | Date       | Type  | Resume                                                            |
| ------------------------------- | ---------- | ----- | ----------------------------------------------------------------- |
| V1.0.0                          | 2026-05-25 | MAJOR | Premiere version officielle stable, cleanup documentation complet |
| (a remplir au fil des releases) |            |       |                                                                   |
