import type { PlannerAction, PlannerDay, PlannerState } from './planner.types';

export const initialPlannerState: PlannerState = {
  days: [],
  currency: 'RUB',
  totals: { price: 0, items: 0, durationMin: 0 },
};

function calcTotals(days: PlannerDay[]): PlannerState['totals'] {
  let price = 0;
  let items = 0;
  let durationMin = 0;

  for (const d of days) {
    for (const it of d.items) {
      items += 1;
      if ('priceFrom' in it && typeof it.priceFrom === 'number') price += it.priceFrom;
      if ('durationMin' in it && typeof it.durationMin === 'number') durationMin += it.durationMin;
    }
  }

  return { price, items, durationMin };
}

export function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  switch (action.type) {
    case 'set_city':
      return { ...state, city: action.city };

    case 'set_days': {
      const totals = calcTotals(action.days);
      return { ...state, days: action.days, totals };
    }

    case 'add_item': {
      const days = state.days.map((d) => (d.date === action.date ? { ...d, items: [...d.items, action.item] } : d));
      const totals = calcTotals(days);
      return { ...state, days, totals };
    }

    case 'remove_item': {
      const days = state.days.map((d) =>
        d.date === action.date ? { ...d, items: d.items.filter((x) => x.id !== action.itemId) } : d,
      );
      const totals = calcTotals(days);
      return { ...state, days, totals };
    }

    case 'reorder_items': {
      const days = state.days.map((d) => {
        if (d.date !== action.date) return d;
        const items = [...d.items];
        const [moved] = items.splice(action.from, 1);
        if (!moved) return d;
        items.splice(action.to, 0, moved);
        return { ...d, items };
      });
      const totals = calcTotals(days);
      return { ...state, days, totals };
    }

    case 'reset':
      return initialPlannerState;

    default:
      return state;
  }
}

