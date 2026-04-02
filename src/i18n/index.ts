import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import fr from './locales/fr.json'
import en from './locales/en.json'

const savedLanguage = localStorage.getItem('naturegraph-lang') || 'fr'

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: savedLanguage,
  fallbackLng: 'fr',
  interpolation: {
    // false est INTENTIONNEL et SÉCURISÉ avec React :
    // React échappe automatiquement toutes les valeurs dans le JSX (XSS nativement bloqué).
    // N'activer escapeValue: true que si i18n est utilisé hors de React (ex: emails serveur).
    escapeValue: false,
  },
})

export default i18n
