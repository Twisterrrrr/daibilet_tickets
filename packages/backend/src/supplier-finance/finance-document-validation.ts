import type { DemoDocType, DemoFinancePayload } from './finance-document-render.service';

export type FinanceValidationSeverity = 'error' | 'warning';

export interface FinanceValidationIssue {
  code: string;
  message: string;
  field: string;
  severity: FinanceValidationSeverity;
}

export function validateFinanceDocumentPayload(
  type: DemoDocType,
  payload: DemoFinancePayload,
): FinanceValidationIssue[] {
  const issues: FinanceValidationIssue[] = [];

  const need = (cond: boolean, code: string, field: string, message: string, sev: FinanceValidationSeverity = 'error') => {
    if (!cond) issues.push({ code, field, message, severity: sev });
  };

  need(!!payload.supplierName?.trim(), 'MISSING_SUPPLIER_NAME', 'supplierName', 'Не заполнено наименование поставщика');
  need(!!payload.supplierInn?.trim(), 'MISSING_SUPPLIER_INN', 'supplierInn', 'Не заполнен ИНН поставщика');
  need(!!payload.customerName?.trim(), 'MISSING_CUSTOMER_NAME', 'customerName', 'Не заполнено покупателя');
  need(!!payload.periodStart?.trim(), 'MISSING_PERIOD_START', 'periodStart', 'Не задано начало периода');
  need(!!payload.periodEnd?.trim(), 'MISSING_PERIOD_END', 'periodEnd', 'Не задан конец периода');
  need(Array.isArray(payload.items) && payload.items.length > 0, 'MISSING_LINES', 'items', 'Нет строк документа');
  need(Number.isFinite(payload.grossAmount), 'INVALID_GROSS', 'grossAmount', 'Некорректная сумма');

  if (type === 'INVOICE') {
    need(!!payload.bankBik?.trim(), 'MISSING_BANK_BIK', 'bankBik', 'Для счёта нужен БИК банка');
    need(!!payload.bankSettlementAccount?.trim(), 'MISSING_BANK_ACCOUNT', 'bankSettlementAccount', 'Для счёта нужен р/с');
    need(!!payload.bankRecipientName?.trim(), 'MISSING_BANK_NAME', 'bankRecipientName', 'Для счёта нужно наименование банка', 'warning');
  }

  if (type === 'UPD' || type === 'VAT_INVOICE') {
    need(!!payload.customerInn?.trim(), 'MISSING_CUSTOMER_INN', 'customerInn', 'Для УПД/счет-фактуры нужен ИНН покупателя');
    need(!!payload.supplierLegalAddress?.trim(), 'MISSING_SUPPLIER_ADDRESS', 'supplierLegalAddress', 'Для УПД желателен адрес продавца', 'warning');
    need(!!payload.customerLegalAddress?.trim(), 'MISSING_CUSTOMER_ADDRESS', 'customerLegalAddress', 'Для УПД желателен адрес покупателя', 'warning');
  }

  if (type === 'AGENT_REPORT' || type === 'SERVICE_ACT') {
    need(Number.isFinite(payload.commissionAmount), 'INVALID_COMMISSION', 'commissionAmount', 'Некорректное вознаграждение');
    need(Number.isFinite(payload.netAmount), 'INVALID_NET', 'netAmount', 'Некорректная сумма к перечислению');
  }

  return issues;
}

export function getBlockingFinanceIssues(issues: FinanceValidationIssue[]): FinanceValidationIssue[] {
  return issues.filter((i) => i.severity === 'error');
}
