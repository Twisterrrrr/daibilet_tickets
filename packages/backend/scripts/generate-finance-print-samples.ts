/**
 * Генерирует 5 пар HTML+PDF (те же шаблоны и демо-данные, что в FinanceDocumentRenderService).
 * Запуск из packages/backend: pnpm run finance:print-samples
 *
 * Данные payload синхронизированы с buildSampleFinancePayload / buildSampleAgentReportPayload / withUpdDemoLineTitle.
 */
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import puppeteer from 'puppeteer';

/** Системный Chrome (Windows), если нет кэша Puppeteer и не задан PUPPETEER_EXECUTABLE_PATH. */
function resolveChromeExecutable(): string | undefined {
  const env = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (env) return env;
  if (process.platform !== 'win32') return undefined;
  const pf = process.env.PROGRAMFILES ?? 'C:\\Program Files';
  const pfx86 = process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)';
  const local = process.env.LOCALAPPDATA ?? '';
  const candidates = [
    join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(pfx86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    local ? join(local, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

import { injectPrintCss } from '../src/supplier-finance/templates/finance-html-shell';
import {
  renderAgentReportHtml,
  renderInvoiceHtml,
  renderServiceActHtml,
  renderUpdHtml,
  renderVatInvoiceHtml,
} from '../src/supplier-finance/templates/finance-document-templates';

type DemoDocType = 'AGENT_REPORT' | 'SERVICE_ACT' | 'UPD' | 'INVOICE' | 'VAT_INVOICE';

interface DemoFinancePayload {
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
  items: Array<{
    title: string;
    quantity: number;
    price: number;
    vatRate: number;
    vatAmount: number;
    operationDate?: string | null;
  }>;
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
  agentAgreementNumber?: string | null;
  agentAgreementDate?: string | null;
}

function buildSampleFinancePayload(): DemoFinancePayload {
  return {
    number: 'DEMO-0001',
    date: '2026-03-29',
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    supplierName: 'ООО «Пример Поставщик»',
    supplierInn: '7700000000',
    supplierKpp: '770001001',
    customerName: 'ООО «Daibilet»',
    customerInn: '7800000000',
    customerKpp: '780101001',
    items: [
      {
        title: 'Агентское вознаграждение по отчету № DEMO-0001 от 29.03.2026',
        quantity: 1,
        price: 8000,
        vatRate: 20,
        vatAmount: 1333.33,
      },
    ],
    grossAmount: 8000,
    commissionAmount: 1600,
    netAmount: 6400,
    vatRate: 20,
    vatAmount: 1333.33,
    bankRecipientName: 'Наименование банка Агента',
    bankBik: '044030000',
    bankCorrespondentAccount: '30101810000000000000',
    bankSettlementAccount: '40702810000000000000',
    supplierLegalAddress: '123456, г. Москва, ул. Примерная, д. 1',
    customerLegalAddress: '190000, г. Санкт-Петербург, пр. Тестовый, д. 2',
    agentAgreementNumber: '123',
    agentAgreementDate: '2026-01-01',
  };
}

function withUpdDemoLineTitle(p: DemoFinancePayload): DemoFinancePayload {
  const [y, m] = p.periodEnd.split('-').map(Number);
  const months = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ];
  const label = m >= 1 && m <= 12 ? `${months[m - 1]} ${y}` : p.periodEnd;
  return {
    ...p,
    items: p.items.map((it, idx) =>
      idx === 0 ? { ...it, title: `Агентское вознаграждение за ${label}` } : it,
    ),
  };
}

function buildSampleAgentReportPayload(): DemoFinancePayload {
  const base = buildSampleFinancePayload();
  return {
    ...base,
    items: [
      {
        title: 'Реализация услуг по бронированию (Заказ №445)',
        quantity: 1,
        price: 40000,
        vatRate: 20,
        vatAmount: 6666.67,
        operationDate: '2026-03-15',
      },
      {
        title: 'Реализация услуг по бронированию (Заказ №446)',
        quantity: 1,
        price: 10000,
        vatRate: 20,
        vatAmount: 1666.67,
        operationDate: '2026-03-20',
      },
    ],
    grossAmount: 50000,
    commissionAmount: 8000,
    netAmount: 42000,
    vatRate: 20,
    vatAmount: 1333.33,
    agentAgreementNumber: '123',
    agentAgreementDate: '2026-01-01',
  };
}

function renderHtmlInner(type: DemoDocType, payload: DemoFinancePayload): string {
  if (type === 'AGENT_REPORT') return renderAgentReportHtml(payload);
  if (type === 'SERVICE_ACT') return renderServiceActHtml(payload);
  if (type === 'INVOICE') return renderInvoiceHtml(payload);
  if (type === 'VAT_INVOICE') return renderVatInvoiceHtml(payload);
  return renderUpdHtml(payload);
}

function renderHtml(type: DemoDocType, payload: DemoFinancePayload): string {
  return injectPrintCss(renderHtmlInner(type, payload));
}

async function htmlToPdf(html: string): Promise<Uint8Array> {
  const executablePath = resolveChromeExecutable();
  const noSandbox = process.env.PUPPETEER_NO_SANDBOX !== 'false';
  const headlessValue = process.env.PUPPETEER_HEADLESS ?? 'true';
  const headless: boolean | 'shell' = headlessValue === 'shell' ? 'shell' : headlessValue !== 'false';

  let browser;
  try {
    browser = await puppeteer.launch({
      headless,
      ...(executablePath ? { executablePath } : {}),
      args: noSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });
    await page.close();
    return new Uint8Array(pdf);
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}

const SAMPLES: Array<{ kind: DemoDocType; file: string; title: string }> = [
  { kind: 'INVOICE', file: '01-schet', title: 'Счёт на оплату' },
  { kind: 'VAT_INVOICE', file: '02-schet-faktura', title: 'Счёт-фактура' },
  { kind: 'AGENT_REPORT', file: '03-otchet-agenta', title: 'Отчёт агента' },
  { kind: 'SERVICE_ACT', file: '04-akt-uslug', title: 'Акт оказанных услуг' },
  { kind: 'UPD', file: '05-upd', title: 'УПД' },
];

function payloadFor(kind: DemoDocType): DemoFinancePayload {
  let p: DemoFinancePayload =
    kind === 'AGENT_REPORT' ? buildSampleAgentReportPayload() : buildSampleFinancePayload();
  if (kind === 'UPD') p = withUpdDemoLineTitle(p);
  return p;
}

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const outDir = join(here, '..', '..', '..', 'docs', 'finance-print-samples');
  await mkdir(outDir, { recursive: true });

  const pdfResults: Array<{ file: string; title: string; ok: boolean; note?: string }> = [];

  for (const { kind, file, title } of SAMPLES) {
    const payload = payloadFor(kind);
    const html = renderHtml(kind, payload);
    await writeFile(join(outDir, `${file}.html`), html, 'utf-8');
    console.error(`Wrote ${file}.html`);

    let pdfOk = false;
    let pdfNote: string | undefined;
    try {
      const pdf = await htmlToPdf(html);
      await writeFile(join(outDir, `${file}.pdf`), pdf);
      pdfOk = true;
      console.error(`Wrote ${file}.pdf (${pdf.byteLength} bytes)`);
    } catch (e) {
      pdfNote = e instanceof Error ? e.message : String(e);
      console.error(`Skip ${file}.pdf: ${pdfNote}`);
    }
    pdfResults.push({ file, title, ok: pdfOk, note: pdfNote });
  }

  const indexLinks: string[] = ['<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Образцы финдокументов</title>'];
  indexLinks.push(
    '<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:24px} li{margin:8px 0}</style></head><body>',
  );
  indexLinks.push(
    '<h1>Образцы печатных форм (демо-данные)</h1><p>Те же шаблоны, что при выпуске: УПД и счёт-фактура — по структуре ПП РФ № 1137 (ред. 1096); счёт и акт — типовые бланки. HTML после <code>injectPrintCss</code>; PDF — тот же HTML через Puppeteer при наличии Chrome.</p><p style="font-size:14px;color:#444">Пересборка: <code>pnpm run finance:print-samples</code> из <code>packages/backend</code>. См. <code>README.txt</code> в этой папке.</p><ul>',
  );

  for (const r of pdfResults) {
    const pdfPart = r.ok
      ? ` · <a href="./${r.file}.pdf">PDF</a>`
      : ` · PDF <span style="color:#666">(не сгенерирован)</span>`;
    indexLinks.push(`<li><b>${r.title}</b> — <a href="./${r.file}.html">HTML</a>${pdfPart}</li>`);
  }

  const allPdf = pdfResults.every((r) => r.ok);
  if (!allPdf) {
    indexLinks.push(
      '</ul><p style="margin-top:1.5em;font-size:14px"><b>Как получить PDF:</b> из каталога <code>packages/backend</code> выполнить <code>npx puppeteer browsers install chrome</code> или задать <code>PUPPETEER_EXECUTABLE_PATH</code> на свой Chrome/Chromium, затем снова <code>pnpm run finance:print-samples</code>.</p></body></html>',
    );
  } else {
    indexLinks.push('</ul></body></html>');
  }

  await writeFile(join(outDir, 'index.html'), indexLinks.join('\n'), 'utf-8');

  const readme =
    `Образцы генерируются командой из packages/backend:\n` +
    `  pnpm run finance:print-samples\n\n` +
    `Если PDF нет: установите браузер для Puppeteer:\n` +
    `  npx puppeteer browsers install chrome\n` +
    `или укажите путь: PUPPETEER_EXECUTABLE_PATH="C:\\\\...\\\\chrome.exe"\n`;
  await writeFile(join(outDir, 'README.txt'), readme, 'utf-8');

  console.error(`Done. Open ${join(outDir, 'index.html')}`);
  if (!allPdf) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
