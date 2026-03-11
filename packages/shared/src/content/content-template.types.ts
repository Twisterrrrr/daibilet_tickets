/**
 * Типизированные схемы contentTemplateData и venueTemplateData.
 * @see docs/PageTemplateSpecs.md
 */

import { z } from 'zod';

export const ExtraFaqItemSchema = z.object({
  q: z.string(),
  a: z.string(),
});

export const EventContentTemplateDataSchema = z
  .object({
    routeDescription: z.string().optional(),
    program: z.string().optional(),
    menu: z.string().optional(),
    cast: z.string().optional(),
    advantages: z.array(z.string()).optional(),
    bookingRules: z.string().optional(),
    visitRules: z.string().optional(),
    visitorTips: z.string().optional(),
    extraFaq: z.array(ExtraFaqItemSchema).optional(),
  })
  .passthrough()
  .optional();

export type EventContentTemplateData = z.infer<typeof EventContentTemplateDataSchema>;
export type ExtraFaqItem = z.infer<typeof ExtraFaqItemSchema>;

export const VenueTemplateDataSchema = z
  .object({
    collections: z.array(z.string()).optional(),
    currentExhibitions: z.string().optional(),
    permanentExhibitions: z.string().optional(),
    audioGuide: z.boolean().optional(),
    interactive: z.boolean().optional(),
    halls: z.array(z.string()).optional(),
    cloakroom: z.boolean().optional(),
    acoustics: z.string().optional(),
    seasonality: z.string().optional(),
    accessibilityNotes: z.string().optional(),
  })
  .passthrough()
  .optional();

export type VenueTemplateData = z.infer<typeof VenueTemplateDataSchema>;

export function parseEventContentTemplateData(raw: unknown): EventContentTemplateData | null {
  const result = EventContentTemplateDataSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function parseVenueTemplateData(raw: unknown): VenueTemplateData | null {
  const result = VenueTemplateDataSchema.safeParse(raw);
  return result.success ? result.data : null;
}
