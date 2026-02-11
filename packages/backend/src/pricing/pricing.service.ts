import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ==========================================
// Pricing Service — ядро монетизации Дайбилет
// ==========================================
//
// Модель дохода:
// 1. Агентская комиссия TC (5-15%) — уже в цене TC, нам перечисляют разницу
// 2. Сервисный сбор (SERVICE_FEE_PERCENT) — наценка на пакет Trip Planner
// 3. Динамическая наценка (PEAK_MARKUP_PERCENT) — пиковые даты/события
// 4. Upsell — дополнительные услуги (ужин, трансфер, VIP)
//
// Стратегия MVP: 0% сервисный сбор первые 3-6 месяцев,
// доход только от агентской комиссии TC.

export interface PriceBreakdown {
  /** Базовая стоимость билетов (копейки) */
  basePrice: number;
  /** Сервисный сбор (копейки) */
  serviceFee: number;
  /** Динамическая наценка (копейки) */
  markup: number;
  /** Стоимость upsell-услуг (копейки) */
  upsellTotal: number;
  /** Итого к оплате (копейки) */
  grandTotal: number;
  /** Цена за человека (копейки) */
  perPerson: number;
  /** Ожидаемая агентская комиссия от TC (копейки) */
  estimatedCommission: number;
}

export interface UpsellItem {
  id: string;
  name: string;
  description: string;
  priceKopecks: number;
  category: 'food' | 'transport' | 'vip' | 'souvenir' | 'photo';
  citySlug?: string; // если привязан к городу
  icon: string;
}

export interface MarkupContext {
  /** Дата начала поездки */
  dateFrom?: string;
  /** Категория события */
  category?: string;
  /** Город */
  citySlug?: string;
  /** Количество дней до поездки */
  daysUntilTrip?: number;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  // Конфигурация (из env с дефолтами)
  private readonly SERVICE_FEE_PERCENT: number;
  private readonly PEAK_MARKUP_PERCENT: number;
  private readonly TC_COMMISSION_PERCENT: number;
  private readonly LAST_MINUTE_MARKUP_PERCENT: number;

  // Пиковые даты (фиксированные + генерируемые)
  private readonly PEAK_DATES: string[] = [
    // Белые ночи СПб
    '06-01', '06-02', '06-03', '06-04', '06-05', '06-06', '06-07',
    '06-08', '06-09', '06-10', '06-11', '06-12', '06-13', '06-14',
    '06-15', '06-16', '06-17', '06-18', '06-19', '06-20', '06-21',
    '06-22', '06-23', '06-24', '06-25', '06-26', '06-27', '06-28',
    '06-29', '06-30', '07-01', '07-02', '07-03', '07-04', '07-05',
    // Майские
    '05-01', '05-02', '05-03', '05-08', '05-09', '05-10',
    // Новогодние
    '12-31', '01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07',
  ];

  constructor(private readonly config: ConfigService) {
    this.SERVICE_FEE_PERCENT = Number(config.get('SERVICE_FEE_PERCENT', '0'));
    this.PEAK_MARKUP_PERCENT = Number(config.get('PEAK_MARKUP_PERCENT', '0'));
    this.TC_COMMISSION_PERCENT = Number(config.get('TC_COMMISSION_PERCENT', '10'));
    this.LAST_MINUTE_MARKUP_PERCENT = Number(config.get('LAST_MINUTE_MARKUP_PERCENT', '0'));

    this.logger.log(
      `Pricing: fee=${this.SERVICE_FEE_PERCENT}%, peak=${this.PEAK_MARKUP_PERCENT}%, ` +
      `tc_commission=${this.TC_COMMISSION_PERCENT}%, last_minute=${this.LAST_MINUTE_MARKUP_PERCENT}%`,
    );
  }

  // ==========================================
  // Основные расчёты
  // ==========================================

  /**
   * Рассчитать полную разбивку цены пакета.
   */
  calculateBreakdown(
    basePriceKopecks: number,
    totalPersons: number,
    upsells: UpsellItem[] = [],
    context: MarkupContext = {},
  ): PriceBreakdown {
    const serviceFee = this.calculateServiceFee(basePriceKopecks);
    const markup = this.calculateDynamicMarkup(basePriceKopecks, context);
    const upsellTotal = upsells.reduce((sum, u) => sum + u.priceKopecks, 0);
    const grandTotal = basePriceKopecks + serviceFee + markup + upsellTotal;
    const perPerson = totalPersons > 0 ? Math.ceil(grandTotal / totalPersons) : grandTotal;
    const estimatedCommission = this.estimateCommission(basePriceKopecks);

    return {
      basePrice: basePriceKopecks,
      serviceFee,
      markup,
      upsellTotal,
      grandTotal,
      perPerson,
      estimatedCommission,
    };
  }

  /**
   * Сервисный сбор (% от базовой цены).
   */
  calculateServiceFee(basePriceKopecks: number): number {
    if (this.SERVICE_FEE_PERCENT <= 0) return 0;
    return Math.ceil(basePriceKopecks * this.SERVICE_FEE_PERCENT / 100);
  }

  /**
   * Динамическая наценка (пиковые даты + last-minute).
   */
  calculateDynamicMarkup(basePriceKopecks: number, context: MarkupContext = {}): number {
    let markupPercent = 0;

    // Пиковые даты
    if (context.dateFrom && this.isPeakDate(context.dateFrom)) {
      markupPercent += this.PEAK_MARKUP_PERCENT;
    }

    // Last-minute (менее 3 дней до поездки)
    if (context.daysUntilTrip !== undefined && context.daysUntilTrip <= 3) {
      markupPercent += this.LAST_MINUTE_MARKUP_PERCENT;
    }

    if (markupPercent <= 0) return 0;
    return Math.ceil(basePriceKopecks * markupPercent / 100);
  }

  /**
   * Ожидаемая агентская комиссия от TC (для аналитики, не для пользователя).
   */
  estimateCommission(basePriceKopecks: number): number {
    return Math.floor(basePriceKopecks * this.TC_COMMISSION_PERCENT / 100);
  }

  // ==========================================
  // Upsell-каталог
  // ==========================================

  /**
   * Получить доступные upsell-предложения для города.
   */
  getUpsells(citySlug?: string): UpsellItem[] {
    const catalog = this.getUpsellCatalog();
    if (!citySlug) return catalog.filter(u => !u.citySlug);
    return catalog.filter(u => !u.citySlug || u.citySlug === citySlug);
  }

  private getUpsellCatalog(): UpsellItem[] {
    return [
      // Универсальные
      {
        id: 'photo-pack',
        name: 'Фотопакет',
        description: 'Профессиональная фотосессия на 15 минут в знаковом месте',
        priceKopecks: 300000, // 3000₽
        category: 'photo',
        icon: '📸',
      },
      {
        id: 'souvenir-box',
        name: 'Сувенирный набор',
        description: 'Подборка локальных сувениров от местных мастеров',
        priceKopecks: 150000, // 1500₽
        category: 'souvenir',
        icon: '🎁',
      },

      // СПб
      {
        id: 'spb-dinner-cruise',
        name: 'Ужин на теплоходе',
        description: 'Романтический ужин на теплоходе по Неве (2 часа)',
        priceKopecks: 450000, // 4500₽
        category: 'food',
        citySlug: 'saint-petersburg',
        icon: '🍽️',
      },
      {
        id: 'spb-transfer-airport',
        name: 'Трансфер из аэропорта',
        description: 'Комфортный трансфер Пулково → отель',
        priceKopecks: 200000, // 2000₽
        category: 'transport',
        citySlug: 'saint-petersburg',
        icon: '🚗',
      },
      {
        id: 'spb-vip-boat',
        name: 'VIP-прогулка',
        description: 'Индивидуальная прогулка на катере (до 6 человек)',
        priceKopecks: 1200000, // 12000₽
        category: 'vip',
        citySlug: 'saint-petersburg',
        icon: '🛥️',
      },

      // Москва
      {
        id: 'msk-dinner-cruise',
        name: 'Ужин на теплоходе',
        description: 'Ужин-круиз по Москве-реке с видом на Кремль (2,5 часа)',
        priceKopecks: 500000, // 5000₽
        category: 'food',
        citySlug: 'moscow',
        icon: '🍽️',
      },
      {
        id: 'msk-transfer-airport',
        name: 'Трансфер из аэропорта',
        description: 'Комфортный трансфер из любого аэропорта → отель',
        priceKopecks: 250000, // 2500₽
        category: 'transport',
        citySlug: 'moscow',
        icon: '🚗',
      },

      // Казань
      {
        id: 'kzn-gastro-tour',
        name: 'Гастро-тур',
        description: 'Дегустация татарской кухни: чак-чак, эчпочмак, кыстыбый',
        priceKopecks: 250000, // 2500₽
        category: 'food',
        citySlug: 'kazan',
        icon: '🥟',
      },

      // Калининград
      {
        id: 'kld-amber-tour',
        name: 'Янтарный мастер-класс',
        description: 'Создайте украшение из балтийского янтаря',
        priceKopecks: 200000, // 2000₽
        category: 'souvenir',
        citySlug: 'kaliningrad',
        icon: '💎',
      },

      // Нижний Новгород
      {
        id: 'nn-sunset-cruise',
        name: 'Закатный круиз',
        description: 'Вечерняя прогулка по Волге на закате (1,5 часа)',
        priceKopecks: 200000, // 2000₽
        category: 'food',
        citySlug: 'nizhny-novgorod',
        icon: '🌅',
      },
    ];
  }

  // ==========================================
  // Утилиты
  // ==========================================

  /**
   * Проверить, является ли дата пиковой.
   */
  isPeakDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return this.PEAK_DATES.includes(mmdd);
  }

  /**
   * Рассчитать дней до поездки.
   */
  daysUntilDate(dateStr: string): number {
    const now = new Date();
    const target = new Date(dateStr);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Текущая конфигурация (для отладки/админки).
   */
  getConfig() {
    return {
      serviceFeePercent: this.SERVICE_FEE_PERCENT,
      peakMarkupPercent: this.PEAK_MARKUP_PERCENT,
      tcCommissionPercent: this.TC_COMMISSION_PERCENT,
      lastMinuteMarkupPercent: this.LAST_MINUTE_MARKUP_PERCENT,
      peakDatesCount: this.PEAK_DATES.length,
      upsellCount: this.getUpsellCatalog().length,
    };
  }
}
