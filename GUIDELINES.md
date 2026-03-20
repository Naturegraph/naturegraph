# Naturegraph — Guidelines projet

> Referentiel interne eco-conception, accessibilite et qualite.
> Base sur le Guide d'Eco-conception des Designers Ethiques (CC-BY) et le RGESN.

---

## 1. Eco-conception

### Principes fondamentaux
- **Sobriete fonctionnelle** : chaque fonctionnalite doit repondre a un besoin reel. Pas de feature "nice-to-have" sans justification.
- **Mobile-first** : concevoir d'abord pour mobile, enrichir pour desktop. Plus facile de passer mobile → desktop que l'inverse.
- **Budget performance** : chaque page doit rester sous les seuils definis.
- **Reduire l'obsolescence** : supporter les anciens terminaux et navigateurs, limiter la consommation CPU/RAM.

### Seuils de performance par page

| Metrique | Seuil | Outil |
|----------|-------|-------|
| Poids total JS | < 300 KB (gzip) | Vite build |
| Poids total CSS | < 50 KB (gzip) | Vite build |
| Poids page (transfert) | < 500 KB | Lighthouse |
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse |
| FID / INP | < 200ms | Lighthouse |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse |
| EcoIndex | A ou B | GreenIT Analysis |
| Nombre de requetes HTTP | < 30 par page | DevTools |

### Images & medias
- Format WebP ou AVIF obligatoire (fallback PNG/JPG)
- Lazy loading (`loading="lazy"`) sur toutes les images hors viewport
- Images dimensionnees (`width`/`height` explicites) pour eviter le CLS
- Pas de video en fond (background video)
- Pas d'autoplay sur les carrousels
- Compression avant upload (cible : < 100 KB par image affichee)

### Polices
- Maximum 2 familles (Quicksand + Mulish)
- Charger uniquement les graisses utilisees
- `font-display: swap` pour eviter le FOIT
- Preconnect aux serveurs de fonts

### CSS & JS
- Preferer CSS aux animations JS
- Pas de dependance JS sans justification (audit avant ajout)
- Code splitting / lazy loading des pages (deja en place via React Router)
- Tree-shaking automatique (Vite)
- Pas de polyfill inutile

### Requetes & donnees
- Pagination obligatoire (pas de scroll infini)
- Cache client via TanStack Query (staleTime adapte)
- Pas de collecte de donnees inutile dans les formulaires
- Compression gzip/brotli sur le serveur

### Animations
- Limiter les animations au strict necessaire (feedback UI)
- Respecter `prefers-reduced-motion`
- Pas de GIF anime
- Pas de chatbot

---

## 2. Accessibilite (WCAG AA)

### Principes
- **Perceptible** : tout contenu non-textuel a un equivalent textuel
- **Utilisable** : navigation complete au clavier
- **Comprehensible** : langue declaree, messages d'erreur clairs
- **Robuste** : HTML semantique, compatible lecteurs d'ecran

### Regles obligatoires

| Critere | Regle |
|---------|-------|
| Contraste texte | Ratio >= 4.5:1 (texte normal), >= 3:1 (grand texte) |
| Contraste UI | Ratio >= 3:1 pour les elements interactifs |
| Focus visible | Outline visible sur tous les elements focusables |
| Skip link | Lien "Aller au contenu" en premier element |
| Aria labels | Sur tous les elements interactifs sans texte visible |
| Alt text | Sur toutes les images informatives. `alt=""` pour les decoratives |
| HTML semantique | `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`, headings h1-h6 |
| Formulaires | `<label>` associe a chaque input, messages d'erreur lies par `aria-describedby` |
| Responsive | Zoom 200% sans perte de contenu |
| Animations | `prefers-reduced-motion: reduce` respecte |
| Langue | `lang="fr"` sur `<html>`, `lang` sur les passages en autre langue |

### Outils de verification
- **WAVE** : audit accessibilite
- **Colour Contrast Analyser** : verification des contrastes
- **Navigation clavier** : test manuel Tab/Shift+Tab/Enter/Escape
- **Lecteur d'ecran** : test NVDA ou VoiceOver

---

## 3. Qualite du code

### TypeScript
- Mode strict active (`strict: true`)
- Pas de `any` — utiliser `unknown` + type guards si necessaire
- Types explicites sur les props de composants

### Composants React
- Un composant = un fichier
- Maximum 200 lignes par composant (sinon decomposer)
- Separation logique (hooks) / presentation (JSX)
- Props typees avec interface ou type

### Design system
- Toujours utiliser les tokens du design system (CSS custom properties)
- Jamais de couleurs en dur dans les composants
- Composants UI reutilisables dans `src/components/ui/`
- Respecter la nomenclature Figma

### CSS
- SCSS pour le design system et les themes
- Tailwind pour le layout rapide dans les composants
- Pas de `!important` (sauf utilities)
- Pas de styles inline sauf cas dynamique justifie

### Git
- Commits atomiques, messages clairs
- Format : `feat:`, `fix:`, `refactor:`, `docs:`, `style:`, `perf:`, `test:`
- Une branche par feature/fix

---

## 4. Tests eco/a11y (audit automatique)

Apres chaque implementation, verifier :

### Checklist eco-conception
- [ ] Poids de la page < 500 KB
- [ ] Images optimisees (WebP/AVIF, lazy loading)
- [ ] Pas de nouvelle dependance JS sans justification
- [ ] Pas d'animation superflue
- [ ] Pagination (pas de scroll infini)
- [ ] prefers-reduced-motion respecte
- [ ] Requetes HTTP minimisees

### Checklist accessibilite
- [ ] Navigation clavier complete
- [ ] Contrastes conformes (4.5:1 / 3:1)
- [ ] Focus visible sur tous les interactifs
- [ ] Aria labels presents
- [ ] HTML semantique
- [ ] Alt text sur les images
- [ ] Formulaires accessibles

### Outils d'audit
- **Lighthouse** : perf + a11y + best practices
- **GreenIT Analysis** : EcoIndex
- **GTmetrix** : waterfall + poids
- **Yellow Lab Tools** : qualite frontend
- **axe DevTools** : accessibilite

---

## 5. Conformite RGESN

Criteres du Referentiel General d'Ecoconception des Services Numeriques appliques :

- **1.4** : Methodologie d'autoevaluation documentee
- **1.9** : Technologies standards interoperables
- **2.2** : Test sur anciens terminaux
- **2.3** : Test sur connexion 3G/bas-debit
- **2.4** : Test sur anciennes versions navigateur
- **2.5** : Design responsive multi-terminaux
- **2.6** : Revue conception avant developpement
- **3.5** : Mises a jour correctives independantes des evolutives
- **4.3** : Parcours de navigation optimise

---

## References
- [Guide d'eco-conception — Designers Ethiques](https://designersethiques.org/fr/thematiques/ecoconception/guide-d-ecoconception)
- [RGESN — Referentiel General d'Ecoconception](https://ecoresponsable.numerique.gouv.fr/publications/referentiel-general-ecoconception/)
- [WCAG 2.1 — W3C](https://www.w3.org/WAI/WCAG21/quickref/)
- [RGAA — Referentiel General d'Amelioration de l'Accessibilite](https://accessibilite.numerique.gouv.fr/)
