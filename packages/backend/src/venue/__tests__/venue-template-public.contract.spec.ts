import { describe, expect, it } from 'vitest';

import { VenueService } from '../venue.service';

type BuildTemplateInput = {
  venueType: 'MUSEUM' | 'ART_SPACE' | 'GALLERY' | 'EXHIBITION_HALL' | 'THEATER';
  venueTemplateData: unknown;
  legacyDescription: string | null;
  legacyShortDescription: string | null;
  legacyGalleryUrls: string[] | null;
  legacyOpeningHours: Record<string, string | null> | null;
  legacyFaq: Array<{ q: string; a: string }> | null;
  legacyHighlights?: string[] | null;
};

type TemplateBuilderLike = {
  buildVenuePublicTemplate: (input: BuildTemplateInput) => { sections: Record<string, unknown>; supportedTemplateType: boolean } | null;
};

describe('VenueService template public contract', () => {
  const service = new VenueService({} as never);
  const builder = service as unknown as TemplateBuilderLike;

  it('parse/normalize: строит sections для поддержанного типа', () => {
    const result = builder.buildVenuePublicTemplate({
      venueType: 'MUSEUM',
      venueTemplateData: {
        collections: ['Живопись', 'Скульптура'],
        currentExhibitions: 'Новые выставки сезона',
        permanentExhibitions: 'Классическая экспозиция',
        audioGuide: true,
        accessibilityNotes: 'Есть подъемник',
      },
      legacyDescription: '<p>Legacy description</p>',
      legacyShortDescription: 'Legacy short',
      legacyGalleryUrls: ['legacy-1.jpg'],
      legacyOpeningHours: { mon: '10:00-18:00' },
      legacyFaq: [{ q: 'q1', a: 'a1' }],
      legacyHighlights: null,
    });

    expect(result).not.toBeNull();
    expect(result?.supportedTemplateType).toBe(true);
    expect(result?.sections.collections).toBeTruthy();
    expect(result?.sections.permanentExposition).toBeTruthy();
    expect(result?.sections.accessibility).toBeTruthy();
  });

  it('EXHIBITION_HALL: template-aware тип даже при пустом JSON', () => {
    const result = builder.buildVenuePublicTemplate({
      venueType: 'EXHIBITION_HALL',
      venueTemplateData: null,
      legacyDescription: null,
      legacyShortDescription: null,
      legacyGalleryUrls: null,
      legacyOpeningHours: null,
      legacyFaq: null,
      legacyHighlights: null,
    });
    expect(result).not.toBeNull();
    expect(result?.supportedTemplateType).toBe(true);
    expect(Object.keys(result?.sections ?? {})).toHaveLength(0);
  });

  it('fallback: при пустом template использует legacy поля', () => {
    const result = builder.buildVenuePublicTemplate({
      venueType: 'MUSEUM',
      venueTemplateData: null,
      legacyDescription: '<p>Legacy description</p>',
      legacyShortDescription: 'Legacy short',
      legacyGalleryUrls: ['legacy-1.jpg'],
      legacyOpeningHours: { mon: '10:00-18:00' },
      legacyFaq: [{ q: 'q1', a: 'a1' }],
      legacyHighlights: ['Легаси хайлайт'],
    });

    expect(result?.sections.intro).toEqual({
      title: null,
      lead: 'Legacy short',
      longDescription: '<p>Legacy description</p>',
      highlights: ['Легаси хайлайт'],
    });
    expect(result?.sections.gallery).toEqual({ images: ['legacy-1.jpg'] });
    expect(result?.sections.visitInfo).toEqual({
      openingHours: { mon: '10:00-18:00' },
      visitingRules: null,
    });
    expect(result?.sections.faq).toEqual({ items: [{ q: 'q1', a: 'a1' }] });
  });

  it('priority: template значения приоритетнее legacy', () => {
    const result = builder.buildVenuePublicTemplate({
      venueType: 'GALLERY',
      venueTemplateData: {
        introTitle: 'Подзаголовок для PDP',
        lead: 'Template lead',
        longDescription: '<p>Template long</p>',
        gallery: ['template-1.jpg'],
        faq: [{ q: 'template-q', a: 'template-a' }],
        highlights: ['Из шаблона'],
        amenities: 'Кафе и гардероб',
        amenitiesList: ['Wi‑Fi для гостей'],
      },
      legacyDescription: '<p>Legacy description</p>',
      legacyShortDescription: 'Legacy short',
      legacyGalleryUrls: ['legacy-1.jpg'],
      legacyOpeningHours: { mon: '10:00-18:00' },
      legacyFaq: [{ q: 'legacy-q', a: 'legacy-a' }],
      legacyHighlights: ['Старый буллет'],
    });

    expect(result?.sections.intro).toEqual({
      title: 'Подзаголовок для PDP',
      lead: 'Template lead',
      longDescription: '<p>Template long</p>',
      highlights: ['Из шаблона'],
    });
    expect(result?.sections.amenities).toEqual({
      items: ['Wi‑Fi для гостей'],
      text: 'Кафе и гардероб',
    });
    expect(result?.sections.gallery).toEqual({ images: ['template-1.jpg'] });
    expect(result?.sections.faq).toEqual({ items: [{ q: 'template-q', a: 'template-a' }] });
  });

  it('type gating: для неподдержанного типа без template возвращает null', () => {
    const result = builder.buildVenuePublicTemplate({
      venueType: 'THEATER',
      venueTemplateData: null,
      legacyDescription: null,
      legacyShortDescription: null,
      legacyGalleryUrls: null,
      legacyOpeningHours: null,
      legacyFaq: null,
      legacyHighlights: null,
    });

    expect(result).toBeNull();
  });

  it('empty sections: не добавляет пустые секции', () => {
    const result = builder.buildVenuePublicTemplate({
      venueType: 'MUSEUM',
      venueTemplateData: {
        collections: [],
        currentExhibitions: ' ',
        permanentExhibitions: '   ',
        faq: [{ q: '', a: ' ' }],
      },
      legacyDescription: null,
      legacyShortDescription: null,
      legacyGalleryUrls: null,
      legacyOpeningHours: null,
      legacyFaq: null,
      legacyHighlights: null,
    });

    expect(result).not.toBeNull();
    expect(result?.sections.collections).toBeUndefined();
    expect(result?.sections.permanentExposition).toBeUndefined();
    expect(result?.sections.faq).toBeUndefined();
  });

  it('eventsCopy: прокидывает title/intro секции программы из template', () => {
    const result = builder.buildVenuePublicTemplate({
      venueType: 'MUSEUM',
      venueTemplateData: {
        eventsTitle: 'Программа музея',
        eventsIntro: 'Ключевые выставки сезона',
      },
      legacyDescription: null,
      legacyShortDescription: null,
      legacyGalleryUrls: null,
      legacyOpeningHours: null,
      legacyFaq: null,
      legacyHighlights: null,
    });

    expect(result?.sections.eventsCopy).toEqual({
      title: 'Программа музея',
      intro: 'Ключевые выставки сезона',
    });
  });

  it('visitInfo: приоритет template.visitHours над legacy openingHours', () => {
    const result = builder.buildVenuePublicTemplate({
      venueType: 'ART_SPACE',
      venueTemplateData: {
        visitHours: { tue: '12:00-20:00' },
      },
      legacyDescription: null,
      legacyShortDescription: null,
      legacyGalleryUrls: null,
      legacyOpeningHours: { mon: '10:00-18:00' },
      legacyFaq: null,
      legacyHighlights: null,
    });

    expect(result?.sections.visitInfo).toEqual({
      openingHours: { tue: '12:00-20:00' },
      visitingRules: null,
    });
  });
});
