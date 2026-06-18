/**
 * Accordion : Liste d'éléments dépliables (FAQ, sections collapsibles)
 * =====================================================================
 * Composant entièrement contrôlé : le parent gère l'état des items ouverts
 * via un Set<string>. Permet d'ouvrir plusieurs items simultanément ou de
 * forcer un seul ouvert (logique métier dans le parent).
 *
 * A11y :
 * - Chaque header est un <button> avec aria-expanded + aria-controls
 * - Le panel a role="region" + aria-labelledby pour l'association sémantique
 * - Les icônes +/− sont décoratives (aria-hidden via lucide)
 * - Animation respecte prefers-reduced-motion (motion/react par défaut)
 */

import { motion, AnimatePresence } from 'motion/react'
import { Minus, Plus } from 'lucide-react'

export interface AccordionItem {
  id: string
  question: string
  answer: string
}

interface AccordionProps {
  items: AccordionItem[]
  /** Set des ids ouverts (controlled) */
  openIds: Set<string>
  /** Callback toggle d'un item */
  onToggle: (id: string) => void
  className?: string
}

/* ── Item individuel (interne) ────────────────────────────────────── */

function AccordionItemView({
  item,
  isOpen,
  onToggle,
}: {
  item: AccordionItem
  isOpen: boolean
  onToggle: () => void
}) {
  const panelId = `accordion-panel-${item.id}`
  const buttonId = `accordion-button-${item.id}`

  return (
    <div className="bg-[var(--color-bg-tertiary)] rounded-[20px] w-full">
      <div className="flex flex-col p-6">
        <button
          id={buttonId}
          onClick={onToggle}
          className="flex items-center gap-8 w-full text-left bg-transparent border-none cursor-pointer p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-default)] focus-visible:ring-offset-2 rounded"
          aria-expanded={isOpen}
          aria-controls={panelId}
        >
          <h4 className="flex-1 text-[var(--color-text-primary)]">{item.question}</h4>
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

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
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
              <p className="text-[var(--color-text-secondary)] pt-4">{item.answer}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function Accordion({ items, openIds, onToggle, className = '' }: AccordionProps) {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {items.map((item) => (
        <AccordionItemView
          key={item.id}
          item={item}
          isOpen={openIds.has(item.id)}
          onToggle={() => onToggle(item.id)}
        />
      ))}
    </div>
  )
}
