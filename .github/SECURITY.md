# Security Policy

## Versions supportées

| Version             | Supportée                    |
| ------------------- | ---------------------------- |
| `main` (production) | ✅                           |
| `staging` (UAT)     | ✅ (correctifs urgents)      |
| `develop` (dev)     | ✅ (correctifs prioritaires) |

## Signaler une vulnérabilité

⚠️ **NE PAS** ouvrir d'issue publique pour une vulnérabilité de sécurité.

### Procédure

1. **Email confidentiel** à : `security@naturegraph.ca` (en cours de configuration, cf. NG-009 ; domaine principal .ca)
2. **Sujet** : `[SECURITY] Vulnérabilité - <courte description>`
3. **Contenu** :
   - Description technique
   - Étapes pour reproduire
   - Impact potentiel
   - Patch suggéré (si applicable)
   - Tes coordonnées (pour t'attribuer la découverte si tu le souhaites)

### Engagement

- **Accusé réception** : < 48 heures
- **Première évaluation** : < 5 jours
- **Patch ou statut** : < 30 jours selon sévérité

### Sévérité (CVSS)

| Sévérité                                 | Délai patch cible |
| ---------------------------------------- | ----------------- |
| 🔴 Critique (RCE, fuite massive données) | 24-72h            |
| 🟠 Haute (XSS, RLS bypass)               | 7 jours           |
| 🟡 Moyenne (CSRF, info disclosure)       | 30 jours          |
| ⚪ Basse (cosmétique, edge case)         | 90 jours          |

### Programme de divulgation responsable

- Tu reportes une vulnérabilité → nous corrigeons → nous coordonnons la divulgation publique
- **Hall of Fame** (avec ton consentement) si tu acceptes d'être mentionné
- Pas de bug bounty financier en l'état (early stage)

## Bonnes pratiques côté utilisateur

- Ne partage **jamais** tes credentials Supabase
- Active la 2FA sur ton compte (quand disponible)
- Signale tout comportement suspect via le formulaire support

## Conformité

Naturegraph respecte :

- **RGPD** (Règlement Général sur la Protection des Données : UE)
- **Loi 25** (Loi modernisant des dispositions législatives en matière de protection des renseignements personnels : Québec)

Pour exercer tes droits RGPD/Loi 25 : Settings → Export RGPD ou Suppression compte.
