import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

// ==========================================
// Pricing Service — ядро монетизации Дайбилет
// ==========================================

export interface PriceBreakdown {
  basePrice: number;
  serviceFee: number;
  markup: number;
  upsellTotal: number;
  grandTotal: number;
  perPerson: number;
  estimatedCommission: number;
}

export interface UpsellItem {
  id: string;
  name: string;
  description: string;
  priceKopecks: number;
  category: string;
  citySlug?: string | null;
  icon: string;
}

export interface MarkupContext {
  dateFrom?: string;
  category?: string;
  citySlug?: string;
  daysUntilTrip?: number;
}

interface PeakRange {
  dateFrom: string;
  dateTo: string;
}

interface PricingConfigData {
  serviceFeePercent: number;
  peakMarkupPercent: number;
  lastMinutePercent: number;
  tcCommissionPercent: number;
  peakRanges: PeakRange[];
}

const PRICING_CACHE_KEY = 'pricing:config';
const PRICING_CACHE_TTL = 300; // 5 минут

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // ==========================================
  // Загрузка конфигурации из БД (с кэшем)
  // ==========================================

  private async getConfig(): Promise<PricingConfigData> {
    const cached = await this.cache.getOrSet<PricingConfigData>(
      PRICING_CACHE_KEY,
      PRICING_CACHE_TTL,
      async () => {
        const config = await this.prisma.pricingConfig.findFirst();
        if (!config) {
          return {
            serviceFeePercent: 0,
            peakMarkupPercent: 15,
            lastMinutePercent: 10,
            tcCommissionPercent: 5,
            peakRanges: [],
          };
        }
        return {
          serviceFeePercent: config.serviceFeePercent,
          peakMarkupPercent: config.peakMarkupPercent,
          lastMinutePercent: config.lastMinutePercent,
          tcCommissionPercent: config.tcCommissionPercent,
          peakRanges: (config.peakRanges as unknown as PeakRange[]) || [],
        };
      },
    );
    return cached;
  }

  // ==========================================
  // Основные расчёты
  // ==========================================

  async calculateBreakdown(
    basePriceKopecks: number,
    totalPersons: number,
    upsells: UpsellItem[] = [],
    context: MarkupContext = {},
  ): Promise<PriceBreakdown> {
    const config = await this.getConfig();

    const serviceFee = this.calculateServiceFee(basePriceKopecks, config);
    const markup = this.calculateDynamicMarkup(basePriceKopecks, context, config);
    const upsellTotal = upsells.reduce((sum, u) => sum + u.priceKopecks, 0);
    const grandTotal = basePriceKopecks + serviceFee + markup + upsellTotal;
    const perPerson = totalPersons > 0 ? Math.ceil(grandTotal / totalPersons) : grandTotal;
    const estimatedCommission = Math.floor(basePriceKopecks * config.tcCommissionPercent / 100);

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

  private calculateServiceFee(basePriceKopecks: number, config: PricingConfigData): number {
    if (config.serviceFeePercent <= 0) return 0;
    return Math.ceil(basePriceKopecks * config.serviceFeePercent / 100);
  }

  private calculateDynamicMarkup(basePriceKopecks: number, context: MarkupContext, config: PricingConfigData): number {
    let markupPercent = 0;

    if (context.dateFrom && this.isPeakDate(context.dateFrom, config)) {
      markupPercent += config.peakMarkupPercent;
    }

    if (context.daysUntilTrip !== undefined && context.daysUntilTrip <= 3) {
      markupPercent += config.lastMinutePercent;
    }

    if (markupPercent <= 0) return 0;
    return Math.ceil(basePriceKopecks * markupPercent / 100);
  }

  // ==========================================
  // Upsell-каталог (из БД)
  // ==========================================

  async getUpsells(citySlug?: string): Promise<UpsellItem[]> {
    const where: any = { isActive: true };
    if (citySlug) {
      where.OR = [
        { citySlug: null },
        { citySlug },
      ];
    } else {
      where.citySlug = null;
    }

    const items = await this.prisma.upsellItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });

    return items.map(item => ({
      id: item.id,
      name: item.title,
      description: item.description || '',
      priceKopecks: item.priceKopecks,
      category: item.category,
      citySlug: item.citySlug,
      icon: item.icon || '',
    }));
  }

  // ==========================================
  // Утилиты
  // ==========================================

  isPeakDate(dateStr: string, config?: PricingConfigData): boolean {
    const date = new Date(dateStr);

    // Фиксированные пиковые периоды (белые ночи, майские, новогодние)
    const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const fixedPeakDates = [
      '06-01', '06-15', '06-30', '07-01', '07-05',
      '05-01', '05-02', '05-03', '05-08', '05-09', '05-10',
      '12-31', '01-01', '01-02', '01-03', '01-04', '01-05', '01-06', '01-07',
    ];
    if (fixedPeakDates.includes(mmdd)) return true;

    // Динамические пиковые диапазоны из конфигурации
    if (config?.peakRanges) {
      for (const range of config.peakRanges) {
        const from = new Date(range.dateFrom);
        const to = new Date(range.dateTo);
        if (date >= from && date <= to) return true;
      }
    }

    return false;
  }

  daysUntilDate(dateStr: string): number {
    const now = new Date();
    const target = new Date(dateStr);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  async getConfigPublic() {
    const config = await this.getConfig();
    return {
      serviceFeePercent: config.serviceFeePercent,
      peakMarkupPercent: config.peakMarkupPercent,
      tcCommissionPercent: config.tcCommissionPercent,
      lastMinuteMarkupPercent: config.lastMinutePercent,
    };
  }
}
