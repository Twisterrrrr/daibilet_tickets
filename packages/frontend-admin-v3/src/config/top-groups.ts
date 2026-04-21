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
  jazz: 'events',
  opera: 'events',
  ballet: 'events',
  'open-air': 'events',
  conference: 'events',
  meetup: 'events',
  'seasonal-events': 'events',
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
  'group-tours': 'excursions',

  museums: 'museums',
  exhibitions: 'museums',
  planetariums: 'museums',

  'water-sports': 'activities',
  extreme: 'activities',
  cycling: 'activities',
  outdoor: 'activities',
  'sport-events': 'activities',
  'shooting-range-events': 'activities',
  'ice-skating-primary': 'activities',
  'skiing-primary': 'activities',
  'yoga-fitness': 'activities',
  'wellness-spa': 'activities',
  'team-building-primary': 'activities',
  'hiking-primary': 'activities',
  tracking: 'activities',

  quests: 'entertainment',
  attractions: 'entertainment',
  interactive: 'entertainment',
  'kids-activities': 'entertainment',
  'game-zones': 'entertainment',
  zoo: 'entertainment',
  aquarium: 'entertainment',
  circus: 'entertainment',
  cinema: 'entertainment',
  'nightclub-primary': 'entertainment',
  'vr-arcade': 'entertainment',
  'bowling-ent': 'entertainment',
  'food-court-ent': 'entertainment',
};

export function deriveTopGroupFromSubcategorySlug(slug: string | null | undefined): TopGroup | null {
  if (!slug) return null;
  return subcategoryTopGroup[slug] ?? null;
}

