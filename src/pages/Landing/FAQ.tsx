/**
 * FAQ — Questions fréquentes avec accordéon
 * ==========================================
 * Image à gauche (desktop) / en haut (mobile) + liste de questions.
 * Accordéon animé avec icônes +/- via lucide-react.
 * Premier item ouvert par défaut.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { Minus, Plus } from 'lucide-react'
import faqNature from '@/assets/images/faq-nature.png'

/* ── Item FAQ individuel ──────────────────────────────────────────── */

function FaqItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="bg-[var(--color-surface-cream-light)] rounded-[20px] w-full">
      <div className="flex flex-col p-6">
        {/* Question */}
        <button
          onClick={onToggle}
          className="flex items-center gap-8 w-full text-left bg-transparent border-none cursor-pointer p-0"
          aria-expanded={isOpen}
        >
          <h4 className="flex-1 text-[var(--color-text-primary)]">{question}</h4>
          <div className="shrink-0 size-8 flex items-center justify-center">
            <AnimatePresence mode="wait" initial={false}>
              {isOpen ? (
                <motion.div
                  key="minus"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                  <Minus className="size-6 text-[var(--color-text-primary)]" strokeWidth={2} />
                </motion.div>
              ) : (
                <motion.div
                  key="plus"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                  <Plus className="size-6 text-[var(--color-text-primary)]" strokeWidth={2} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </button>

        {/* Réponse animée */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{
                height: 'auto',
                opacity: 1,
                transition: {
                  height: { duration: 0.3, ease: 'easeInOut' },
                  opacity: { duration: 0.2, delay: 0.1 },
                },
              }}
              exit={{
                height: 0,
                opacity: 0,
                transition: {
                  height: { duration: 0.3, ease: 'easeInOut' },
                  opacity: { duration: 0.2 },
                },
              }}
              className="overflow-hidden"
            >
              <p className="text-[var(--color-text-muted)] pt-4">{answer}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ── Composant principal ──────────────────────────────────────────── */

export function FAQ() {
  const { t } = useTranslation()
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(['q1']))

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const questions = [
    { id: 'q1', question: t('landing.faq.q1'), answer: t('landing.faq.a1') },
    { id: 'q2', question: t('landing.faq.q2'), answer: t('landing.faq.a2') },
    { id: 'q3', question: t('landing.faq.q3'), answer: t('landing.faq.a3') },
    { id: 'q4', question: t('landing.faq.q4'), answer: t('landing.faq.a4') },
  ]

  const QuestionList = (
    <div className="flex flex-col gap-10 lg:gap-12 flex-1">
      <h2 className="landing-section-title text-[var(--color-text-primary)]">
        {t('landing.faq.title')}
      </h2>
      <div className="flex flex-col gap-4">
        {questions.map((q) => (
          <FaqItem
            key={q.id}
            question={q.question}
            answer={q.answer}
            isOpen={openItems.has(q.id)}
            onToggle={() => toggleItem(q.id)}
          />
        ))}
      </div>
    </div>
  )

  return (
    <section id="faq" className="bg-[var(--color-bg-primary)] w-full" data-name="Section 8 : FAQ">
      <div className="w-full max-w-[1728px] mx-auto px-6 md:px-10 lg:px-32 pt-16 md:pt-24 lg:pt-40 pb-40">
        {/* Desktop : image + questions côte à côte */}
        <div className="hidden lg:flex items-center gap-20 xl:gap-32">
          {/* Image FAQ */}
          <div className="w-[448px] shrink-0 aspect-square rounded-[48px] overflow-hidden">
            <img
              src={faqNature}
              alt="Nature FAQ Naturegraph"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          {QuestionList}
        </div>

        {/* Mobile/Tablet : image en haut + questions en dessous */}
        <div className="lg:hidden flex flex-col gap-12">
          <div className="w-full aspect-[4/3] md:aspect-video rounded-[48px] overflow-hidden">
            <img
              src={faqNature}
              alt="Nature FAQ Naturegraph"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          {QuestionList}
        </div>
      </div>
    </section>
  )
}
