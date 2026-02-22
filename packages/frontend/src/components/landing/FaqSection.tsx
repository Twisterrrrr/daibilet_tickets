'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
}

export function FaqSection({ items }: { items: FaqItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (!items?.length) return null;

  // Schema.org FAQPage
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <section id="faq" className="py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h2 className="text-2xl font-bold text-slate-900">Часто задаваемые вопросы</h2>
      <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        {items.map((item, idx) => (
          <div key={idx}>
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="pr-4 text-base font-medium text-slate-900">{item.question}</span>
              <ChevronDown
                className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${
                  openIdx === idx ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIdx === idx && <div className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{item.answer}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
