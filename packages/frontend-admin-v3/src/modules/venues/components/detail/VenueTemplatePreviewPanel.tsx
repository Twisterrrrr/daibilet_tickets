import type { BuiltVenueTemplateSections } from '@/modules/venues/utils/venue-template-admin-preview';
import * as React from 'react';

function HtmlOrText({ html }: { html: string | null }) {
  if (!html?.trim()) return <span className="text-muted-foreground">—</span>;
  return (
    <div
      className="max-w-none text-sm leading-relaxed [&_a]:text-primary [&_a]:underline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function VenueTemplatePreviewPanel({ sections }: { sections: BuiltVenueTemplateSections }) {
  return (
    <div className="space-y-6 border-t pt-4">
      <p className="text-xs font-medium text-muted-foreground">
        Блоки как на публичной странице площадки (intro, галерея, визит, коллекции, FAQ и т.д.)
      </p>

      {(sections.heroTitle || sections.introLead) && (
        <section>
          <h3 className="text-sm font-semibold">Hero / интро</h3>
          {sections.heroTitle ? <p className="mt-1 text-sm font-medium">{sections.heroTitle}</p> : null}
          {sections.introLead ? <p className="mt-2 text-sm text-muted-foreground">{sections.introLead}</p> : null}
        </section>
      )}

      {sections.descriptionHtml ? (
        <section>
          <h3 className="text-sm font-semibold">Описание (длинное)</h3>
          <div className="mt-2 text-sm">
            <HtmlOrText html={sections.descriptionHtml} />
          </div>
        </section>
      ) : null}

      {sections.highlights.length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold">Акценты / буллеты</h3>
          <ul className="mt-2 list-inside list-disc text-sm">
            {sections.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {sections.galleryUrls.length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold">Галерея шаблона</h3>
          <ul className="mt-2 max-h-48 list-inside list-disc overflow-auto text-xs">
            {sections.galleryUrls.map((u) => (
              <li key={u}>
                <a className="text-primary hover:underline" href={u} target="_blank" rel="noreferrer">
                  {u}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sections.openingHours && Object.keys(sections.openingHours).length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold">Часы работы (шаблон)</h3>
          <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
            {Object.entries(sections.openingHours).map(([day, hours]) => (
              <React.Fragment key={day}>
                <dt className="text-muted-foreground">{day}</dt>
                <dd>{hours ?? '—'}</dd>
              </React.Fragment>
            ))}
          </dl>
        </section>
      ) : null}

      {sections.visitingRules ? (
        <section>
          <h3 className="text-sm font-semibold">Правила посещения</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm">{sections.visitingRules}</p>
        </section>
      ) : null}

      {(sections.collections.length > 0 || sections.collectionsText) && (
        <section>
          <h3 className="text-sm font-semibold">Коллекции / выставки</h3>
          {sections.collectionsText ? (
            <p className="mt-2 whitespace-pre-wrap text-sm">{sections.collectionsText}</p>
          ) : null}
          {sections.collections.length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-sm">
              {sections.collections.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : null}
        </section>
      )}

      {sections.permanentExposition ? (
        <section>
          <h3 className="text-sm font-semibold">Постоянная экспозиция</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm">{sections.permanentExposition}</p>
        </section>
      ) : null}

      {sections.accessibility ? (
        <section>
          <h3 className="text-sm font-semibold">Доступность</h3>
          <ul className="mt-2 text-sm">
            <li>Аудиогид: {sections.accessibility.audioGuide ? 'да' : 'нет'}</li>
            <li>Интерактив: {sections.accessibility.interactive ? 'да' : 'нет'}</li>
            {sections.accessibility.notes ? <li className="mt-1">{sections.accessibility.notes}</li> : null}
          </ul>
        </section>
      ) : null}

      {sections.amenities ? (
        <section>
          <h3 className="text-sm font-semibold">Удобства</h3>
          {sections.amenities.text ? <p className="mt-2 text-sm">{sections.amenities.text}</p> : null}
          {sections.amenities.items.length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-sm">
              {sections.amenities.items.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {sections.faq.length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold">FAQ</h3>
          <dl className="mt-2 space-y-3 text-sm">
            {sections.faq.map((item, i) => (
              <div key={`${item.q}-${i}`}>
                <dt className="font-medium">{item.q}</dt>
                <dd className="mt-1 text-muted-foreground">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {sections.eventsCopy ? (
        <section>
          <h3 className="text-sm font-semibold">Текст блока событий</h3>
          {sections.eventsCopy.title ? <p className="mt-2 font-medium">{sections.eventsCopy.title}</p> : null}
          {sections.eventsCopy.intro ? <p className="mt-2 text-muted-foreground">{sections.eventsCopy.intro}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
