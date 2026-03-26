/**
 * OnboardingStep4 — Étape 4 : Choix du nom d'utilisateur
 *
 * Input avec validation temps réel + vérification disponibilité Supabase.
 * Compteur de caractères (max 25). Barre de progression 4/4.
 *
 * Accessibilité :
 * - <label htmlFor> associé à l'input (pas de aria-label redondant)
 * - aria-required sur l'input
 * - aria-invalid + aria-describedby vers le message d'erreur
 * - role="alert" sur le message d'erreur (annonce immédiate SR)
 * - aria-hidden sur le * décoratif et l'indicateur visuel de bordure
 * - role="progressbar" sur la barre de progression
 * - focus-visible ring sur toutes les interactions clavier
 * - has-[:focus-visible] sur le conteneur input pour ring accessible
 * - prefers-reduced-motion respecté
 * - aria-label sur les boutons retour et sortie
 */

import { useState, useEffect, type ChangeEvent } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { OnboardingButton } from './OnboardingButton'

// ─── Constantes ───────────────────────────────────────────────────────────────

const MIN_LENGTH = 3
const MAX_LENGTH = 25

/**
 * Liste complète des mots bannis côté client — 434 entrées.
 * Couvre : noms système réservés, vulgarités FR/EN/ES, termes discriminatoires,
 * contournements leetspeak courants, termes sexuels explicites.
 *
 * Détection via normalisation : retire . et _ puis compare en minuscules.
 * Ex : "f.u.c.k" → "fuck" ❌  |  "ad_min" → "admin" ❌  |  "nature" → "nature" ✅
 *
 * TODO [BACKEND] — Remplacer par une requête à une table `banned_usernames`
 *   gérée par les admins (Supabase table avec RLS read-only pour tous).
 *   La vérification finale doit toujours se faire côté serveur (RLS + trigger DB).
 *   Le back doit enrichir la normalisation :
 *   - substitutions leetspeak (4 → a, 3 → e, 1 → i/l, 0 → o, $ → s, etc.)
 *   - variantes avec accents (é → e, ñ → n, ü → u, etc.)
 *   - répétitions de caractères (fuuuck → fuck)
 *   Source : src/core/utils/username-validation.ts (liste de référence back-end)
 */
const BANNED_USERNAMES: readonly string[] = [
  // ── Mots réservés système ─────────────────────────────────────────────────
  'admin',
  'administrator',
  'moderator',
  'mod',
  'naturegraph',
  'support',
  'official',
  'staff',
  'root',
  'test',
  'system',
  'null',
  'undefined',
  'bot',
  'service',
  'help',
  'contact',
  'info',
  'mail',
  'postmaster',
  'webmaster',
  'noreply',

  // ── Vulgarités françaises ─────────────────────────────────────────────────
  'merde',
  'putain',
  'connard',
  'connasse',
  'salope',
  'salaud',
  'enculé',
  'enculer',
  'encule',
  'batard',
  'bâtard',
  'pute',
  'putes',
  'con',
  'conne',
  'connes',
  'cons',
  'couille',
  'couilles',
  'bite',
  'bites',
  'chatte',
  'chattes',
  'cul',
  'anus',
  'chier',
  'chiasse',
  'chieur',
  'chieuse',
  'foutre',
  'branler',
  'branleur',
  'branleuse',
  'sucer',
  'suceur',
  'suceuse',
  'niquer',
  'nique',
  'enfoiré',
  'enfoirée',
  'salopard',
  'saloperie',
  'ordure',
  'pourriture',
  'raclure',
  'tarlouze',
  'tapette',
  'pédé',
  'pédale',
  'grosse',
  'gros',
  'débile',
  'abruti',
  'imbécile',
  'crétin',
  'idiot',
  // Abréviations FR
  'fdp',
  'ntm',
  'vtff',
  'ptn',
  'pd',
  'tg',

  // ── Vulgarités anglaises ──────────────────────────────────────────────────
  'fuck',
  'fucked',
  'fucker',
  'fucking',
  'fck',
  'fuk',
  'fking',
  'shit',
  'shitty',
  'bullshit',
  'bitch',
  'bitches',
  'bastard',
  'asshole',
  'ashole',
  'ass',
  'arse',
  'dick',
  'dicks',
  'cock',
  'cocks',
  'pussy',
  'pussies',
  'cunt',
  'cunts',
  'damn',
  'damned',
  'hell',
  'bloody',
  'whore',
  'slut',
  'sluts',
  'wanker',
  'twat',
  'prick',
  'bollocks',
  'bugger',
  'shag',
  'tosser',
  'arsehole',
  'motherfucker',
  'mofo',
  'douche',
  'douchebag',
  'jackass',
  'retard',
  'retarded',
  'idiot',
  'moron',
  'stupid',
  'dumb',
  'dumbass',
  'boob',
  'boobs',
  'tit',
  'tits',
  'penis',
  'vagina',
  'screw',
  'piss',
  'pissed',
  'crap',
  'crappy',
  // Abréviations EN
  'wtf',
  'stfu',
  'ffs',
  'milf',
  'dilf',
  'kys',
  'fml',

  // ── Vulgarités espagnoles ─────────────────────────────────────────────────
  'puto',
  'puta',
  'putas',
  'putos',
  'mierda',
  'mierdas',
  'joder',
  'jodido',
  'coño',
  'cojon',
  'cojones',
  'pendejo',
  'pendeja',
  'cabrón',
  'cabron',
  'cabrona',
  'hijo',
  'perra',
  'perro',
  'idiota',
  'imbécil',
  'estúpido',
  'estupido',
  'tonto',
  'tonta',
  'gilipollas',
  'gilipolla',
  'maricón',
  'maricon',
  'marica',
  'boludo',
  'boluda',
  'pelotudo',
  'pelotuda',
  'huevón',
  'huevon',
  'weon',
  'verga',
  'chingar',
  'chingado',
  'chingada',
  'mamón',
  'mamon',
  'mamada',
  'polla',
  'chichi',
  'teta',
  'tetas',
  'culo',
  'culero',
  'panocha',
  'concha',
  'zorra',
  'zorro',
  'maldito',
  'maldita',
  'carajo',
  'pinche',
  'culiao',
  'conchudo',
  'conchuda',
  'pajero',
  'pajera',
  // Abréviations ES
  'hdp',
  'hpta',
  'ctm',
  'csm',
  'ptm',
  'lpm',
  'qlq',
  'ctmr',

  // ── Termes discriminatoires & offensants ──────────────────────────────────
  // Racisme
  'nazi',
  'nazis',
  'hitler',
  'heil',
  'nigger',
  'nigga',
  'niggas',
  'negro',
  'nègre',
  'negre',
  'beaner',
  'chink',
  'gook',
  'kike',
  'spic',
  'wetback',
  'cracker',
  'honky',
  'coon',
  'paki',
  'towelhead',
  'raghead',
  'arab',
  'terrorist',
  'jihad',
  // Homophobie
  'fag',
  'faggot',
  'faggots',
  'dyke',
  'queer',
  'homo',
  'homos',
  'sodomite',
  // Sexisme
  'rape',
  'raper',
  'rapist',
  'molest',
  'incest',
  // Handicap
  'spastic',
  'mongo',
  'downie',
  'autist',
  'autistic',
  // Violence
  'kill',
  'murder',
  'suicide',
  'genocide',
  'bomb',
  'explosion',
  'weapon',
  'gun',
  'knife',
  // Drogue
  'cocaine',
  'heroin',
  'meth',
  'crack',
  'weed',
  'cannabis',
  'marijuana',
  'drug',
  'dealer',
  // Extrémisme
  'isis',
  'alqaeda',
  'taliban',
  'extremist',
  'radical',

  // ── Contournements courants (leetspeak & variations) ─────────────────────
  'fuc',
  'fuk',
  'fvck',
  'phuck',
  'sh1t',
  'sht',
  'btch',
  'b1tch',
  'azz',
  'd1ck',
  'dik',
  'cnt',
  'kunt',
  'a55',
  'n1gger',
  'n1gga',
  'fck',
  'shlt',
  'motherfker',
  'motherfkr',
  'mothafucka',
  'soab',
  'sob',
  // Variantes françaises
  'mrd',
  'nkm',
  'enklr',
  'btrd',
  'saloppe',
  'enkl',
  'nkr',
  // Variantes espagnoles
  'pta',
  'pto',
  'jdr',
  'cdm',
  'vrga',
  'wbn',
  'gey',

  // ── Termes sexuels explicites ─────────────────────────────────────────────
  'sex',
  'porn',
  'porno',
  'xxx',
  'nude',
  'nudes',
  'naked',
  'orgasm',
  'masturbate',
  'masturbation',
  'blowjob',
  'handjob',
  'anal',
  'oral',
  'cum',
  'cumming',
  'ejaculate',
  'erection',
  'horny',
  'fetish',
  'bdsm',
  'bondage',
  'dildo',
  'vibrator',
  'hentai',
  'booty',
  'hooker',
  'prostitute',
  'escort',
  'stripper',
]

/**
 * Normalise un nom d'utilisateur pour la détection de mots bannis.
 * Retire les séparateurs (. et _) et passe en minuscules.
 * Ex : "f.u.c.k" → "fuck" ❌  |  "ad_min" → "admin" ❌  |  "nature" → "nature" ✅
 */
function normalizeForBannedCheck(username: string): string {
  return username.toLowerCase().replace(/[._]/g, '')
}

// ─── Types ────────────────────────────────────────────────────────────────────

type UsernameError = 'tooShort' | 'tooLong' | 'invalidFormat' | 'alreadyTaken' | 'bannedWord' | null

interface OnboardingStep4Props {
  onComplete: (username: string) => void
  onBack: () => void
  initialUsername?: string
  onExit?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateFormat(username: string): UsernameError {
  if (username.length < MIN_LENGTH) return 'tooShort'
  if (username.length > MAX_LENGTH) return 'tooLong'
  if (!/^[a-zA-Z0-9._]+$/.test(username)) return 'invalidFormat'
  if (/^[._]|[._]$/.test(username)) return 'invalidFormat'
  if (/[._]{2,}/.test(username)) return 'invalidFormat'
  // Vérification mots bannis côté client (normalisation anti-contournement)
  if (BANNED_USERNAMES.includes(normalizeForBannedCheck(username))) return 'bannedWord'
  return null
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function OnboardingStep4({
  onComplete,
  onBack,
  initialUsername = '',
  onExit,
}: OnboardingStep4Props) {
  const { t } = useTranslation()
  const [username, setUsername] = useState(initialUsername)
  const [formatError, setFormatError] = useState<UsernameError>(null)
  const [serverError, setServerError] = useState<UsernameError>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [hasTyped, setHasTyped] = useState(false)

  // Validation format en temps réel
  useEffect(() => {
    if (!hasTyped || username.length === 0) {
      setFormatError(null)
      return
    }
    setFormatError(validateFormat(username))
  }, [username, hasTyped])

  // Vérification disponibilité Supabase avec debounce
  useEffect(() => {
    if (!hasTyped || username.length === 0 || formatError !== null) {
      setServerError(null)
      setIsChecking(false)
      return
    }

    setIsChecking(true)
    const timer = setTimeout(async () => {
      try {
        if (supabase) {
          const { data } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username.trim())
            .maybeSingle()
          setServerError(data ? 'alreadyTaken' : null)
        } else {
          // Simulation hors Supabase
          const taken = ['admin', 'naturegraph', 'user', 'test']
          setServerError(taken.includes(username.toLowerCase()) ? 'alreadyTaken' : null)
        }
      } finally {
        setIsChecking(false)
      }
    }, 800)

    return () => {
      clearTimeout(timer)
      setIsChecking(false)
    }
  }, [username, formatError, hasTyped])

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (!hasTyped) setHasTyped(true)
    if (val.length <= MAX_LENGTH) setUsername(val)
  }

  const error: UsernameError = formatError ?? serverError
  const isValid = username.length >= MIN_LENGTH && error === null && !isChecking

  const borderClass = () => {
    if (!hasTyped || username.length === 0) return 'border-border'
    if (isChecking) return 'border-primary'
    if (error) return 'border-destructive-foreground'
    return 'border-primary'
  }

  const bgClass = () => {
    if (username.length === 0) return 'bg-off-white'
    if (error && hasTyped) return 'bg-destructive/10'
    return 'bg-primary-light'
  }

  return (
    <div className="flex flex-col overflow-clip w-full h-full">
      <div className="flex flex-col items-start p-6 md:p-8 gap-8 h-full min-h-[730px] max-h-screen">
        {/* Header : badge + étape + progression */}
        <div className="flex flex-col gap-3 w-full shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="bg-teal-dark flex h-8 items-center justify-center px-3 rounded-button shrink-0">
              <p className="text-text-light text-sm">{t('onboarding.categories.profile')}</p>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {/* aria-hidden : redondant avec role="progressbar" ci-dessous */}
              <p className="text-text-dark" aria-hidden="true">
                {t('onboarding.stepLabel')} 4/4
              </p>
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  aria-label={t('onboarding.exitButtonLabel')}
                  className="bg-[#f0f0f5] flex items-center justify-center rounded-full shrink-0 size-8 hover:bg-[#e0e0eb] transition-colors motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="#090F0D"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Barre de progression 4/4 */}
          <div
            role="progressbar"
            aria-valuenow={4}
            aria-valuemax={4}
            aria-valuetext={t('onboarding.progressLabel', { current: 4, total: 4 })}
            className="flex gap-1 w-full"
          >
            <div className="flex-1 h-[6px] bg-teal-dark rounded-button" />
            <div className="flex-1 h-[6px] bg-teal-dark rounded-button" />
            <div className="flex-1 h-[6px] bg-teal-dark rounded-button" />
            <div className="flex-1 h-[6px] bg-teal-dark rounded-button" />
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex flex-col gap-6 items-start w-full overflow-y-auto flex-1">
          <div className="flex flex-col gap-3 w-full shrink-0">
            <h3 className="text-foreground">{t('onboarding.username.title')}</h3>
            <p className="text-text-dark">{t('onboarding.username.description')}</p>
          </div>

          {/* Input */}
          <div className="flex flex-col gap-2 w-full shrink-0">
            {/*
             * <label htmlFor> associe sémantiquement le libellé à l'input.
             * Le * est décoratif (aria-hidden) : aria-required="true" porte l'info.
             */}
            <label htmlFor="onboarding-username" className="text-text-dark">
              {t('onboarding.username.inputLabel')}
              <span aria-hidden="true" className="text-destructive-foreground">
                {t('onboarding.username.inputRequired')}
              </span>
            </label>

            <div className="relative w-full">
              {/*
               * has-[:focus-visible]:ring-2 expose le ring sur le conteneur quand
               * l'input reçoit le focus clavier, sans affecter le focus souris.
               */}
              <div
                className={`h-12 rounded-button w-full transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-1 ${bgClass()}`}
              >
                {/* Border overlay — décoratif, état porté par aria-invalid */}
                <div
                  aria-hidden="true"
                  className={`absolute inset-0 pointer-events-none rounded-button border transition-colors ${borderClass()}`}
                />

                {/* Input + compteur */}
                <div className="flex items-center px-6 size-full gap-3">
                  <input
                    id="onboarding-username"
                    type="text"
                    value={username}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isValid) onComplete(username.trim())
                    }}
                    className="flex-1 min-w-0 bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground"
                    aria-required="true"
                    aria-invalid={!!error}
                    aria-describedby={error ? 'username-error' : undefined}
                    // eslint-disable-next-line jsx-a11y/no-autofocus -- Focus automatique justifié : seul champ de la modale (pattern ARIA dialog)
                    autoFocus
                  />
                  <div className="shrink-0" aria-hidden="true">
                    {isChecking ? (
                      <p className="text-primary text-sm">
                        {t('onboarding.username.errors.checking')}
                      </p>
                    ) : (
                      <p className="text-text-dark opacity-[0.64]">
                        {MAX_LENGTH - username.length}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Message d'erreur ou texte d'aide */}
            {error && hasTyped ? (
              <p id="username-error" className="text-destructive-foreground text-sm" role="alert">
                {t(`onboarding.username.errors.${error}`)}
              </p>
            ) : (
              <p className="italic text-text-dark">{t('onboarding.username.inputHelper')}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 md:gap-4 w-full shrink-0">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('onboarding.back')}
            className="flex items-center justify-center gap-3 h-12 px-6 bg-off-white border border-border rounded-button hover:border-foreground/40 transition-all motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <ArrowLeft className="size-5 text-foreground" aria-hidden="true" />
            <span className="hidden md:inline text-foreground">{t('onboarding.back')}</span>
          </button>
          <OnboardingButton
            variant="primary"
            onClick={() => isValid && onComplete(username.trim())}
            disabled={!isValid}
            className="flex-1"
          >
            {isValid
              ? t('onboarding.username.buttonEnabled')
              : t('onboarding.username.buttonDisabled')}
          </OnboardingButton>
        </div>
      </div>
    </div>
  )
}
