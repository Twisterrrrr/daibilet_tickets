/**
 * Яндекс Метрика — отправка целей.
 *
 * Цели (настроить в интерфейсе Метрики):
 * - event_view: Просмотр карточки события
 * - widget_open: Открытие виджета покупки
 * - buy_click: Клик на кнопку «Купить»
 * - purchase_success: Успешная покупка
 * - planner_start: Запуск планировщика
 * - planner_result: Получение результатов планировщика
 * - combo_view: Просмотр combo-программы
 * - landing_view: Просмотр лендинга
 */

declare global {
  interface Window {
    ym?: (id: number, action: string, target: string, params?: Record<string, any>) => void;
  }
}

const YM_ID = typeof window !== 'undefined' ? Number(process.env.NEXT_PUBLIC_YM_ID || '0') : 0;

/**
 * Отправить цель в Яндекс Метрику.
 */
export function reachGoal(target: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !YM_ID || !window.ym) return;
  try {
    window.ym(YM_ID, 'reachGoal', target, params);
  } catch {
    // Метрика не загружена — игнорируем
  }
}

// Типизированные хелперы

export function trackEventView(eventSlug: string, citySlug?: string) {
  reachGoal('event_view', { event: eventSlug, city: citySlug });
}

export function trackWidgetOpen(eventSlug: string) {
  reachGoal('widget_open', { event: eventSlug });
}

export function trackBuyClick(eventSlug: string, price?: number) {
  reachGoal('buy_click', { event: eventSlug, price });
}

export function trackPurchaseSuccess(orderId: string, total?: number) {
  reachGoal('purchase_success', { order: orderId, total });
}

export function trackPlannerStart(city: string) {
  reachGoal('planner_start', { city });
}

export function trackPlannerResult(city: string, variantsCount: number) {
  reachGoal('planner_result', { city, variants: variantsCount });
}

export function trackComboView(comboSlug: string) {
  reachGoal('combo_view', { combo: comboSlug });
}

export function trackLandingView(landingSlug: string) {
  reachGoal('landing_view', { landing: landingSlug });
}
