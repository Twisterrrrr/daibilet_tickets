import type { SectionSlug } from './classification.types';

/**
 * Канонический mapping: subcategorySlug -> sectionSlug.
 * Это единственная точка истины для derived секции (Категории) в админке/SEO-хабах.
 */
export const SUBCATEGORY_SECTION: Record<string, SectionSlug> = {
  // events
  concerts: 'events',
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

  // entertainment
  quests: 'entertainment',
  attractions: 'entertainment',
  interactive: 'entertainment',
  'kids-activities': 'entertainment',
  'game-zones': 'entertainment',
  rooftop: 'entertainment',
  'escape-rooms': 'entertainment',

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

