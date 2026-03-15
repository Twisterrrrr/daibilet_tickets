/**
 * P3.1-2: Расчёты для Tax Matrix — единый источник формул НДС и комиссии.
 * Используется в отчётах, УПД и юнит-тестах.
 */

const DECIMAL_PLACES = 2;

function roundMoney(value: number): number {
  return Math.round(value * 10 ** DECIMAL_PLACES) / 10 ** DECIMAL_PLACES;
}

/**
 * Выделение НДС из суммы с НДС (gross) и расчёт базы (net).
 * Формула: net = gross / (1 + rate/100), vat = gross - net.
 * При rate=20%: net = gross/1.2, vat = gross - net = gross/1.2 * 0.2.
 *
 * @param grossAmount — сумма с НДС (например, 1200 при 20% НДС)
 * @param vatRatePercent — ставка НДС, 0..100 (0 — без НДС)
 * @returns net — сумма без НДС, vat — сумма НДС (округлено до 2 знаков)
 */
export function vatFromGross(
  grossAmount: number,
  vatRatePercent: number,
): { net: number; vat: number } {
  if (grossAmount === 0) {
    return { net: 0, vat: 0 };
  }
  if (vatRatePercent === 0) {
    return { net: roundMoney(grossAmount), vat: 0 };
  }
  const divisor = 1 + vatRatePercent / 100;
  const net = roundMoney(grossAmount / divisor);
  const vat = roundMoney(grossAmount - net);
  return { net, vat };
}

export interface CommissionOptions {
  /** Ставка НДС (%). Если задана и commissionAfterVat=true, комиссия считается от net. */
  vatRatePercent?: number;
  /** Комиссия считается от суммы без НДС (после выделения НДС). */
  commissionAfterVat?: boolean;
}

/**
 * Расчёт комиссии от суммы.
 * — До налогов: commission = gross * commissionPercent/100.
 * — После налогов: net = vatFromGross(gross, vatRatePercent).net, commission = net * commissionPercent/100.
 *
 * @param grossAmount — выручка (с НДС или без — зависит от контекста)
 * @param commissionPercent — процент комиссии платформы (0..100)
 * @param options — vatRatePercent и commissionAfterVat для расчёта «после НДС»
 */
export function commissionFromGross(
  grossAmount: number,
  commissionPercent: number,
  options?: CommissionOptions,
): { commission: number; baseForCommission: number } {
  if (grossAmount === 0 || commissionPercent === 0) {
    return { commission: 0, baseForCommission: grossAmount };
  }
  const afterVat = options?.commissionAfterVat && (options.vatRatePercent ?? 0) > 0;
  const baseForCommission = afterVat
    ? vatFromGross(grossAmount, options.vatRatePercent!).net
    : grossAmount;
  const commission = roundMoney((baseForCommission * commissionPercent) / 100);
  return { commission, baseForCommission };
}
