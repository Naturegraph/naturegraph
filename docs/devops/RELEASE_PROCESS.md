# Release Process Naturegraph

> Norme officielle depuis 2026-05-25 (decision Nicolas).
> S applique a TOUTES les MAJ qui partent en prod (main).

---

## Principes

1. **Pas de push prod systematique** : on accumule plusieurs fixes / ameliorations puis on release groupé.
2. **Release note obligatoire** : Nicolas valide chaque MAJ avant merge sur main.
3. **Force-logout users seulement de temps en temps**, pas a chaque release.
4. **Cycle ideal** : 1 release par jour ou par grappe de 3-5 changements coherents (pas par bug isole).

---

## Workflow standard

```
feature/fix → develop  (push libre, autant qu on veut)
develop → main         (PR obligatoire avec release note + validation Nicolas)
```

### Etape 1 : developpement libre sur develop

- Push autant de commits / PRs intermediaires que necessaire sur `develop`
- Vercel deploie automatiquement les previews
- Tests locaux ou sur preview branch

### Etape 2 : preparation de la release

Quand on a accumule assez de changements (ou qu un fix est urgent) :

1. **Rediger la release note** (template ci-dessous)
2. **Soumettre a Nicolas pour validation** (chat ou DM)
3. Nicolas valide ou demande des ajustements
4. **Une fois valide** : creer la PR develop -> main avec la release note en body

### Etape 3 : deploiement

- Merge PR develop -> main (squash ou merge commit selon contexte)
- Vercel deploie automatiquement
- **Si la release inclut un changement auth / schema** : force-logout tous les users via `docs/devops/FORCE_LOGOUT_RUNBOOK.md`
- Sinon : pas de force-logout, les users continuent leur session normalement

### Etape 4 : annonce + verification

- Notification in-app aux users (si bug fix important) ou simple deploy silencieux (refactor / perf)
- Surveiller les retours pendant 30-60 min
- Documenter dans `docs/devops/RELEASE_HISTORY.md`

---

## Template release note

````markdown
# Release v[MAJOR.MINOR.PATCH] — [Date YYYY-MM-DD HH:MM TZ]

## Tag de version

v0.X.Y (semver)

## Resume une ligne

Une phrase qui dit ce qui change pour l user.

## Changements

### Nouveautes

- [Feature A], description courte centree sur le benefice user
- [Feature B], ...

### Corrections

- [Bug 1] : impact + cause + fix (1 ligne chacun)
- [Bug 2] : ...

### Sous le capot (technique, non user-facing)

- Refactor X, perf gain Y
- Migration Z

## Actions requises par les users

- [ ] Force-logout requis ? OUI / NON
- [ ] Annonce in-app ? OUI / NON (texte joint ci-dessous si oui)
- [ ] Hard refresh recommande ? OUI / NON

## Tests a faire (priorise par criticite)

### 🔴 Critique (a tester avant validation)

1. [Test 1] : etapes precises + resultat attendu
2. [Test 2] : ...

### 🟡 Important (a tester apres deploiement)

1. [Test 3] : ...

### 🟢 Nice-to-have

1. [Test 4] : ...

## Risques connus

- [Risque 1] : description + mitigation
- [Risque 2] : ...

## Rollback plan

Si bug critique decouvert dans les 30 min post-deploiement :

```bash
git revert <commit-hash>
git push origin main
```
````

## Validation Nicolas

- [ ] Release note lue et validee : YES / NO
- [ ] Date et heure de deploiement choisis : \_\_\_
- [ ] Force-logout decide : OUI / NON
- [ ] Notif in-app validee : OUI / NON

Signature : Nicolas (heure validation)

```

---

## Versioning semver

- **MAJOR** : breaking change (refonte auth, schema casse, URL changee)
- **MINOR** : nouvelle feature retro-compatible
- **PATCH** : bug fix ou amelioration mineure

Tag git correspondant : `git tag -a v0.X.Y -m "Release v0.X.Y"`

---

## Quand utiliser force-logout

Cf. `docs/devops/FORCE_LOGOUT_RUNBOOK.md`. Pour rappel :

| Cas | Force tous |
|---|---|
| Refonte auth | ✅ |
| Schema DB cassant | ✅ |
| MAJ purement code (UI, perf, fix) | ❌ |
| Bug critique necessitant cache reset | Cas par cas |

**Pas de force-logout reflex**. Demande a Nicolas si on hesite.

---

## Notification in-app a tous les users

Pour les MAJ importantes, on peut pousser une notif a tous les users (table `notifications` + type `system`).

Procedure :
1. Rediger le message (titre court + corps)
2. Soumettre a Nicolas pour validation
3. Une fois valide : insert dans `notifications` pour chaque user_id de `profiles`
4. Les users verront un badge dans NotificationsPanel

Voir aussi : `docs/devops/SYSTEM_NOTIFICATIONS.md` (a creer) pour le pattern technique.

---

## Historique

| Version | Date | Resume | Force-logout | Notif in-app |
|---|---|---|---|---|
| v0.0.1 | 2026-05-22 | Beta privée Quebec ouverte | Non | Non |
| (a remplir au fil des releases) | | | | |
```
