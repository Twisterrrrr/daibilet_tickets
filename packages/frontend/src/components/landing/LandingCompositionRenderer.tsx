'use client';

import { FaqSection } from '@/components/landing/FaqSection';
import { faqItemsFromCompositionBlock } from '@/lib/landing-composition-faq';
import type { LandingCompositionBlockPublic } from '@/lib/api.types';

/** Совместимость: предпочтительно `LandingCompositionBlockPublic` из api.types */
export type PublicLandingCompositionBlock = LandingCompositionBlockPublic;

type Props = {
  blocks: LandingCompositionBlockPublic[];
};

/**
 * Публичный рендерер управляемых блоков композиции (Admin → GET catalog landing `blocks`).
 * Legacy JSON-поля лендинга (`howToChoose`, `faq`, …) остаются отдельным слоем до миграции контента.
 */
export function LandingCompositionRenderer({ blocks }: Props) {
  const sorted = [...blocks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="space-y-10">
      {sorted.map((b) => {
        const key = b.id;
        if (b.type === 'FAQ') {
          const items = faqItemsFromCompositionBlock(b);
          if (items.length === 0) {
            return (
              <section key={key} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">FAQ</div>
                {b.title ? <h2 className="mt-2 text-lg font-semibold text-slate-900">{b.title}</h2> : null}
                <p className="mt-2">Контент блока будет добавлен в админке.</p>
              </section>
            );
          }
          return <FaqSection key={key} items={items} />;
        }

        if (b.type === 'SEO_TEXT' || b.type === 'STORY' || b.type === 'RAW_RICH_TEXT') {
          return (
            <section key={key} className="prose prose-slate max-w-none">
              {b.eyebrow ? <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">{b.eyebrow}</p> : null}
              {b.title ? <h2>{b.title}</h2> : null}
              {b.subtitle ? <p className="lead">{b.subtitle}</p> : null}
              {b.body ? (
                <div className="whitespace-pre-wrap text-slate-800">{b.body}</div>
              ) : (
                <p className="text-sm text-slate-500">Пустой блок</p>
              )}
            </section>
          );
        }

        return (
          <section
            key={key}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="text-xs font-mono text-slate-500">{b.type}</div>
            {b.title ? <h2 className="mt-2 text-lg font-semibold text-slate-900">{b.title}</h2> : null}
            {b.subtitle ? <p className="mt-1 text-sm text-slate-600">{b.subtitle}</p> : null}
            {b.body ? <div className="mt-4 whitespace-pre-wrap text-sm text-slate-800">{b.body}</div> : null}
          </section>
        );
      })}
    </div>
  );
}
