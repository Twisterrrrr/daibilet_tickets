import type { SectionSlug } from './classification.types';

/**
 * Канонический mapping: subcategorySlug -> sectionSlug.
 * Это единственная точка истины для derived секции (Категории) в админке/SEO-хабах.
 */
export const SUBCATEGORY_SECTION: Record<string, SectionSlug> = {
  // events
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
  masterclasses: 'events',
  parties: 'events',

  // excursions
  'walking-tours': 'excursions',
  'bus-tours': 'excursions',
  'boat-tours': 'excursions',
  'river-excursion': 'excursions',
  'night-tours': 'excursions',
  'city-tours': 'excursions',
  'private-tours': 'excursions',
  'group-tours': 'excursions',
  'gastro-tours': 'excursions',

  // museums
  museums: 'museums',
  exhibitions: 'museums',
  planetariums: 'museums',
  'gallery-visits': 'museums',
  'palace-visits': 'museums',
  'park-visits': 'museums',
  'art-space-visits': 'museums',

  // activities
  'water-sports': 'activities',
  extreme: 'activities',
  cycling: 'activities',
  outdoor: 'activities',
  'sport-events': 'activities',
  karting: 'activities',
  climbing: 'activities',
  'shooting-range-events': 'activities',
  'ice-skating-primary': 'activities',
  'skiing-primary': 'activities',
  'yoga-fitness': 'activities',
  'wellness-spa': 'activities',
  'team-building-primary': 'activities',
  'hiking-primary': 'activities',
  tracking: 'activities',

  // entertainment
  quests: 'entertainment',
  attractions: 'entertainment',
  interactive: 'entertainment',
  'kids-activities': 'entertainment',
  'game-zones': 'entertainment',
  rooftop: 'entertainment',
  'escape-rooms': 'entertainment',
  zoo: 'entertainment',
  aquarium: 'entertainment',
  circus: 'entertainment',
  cinema: 'entertainment',
  'nightclub-primary': 'entertainment',
  'vr-arcade': 'entertainment',
  'bowling-ent': 'entertainment',
  'food-court-ent': 'entertainment',

  // legacy slugs (compat): keep derived section for existing records
  'gastro-ekskursii': 'excursions',
  'ekskursii-po-krysham': 'entertainment',
  'ekstremalnye-ekskursii': 'activities',
  kvesty: 'entertainment',
  'kombinirovannye-ekskursii': 'excursions',
  'poseshchenie-galereya': 'museums',
  'poseshchenie-dvorec': 'museums',
  'poseshchenie-park': 'museums',
  'poseshchenie-art-prostranstvo': 'museums',
  'poseshchenie-skulptura': 'museums',
  'poseshchenie-sovremennoe-iskusstvo': 'museums',
  'master-klassy': 'events',
  vecherinki: 'events',
};

