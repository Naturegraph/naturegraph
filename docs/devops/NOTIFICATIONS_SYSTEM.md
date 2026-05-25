# Systeme de notifications in-app

> Norme officielle V1.0.0+ (Nicolas 2026-05-25).
> Comment communiquer avec les users via notifications in-app.

---

## Objectif

Informer les users de maniere :

- Claire
- Non intrusive
- Professionnelle
- Facile a fermer

Sans jamais spam.

---

## Architecture technique

### Table `notifications`

```sql
notifications (
  id uuid PK,
  user_id uuid FK profiles,
  type varchar NOT NULL,
  title varchar NOT NULL,
  body text,
  reference_id uuid,
  reference_type varchar,
  read boolean DEFAULT false,
  created_at timestamp DEFAULT now()
)
```

### Types existants (cf. enum NotificationType cote front)

```ts
type NotificationType =
  | 'reaction' // Quelqu un reagit a ton post
  | 'follow' // Quelqu un te suit
  | 'comment' // Quelqu un commente
  | 'mention' // Quelqu un te mentionne
  | 'post' // Nouveau post d un user suivi
  | 'species_digest' // Digest hebdo des especes
  | 'identification' // Quelqu un a identifie ton espece
  | 'system' // Communication officielle Naturegraph
```

### Affichage

- Badge cloche header (compteur non lus)
- NotificationsPanel slide-over (5-10 dernieres)
- NotificationsPage plein ecran (historique)
- Body affiche sur plusieurs lignes via `whitespace-pre-line`

---

## 4 types de communications officielles

Tous utilisent `type='system'` en base.

### 1. Maintenance

**Quand l utiliser** :

- Maintenance courte (downtime < 5 min)
- Reconnexion necessaire post-deploy
- Migration backend (auth, schema)
- MAJ securite

**Template** :

```
Titre : Maintenance en cours [ou termine]
Corps : Brief explication + heure de fin estimee si en cours, ou rassurance si termine.
        Ce qui peut etre necessaire pour l user (refresh, reconnexion).
```

**Exemple** :

```
Titre : Mise a jour technique en cours 🔧
Corps : On effectue une amelioration rapide.
        Si tu rencontres un souci, deconnecte-toi puis reconnecte-toi.
        Merci de ta patience !
```

**Quand envoyer** :

- AVANT le deploy : 24-48h pour MAJOR, 1-2h pour MINOR critique, optionnel pour PATCH
- APRES le deploy : si reconnexion necessaire, ou si maintenance > 5 min

### 2. Nouvelle fonctionnalite

**Quand l utiliser** :

- Lancement d une feature MINOR
- Amelioration UX visible
- Nouvelle section / module

**Template** :

```
Titre : [Emoji] [Verbe action] [Feature]
Corps : Phrase courte qui explique la valeur
        Encouragement a l essayer
```

**Exemple** :

```
Titre : 🌿 Gere tes blocages depuis tes parametres
Corps : Tu peux maintenant reafficher les publications masquees et debloquer
        les comptes depuis Parametres > Blocages. Tout est reversible en un clic.
```

**Quand envoyer** :

- A la livraison de la MINOR (apres deploy + monitoring stable 24h)
- Une seule fois par feature, pas de spam

### 3. Beta testing

**Quand l utiliser** :

- Appel a testeurs pour une nouvelle version beta
- Demande de feedback specifique
- Annonce ouverture beta a un cercle elargi

**Template** :

```
Titre : [Emoji] On a besoin de toi !
Corps : Quoi tester + ou + comment donner du feedback
```

**Exemple** :

```
Titre : 🧪 Teste la nouvelle recherche d especes !
Corps : Une nouvelle version de la recherche est dispo sur beta.naturegraph.ca.
        Essaye-la et dis-nous ce que tu en penses via Parametres > Besoin d aide.
```

### 4. Information produit

**Quand l utiliser** :

- Changement important non-bloquant
- Amelioration stabilite
- Roadmap, vision
- Changements UX importants

**Template** :

```
Titre : Quelque chose a change
Corps : Quoi + pourquoi + ce que ca implique pour l user
```

**Exemple** :

```
Titre : 🦔 Naturegraph passe en V1.0.0
Corps : Cette semaine on a stabilise le produit avec plein de petites
        ameliorations grace a vos retours. Merci a toute la beta,
        bonnes observations !
```

---

## Regles UX strictes

### Format

Une notification doit etre :

- **Courte** : titre < 50 caracteres, corps < 300 caracteres
- **Claire** : un seul sujet, pas de blabla
- **Non agressive** : ton chaleureux, ne pas crier (pas de MAJUSCULES, peu d emojis)
- **Professionnelle** : francais correct, pas de coquilles
- **Facile a fermer** : bouton croix accessible, swipe-to-dismiss mobile

### Frequence maximum

| Type                | Max par mois | Notes                           |
| ------------------- | ------------ | ------------------------------- |
| Maintenance         | 4            | Sauf urgences exceptionnelles   |
| Nouvelle feature    | 4            | Une par MINOR release au max    |
| Beta testing        | 2            | Eviter de noyer les testeurs    |
| Information produit | 2            | Seulement si vraiment important |

**Total max** : ~12 notifs system / mois / user. Au-dela on irrite.

### A ne JAMAIS faire

- Spam : ne pas envoyer 3 notifs pour la meme chose
- Notif sans valeur : "Notre application est super" pas utile
- Notif technique : "Erreur 500 corrigee" pas comprehensible
- Notif urgente non-urgente : reserver le ton urgent au vrai urgent
- Notif sans bouton fermer

---

## Process d envoi

### Etape 1, redaction

Le titre + corps sont rediges dans la release note user-friendly :
`docs/devops/releases/V[X.Y.Z]_USER.md`

### Etape 2, validation Nicolas

Nicolas relit et valide :

- Texte exact (titre + corps)
- Cible (tous les users / segment specifique)
- Timing (date et heure)
- Type ('system')

### Etape 3, envoi SQL

Apres validation, choisir le template adapte dans `NOTIFICATION_TEMPLATES.md`
et copier-coller son SQL pret a l emploi, OU adapter ce SQL de base :

```sql
INSERT INTO notifications (user_id, type, title, body, read)
SELECT
  id,
  'system',
  '[TITRE VALIDE]',
  E'[CORPS VALIDE avec \\n pour saut de ligne]',
  false
FROM profiles
WHERE username NOT LIKE 'user_%'  -- skip onboarding incomplet
  AND is_internal = false;        -- skip admin
```

### Etape 4, verification

```sql
-- Combien envoye ?
SELECT COUNT(*) FROM notifications
WHERE type = 'system'
  AND title = '[TITRE VALIDE]'
  AND created_at > NOW() - INTERVAL '5 minutes';

-- Les users peuvent voir ? (sample)
SELECT n.title, n.body, n.read, p.username
FROM notifications n
JOIN profiles p ON p.id = n.user_id
WHERE n.title = '[TITRE VALIDE]'
LIMIT 5;
```

---

## Rollback notification

Si envoi par erreur :

```sql
-- Option 1 : marquer comme lues (l user les voit mais ne se sent pas spam)
UPDATE notifications
SET read = true
WHERE type = 'system' AND title = '[TITRE]'
  AND created_at > NOW() - INTERVAL '1 hour';

-- Option 2 : delete si erreur grossiere (titre faux, etc.)
DELETE FROM notifications
WHERE type = 'system' AND title = '[TITRE]'
  AND created_at > NOW() - INTERVAL '1 hour';

-- Option 3 : envoi d une notif corrective (cas exemplaire)
INSERT INTO notifications (user_id, type, title, body, read)
SELECT id, 'system', 'Correction', 'La notif precedente etait...', false
FROM profiles WHERE [conditions];
```

---

## Historique des notifs system

A maintenir manuellement dans `releases/NOTIFICATIONS_HISTORY.md` (a creer au fil des envois).

| Date       | Version | Type | Titre                          | Cible        | Resultat  |
| ---------- | ------- | ---- | ------------------------------ | ------------ | --------- |
| 2026-05-25 | V1.0.0  | Info | Merci de tester Naturegraph 🌿 | 7 users beta | Envoye OK |
