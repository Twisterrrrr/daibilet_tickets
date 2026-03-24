export type LandingBlockType = 'FAQ' | 'INFO_CARDS' | 'COMPARISON' | 'CTA' | 'REVIEWS' | 'STATS' | 'LINKS';

export type FaqItem = { question: string; answer: string };
export type InfoCardItem = { title: string; text: string };
export type ReviewItem = { text: string; author: string; rating: number };
export type StatsPayload = { soldTickets?: number; avgRating?: number };
export type LinkItem = { title: string; href: string };
export type ComparisonPayload = { columns: string[]; hideIncomparable?: boolean; maxRows?: number };
export type CtaPayload = { title?: string; buttonText?: string; link?: string };

export type LandingBlock =
  | { id: string; type: 'FAQ'; order: number; payload: FaqItem[] }
  | { id: string; type: 'INFO_CARDS'; order: number; payload: InfoCardItem[] }
  | { id: string; type: 'REVIEWS'; order: number; payload: ReviewItem[] }
  | { id: string; type: 'STATS'; order: number; payload: StatsPayload }
  | { id: string; type: 'LINKS'; order: number; payload: LinkItem[] }
  | { id: string; type: 'COMPARISON'; order: number; payload: ComparisonPayload }
  | { id: string; type: 'CTA'; order: number; payload: CtaPayload };

const randomId = () => Math.random().toString(36).slice(2, 10);

export function jsonToBlocksMigration(source: {
  faq?: unknown;
  infoBlocks?: unknown;
  reviews?: unknown;
  stats?: unknown;
  relatedLinks?: unknown;
  additionalFilters?: unknown;
  howToChoose?: unknown;
}): LandingBlock[] {
  const blocks: LandingBlock[] = [];
  let order = 0;
  const faq = Array.isArray(source.faq) ? source.faq : [];
  if (faq.length) blocks.push({ id: randomId(), type: 'FAQ', order: order++, payload: faq as FaqItem[] });
  const cards = Array.isArray(source.infoBlocks) ? source.infoBlocks : [];
  if (cards.length) blocks.push({ id: randomId(), type: 'INFO_CARDS', order: order++, payload: cards as InfoCardItem[] });
  const reviews = Array.isArray(source.reviews) ? source.reviews : [];
  if (reviews.length) blocks.push({ id: randomId(), type: 'REVIEWS', order: order++, payload: reviews as ReviewItem[] });
  const stats = source.stats && typeof source.stats === 'object' ? (source.stats as StatsPayload) : null;
  if (stats) blocks.push({ id: randomId(), type: 'STATS', order: order++, payload: stats });
  const links = Array.isArray(source.relatedLinks) ? source.relatedLinks : [];
  if (links.length) blocks.push({ id: randomId(), type: 'LINKS', order: order++, payload: links as LinkItem[] });
  const comparisonSource = source.additionalFilters && typeof source.additionalFilters === 'object' ? (source.additionalFilters as Record<string, unknown>) : {};
  if (Array.isArray(comparisonSource.columns)) {
    blocks.push({
      id: randomId(),
      type: 'COMPARISON',
      order: order++,
      payload: {
        columns: comparisonSource.columns.filter((v): v is string => typeof v === 'string'),
        hideIncomparable: Boolean(comparisonSource.hideIncomparable),
        maxRows: typeof comparisonSource.maxRows === 'number' ? comparisonSource.maxRows : undefined,
      },
    });
  }
  const ctaSource = source.howToChoose && Array.isArray(source.howToChoose) && source.howToChoose[0] && typeof source.howToChoose[0] === 'object'
    ? (source.howToChoose[0] as Record<string, unknown>)
    : null;
  if (ctaSource) {
    blocks.push({
      id: randomId(),
      type: 'CTA',
      order: order++,
      payload: {
        title: typeof ctaSource.title === 'string' ? ctaSource.title : '',
        buttonText: typeof ctaSource.buttonText === 'string' ? ctaSource.buttonText : '',
        link: typeof ctaSource.link === 'string' ? ctaSource.link : '',
      },
    });
  }
  return blocks.sort((a, b) => a.order - b.order);
}

export function blocksToLegacyPayload(blocks: LandingBlock[]) {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const payload: Record<string, unknown> = {
    faq: [],
    infoBlocks: [],
    reviews: [],
    stats: {},
    relatedLinks: [],
    additionalFilters: {},
    howToChoose: [],
  };
  for (const block of sorted) {
    if (block.type === 'FAQ') payload.faq = block.payload;
    if (block.type === 'INFO_CARDS') payload.infoBlocks = block.payload;
    if (block.type === 'REVIEWS') payload.reviews = block.payload;
    if (block.type === 'STATS') payload.stats = block.payload;
    if (block.type === 'LINKS') payload.relatedLinks = block.payload;
    if (block.type === 'COMPARISON') payload.additionalFilters = block.payload;
    if (block.type === 'CTA') payload.howToChoose = [block.payload];
  }
  return payload;
}

export function validateBlocks(blocks: LandingBlock[]): string[] {
  const errors: string[] = [];
  for (const block of blocks) {
    if (block.type === 'FAQ') {
      for (const item of block.payload) {
        if (!item.question?.trim() || !item.answer?.trim()) errors.push('FAQ: question и answer обязательны');
      }
    }
    if (block.type === 'CTA') {
      if (!block.payload.buttonText?.trim() || !block.payload.link?.trim()) {
        errors.push('CTA: buttonText и link обязательны');
      }
    }
  }
  return errors;
}

export function createEmptyBlock(type: LandingBlockType, order: number): LandingBlock {
  const id = randomId();
  if (type === 'FAQ') return { id, type, order, payload: [{ question: '', answer: '' }] };
  if (type === 'INFO_CARDS') return { id, type, order, payload: [{ title: '', text: '' }] };
  if (type === 'REVIEWS') return { id, type, order, payload: [{ text: '', author: '', rating: 5 }] };
  if (type === 'STATS') return { id, type, order, payload: { soldTickets: 0, avgRating: 5 } };
  if (type === 'LINKS') return { id, type, order, payload: [{ title: '', href: '' }] };
  if (type === 'COMPARISON') return { id, type, order, payload: { columns: ['price', 'rating'], hideIncomparable: false, maxRows: 10 } };
  return { id, type, order, payload: { title: '', buttonText: '', link: '' } };
}
