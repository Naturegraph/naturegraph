/**
 * FAQ — Questions fréquentes avec accordéon
 * ==========================================
 * Image + liste de questions. Utilise ImageTextLayout (image fixed 448px desktop).
 * Accordion partagé du DS, rendu une seule fois.
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Accordion, type AccordionItem } from '@/components/ui'
import { ImageTextLayout } from '@/components/templates'
import faqNature from '@/assets/images/faq-nature.png'

export function FAQ() {
  const { t } = useTranslation()
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(['q1']))

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const questions: AccordionItem[] = [
    { id: 'q1', question: t('landing.faq.q1'), answer: t('landing.faq.a1') },
    { id: 'q2', question: t('landing.faq.q2'), answer: t('landing.faq.a2') },
    { id: 'q3', question: t('landing.faq.q3'), answer: t('landing.faq.a3') },
    { id: 'q4', question: t('landing.faq.q4'), answer: t('landing.faq.a4') },
  ]

  return (
    <section id="faq" className="bg-[var(--color-bg-primary)] w-full" data-name="Section 8 : FAQ">
      <div className="w-full max-w-[1728px] mx-auto px-6 md:px-10 lg:px-32 pt-16 md:pt-24 lg:pt-40 pb-40">
        <ImageTextLayout
          gap="lg"
          imageWidth="fixed"
          image={
            <div className="w-full lg:w-[448px] aspect-[4/3] md:aspect-video lg:aspect-square rounded-[48px] overflow-hidden">
              <img
                src={faqNature}
                alt="Nature FAQ Naturegraph"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          }
        >
          <div className="flex flex-col gap-10 lg:gap-12">
            <h2 className="landing-section-title text-[var(--color-text-primary)]">
              {t('landing.faq.title')}
            </h2>
            <Accordion items={questions} openIds={openItems} onToggle={toggleItem} />
          </div>
        </ImageTextLayout>
      </div>
    </section>
  )
}
