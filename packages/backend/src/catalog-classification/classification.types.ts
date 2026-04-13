export type SectionSlug = 'events' | 'excursions' | 'museums' | 'activities' | 'entertainment';

export type SectionView = {
  slug: SectionSlug;
  name: string;
};

export const sectionNames: Record<SectionSlug, string> = {
  events: 'Мероприятия',
  excursions: 'Экскурсии',
  museums: 'Музеи и арт',
  activities: 'Активный отдых',
  entertainment: 'Развлечения',
};

