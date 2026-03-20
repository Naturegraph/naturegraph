import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Eye,
  Camera,
  Users,
  Shield,
  Heart,
  Share2,
  Compass,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";

export default function Landing() {
  const { t } = useTranslation();

  return (
    <div data-theme="light" className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] overflow-x-hidden">
      <LandingHeader />
      <HeroSection />
      <DiscoverSection />
      <ValuesSection />
      <AppFeaturesSection />
      <StoryCtaSection />
      <ObservationSection />
      <DiscordSection />
      <FaqSection />
      <PartnersSection />
      <LandingFooter />
    </div>
  );
}

/* ================================================================== */
/*  HEADER                                                             */
/* ================================================================== */

function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between h-16 px-5 lg:px-10">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-[var(--color-primary)]">Naturegraph</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Navigation principale">
          <a href="#discover" className="text-sm font-medium text-gray-600 hover:text-[var(--color-primary)] transition-colors">
            Decouvrir
          </a>
          <a href="#values" className="text-sm font-medium text-gray-600 hover:text-[var(--color-primary)] transition-colors">
            Impact
          </a>
          <a href="#discord" className="text-sm font-medium text-gray-600 hover:text-[var(--color-primary)] transition-colors">
            Communaute
          </a>
          <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-[var(--color-primary)] transition-colors">
            FAQ
          </a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/signup"
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Commencer l'aventure
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden p-2 text-gray-600"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-5 py-4 space-y-3">
          <a href="#discover" className="block text-sm font-medium text-gray-600 py-2" onClick={() => setMobileOpen(false)}>Decouvrir</a>
          <a href="#values" className="block text-sm font-medium text-gray-600 py-2" onClick={() => setMobileOpen(false)}>Impact</a>
          <a href="#discord" className="block text-sm font-medium text-gray-600 py-2" onClick={() => setMobileOpen(false)}>Communaute</a>
          <a href="#faq" className="block text-sm font-medium text-gray-600 py-2" onClick={() => setMobileOpen(false)}>FAQ</a>
          <Link
            to="/signup"
            className="block text-center px-5 py-2.5 text-sm font-semibold text-white bg-[var(--color-primary)] rounded-lg"
            onClick={() => setMobileOpen(false)}
          >
            Commencer l'aventure
          </Link>
        </div>
      )}
    </header>
  );
}

/* ================================================================== */
/*  HERO                                                               */
/* ================================================================== */

function HeroSection() {
  return (
    <section className="relative bg-[var(--color-primary)] overflow-hidden">
      {/* Background image overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)]/95 via-[var(--color-primary)]/80 to-[var(--color-primary)]/40" />

      {/* Hero image right side (desktop) */}
      <div className="absolute inset-0 hidden lg:block">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-black/10 to-transparent" />
      </div>

      <div className="relative max-w-[1280px] mx-auto px-5 lg:px-10 py-16 lg:py-24">
        <div className="max-w-xl">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            Ensemble, donnons vie a tes rencontres !
          </h1>
          <p className="text-base lg:text-lg text-white/80 mb-8 max-w-md">
            Chaque sortie devient un souvenir, chaque observation une histoire a partager.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-[var(--color-primary)] bg-white rounded-lg hover:bg-gray-50 transition-colors"
            >
              Partage une decouverte
            </Link>
            <Link
              to="/explore"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white border border-white/40 rounded-lg hover:bg-white/10 transition-colors"
            >
              Decouvre notre mission
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative rounded image (desktop) */}
      <div className="hidden lg:block absolute right-10 xl:right-20 top-1/2 -translate-y-1/2 w-[420px] h-[340px] rounded-3xl overflow-hidden shadow-2xl">
        <div className="w-full h-full bg-gradient-to-br from-[var(--color-primary-light)]/30 to-[var(--color-secondary)]/20 flex items-center justify-center">
          <Camera size={64} className="text-white/30" />
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  DISCOVER NATUREGRAPH (3 cards)                                     */
/* ================================================================== */

function DiscoverSection() {
  const cards = [
    {
      icon: <Eye size={24} />,
      title: "Observe a ton rythme",
      description:
        "Pas besoin d'etre un expert naturaliste pour commencer. Tu observes la nature qui t'entoure et tu la documentes a ta facon.",
    },
    {
      icon: <Camera size={24} />,
      title: "Partage tes instants",
      description:
        "Publie facilement tes observations avec photos. Chaque decouverte peut aller loin grace a un reseau engage pour la biodiversite.",
    },
    {
      icon: <Users size={24} />,
      title: "Construire ensemble",
      description:
        "Naturegraph est une communaute. Identifie, commente, aide d'autres observateurs et contribue a mieux connaitre la nature qui nous entoure.",
    },
  ];

  return (
    <section id="discover" className="py-16 lg:py-24 bg-[var(--color-bg-secondary)]">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)]">
            Decouvre Naturegraph
          </h2>
          <p className="text-sm text-gray-500 lg:max-w-xs lg:text-right">
            Observe ton fil, decouvre tes voisins, et embarque.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100"
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-5">
                {card.icon}
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">
                {card.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  VALUES / GUIDE (Transparence, Communaute, Partage)                 */
/* ================================================================== */

function ValuesSection() {
  const values = [
    {
      icon: <Shield size={20} />,
      title: "Transparence a la construction",
      description:
        "Nous partageons nos principes, nos choix et nos differents axes a chaque etape du developpement, et accueillons les retours constructifs sur notre beta.",
    },
    {
      icon: <Heart size={20} />,
      title: "Communaute au coeur",
      description:
        "Naturegraph existe grace a ses membres. Identifier, echanger, decouvrir ensemble : c'est cette dynamique qui donne tout son sens a l'experience.",
    },
    {
      icon: <Share2 size={20} />,
      title: "Partage et emotions",
      description:
        "Chaque sortie est une occasion de s'emerveiller et partager : photos, recits, carnets de terrain et partage au sein de la communaute.",
    },
  ];

  return (
    <section id="values" className="py-16 lg:py-24 bg-white">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          {/* Image left */}
          <div className="lg:w-1/2 rounded-3xl overflow-hidden bg-[var(--color-bg-tertiary)] aspect-[4/3] lg:aspect-auto flex items-center justify-center">
            <div className="w-full h-full min-h-[300px] bg-gradient-to-br from-[var(--color-primary-light)]/20 to-[var(--color-secondary)]/10 flex items-center justify-center">
              <Compass size={64} className="text-[var(--color-primary)]/20" />
            </div>
          </div>

          {/* Content right */}
          <div className="lg:w-1/2 flex flex-col justify-center">
            <h2 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)] mb-3">
              Ce qui nous guide au quotidien
            </h2>
            <div className="space-y-6 mt-6">
              {values.map((v, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mt-0.5">
                    {v.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
                      {v.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {v.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  APP FEATURES (4 features around phone mockup)                      */
/* ================================================================== */

function AppFeaturesSection() {
  const features = [
    {
      icon: <Camera size={20} />,
      title: "Immortalise tes rencontres nature",
      description:
        "Publie tes observations, ajoute des photos et retiens les belles decouvertes. Partage avec la communaute ou garde-les dans tes carnets personnels.",
      position: "left-top",
    },
    {
      icon: <Compass size={20} />,
      title: "Decouvre les dernieres observations",
      description:
        "Explore ton fil d'actualite et decouvre les derniers animaux et vegetaux observes pres de chez toi ou a travers le monde.",
      position: "left-bottom",
    },
    {
      icon: <BookOpen size={20} />,
      title: "Gere ton profil et suis tes decouvertes",
      description:
        "Retrouve toutes tes observations, tes carnets et tes badges. Personnalise et complete ton profil.",
      position: "right-top",
    },
    {
      icon: <HelpCircle size={20} />,
      title: "Obtiens de l'aide pour identifier une espece",
      description:
        "Pas sur de l'espece ? La communaute est la pour t'aider. Propose une identification ou valide celles des autres.",
      position: "right-bottom",
    },
  ];

  return (
    <section className="py-16 lg:py-24 bg-[var(--color-bg-secondary)]">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)] mb-3">
            Decouvre ce que l'app t'apporte
          </h2>
          <p className="text-sm text-gray-500 max-w-xl mx-auto">
            Publie tes observations, ajoute des photos et decouvre ce que tu as a offrir. Chaque aventure devient un souvenir partage avec la communaute.
          </p>
        </div>

        {/* Mobile: stacked list */}
        <div className="lg:hidden space-y-6">
          {features.map((f, i) => (
            <div key={i} className="flex gap-4 bg-white rounded-2xl p-5 border border-gray-100">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                <span className="text-sm font-bold">{i + 1}</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                  {f.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: features around phone mockup */}
        <div className="hidden lg:grid grid-cols-3 gap-8 items-center">
          {/* Left features */}
          <div className="space-y-10">
            {features.filter((_, i) => i < 2).map((f, i) => (
              <div key={i} className="text-right">
                <div className="flex items-center justify-end gap-3 mb-2">
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                    {f.title}
                  </h3>
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                    <span className="text-sm font-bold">{i + 1}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>

          {/* Phone mockup center */}
          <div className="flex justify-center">
            <div className="w-[240px] h-[480px] rounded-[36px] bg-gradient-to-b from-[var(--color-primary)] to-[var(--color-primary-dark)] shadow-2xl flex items-center justify-center border-4 border-gray-200">
              <div className="w-[220px] h-[460px] rounded-[32px] bg-white/10 flex items-center justify-center">
                <Camera size={48} className="text-white/30" />
              </div>
            </div>
          </div>

          {/* Right features */}
          <div className="space-y-10">
            {features.filter((_, i) => i >= 2).map((f, i) => (
              <div key={i} className="text-left">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                    <span className="text-sm font-bold">{i + 3}</span>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                    {f.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  STORY CTA (bird image + "Et si chaque sortie...")                  */
/* ================================================================== */

function StoryCtaSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="flex flex-col lg:flex-row min-h-[400px] lg:min-h-[500px]">
        {/* Left content - dark bg */}
        <div className="lg:w-1/2 bg-[var(--color-text-primary)] px-5 lg:px-16 py-16 lg:py-24 flex flex-col justify-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
            <span className="text-2xl">&#x1F4AC;</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white leading-tight mb-4">
            Et si chaque sortie devenait une histoire ?
          </h2>
          <p className="text-sm text-white/60 leading-relaxed mb-8 max-w-md">
            Imagine que tes pas sont les guides, que ta feuille de route est faite de sentiers, de chants d'oiseaux et de rencontres inattendues. Naturegraph t'accompagne pour ne plus jamais perdre le fil de tes explorations.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[var(--color-text-primary)] bg-[var(--color-secondary)] rounded-lg hover:bg-[var(--color-primary-light)] transition-colors w-fit"
          >
            Commencer l'aventure
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Right image */}
        <div className="lg:w-1/2 bg-gradient-to-br from-[var(--color-secondary)]/30 to-[var(--color-primary)]/20 flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <span className="text-6xl">&#x1F426;</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  OBSERVATION MEANING                                                */
/* ================================================================== */

function ObservationSection() {
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">
          {/* Image left */}
          <div className="lg:w-1/2 rounded-3xl overflow-hidden bg-[var(--color-bg-tertiary)] aspect-[4/3] lg:aspect-auto w-full flex items-center justify-center min-h-[300px]">
            <div className="w-full h-full min-h-[300px] bg-gradient-to-br from-[var(--color-warning)]/10 to-[var(--color-primary)]/10 flex items-center justify-center">
              <Camera size={64} className="text-[var(--color-primary)]/20" />
            </div>
          </div>

          {/* Content right */}
          <div className="lg:w-1/2">
            <h2 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)] mb-4">
              Donner du sens a chaque observation
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              La science naturaliste permet de comprendre. Naturegraph permet de documenter tes decouvertes et de les valoriser dans un cadre collaboratif et pedagogique. En combinant technologie et intelligence collective, Naturegraph veut transformer chaque observation en une contribution utile.
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Que tu sois debutant curieux, observateur aguerri ou scientifique passionne, chaque donnee que tu ajoutes enrichit notre comprehension collective de la biodiversite.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  DISCORD CTA                                                        */
/* ================================================================== */

function DiscordSection() {
  return (
    <section id="discord" className="py-16 lg:py-24 bg-[var(--color-bg-secondary)]">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
          {/* Content left */}
          <div className="lg:w-1/2">
            <h2 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)] mb-4">
              Rejoins-nous sur Discord !
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6 max-w-md">
              Un espace unique pour echanger sur tes sorties nature, poser tes questions, donner ton avis sur les evolutions de l'application et rencontrer d'autres passionnes.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <ChevronRight size={16} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
                Partage tes sorties et decouverte avec d'autres amateurs
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <ChevronRight size={16} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
                Pose tes questions d'identification aux observateurs experimentes
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <ChevronRight size={16} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
                Donne ton avis sur les nouvelles fonctionnalites
              </li>
            </ul>
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#5865F2] rounded-lg hover:bg-[#4752C4] transition-colors"
            >
              Rejoindre le Discord
              <ArrowRight size={16} />
            </a>
          </div>

          {/* Discord preview right */}
          <div className="lg:w-1/2 rounded-2xl overflow-hidden bg-[#36393F] p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white text-sm font-bold">
                N
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Naturegraph</p>
                <p className="text-xs text-gray-400">Serveur communautaire</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-[#2F3136] rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1"># general</p>
                <p className="text-sm text-gray-300">Bienvenue dans la communaute Naturegraph ! N'hesite pas a te presenter.</p>
              </div>
              <div className="bg-[#2F3136] rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1"># identifications</p>
                <p className="text-sm text-gray-300">Quelqu'un peut m'aider a identifier cet oiseau ? Photo prise ce matin.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  FAQ                                                                */
/* ================================================================== */

function FaqSection() {
  const faqs = [
    {
      q: "L'application est-elle gratuite ?",
      a: "Oui, Naturegraph est entierement gratuite et le restera. Pas d'abonnement, pas de publicite. Notre objectif est de rendre l'observation de la nature accessible a tous.",
    },
    {
      q: "Suis-je un expert pour contribuer ?",
      a: "Absolument pas ! Naturegraph est concu pour tout le monde, du debutant curieux a l'expert naturaliste. La communaute est la pour t'aider a identifier tes observations.",
    },
    {
      q: "Quand l'application sera-t-elle disponible ?",
      a: "Nous travaillons activement sur le developpement. Rejoins notre Discord pour suivre les avancees et etre parmi les premiers a tester la beta.",
    },
    {
      q: "Comment puis-je aider le projet ?",
      a: "Tu peux nous aider de plusieurs facons : rejoindre la communaute Discord, partager le projet autour de toi, ou nous donner tes retours sur les fonctionnalites.",
    },
  ];

  return (
    <section id="faq" className="py-16 lg:py-24 bg-white">
      <div className="max-w-[720px] mx-auto px-5 lg:px-10">
        <h2 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)] text-center mb-12">
          Reponses a tes questions
        </h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FaqItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-[var(--color-text-primary)] pr-4">
          {question}
        </span>
        <ChevronDown
          size={18}
          className={`text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm text-gray-500 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  PARTNERS                                                           */
/* ================================================================== */

function PartnersSection() {
  return (
    <section className="py-12 lg:py-16 bg-[var(--color-bg-secondary)] border-t border-gray-200">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10 text-center">
        <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-8">
          Ils soutiennent Naturegraph
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
          <span className="text-xl font-bold text-gray-300 tracking-wide">wazoom</span>
          <span className="text-xl font-bold text-gray-300 tracking-wide">Curiosity</span>
          <span className="text-xl font-bold text-gray-300 tracking-wide">ENTEMYLAB</span>
          <span className="text-xl font-bold text-gray-300 tracking-wide">Pal&middot;une</span>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  FOOTER                                                             */
/* ================================================================== */

function LandingFooter() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-10 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <span className="text-xl font-bold text-[var(--color-primary)] block mb-3">
              Naturegraph
            </span>
            <p className="text-sm text-gray-500 leading-relaxed">
              Naturegraph est un projet en cours de developpement. Rejoins-nous pour observer, documenter et partager la biodiversite.
            </p>
          </div>

          {/* Produit */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
              Produit
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#discover" className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors">
                  Fonctionnalites
                </a>
              </li>
              <li>
                <a href="#values" className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors">
                  Notre mission
                </a>
              </li>
              <li>
                <a href="#faq" className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Entreprise */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
              Entreprise
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#" className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors">
                  Mentions legales
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors">
                  Politique de confidentialite
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-500 hover:text-[var(--color-primary)] transition-colors">
                  CGU
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter CTA */}
          <div>
            <div className="bg-[var(--color-primary)] rounded-2xl p-6">
              <p className="text-sm font-semibold text-white mb-2">
                Envie de reprendre l'aventure ?
              </p>
              <p className="text-xs text-white/60 mb-4">
                Decouvre les futures mises a jour.
              </p>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-[var(--color-primary)] bg-white rounded-lg hover:bg-gray-50 transition-colors"
              >
                S'inscrire
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Naturegraph &middot; Tous droits reserves
          </p>
          <p className="text-xs text-gray-400">
            Donnees taxonomiques : TAXREF v18.0 — PatriNat (OFB-CNRS-MNHN-IRD)
          </p>
        </div>
      </div>
    </footer>
  );
}
