# Naturegraph — Convention TODOs

> **Version** : 1.0 — 2026-05-04
> **Statut** : Convention obligatoire pour tout nouveau TODO
> **Source** : `QUICK_WINS.md` QW-I12 + `MASTER_TODO.md` T-072

---

## Format obligatoire

Tout commentaire `TODO`, `FIXME`, `HACK`, `XXX` doit suivre ce format :

```ts
// TODO(YYYY-MM-DD, owner, #issue): description courte
```

ou minimum (si issue pas encore créée) :

```ts
// TODO(YYYY-MM-DD, owner): description courte
```

## Champs

| Champ       | Obligatoire | Description                                                     |
| ----------- | ----------- | --------------------------------------------------------------- |
| Date        | ✅          | Date d'ajout du TODO (format ISO YYYY-MM-DD)                    |
| Owner       | ✅          | Username GitHub ou prénom (ex: `nicolas`, `@nicolas-douaron`)   |
| #issue      | Optionnel   | Référence issue GitHub/Linear (ex: `#42`, `T-013`)              |
| Description | ✅          | Courte (< 80 chars) — ajouter détails dans l'issue si plus long |

## Exemples

### ✅ BON

```ts
// TODO(2026-05-04, nicolas, T-013): extraire FormProvider dans hook séparé
// TODO(2026-05-10, nicolas, #45): ajouter support HEIC avec libheif-wasm
// TODO(2026-06-15, nicolas): mocker Supabase pour tests E2E
```

### ❌ MAUVAIS

```ts
// TODO: faire ça plus tard          ← Pas de date, pas d'owner, vague
// TODO [BACKEND]                    ← Format ancien, manque d'info
// FIXME bug ici                     ← Vague
// HACK temporaire                   ← Pas de contexte
```

## Pourquoi cette convention ?

| Bénéfice   | Raison                                                             |
| ---------- | ------------------------------------------------------------------ |
| Tracking   | On peut voir quel TODO date de quand                               |
| Ownership  | On sait qui a écrit le TODO et qui peut le résoudre                |
| Lien issue | Le travail prévu est traçable hors du code                         |
| Cleanup    | Audit trimestriel des TODOs orphelins (sans owner depuis > 6 mois) |

## Migration des 56 TODOs existants

Les TODOs actuels au format ancien (`TODO [BACKEND]`, `TODO: ...`) seront
migrés progressivement vers le nouveau format lors des refactos Phase 3
(MASTER_TODO T-011 à T-035).

**Règle pour le code existant** : si tu touches un fichier avec un TODO
ancien, migre-le au nouveau format avant de commit.

**Règle pour le nouveau code** : tout nouveau TODO DOIT suivre cette convention.

## ESLint rule (futur)

Une règle ESLint custom pourra être ajoutée pour bloquer les TODOs sans owner :

```js
// eslint-plugin-todo-format (à créer)
'todo-format/require-owner': 'error'
```

Pour l'instant : code review manuelle.

## Audit trimestriel

Chaque trimestre, exécuter :

```bash
# Lister tous les TODOs avec leur âge
grep -rnE "TODO\((20[0-9]{2}-[0-9]{2}-[0-9]{2})" src/ --include="*.ts" --include="*.tsx"
```

Action sur les TODOs > 6 mois :

- Résolus → supprimer le TODO
- Toujours d'actualité → créer une issue + update commentaire
- Obsolètes → supprimer le code mort associé

---

**📌 Convention obligatoire pour tout nouveau commit. À enrichir au fur et à mesure du retour d'expérience.**
