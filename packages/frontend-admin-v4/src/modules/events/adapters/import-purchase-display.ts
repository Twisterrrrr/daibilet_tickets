import type { EventDetailDto } from '@/modules/events/types';

/** Отображение без расширения backend DTO — см. `docs/qa.md` → AdminPurchaseLinkDto (целевой контракт). */
export type ImportedPurchaseDisplay = {
  providerLabel: string;
  purchaseTypeLabel: string;
  expectsExternalWidget: boolean;
  summaryRu: string;
  gapNoteRu: string;
};

function normalizeSource(src: string): string {
  return String(src ?? '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
}

export function deriveImportedPurchaseDisplay(event: EventDetailDto): ImportedPurchaseDisplay {
  const s = normalizeSource(event.source ?? '');

  const isTc = s === 'TICKETSCLOUD' || s === 'TC' || s.includes('TICKETS');
  const isTep = s === 'TEPLOHOD' || s === 'TEP';
  const isManual = s === 'MANUAL' || s === '';

  if (isTc || isTep) {
    const providerLabel = isTc ? 'Ticketscloud' : 'Teplohod.info';
    return {
      providerLabel,
      purchaseTypeLabel: 'Виджет / внешний провайдер',
      expectsExternalWidget: true,
      summaryRu: `Импорт: покупка на стороне провайдера (${providerLabel}), без внутреннего checkout Daibilet.`,
      gapNoteRu:
        'Используется эвристика по source: в ответе нет purchaseLink. Если бэкенд отдаёт purchaseLink — показывается диагностика из API (см. docs/qa.md).',
    };
  }

  if (isManual) {
    return {
      providerLabel: '—',
      purchaseTypeLabel: 'Не импорт / ручное',
      expectsExternalWidget: false,
      summaryRu: 'Источник не импортный — контракт покупки зависит от настройки события и офферов.',
      gapNoteRu: 'Для неимпортных событий нужна отдельная диагностика (internal checkout и т.д.) — вне scope импортированных продаж.',
    };
  }

  return {
    providerLabel: event.source ?? '—',
    purchaseTypeLabel: 'Неизвестно',
    expectsExternalWidget: false,
    summaryRu: `Источник «${event.source ?? '—'}»: уточните маппинг в справочнике источников.`,
    gapNoteRu: 'Добавьте стабильные поля provider/import в admin event DTO (additive only).',
  };
}
