import { z } from 'zod';

// ========================
// FAQ
// ========================
export const FaqItemSchema = z.object({
  question: z.string().min(1, 'Вопрос обязателен'),
  answer: z.string().min(1, 'Ответ обязателен'),
});
export const FaqSchema = z.array(FaqItemSchema);

// ========================
// Reviews
// ========================
export const ReviewSchema = z.array(z.object({
  text: z.string().min(1),
  author: z.string().min(1),
  rating: z.number().min(1).max(5),
}));

// ========================
// Stats
// ========================
export const StatsSchema = z.object({
  soldTickets: z.number().int().nonnegative(),
  avgRating: z.number().min(0).max(5),
});

// ========================
// Related Links
// ========================
export const RelatedLinkSchema = z.array(z.object({
  title: z.string().min(1),
  href: z.string().min(1),
}));

// ========================
// HowToChoose
// ========================
export const HowToChooseSchema = z.array(z.object({
  title: z.string().min(1),
  text: z.string().min(1),
}));

// ========================
// Info Blocks
// ========================
export const InfoBlockSchema = z.array(z.object({
  title: z.string().min(1),
  text: z.string().min(1),
}));

// ========================
// Features (Combo USP)
// ========================
export const FeatureSchema = z.array(z.object({
  icon: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1),
}));

// ========================
// Curated Events (Combo)
// ========================
export const CuratedEventSchema = z.array(z.object({
  eventId: z.string().uuid(),
  dayNumber: z.number().int().positive(),
  slot: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
  time: z.string(),
}));

// ========================
// Includes (Combo)
// ========================
export const IncludesSchema = z.array(z.string().min(1));

// ========================
// Additional Filters (Landing)
// ========================
export const AdditionalFiltersSchema = z.object({
  category: z.string().optional(),
  source: z.string().optional(),
  minDuration: z.number().optional(),
  maxDuration: z.number().optional(),
  features: z.array(z.string()).optional(),
}).optional();

// ========================
// Peak Ranges (PricingConfig)
// ========================
export const PeakRangeSchema = z.array(z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  cities: z.array(z.string()).optional(),
}));

// ========================
// Валидатор-хелпер
// ========================
export function validateJson<T>(schema: z.ZodSchema<T>, data: unknown, fieldName: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Ошибка валидации ${fieldName}: ${errors}`);
  }
  return result.data;
}
