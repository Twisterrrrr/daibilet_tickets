export type TeplohodWidgetLang = 'ru' | 'en';
export type TeplohodWidgetTheme = 'light' | 'dark';
export type TeplohodWidgetLayout = 'compact' | 'full';

export class TeplohodWidgetQueryDto {
  eventId!: string;
  lang?: TeplohodWidgetLang;
  theme?: TeplohodWidgetTheme;
  layout?: TeplohodWidgetLayout;
  origin?: string;
}

export class TeplohodWidgetEventSessionDto {
  id!: string;
  startIso!: string;
  endIso?: string;
  price?: number;
  available?: boolean;
  reasonClosed?: 'SOLD_OUT' | 'PAST' | 'CANCELLED' | 'UNKNOWN';
}

export class TeplohodWidgetEventInfoDto {
  id!: string;
  externalId?: string;
  title!: string;
  city?: string;
  imageUrl?: string;
  url!: string;
  priceFrom?: number;
  currency?: 'RUB';
}

export class TeplohodWidgetUiConfigDto {
  lang!: TeplohodWidgetLang;
  theme!: TeplohodWidgetTheme;
  layout!: TeplohodWidgetLayout;
}

export class TeplohodWidgetEventDto {
  provider!: 'TEPLOHOD';
  event!: TeplohodWidgetEventInfoDto;
  sessions!: TeplohodWidgetEventSessionDto[];
  ui!: TeplohodWidgetUiConfigDto;
}

export class TeplohodWidgetCheckoutReqDto {
  eventId!: string;
  sessionId?: string;
  qty?: number;
  returnUrl?: string;
}

export class TeplohodWidgetCheckoutResDto {
  checkoutUrl!: string;
}

