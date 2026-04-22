/** Отображаемые подписи для enum-значений подкатегорий (API по-прежнему отдаёт латиницу). */

export const SUBCATEGORY_TYPE_LABEL: Record<string, string> = {
  UNIVERSAL: 'Общая',
  EVENT_ONLY: 'Только события',
  VENUE_ONLY: 'Только площадки',
};

export const SUBCATEGORY_LAYER_LABEL: Record<string, string> = {
  PRIMARY: 'Основной слой',
  SECONDARY: 'Дополнительный слой',
};

export const SUBCATEGORY_LANDING_MODE_LABEL: Record<string, string> = {
  DISABLED: 'Выключено',
  AUTO: 'Авто',
  TOPIC_HUB: 'Тематический хаб',
};

export function subcategoryTypeLabel(type: string | null | undefined): string {
  if (type == null || type === '') return '—';
  return SUBCATEGORY_TYPE_LABEL[type] ?? type;
}

export function subcategoryLayerLabel(layer: string | null | undefined): string {
  if (layer == null || layer === '') return '—';
  return SUBCATEGORY_LAYER_LABEL[layer] ?? layer;
}

export function subcategoryLandingModeLabel(mode: string | null | undefined): string {
  if (mode == null || mode === '') return '—';
  return SUBCATEGORY_LANDING_MODE_LABEL[mode] ?? mode;
}

export function subcategoryActiveLabel(isActive: boolean): string {
  return isActive ? 'Активна' : 'Неактивна';
}

export function landingEnabledBadgeLabel(enabled: boolean): string {
  return enabled ? 'вкл' : 'выкл';
}
