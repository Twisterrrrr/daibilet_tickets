type DemoItem = {
  title: string;
  quantity: number;
  price: number;
  vatRate: number;
  vatAmount: number;
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
  items: DemoItem[];
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
};

const css = `
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    h2 { font-size: 16px; margin: 16px 0 8px; }
    p { margin: 4px 0; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #ccc; padding: 6px; font-size: 12px; text-align: left; }
    .right { text-align: right; }
    .muted { color: #666; }
    .sign { margin-top: 24px; display: flex; justify-content: space-between; }
  </style>
`;

export function renderAgentReportHtml(payload: DemoPayload): string {
  const rows = payload.items
    .map(
      (i, idx) => `<tr>
  <td>${idx + 1}</td>
  <td>${i.title}</td>
  <td class="right">${i.quantity}</td>
  <td class="right">${i.price.toFixed(2)}</td>
  <td class="right">${(i.quantity * i.price).toFixed(2)}</td>
</tr>`,
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8" />${css}</head><body>
<h1>Отчет агента</h1>
<p>Номер: ${payload.number}</p>
<p>Дата: ${payload.date}</p>
<p>Период: ${payload.periodStart} - ${payload.periodEnd}</p>
<p>Принципал: ${payload.supplierName} (ИНН ${payload.supplierInn})</p>
<p>Агент: Daibilet</p>
<h2>Перечень продаж</h2>
<table>
  <thead><tr><th>#</th><th>Услуга</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<p><b>Сумма продаж:</b> ${payload.grossAmount.toFixed(2)} RUB</p>
<p><b>Комиссия агента:</b> ${payload.commissionAmount.toFixed(2)} RUB</p>
<p><b>Итог к перечислению:</b> ${payload.netAmount.toFixed(2)} RUB</p>
</body></html>`;
}

export function renderServiceActHtml(payload: DemoPayload): string {
  return `<!doctype html><html><head><meta charset="utf-8" />${css}</head><body>
<h1>Акт оказанных услуг</h1>
<p>Номер: ${payload.number}</p>
<p>Дата: ${payload.date}</p>
<p>Период: ${payload.periodStart} - ${payload.periodEnd}</p>
<p>Исполнитель (Агент): Daibilet</p>
<p>Заказчик (Принципал): ${payload.supplierName}, ИНН ${payload.supplierInn}${payload.supplierKpp ? `, КПП ${payload.supplierKpp}` : ''}</p>
<p>Основание: договор агентского обслуживания (demo)</p>
<table>
  <thead><tr><th>Услуга</th><th>Сумма</th></tr></thead>
  <tbody>
    <tr><td>Агентские услуги платформы за период</td><td class="right">${payload.commissionAmount.toFixed(2)} RUB</td></tr>
  </tbody>
</table>
<p class="muted">НДС: ${payload.vatRate > 0 ? `${payload.vatRate}% (${payload.vatAmount.toFixed(2)} RUB)` : 'Без НДС'}</p>
<div class="sign">
  <div>Исполнитель: ____________</div>
  <div>Заказчик: ____________</div>
</div>
</body></html>`;
}

export function renderUpdHtml(payload: DemoPayload): string {
  const rows = payload.items
    .map(
      (i, idx) => `<tr>
  <td>${idx + 1}</td>
  <td>${i.title}</td>
  <td class="right">${i.quantity}</td>
  <td class="right">${i.price.toFixed(2)}</td>
  <td class="right">${i.vatRate}%</td>
  <td class="right">${i.vatAmount.toFixed(2)}</td>
  <td class="right">${(i.quantity * i.price).toFixed(2)}</td>
</tr>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8" />${css}</head><body>
<h1>УПД</h1>
<p>Номер: ${payload.number}</p>
<p>Дата: ${payload.date}</p>
<p>Продавец: ${payload.supplierName}, ИНН ${payload.supplierInn}${payload.supplierKpp ? `, КПП ${payload.supplierKpp}` : ''}</p>
<p>Покупатель: ${payload.customerName}${payload.customerInn ? `, ИНН ${payload.customerInn}` : ''}</p>
<table>
  <thead><tr><th>#</th><th>Наименование</th><th>Кол-во</th><th>Цена</th><th>НДС</th><th>Сумма НДС</th><th>Сумма</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<p><b>Ставка НДС:</b> ${payload.vatRate}%</p>
<p><b>Сумма НДС:</b> ${payload.vatAmount.toFixed(2)} RUB</p>
<p><b>Сумма с НДС:</b> ${payload.grossAmount.toFixed(2)} RUB</p>
<p><b>Сумма без НДС:</b> ${(payload.grossAmount - payload.vatAmount).toFixed(2)} RUB</p>
</body></html>`;
}

export function renderInvoiceHtml(payload: DemoPayload): string {
  return `<!doctype html><html><head><meta charset="utf-8" />${css}</head><body>
<h1>Счет на оплату</h1>
<p>Номер: ${payload.number}</p>
<p>Дата: ${payload.date}</p>
<p>Период: ${payload.periodStart} - ${payload.periodEnd}</p>
<p>Поставщик: ${payload.supplierName}, ИНН ${payload.supplierInn}</p>
<p>Покупатель: ${payload.customerName}${payload.customerInn ? `, ИНН ${payload.customerInn}` : ''}</p>
<p>Основание: расчеты по агентскому договору</p>
<p><b>Сумма к оплате:</b> ${payload.netAmount.toFixed(2)} RUB</p>
<p><b>НДС:</b> ${payload.vatRate > 0 ? `${payload.vatRate}%` : 'Без НДС'}</p>
</body></html>`;
}

export function renderVatInvoiceHtml(payload: DemoPayload): string {
  return `<!doctype html><html><head><meta charset="utf-8" />${css}</head><body>
<h1>Счет-фактура</h1>
<p>Номер: ${payload.number}</p>
<p>Дата: ${payload.date}</p>
<p>Продавец: ${payload.supplierName}, ИНН ${payload.supplierInn}${payload.supplierKpp ? `, КПП ${payload.supplierKpp}` : ''}</p>
<p>Покупатель: ${payload.customerName}${payload.customerInn ? `, ИНН ${payload.customerInn}` : ''}</p>
<p><b>Сумма без НДС:</b> ${(payload.grossAmount - payload.vatAmount).toFixed(2)} RUB</p>
<p><b>Сумма НДС:</b> ${payload.vatAmount.toFixed(2)} RUB</p>
<p><b>Сумма с НДС:</b> ${payload.grossAmount.toFixed(2)} RUB</p>
</body></html>`;
}

