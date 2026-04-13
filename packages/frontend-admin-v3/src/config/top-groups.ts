export type TopGroup = 'events' | 'excursions' | 'museums' | 'activities' | 'entertainment';

export const topGroupLabels: Record<TopGroup, string> = {
  events: 'Мероприятия',
  excursions: 'Экскурсии',
  museums: 'Музеи и арт',
  activities: 'Активный отдых',
  entertainment: 'Развлечения',
};

/** Канонический derived mapping: subcategorySlug -> topGroup */
export const subcategoryTopGroup: Record<string, TopGroup> = {
  concerts: 'events',
  theater: 'events',
  shows: 'events',
  standup: 'events',
  festivals: 'events',
  lectures: 'events',
  'kids-shows': 'events',
  'immersive-shows': 'events',

  'walking-tours': 'excursions',
  'bus-tours': 'excursions',
  'boat-tours': 'excursions',
  'night-tours': 'excursions',
  'city-tours': 'excursions',
  'private-tours': 'excursions',

  museums: 'museums',
  exhibitions: 'museums',
  planetariums: 'museums',

  'water-sports': 'activities',
  extreme: 'activities',
  cycling: 'activities',
  outdoor: 'activities',
  'sport-events': 'activities',

  quests: 'entertainment',
  attractions: 'entertainment',
  interactive: 'entertainment',
  'kids-activities': 'entertainment',
  'game-zones': 'entertainment',
};

export function deriveTopGroupFromSubcategorySlug(slug: string | null | undefined): TopGroup | null {
  if (!slug) return null;
  return subcategoryTopGroup[slug] ?? null;
}

