# Molecules

> Combinaisons d'atoms avec une responsabilité unique.

| Molecule       | Statut | Composé de                         | Usage                                                       |
| -------------- | ------ | ---------------------------------- | ----------------------------------------------------------- |
| FormField      | ✅     | Label + Input + ErrorText          | Tous formulaires (existant `ui/FormField.tsx`)              |
| FeatureCard    | ✅     | IconCircle + heading + text        | Landing (3+) : **créé Sprint 2**                            |
| BackButton     | ✅     | button + ArrowLeft + label         | Onboarding (3) : **créé Sprint 2**                          |
| SocialLink     | ❌     | IconButton + tooltip               | Footer (basse priorité)                                     |
| SelectOption   | ✅     | button + label + radio/checkbox    | Onboarding (6) : **créé Sprint 2** (modes radio + checkbox) |
| StepIndicator  | ✅     | barre segmentée + ARIA progressbar | Onboarding (4) : **créé Sprint 2**                          |
| AccordionItem  | ❌     | Button + Icon + Panel              | Landing FAQ                                                 |
| LanguageToggle | 🟡     | Button + Dropdown                  | Header                                                      |
| ThemeToggle    | 🟡     | IconButton                         | Header (mode dark reporté post-MVP)                         |
| Tag            | ✅     | existant `ui/Tag.tsx`              | Posts                                                       |
