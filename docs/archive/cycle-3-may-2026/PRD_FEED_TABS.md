# PRD — Tabs du Feed (Naturegraph)

**Statut** : Validé · Version 1.1  
**Date** : 2026-04-15

---

## 🎯 Objectif

Structurer la navigation du feed avec des tabs simples et efficaces afin de :

- Faciliter la découverte du contenu
- Introduire progressivement la personnalisation
- Encourager la création de compte

---

## 🧩 Tabs disponibles

Ordre validé : **Récent · Populaire · Pour vous**

| Tab       | Description                                           | Accès                |
| --------- | ----------------------------------------------------- | -------------------- |
| Récent    | Observations les plus récentes (chronologique)        | Tous                 |
| Populaire | Observations avec le plus d'engagement (30j)          | Tous                 |
| Pour vous | Feed personnalisé (intérêts + follows + localisation) | Connectés uniquement |

> **Note produit** : pas d'onglet "Près de moi".  
> La localisation est un signal interne de "Pour vous", pas un tab séparé.  
> Objectif : éviter la fragmentation, centraliser la personnalisation.

---

## 1. Tab "Récent"

### Règles

- Tri chronologique (du plus récent au plus ancien)
- Accessible à tous (connecté et non connecté)
- **Tab par défaut** à l'arrivée sur le feed

---

## 2. Tab "Populaire"

### Règles

- Score d'engagement = `réactions × 2 + commentaires × 3`
- **Fenêtre temporelle fixe : 30 jours** (MVP — réévaluer en phase 2)
- Accessible à tous
- Fallback si 0 résultats : élargir à 90j automatiquement

---

## 3. Tab "Pour vous"

### Logique (3 signaux combinés)

| Signal                          | Poids | Condition                          |
| ------------------------------- | ----- | ---------------------------------- |
| Utilisateurs suivis             | Fort  | Doit avoir ≥ 1 follow              |
| Centres d'intérêt               | Moyen | Doit avoir sélectionné ≥ 1 intérêt |
| Localisation (nearby_posts RPC) | Moyen | Doit avoir activé sa zone          |

### Empty state (0 signal)

Ne pas afficher un feed vide. Afficher 3 CTAs d'activation :

1. _Choisir vos centres d'intérêt_ → `/settings#interests`
2. _Suivre des migrateurs_ → `/explore/users`
3. _Activer votre zone_ → ouvre LocationPermissionModal

---

## 👤 Comportement selon l'état d'authentification

### Non connecté

- **Récent** → ✅ actif (tab par défaut)
- **Populaire** → ✅ actif
- **Pour vous** → 👁️ visible, grisé, cursor pointer

Au clic sur "Pour vous" (non connecté) :
→ Ouvre `ForYouDiscoveryModal` (proposition douce, non bloquante) :

- CTA principal : "Créer mon compte" → `/signup`
- CTA secondaire : "Continuer sans personnalisation" → ferme, reste sur Récent

### Connecté

- **Récent** → ✅ tab par défaut
- **Populaire** → ✅ actif
- **Pour vous** → ✅ actif avec 3 signaux

---

## ⚠️ Contraintes UX

- **Tab par défaut** : toujours "Récent" (pas de personnalisation présupposée)
- **Scroll** : remise en haut à chaque changement d'onglet
- **Pagination** : 20 items max par requête (CLAUDE.md)
- Aucune redondance entre tabs
- Différenciation claire : découverte (Récent/Populaire) vs personnalisation (Pour vous)
