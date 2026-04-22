import type { VenueModerationReasonCode } from '@/modules/venues/api/candidates';

const LABELS: Record<VenueModerationReasonCode, string> = {
  BAD_SOURCE_DATA: 'Плохие исходные данные',
  DUPLICATE_NOT_CONFIRMED: 'Дубликат не подтверждён',
  WRONG_CITY: 'Неверный город',
  WRONG_ADDRESS: 'Неверный адрес',
  SPAM: 'Спам',
  IRRELEVANT: 'Не по теме',
  OTHER: 'Другое',
};

export function venueRejectReasonLabel(code: VenueModerationReasonCode): string {
  return LABELS[code] ?? code;
}

export const VENUE_REJECT_REASON_OPTIONS: VenueModerationReasonCode[] = [
  'DUPLICATE_NOT_CONFIRMED',
  'BAD_SOURCE_DATA',
  'WRONG_CITY',
  'WRONG_ADDRESS',
  'SPAM',
  'IRRELEVANT',
  'OTHER',
];
