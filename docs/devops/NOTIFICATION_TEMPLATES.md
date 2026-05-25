# Templates de notifications in-app officielles

> Templates valides Nicolas 2026-05-25. A reutiliser tels quels pour les futures
> communications. Toujours valider le contenu final avec Nicolas avant envoi
> (cf. `NOTIFICATIONS_SYSTEM.md` process complet).

---

## Comment utiliser ces templates

Chaque template inclut :

- **Titre** : a coller dans le champ `title` de la notification
- **Message** : a coller dans le champ `body` (les retours a la ligne sont preserves via whitespace-pre-line)
- **CTA** : intentions de l UI (a implementer cote frontend dans une evolution future, en attendant le clic ouvre la NotificationsPage par defaut)
- **SQL pret a l emploi** : remplace les variables `[X]` puis exec via MCP Supabase

### Cible par defaut

```sql
WHERE username NOT LIKE 'user_%'   -- skip onboarding incomplet
  AND is_internal = false           -- skip Nicolas admin (cumule des tests)
```

Pour cibler tous les users (Nicolas inclus pour preview) :

```sql
WHERE username NOT LIKE 'user_%'
```

Pour cibler un segment specifique (testeurs beta uniquement, par exemple) : ajouter conditions dans le WHERE.

---

## Template 1, Maintenance / reconnexion

**Cas d usage** : maintenance courte, deploy avec force-logout, migration backend, MAJ securite.

**Quand envoyer** : 24-48h avant (MAJOR/MINOR), 1-2h avant (PATCH critique), ou apres maintenance si non annoncee.

### Contenu

**Titre** :

```
🚧 Maintenance & amélioration en cours
```

**Message** :

```
Une mise à jour importante vient d'être déployée afin d'améliorer la stabilité et les performances de l'application.

Une déconnexion/reconnexion peut être nécessaire dans les prochaines minutes.

Merci pour votre patience 💚
```

**CTA prevu** : `Recharger l'application` ou `Se reconnecter` (a implementer plus tard cote front).

### SQL

```sql
INSERT INTO notifications (user_id, type, title, body, read)
SELECT
  id,
  'system',
  '🚧 Maintenance & amélioration en cours',
  E'Une mise à jour importante vient d''être déployée afin d''améliorer la stabilité et les performances de l''application.\n\nUne déconnexion/reconnexion peut être nécessaire dans les prochaines minutes.\n\nMerci pour votre patience 💚',
  false
FROM profiles
WHERE username NOT LIKE 'user_%'
  AND is_internal = false;
```

---

## Template 2, Nouvelle fonctionnalite

**Cas d usage** : lancement d une feature MINOR, amelioration UX visible, nouvelle section.

**Quand envoyer** : a la livraison de la MINOR, apres monitoring stable 24h. Une seule fois par feature.

### Contenu

**Titre** :

```
✨ Nouvelle fonctionnalité disponible
```

**Message** (a personnaliser, remplacer `[Feature X]`) :

```
Nous venons de déployer une nouvelle amélioration sur l'application.

Nouveautés :
• [Feature 1]
• [Feature 2]
• [Amélioration UX]

Vos retours nous aident énormément à améliorer l'expérience.
```

**CTA prevu** : `Découvrir` ou `Tester maintenant` (lien vers la feature concernee, a implementer plus tard).

### SQL (template a personnaliser)

```sql
INSERT INTO notifications (user_id, type, title, body, read)
SELECT
  id,
  'system',
  '✨ Nouvelle fonctionnalité disponible',
  E'Nous venons de déployer une nouvelle amélioration sur l''application.\n\nNouveautés :\n• [Feature 1]\n• [Feature 2]\n• [Amélioration UX]\n\nVos retours nous aident énormément à améliorer l''expérience.',
  false
FROM profiles
WHERE username NOT LIKE 'user_%'
  AND is_internal = false;
```

### Exemple concret (V1.1.0 hypothetique avec partage post)

```sql
INSERT INTO notifications (user_id, type, title, body, read)
SELECT
  id,
  'system',
  '✨ Nouvelle fonctionnalité disponible',
  E'Nous venons de déployer une nouvelle amélioration sur l''application.\n\nNouveautés :\n• Partage de publications via lien direct\n• Aperçu enrichi sur les réseaux sociaux\n• Page dédiée pour chaque observation\n\nVos retours nous aident énormément à améliorer l''expérience.',
  false
FROM profiles
WHERE username NOT LIKE 'user_%'
  AND is_internal = false;
```

---

## Template 3, Beta privee

**Cas d usage** : appel a testeurs pour nouvelle version beta, demande de feedback specifique, ouverture beta a un cercle elargi.

**Quand envoyer** : a l ouverture de la beta. Idealement cible (testeurs autorises uniquement), pas tous les users.

### Contenu

**Titre** :

```
🧪 Nouvelle beta disponible
```

**Message** (a personnaliser) :

```
Une nouvelle version beta est disponible pour certains utilisateurs test.

Cette version permet de tester :
• [Nouvelle feature]
• [Nouvelle expérience]
• [Nouveau système]

Des ajustements peuvent encore être en cours.
```

**CTA prevu** : `Accéder à la beta` (lien vers `beta.naturegraph.ca`) ou `Envoyer un feedback`.

### SQL (cible : testeurs beta uniquement)

```sql
-- Adapter le WHERE selon comment tu identifies les testeurs
-- Exemple : utilisateurs avec une beta_key specifique, ou allowlist email
INSERT INTO notifications (user_id, type, title, body, read)
SELECT
  id,
  'system',
  '🧪 Nouvelle beta disponible',
  E'Une nouvelle version beta est disponible pour certains utilisateurs test.\n\nCette version permet de tester :\n• [Nouvelle feature]\n• [Nouvelle expérience]\n• [Nouveau système]\n\nDes ajustements peuvent encore être en cours.',
  false
FROM profiles
WHERE username NOT LIKE 'user_%'
  AND is_internal = false
  AND email IN (
    -- Liste des testeurs autorises
    'photographe1@example.com',
    'photographe2@example.com'
  );
```

---

## Template 4, Correctif important

**Cas d usage** : PATCH release avec fixes critiques, amelioration stabilite generale, correction bug ayant impacte les users.

**Quand envoyer** : apres deploy PATCH significatif. Pas pour les micro-fixes invisibles.

### Contenu

**Titre** :

```
🛠 Correctifs & stabilité
```

**Message** :

```
Nous avons corrigé plusieurs problèmes afin d'améliorer la stabilité générale de l'application :

• performances,
• responsive,
• compatibilité navigateurs,
• stabilité mobile.

Merci pour vos retours et votre aide 💚
```

**CTA prevu** : `Continuer` (simple acknowledgement, ferme la notif).

### SQL

```sql
INSERT INTO notifications (user_id, type, title, body, read)
SELECT
  id,
  'system',
  '🛠 Correctifs & stabilité',
  E'Nous avons corrigé plusieurs problèmes afin d''améliorer la stabilité générale de l''application :\n\n• performances,\n• responsive,\n• compatibilité navigateurs,\n• stabilité mobile.\n\nMerci pour vos retours et votre aide 💚',
  false
FROM profiles
WHERE username NOT LIKE 'user_%'
  AND is_internal = false;
```

---

## Template 5, Release majeure

**Cas d usage** : release MINOR ou MAJOR avec plusieurs grosses nouveautes. Communication forte de la valeur ajoutee.

**Quand envoyer** : a la livraison de la version, apres monitoring stable 24h. Reste fier mais sobre.

### Contenu

**Titre** (remplacer `[X.X.X]` par la version exacte) :

```
🚀 Version [X.X.X] disponible
```

**Message** (a personnaliser) :

```
La nouvelle version de l'application est maintenant disponible.

Principales nouveautés :
• [Nouvelle fonctionnalité]
• [Amélioration majeure]
• [Optimisation importante]

Cette mise à jour améliore significativement l'expérience globale.
```

**CTA prevu** : `Voir les nouveautés` (lien vers CHANGELOG public ou page dediee) ou `Commencer`.

### SQL (V1.1.0 hypothetique)

```sql
INSERT INTO notifications (user_id, type, title, body, read)
SELECT
  id,
  'system',
  '🚀 Version 1.1.0 disponible',
  E'La nouvelle version de l''application est maintenant disponible.\n\nPrincipales nouveautés :\n• Partage de publications via lien direct\n• Installation comme app sur ton téléphone\n• Apercu enrichi des observations\n\nCette mise à jour améliore significativement l''expérience globale.',
  false
FROM profiles
WHERE username NOT LIKE 'user_%'
  AND is_internal = false;
```

---

## Verification post-envoi (toujours faire)

Apres chaque INSERT batch :

```sql
-- Combien envoyees ?
SELECT COUNT(*) AS notifs_envoyees
FROM notifications
WHERE type = 'system'
  AND title = '[TITRE EXACT]'
  AND created_at > NOW() - INTERVAL '5 minutes';

-- Sample pour verifier le rendu cote user
SELECT n.title, n.body, n.read, p.username
FROM notifications n
JOIN profiles p ON p.id = n.user_id
WHERE n.title = '[TITRE EXACT]'
  AND n.created_at > NOW() - INTERVAL '5 minutes'
LIMIT 3;
```

---

## Rollback en cas d erreur

Si erreur de contenu, mauvais users, mauvais timing :

```sql
-- Option 1 : mark as read (l user ne s en preoccupe plus)
UPDATE notifications
SET read = true
WHERE type = 'system'
  AND title = '[TITRE FAUTIF]'
  AND created_at > NOW() - INTERVAL '1 hour';

-- Option 2 : delete (cas erreur grossiere)
DELETE FROM notifications
WHERE type = 'system'
  AND title = '[TITRE FAUTIF]'
  AND created_at > NOW() - INTERVAL '1 hour';

-- Option 3 : notif corrective (rare, cas embarrassant)
INSERT INTO notifications (user_id, type, title, body, read)
SELECT id, 'system', 'Correction', E'Une notification precedente contenait une erreur.\n[Texte correctif]', false
FROM profiles
WHERE username NOT LIKE 'user_%' AND is_internal = false;
```

---

## Historique des envois

A maintenir manuellement dans cette table au fil des envois (template ci-dessous).

| Date       | Version | Template     | Titre                          | Cible                  | Resultat |
| ---------- | ------- | ------------ | ------------------------------ | ---------------------- | -------- |
| 2026-05-25 | V1.0.0  | Info produit | Merci de tester Naturegraph 🌿 | 7 users beta + Nicolas | OK       |

---

## CTAs et evolutions futures

Les CTAs (`Recharger l application`, `Découvrir`, `Accéder à la beta`, etc.) mentionnes dans chaque template sont des **intentions UX**. Pour les implementer reellement, il faudrait :

1. Ajouter une colonne `cta_label` et `cta_url` (ou `cta_action`) a la table `notifications`
2. Mettre a jour `NotificationsPanel` et `NotificationsPage` pour afficher le bouton CTA quand present
3. Si action interne : navigation via React Router
4. Si action externe : `window.location.assign` ou `<a target="_blank">`
5. Tracker les clics sur CTA pour mesurer l engagement

A planifier pour une release V1.X.0 si besoin reel emerge.
