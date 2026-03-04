export type PlannerCity = { slug: string; name: string };

export type PlannerItemBase = {
  id: string;
  slug: string;
  title: string;
  coverUrl?: string | null;
};

export type PlannerEventItem = PlannerItemBase & {
  kind: 'event';
  priceFrom?: number | null;
  rating?: number | null;
  durationMin?: number | null;
  address?: string | null;
  citySlug?: string | null;
};

export type PlannerVenueItem = PlannerItemBase & {
  kind: 'venue';
  address?: string | null;
  citySlug?: string | null;
};

export type PlannerComboItem = PlannerItemBase & {
  kind: 'combo';
  priceFrom?: number | null;
};

export type PlannerItem = PlannerEventItem | PlannerVenueItem | PlannerComboItem;

export type PlannerDay = {
  date: string; // yyyy-mm-dd
  items: PlannerItem[];
};

export type PlannerTotals = {
  price: number;
  items: number;
  durationMin: number;
};

export type PlannerState = {
  city?: PlannerCity;
  days: PlannerDay[];
  currency: 'RUB';
  totals: PlannerTotals;
};

export type PlannerAction =
  | { type: 'set_city'; city: PlannerCity }
  | { type: 'set_days'; days: PlannerDay[] }
  | { type: 'add_item'; date: string; item: PlannerItem }
  | { type: 'remove_item'; date: string; itemId: string }
  | { type: 'reorder_items'; date: string; from: number; to: number }
  | { type: 'reset' };

