import { rublesToWords } from './invoice-amount-words';
import {
  FN_COMMERCIAL_INVOICE_FOOTER,
  FN_PP1137_APPENDIX,
  FN_SF_CORRECTION,
  FN_SF_CORRECTION_NOTE,
  FN_SF_NUMBER_NOTE,
} from './finance-document-form-boilerplate';

type DemoItem = {
  title: string;
  quantity: number;
  price: number;
  vatRate: number;
  vatAmount: number;
  /** Дата операции в таблице отчёта агента (YYYY-MM-DD) */
  operationDate?: string | null;
};

type DemoPayload = {
  number: string;
  date: string;
  periodStart: string;
  periodEnd: string;
  supplierName: string;
  supplierInn: string;
  supplierKpp?: string | null;
  customerName: string;
  customerInn?: string | null;
  customerKpp?: string | null;
  items: DemoItem[];
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  bankRecipientName?: string | null;
  bankBik?: string | null;
  bankCorrespondentAccount?: string | null;
  bankSettlementAccount?: string | null;
  supplierLegalAddress?: string | null;
  customerLegalAddress?: string | null;
  /** Агентский договор (шапка отчёта агента) */
  agentAgreementNumber?: string | null;
  agentAgreementDate?: string | null;
  invoicePaymentDueText?: string | null;
};

function esc(s: string | number | null | undefined): string {
  if (s == null || s === '') return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MONTHS_GEN = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const;

function formatDateLongRu(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return esc(iso);
  return `${d} ${MONTHS_GEN[m - 1] ?? ''} ${y} г.`;
}

function formatShortRu(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return esc(iso);
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
}

function moneyRu(n: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatQty(q: number): string {
  if (Number.isInteger(q)) return String(q);
  return q.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

/** Табличная часть по структуре ПП № 1137; под A4 — мелкий кегль (`fn-table-1137`). */
function build1137GoodsTable(payload: DemoPayload, tfootLabel: string): string {
  const rows = payload.items
    .map((i, idx) => {
      const lineIncl = i.quantity * i.price;
      const lineExcl = lineIncl - i.vatAmount;
      const unitExcl = i.quantity > 0 ? lineExcl / i.quantity : 0;
      const rateCell = i.vatRate > 0 ? `${i.vatRate}%` : 'без НДС';
      return `<tr>
        <td style="text-align:center">—</td>
        <td style="text-align:center">${idx + 1}</td>
        <td>${esc(i.title)}</td>
        <td style="text-align:center">—</td>
        <td style="text-align:center">796<br>усл.</td>
        <td class="numeric">${esc(formatQty(i.quantity))}</td>
        <td class="numeric">${moneyRu(unitExcl)}</td>
        <td class="numeric">${moneyRu(lineExcl)}</td>
        <td style="text-align:center;font-size:6.7pt;line-height:1.1">без<br>акциза</td>
        <td style="text-align:center">${rateCell}</td>
        <td class="numeric">${moneyRu(i.vatAmount)}</td>
        <td class="numeric">${moneyRu(lineIncl)}</td>
        <td style="text-align:center">—</td>
      </tr>`;
    })
    .join('');

  const totalExcl = payload.items.reduce((s, i) => s + (i.quantity * i.price - i.vatAmount), 0);
  const totalVat = payload.items.reduce((s, i) => s + i.vatAmount, 0);
  const totalPaid = payload.grossAmount;

  return `<table class="fn-table-1137">
    <thead>
      <tr>
        <th style="width:4.2%">Код товара/ работ, услуг (А)</th>
        <th style="width:2.6%">№ п/п<br>(1)</th>
        <th>Наименование товара (описание выполненных работ, оказанных услуг), имущественного права</th>
        <th style="width:5.5%">Код вида товара (1а)<br><span style="font-weight:normal">(1б)</span></th>
        <th style="width:5.2%">Ед. изм.<br>(2)(2а)</th>
        <th style="width:4.8%">Кол-во<br>(3)</th>
        <th style="width:6.5%">Цена<br>(4)</th>
        <th style="width:7.2%">Стоимость без НДС<br>(5)</th>
        <th style="width:5.5%">Акциз<br>(6)</th>
        <th style="width:4.5%">Ставка<br>(7)</th>
        <th style="width:6.5%">Сумма НДС<br>(8)</th>
        <th style="width:7%">Всего с НДС<br>(9)</th>
        <th style="width:5.8%">Страна /<br>прослеж.<br>(10)(10а)(11)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="7" style="text-align:right">Всего к оплате ${esc(tfootLabel)}</td>
        <td class="numeric">${moneyRu(totalExcl)}</td>
        <td style="text-align:center">Х</td>
        <td style="text-align:center">Х</td>
        <td class="numeric">${moneyRu(totalVat)}</td>
        <td class="numeric">${moneyRu(totalPaid)}</td>
        <td style="text-align:center">—</td>
      </tr>
    </tfoot>
  </table>`;
}

export function renderAgentReportHtml(payload: DemoPayload): string {
  const agNum = payload.agentAgreementNumber?.trim();
  const agDate = payload.agentAgreementDate?.trim();
  const contractTail =
    agNum && agDate
      ? `№${esc(agNum)} от ${formatShortRu(agDate)}`
      : agNum
        ? `№${esc(agNum)} от ${formatShortRu(payload.periodStart)}`
        : `(номер и дата договора — по данным учёта)`;

  const totalDeals = payload.items.reduce((s, i) => s + i.quantity * i.price, 0);
  const commissionVat =
    payload.vatRate > 0
      ? Number(((payload.commissionAmount * payload.vatRate) / (100 + payload.vatRate)).toFixed(2))
      : 0;

  let allocatedCommission = 0;
  const rows = payload.items
    .map((i, idx) => {
      const dealSum = i.quantity * i.price;
      const opDate = i.operationDate?.trim()
        ? formatShortRu(i.operationDate)
        : formatShortRu(payload.periodEnd);
      const isLast = idx === payload.items.length - 1;
      const lineCommission =
        totalDeals > 0
          ? isLast
            ? Number((payload.commissionAmount - allocatedCommission).toFixed(2))
            : Number(((dealSum / totalDeals) * payload.commissionAmount).toFixed(2))
          : 0;
      if (!isLast) allocatedCommission += lineCommission;
      const lineToPrincipal = Number((dealSum - lineCommission).toFixed(2));
      return `<tr>
      <td style="text-align:center">${idx + 1}</td>
      <td>${esc(i.title)}</td>
      <td style="text-align:center">${opDate}</td>
      <td class="numeric">${moneyRu(dealSum)}</td>
      <td class="numeric">${moneyRu(i.vatAmount)}</td>
      <td class="numeric">${moneyRu(lineCommission)}</td>
      <td class="numeric">${moneyRu(lineToPrincipal)}</td>
    </tr>`;
    })
    .join('');

  const supKpp = payload.supplierKpp?.trim();
  const custKpp = payload.customerKpp?.trim();

  return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Отчёт агента № ${esc(payload.number)}</title>
</head>
<body>
<div class="fn-doc">
    <table class="fn-meta-two">
        <tr><td>Номер отчёта</td><td>${esc(payload.number)}</td></tr>
        <tr><td>Дата составления</td><td>${formatDateLongRu(payload.date)}</td></tr>
    </table>

    <div class="fn-doc-title">Отчёт агента</div>
    <div class="fn-doc-sub">об исполнении поручения по агентскому договору ${contractTail}</div>

    <div class="fn-section-title">Стороны и период</div>
    <table class="fn-req-table">
        <tr>
            <td>Отчётный период</td>
            <td>с ${formatShortRu(payload.periodStart)} по ${formatShortRu(payload.periodEnd)}</td>
        </tr>
        <tr>
            <td>Агент</td>
            <td>${esc(payload.customerName)}${payload.customerInn ? `, ИНН ${esc(payload.customerInn)}` : ''}${custKpp ? `, КПП ${esc(custKpp)}` : ''}</td>
        </tr>
        <tr>
            <td>Принципал</td>
            <td>${esc(payload.supplierName)}, ИНН ${esc(payload.supplierInn)}${supKpp ? `, КПП ${esc(supKpp)}` : ''}</td>
        </tr>
    </table>

    <div class="fn-section-title">Расшифровка операций</div>
    <p class="fn-small-note" style="margin-top:0">Настоящим Агент уведомляет Принципала об операциях, отражённых в отчётном периоде.</p>

    <table class="fn-table">
        <thead>
            <tr>
                <th style="width:2.2em">№</th>
                <th>Содержание операции (наименование, заказ / основание)</th>
                <th style="width:7em">Дата</th>
                <th style="width:8em">Реализация,<br>руб.</th>
                <th style="width:7em">НДС по<br>сделке, руб.</th>
                <th style="width:8em">Вознаграждение<br>агента, руб.</th>
                <th style="width:8em">К перечислению<br>принципалу, руб.</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>

    <p class="fn-small-note fn-avoid-break"><b>Примечание.</b> Детализация по отдельным заказам и событиям подключается при расширении расчётного контура; форма отчёта сохраняется. Для сверки используйте данные расчётного периода в учётной системе.</p>

    <div class="fn-section-title">Итоги по отчёту</div>
    <table class="fn-total-box">
        <tr>
            <td>Всего реализация (оборот)</td>
            <td class="numeric">${moneyRu(totalDeals)}</td>
        </tr>
        <tr>
            <td>Сумма агентского вознаграждения</td>
            <td class="numeric">${moneyRu(payload.commissionAmount)}</td>
        </tr>
        <tr>
            <td>В том числе НДС с вознаграждения (${payload.vatRate}%)</td>
            <td class="numeric">${moneyRu(commissionVat)}</td>
        </tr>
        <tr class="fn-total-pay">
            <td>Сумма к перечислению принципалу (итого)</td>
            <td class="numeric">${moneyRu(payload.netAmount)}</td>
        </tr>
    </table>

    <p class="fn-small-note fn-avoid-break" style="margin-top:14px">К отчёту могут прилагаться копии первичных документов — при отражении в договоре. Претензии по отчёту направляются Агенту в срок, установленный договором (при отсутствии оговорки — в течение 30 календарных дней с даты получения отчёта).</p>

    <div class="fn-signatures fn-avoid-break">
        <div class="fn-section-title" style="margin-top:18px">Подписи сторон</div>
        <div class="fn-sig-pair">
            <div>
                От Агента:<br>
                <div class="fn-sig-line"></div>
                <span style="font-size:8.5pt">(подпись, расшифровка)</span>
            </div>
            <div>
                От Принципала:<br>
                <div class="fn-sig-line"></div>
                <span style="font-size:8.5pt">(подпись, расшифровка)</span>
            </div>
        </div>
    </div>
</div>
</body>
</html>`;
}

function formatAgentContractBasis(payload: DemoPayload): string {
  const agNum = payload.agentAgreementNumber?.trim();
  const agDate = payload.agentAgreementDate?.trim();
  if (agNum && agDate) {
    return `Агентский договор №${esc(agNum)} от ${formatShortRu(agDate)}`;
  }
  if (agNum) {
    return `Агентский договор №${esc(agNum)} от ${formatShortRu(payload.periodStart)}`;
  }
  return 'Агентский договор (реквизиты по данным учёта)';
}

export function renderServiceActHtml(payload: DemoPayload): string {
  const inn = esc(payload.supplierInn);
  const supAddr = payload.supplierLegalAddress?.trim();
  const executorBlock = supAddr
    ? `<b>${esc(payload.supplierName)}, ИНН ${inn}, ${esc(supAddr)}</b>`
    : `<b>${esc(payload.supplierName)}, ИНН ${inn}</b>`;
  const buyerAddr = payload.customerLegalAddress?.trim();
  const customerBlock = `<b>${esc(payload.customerName)}${payload.customerInn ? `, ИНН ${esc(payload.customerInn)}` : ''}${buyerAddr ? `, ${esc(buyerAddr)}` : ''}</b>`;

  const itemRows = payload.items
    .map((i, idx) => {
      const lineIncl = i.quantity * i.price;
      const lineExcl = lineIncl - i.vatAmount;
      const unitExcl = i.quantity > 0 ? lineExcl / i.quantity : 0;
      return `<tr>
                <td style="text-align:center">${idx + 1}</td>
                <td>${esc(i.title)}</td>
                <td style="text-align:center">${i.quantity}</td>
                <td style="text-align:center">усл.</td>
                <td class="numeric">${moneyRu(unitExcl)}</td>
                <td class="numeric">${moneyRu(lineExcl)}</td>
            </tr>`;
    })
    .join('');

  const totalExcl = payload.items.reduce((s, i) => s + (i.quantity * i.price - i.vatAmount), 0);
  const totalVat = payload.items.reduce((s, i) => s + i.vatAmount, 0);
  const totalPaid = payload.grossAmount;
  const vatLabel =
    payload.vatRate > 0 ? `В том числе НДС (${payload.vatRate}%)` : 'В том числе НДС';
  const summaryWords = rublesToWords(totalPaid);

  return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Акт об оказании услуг № ${esc(payload.number)}</title>
</head>
<body>
<div class="fn-doc">
    <div class="fn-doc-title" style="margin-bottom:2px">Акт № ${esc(payload.number)} от ${formatDateLongRu(payload.date)}</div>
    <div class="fn-doc-sub" style="font-size:10pt;font-weight:normal;margin-bottom:12px">об оказании услуг</div>

    <table class="fn-req-table">
        <tr>
            <td>Исполнитель:</td>
            <td>${executorBlock}</td>
        </tr>
        <tr>
            <td>Заказчик:</td>
            <td>${customerBlock}</td>
        </tr>
        <tr>
            <td>Основание:</td>
            <td>${formatAgentContractBasis(payload)}; период: с ${formatShortRu(payload.periodStart)} по ${formatShortRu(payload.periodEnd)}</td>
        </tr>
    </table>

    <table class="fn-table" style="margin-top:10px">
        <thead>
            <tr>
                <th style="width:5%">№</th>
                <th>Наименование работ, услуг</th>
                <th style="width:9%">Кол-во</th>
                <th style="width:8%">Ед.</th>
                <th style="width:13%">Цена без НДС</th>
                <th style="width:13%">Сумма без НДС</th>
            </tr>
        </thead>
        <tbody>
            ${itemRows}
        </tbody>
    </table>

    <table class="fn-total-box" style="max-width:100%;margin-top:12px">
        <tr>
            <td>Всего без НДС</td>
            <td class="numeric">${moneyRu(totalExcl)}</td>
        </tr>
        <tr>
            <td>${vatLabel}</td>
            <td class="numeric">${moneyRu(totalVat)}</td>
        </tr>
        <tr class="fn-total-pay">
            <td>Всего с НДС</td>
            <td class="numeric">${moneyRu(totalPaid)}</td>
        </tr>
    </table>

    <p style="font-size:9.5pt;margin:14px 0 4px">Всего оказано услуг на сумму <b>${moneyRu(totalPaid)}</b> руб.</p>
    <p style="font-size:9.5pt;margin:0 0 14px"><b>${esc(summaryWords)}</b>${payload.vatRate > 0 ? `, в т.ч. НДС — ${moneyRu(totalVat)} руб.` : ''}</p>

    <p class="fn-avoid-break" style="font-size:9.5pt;line-height:1.35;margin:12px 0;text-align:justify">
        Вышеперечисленные услуги выполнены полностью и в срок. Заказчик претензий по объёму, качеству и срокам оказания услуг не имеет.
    </p>

    <table class="fn-act-signed-row">
        <tr>
            <td>Исполнитель</td>
            <td>Заказчик</td>
        </tr>
    </table>
    <div class="fn-sig-pair" style="margin-top:6px">
        <div>
            <div class="fn-sig-line"></div>
            <span style="font-size:8.5pt">(подпись / расшифровка) М.П.</span>
        </div>
        <div>
            <div class="fn-sig-line"></div>
            <span style="font-size:8.5pt">(подпись / расшифровка) М.П.</span>
        </div>
    </div>
</div>
</body>
</html>`;
}

export function renderUpdHtml(payload: DemoPayload): string {
  const supAddr = payload.supplierLegalAddress?.trim();
  const buyerAddr = payload.customerLegalAddress?.trim();
  const sellerInnKpp = `${esc(payload.supplierInn)} / ${payload.supplierKpp?.trim() ? esc(payload.supplierKpp.trim()) : '—'}`;
  const buyerInn = payload.customerInn?.trim();
  const buyerKppPart = payload.customerKpp?.trim();
  const buyerInnKpp = buyerInn
    ? `${esc(buyerInn)} / ${buyerKppPart ? esc(buyerKppPart) : '—'}`
    : '— / —';
  const consignee =
    buyerAddr || payload.customerName
      ? `${esc(payload.customerName)}${buyerAddr ? `, ${esc(buyerAddr)}` : ''}`
      : '—';
  const updShipDoc = `Универсальный передаточный документ, № ${esc(payload.number)} от ${formatDateLongRu(payload.date)}`;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>УПД № ${esc(payload.number)}</title>
</head>
<body>
<div class="fn-doc">
    <table class="fn-upd-top fn-avoid-break">
        <tr>
            <td class="fn-upd-status">
                <div style="font-weight:bold;margin-bottom:4px">Статус</div>
                <div style="font-size:14pt;font-weight:bold">1</div>
                <div style="margin-top:6px;font-size:7.5pt;line-height:1.15">1 — счёт-фактура<br>и передаточный<br>документ (акт)<br>2 — передаточный<br>документ (акт)</div>
            </td>
            <td class="fn-upd-head-main">
                <div class="fn-upd-name">Универсальный передаточный документ</div>
                <div class="fn-sf-doc-line">Счёт-фактура № <b>${esc(payload.number)}</b> от <b>${formatDateLongRu(payload.date)}</b> <span class="fn-sf-num-mark">${esc(FN_SF_NUMBER_NOTE)}</span></div>
                <p class="fn-pp1137-appendix">${esc(FN_PP1137_APPENDIX)}</p>
                <div class="fn-sf-correction">${esc(FN_SF_CORRECTION)} <span class="fn-sf-num-mark">${esc(FN_SF_CORRECTION_NOTE)}</span></div>
                <div style="font-size:10.5pt;margin-top:6px">УПД № <b>${esc(payload.number)}</b> от <b>${formatShortRu(payload.date)}</b></div>
            </td>
        </tr>
    </table>

    <table class="fn-upd-four fn-avoid-break">
        <tr>
            <td class="fn-ud-label">Продавец (2)</td>
            <td><b>${esc(payload.supplierName)}</b></td>
            <td class="fn-ud-label">Покупатель (6)</td>
            <td><b>${esc(payload.customerName)}</b></td>
        </tr>
        <tr>
            <td class="fn-ud-label">Адрес (2а)</td>
            <td>${supAddr ? esc(supAddr) : '—'}</td>
            <td class="fn-ud-label">Адрес (6а)</td>
            <td>${buyerAddr ? esc(buyerAddr) : '—'}</td>
        </tr>
        <tr>
            <td class="fn-ud-label">ИНН/КПП продавца (2б)</td>
            <td><b>${sellerInnKpp}</b></td>
            <td class="fn-ud-label">ИНН/КПП покупателя (6б)</td>
            <td><b>${buyerInnKpp}</b></td>
        </tr>
        <tr>
            <td class="fn-ud-label">Грузоотправитель и адрес (3)</td>
            <td>он же</td>
            <td class="fn-ud-label">Валюта: наименование, код (7)</td>
            <td>Российский рубль, 643</td>
        </tr>
        <tr>
            <td class="fn-ud-label">Грузополучатель и адрес (4)</td>
            <td>${consignee}</td>
            <td class="fn-ud-label">Идентификатор госконтракта (8)</td>
            <td>—</td>
        </tr>
        <tr>
            <td class="fn-ud-label">К платежно-расчётному документу (5)</td>
            <td colspan="3">№ — от —</td>
        </tr>
        <tr>
            <td class="fn-ud-label">Документ об отгрузке (5а)</td>
            <td colspan="3">${updShipDoc}</td>
        </tr>
    </table>

    ${build1137GoodsTable(payload, '(9)')}

    <div class="fn-section-title" style="margin-top:10px">Документ составлен на 1 листе. Ответственные лица</div>
    <table style="width:100%;border-collapse:collapse;font-size:8.5pt;margin-top:4px" class="fn-avoid-break">
        <tr>
            <td style="width:33%;vertical-align:top;padding:6px 5px;border:1px solid #000">
                Руководитель организации<br>или иное уполномоченное лицо<br><br>
                <div style="border-bottom:1px solid #000;min-height:18px"></div>
                <span style="font-size:7.5pt">(подпись) (ф.и.о.)</span>
            </td>
            <td style="width:33%;vertical-align:top;padding:6px 5px;border:1px solid #000">
                Главный бухгалтер<br>или иное уполномоченное лицо<br><br>
                <div style="border-bottom:1px solid #000;min-height:18px"></div>
                <span style="font-size:7.5pt">(подпись) (ф.и.о.)</span>
            </td>
            <td style="width:34%;vertical-align:top;padding:6px 5px;border:1px solid #000">
                Индивидуальный предприниматель<br>или иное уполномоченное лицо<br><br>
                <div style="border-bottom:1px solid #000;min-height:18px"></div>
                <span style="font-size:7.5pt">(подпись) (ф.и.о.) / реквизиты свидетельства о гос. регистрации ИП</span>
            </td>
        </tr>
        <tr>
            <td colspan="2" style="padding:6px 5px;border:1px solid #000;vertical-align:top">
                <b>Товар (груз) передал / услуги, результаты работ, права сдал.</b><br>
                Дата отгрузки, передачи (сдачи): <b>${formatDateLongRu(payload.date)}</b>
            </td>
            <td style="padding:6px 5px;border:1px solid #000;vertical-align:top">
                <b>Товар (груз) получил / услуги, результаты работ, права принял</b><br><br>
                <div style="border-bottom:1px solid #000;min-height:18px"></div>
                <span style="font-size:7.5pt">(должность) (подпись) (ф.и.о.)</span>
            </td>
        </tr>
    </table>
    <table class="fn-req-table" style="margin-top:8px;font-size:8.5pt">
        <tr><td style="width:22%">Наименование экономического субъекта — составителя документа (14)</td><td><b>${esc(payload.supplierName)}</b></td></tr>
        <tr><td>Покупатель (для сверки)</td><td><b>${esc(payload.customerName)}</b>${buyerInn ? `, ИНН ${esc(buyerInn)}` : ''}</td></tr>
    </table>
    <p class="fn-page-footer">Страница 1 из 1</p>
</div>
</body>
</html>`;
}

export function renderInvoiceHtml(payload: DemoPayload): string {
  const bankLabel = esc(payload.bankRecipientName?.trim()) || '—';
  const bik = esc(payload.bankBik?.trim()) || '—';
  const corr = esc(payload.bankCorrespondentAccount?.trim()) || '—';
  const rs = esc(payload.bankSettlementAccount?.trim()) || '—';
  const inn = esc(payload.supplierInn);
  const kpp = payload.supplierKpp?.trim() ? esc(payload.supplierKpp.trim()) : '—';

  const supAddr = payload.supplierLegalAddress?.trim();
  const buyerAddr = payload.customerLegalAddress?.trim();
  const supplierBlock = supAddr
    ? `<b>${esc(payload.supplierName)}, ИНН ${inn}, ${esc(supAddr)}</b>`
    : `<b>${esc(payload.supplierName)}, ИНН ${inn}</b>`;
  const buyerBlock = `<b>${esc(payload.customerName)}${payload.customerInn ? `, ИНН ${esc(payload.customerInn)}` : ''}${buyerAddr ? `, ${esc(buyerAddr)}` : ''}</b>`;

  const itemRows = payload.items
    .map((i, idx) => {
      const lineIncl = i.quantity * i.price;
      const lineExcl = lineIncl - i.vatAmount;
      const unitExcl = i.quantity > 0 ? lineExcl / i.quantity : 0;
      return `<tr>
      <td style="text-align:center">${idx + 1}</td>
      <td>${esc(i.title)}</td>
      <td style="text-align:center">${i.quantity}</td>
      <td style="text-align:center">усл.</td>
      <td class="numeric">${moneyRu(unitExcl)}</td>
      <td class="numeric">${moneyRu(lineExcl)}</td>
    </tr>`;
    })
    .join('');

  const totalExcl = payload.items.reduce((s, i) => s + (i.quantity * i.price - i.vatAmount), 0);
  const totalVat = payload.items.reduce((s, i) => s + i.vatAmount, 0);
  const totalIncl = payload.grossAmount;
  const cnt = payload.items.length;
  const words = rublesToWords(totalIncl);
  const payBy = esc(payload.invoicePaymentDueText?.trim()) || '________________';

  return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Счёт на оплату № ${esc(payload.number)}</title>
</head>
<body>
<div class="fn-doc">
    <table class="fn-bank">
        <tr>
            <td colspan="2" rowspan="2" style="font-weight:bold">Банк получателя<br><span style="font-weight:normal">${bankLabel}</span></td>
            <td style="width:12%">БИК</td>
            <td style="width:32%">${bik}</td>
        </tr>
        <tr>
            <td>Сч. №</td>
            <td>${corr}</td>
        </tr>
        <tr>
            <td>ИНН ${inn}</td>
            <td>КПП ${kpp}</td>
            <td rowspan="2">Сч. №</td>
            <td rowspan="2"><b>${rs}</b></td>
        </tr>
        <tr>
            <td colspan="2">Получатель: <b>${esc(payload.supplierName)}</b></td>
        </tr>
    </table>

    <div class="fn-doc-title">Счёт на оплату</div>
    <div class="fn-doc-sub">№ ${esc(payload.number)} от ${formatDateLongRu(payload.date)}</div>

    <div class="fn-section-title">Стороны и основание</div>
    <table class="fn-req-table">
        <tr>
            <td>Поставщик / (Исполнитель)</td>
            <td>${supplierBlock}</td>
        </tr>
        <tr>
            <td>Покупатель / (Заказчик)</td>
            <td>${buyerBlock}</td>
        </tr>
        <tr>
            <td>Основание</td>
            <td>Взаиморасчёты по агентскому договору (период: ${formatShortRu(payload.periodStart)} — ${formatShortRu(payload.periodEnd)})</td>
        </tr>
    </table>

    <div class="fn-section-title">Товары (работы, услуги)</div>
    <table class="fn-table">
        <thead>
            <tr>
                <th style="width:4%">№</th>
                <th>Наименование</th>
                <th style="width:9%">Кол-во</th>
                <th style="width:7%">Ед.</th>
                <th style="width:13%">Цена без НДС</th>
                <th style="width:13%">Сумма без НДС</th>
            </tr>
        </thead>
        <tbody>
            ${itemRows}
        </tbody>
    </table>

    <div class="fn-section-title">Итого к оплате</div>
    <table class="fn-total-box">
        <tr>
            <td>Итого без НДС</td>
            <td class="numeric">${moneyRu(totalExcl)}</td>
        </tr>
        <tr>
            <td>В том числе НДС (${payload.vatRate}%)</td>
            <td class="numeric">${moneyRu(totalVat)}</td>
        </tr>
        <tr class="fn-total-pay">
            <td>Всего к оплате</td>
            <td class="numeric">${moneyRu(totalIncl)}</td>
        </tr>
    </table>

    <p style="font-size:9.5pt; margin:12px 0 4px">Всего наименований <b>${cnt}</b>, на сумму <b>${moneyRu(totalIncl)}</b> руб.</p>
    <p style="font-size:9.5pt; margin:0 0 10px"><b>${esc(words)}</b></p>

    <p style="font-size:9.5pt;margin:10px 0"><b>Оплатить не позднее:</b> ${payBy}</p>

    <div class="fn-signatures fn-avoid-break">
        <div class="fn-sig-pair">
            <div>Руководитель<br><div class="fn-sig-line"></div><span style="font-size:8.5pt">(подпись) (ф.и.о.)</span></div>
            <div>Главный бухгалтер<br><div class="fn-sig-line"></div><span style="font-size:8.5pt">(подпись) (ф.и.о.)</span></div>
        </div>
        <p style="font-size:9.5pt;margin-top:14px"><b>Индивидуальный предприниматель</b> (при наличии)<br>
        <div class="fn-sig-line" style="max-width:65%"></div>
        <span style="font-size:8.5pt">(подпись) (ф.и.о.) / реквизиты свидетельства о гос. регистрации ИП</span></p>
    </div>

    ${FN_COMMERCIAL_INVOICE_FOOTER}
    <p class="fn-small-note" style="margin-top:10px">По условиям договора срок оплаты может отличаться; при отсутствии оговорки — в течение 3 банковских дней с даты счёта.</p>
</div>
</body>
</html>`;
}

export function renderVatInvoiceHtml(payload: DemoPayload): string {
  const inn = esc(payload.supplierInn);
  const kpp = payload.supplierKpp?.trim() ? esc(payload.supplierKpp.trim()) : '—';
  const supAddr = payload.supplierLegalAddress?.trim();
  const buyerAddr = payload.customerLegalAddress?.trim();
  const buyerInn = payload.customerInn?.trim();
  const buyerKpp = payload.customerKpp?.trim();
  const sellerInnKpp = `${inn} / ${kpp}`;
  const buyerInnKpp = buyerInn
    ? `${esc(buyerInn)} / ${buyerKpp ? esc(buyerKpp) : '—'}`
    : '— / —';
  const consignee =
    buyerAddr || payload.customerName
      ? `${esc(payload.customerName)}${buyerAddr ? `, ${esc(buyerAddr)}` : ''}`
      : '—';
  const shipDoc = `Универсальный передаточный документ (счёт-фактура), № ${esc(payload.number)} от ${formatDateLongRu(payload.date)}`;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Счёт-фактура № ${esc(payload.number)}</title>
</head>
<body>
<div class="fn-doc">
    <div class="fn-doc-title" style="text-transform:none">Счёт-фактура</div>
    <div class="fn-sf-doc-line">№ <b>${esc(payload.number)}</b> от <b>${formatDateLongRu(payload.date)}</b> <span class="fn-sf-num-mark">${esc(FN_SF_NUMBER_NOTE)}</span></div>
    <p class="fn-pp1137-appendix">${esc(FN_PP1137_APPENDIX)}</p>
    <div class="fn-sf-correction">${esc(FN_SF_CORRECTION)} <span class="fn-sf-num-mark">${esc(FN_SF_CORRECTION_NOTE)}</span></div>

    <table class="fn-upd-four fn-avoid-break">
        <tr>
            <td class="fn-ud-label">Продавец (2)</td>
            <td><b>${esc(payload.supplierName)}</b></td>
            <td class="fn-ud-label">Покупатель (6)</td>
            <td><b>${esc(payload.customerName)}</b></td>
        </tr>
        <tr>
            <td class="fn-ud-label">Адрес (2а)</td>
            <td>${supAddr ? esc(supAddr) : '—'}</td>
            <td class="fn-ud-label">Адрес (6а)</td>
            <td>${buyerAddr ? esc(buyerAddr) : '—'}</td>
        </tr>
        <tr>
            <td class="fn-ud-label">ИНН/КПП продавца (2б)</td>
            <td><b>${sellerInnKpp}</b></td>
            <td class="fn-ud-label">ИНН/КПП покупателя (6б)</td>
            <td><b>${buyerInnKpp}</b></td>
        </tr>
        <tr>
            <td class="fn-ud-label">Грузоотправитель и адрес (3)</td>
            <td>он же</td>
            <td class="fn-ud-label">Валюта: наименование, код (7)</td>
            <td>Российский рубль, 643</td>
        </tr>
        <tr>
            <td class="fn-ud-label">Грузополучатель и адрес (4)</td>
            <td>${consignee}</td>
            <td class="fn-ud-label">Идентификатор госконтракта (8)</td>
            <td>—</td>
        </tr>
        <tr>
            <td class="fn-ud-label">К платежно-расчётному документу (5)</td>
            <td colspan="3">№ — от —</td>
        </tr>
        <tr>
            <td class="fn-ud-label">Документ об отгрузке (5а)</td>
            <td colspan="3">${shipDoc}</td>
        </tr>
    </table>

    ${build1137GoodsTable(payload, '(9)')}

    <div class="fn-section-title" style="margin-top:8px">Подписи</div>
    <table style="width:100%;border-collapse:collapse;font-size:8.5pt" class="fn-avoid-break">
        <tr>
            <td style="width:33%;vertical-align:top;padding:6px 5px;border:1px solid #000">
                Руководитель организации<br>или иное уполномоченное лицо<br><br>
                <div style="border-bottom:1px solid #000;min-height:18px"></div>
                <span style="font-size:7.5pt">(подпись) (ф.и.о.)</span>
            </td>
            <td style="width:33%;vertical-align:top;padding:6px 5px;border:1px solid #000">
                Главный бухгалтер<br>или иное уполномоченное лицо<br><br>
                <div style="border-bottom:1px solid #000;min-height:18px"></div>
                <span style="font-size:7.5pt">(подпись) (ф.и.о.)</span>
            </td>
            <td style="width:34%;vertical-align:top;padding:6px 5px;border:1px solid #000">
                Индивидуальный предприниматель<br>или иное уполномоченное лицо<br><br>
                <div style="border-bottom:1px solid #000;min-height:18px"></div>
                <span style="font-size:7.5pt">(подпись) (ф.и.о.)</span>
            </td>
        </tr>
    </table>
    <p class="fn-page-footer">Страница 1 из 1</p>
</div>
</body>
</html>`;
}

