/**
 * Импорт маппинга ID виджетов teplohod.info из JSON или XLSX.
 */
/**
 *
 * Виджеты создаются в админке teplohod.info; каждый виджет имеет свой ID (data-id, напр. 14000).
 * Этот скрипт обновляет widgetPayload.tepWidgetId для TEPLOHOD-офферов.
 *
 * Форматы:
 * - JSON: { "tep-282": 14000, "tep-1291": 14001 } или { "282": 14000 }
 * - XLSX: первая строка — заголовки, столбцы с id события и data-id виджета (автоопределение)
 *
 * Запуск:
 *   npx tsx prisma/seed-teplohod-widgets.ts [path/to/file.json|.xlsx]
 *   npx tsx prisma/seed-teplohod-widgets.ts "C:\Users\...\teplohodinfo.xlsx"
 *   npx tsx prisma/seed-teplohod-widgets.ts file.xlsx --inspect   # показать структуру
 * По умолчанию: prisma/teplohod-widgets.json
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import * as XLSX from 'xlsx';

// Load .env from backend or project root
const envPath = [resolve(__dirname, '../../.env'), resolve(__dirname, '../../../.env')].find(existsSync);
if (envPath) {
  const env = readFileSync(envPath, 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

const prisma = new PrismaClient();

const EVENT_COL_PATTERNS = [
  /^id$/i, /^event_?id$/i, /^event\s*id$/i, /^tep$/i, /^прогулк/i, /^№\s*\d*$/i,
];
const WIDGET_COL_PATTERNS = [
  /data-?id/i, /^widget/i, /виджет/i, /^widget_id$/i, /data_id/i,
];

function parseEventId(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s) return null;
  const num = parseInt(s.replace(/[^\d]/g, ''), 10);
  return Number.isNaN(num) ? null : String(num);
}

function parseWidgetId(val: unknown): number | null {
  if (val == null) return null;
  const num = typeof val === 'number' ? val : parseInt(String(val).replace(/\s/g, ''), 10);
  return Number.isNaN(num) ? null : num;
}

function loadMappingFromJson(filePath: string): Record<string, number> {
  const raw = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as Record<string, number | string>;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(data)) {
    const num = typeof v === 'number' ? v : parseInt(String(v), 10);
    if (Number.isNaN(num)) continue;
    out[k] = num;
  }
  return out;
}

function inspectXlsx(filePath: string): void {
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
  console.log('Лист:', sheetName, '| Строк:', rows.length);
  console.log('Заголовки:', JSON.stringify((rows[0] as any[]).map((h, i) => `${i}:${String(h ?? '').trim()}`)));
  console.log('Первые 5 строк данных:');
  for (let r = 1; r < Math.min(6, rows.length); r++) {
    console.log('  ', (rows[r] as any[]).map((c, i) => `[${i}]${c}`).join(' | '));
  }
}

function loadMappingFromXlsx(filePath: string): Record<string, number> {
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

  if (rows.length < 2) {
    console.warn('XLSX: меньше 2 строк (заголовок + данные)');
    return {};
  }

  const headers = (rows[0] as any[]).map((h) => String(h ?? '').trim().toLowerCase());
  let eventCol = -1;
  let widgetCol = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (EVENT_COL_PATTERNS.some((p) => p.test(h))) eventCol = i;
    if (WIDGET_COL_PATTERNS.some((p) => p.test(h))) widgetCol = i;
  }

  if (eventCol < 0) {
    eventCol = 0;
    console.warn('XLSX: столбец id события не найден, используем первый');
  }
  if (widgetCol < 0) {
    widgetCol = 1;
    console.warn('XLSX: столбец data-id не найден, используем второй');
  }

  const out: Record<string, number> = {};
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as any[];
    const eventId = parseEventId(row?.[eventCol]);
    const widgetId = parseWidgetId(row?.[widgetCol]);
    if (eventId && widgetId != null) {
      out[eventId] = widgetId;
      out[`tep-${eventId}`] = widgetId;
    }
  }
  return out;
}

function loadMapping(filePath: string): Record<string, number> {
  const abs = resolve(filePath.startsWith('/') || /^[A-Za-z]:/.test(filePath) ? filePath : resolve(process.cwd(), filePath));
  if (!existsSync(abs)) {
    throw new Error(`Файл не найден: ${abs}`);
  }
  const ext = abs.toLowerCase().endsWith('.xlsx') || abs.toLowerCase().endsWith('.xls');
  return ext ? loadMappingFromXlsx(abs) : loadMappingFromJson(abs);
}

async function main() {
  const filePath = process.argv[2] || 'prisma/teplohod-widgets.json';
  const debug = process.argv.includes('--debug');
  const inspect = process.argv.includes('--inspect');

  if (inspect && filePath) {
    const abs = resolve(filePath.startsWith('/') || /^[A-Za-z]:/.test(filePath) ? filePath : resolve(process.cwd(), filePath));
    if (existsSync(abs) && (abs.endsWith('.xlsx') || abs.endsWith('.xls'))) {
      inspectXlsx(abs);
    } else {
      console.log('--inspect: укажите путь к .xlsx файлу');
    }
    return;
  }

  const mapping = loadMapping(filePath);

  const uniqueMapping: Record<string, number> = {};
  for (const [k, v] of Object.entries(mapping)) {
    const tepKey = k.startsWith('tep-') ? k : `tep-${k}`;
    uniqueMapping[tepKey] = v;
  }
  const tepKeys = Object.keys(uniqueMapping);

  if (tepKeys.length === 0) {
    console.log('Нет записей в маппинге. Проверьте формат файла. Используйте --debug для отладки.');
    if (debug) {
      console.log('Прочитанные пары (первые 20):', Object.entries(mapping).slice(0, 20));
    }
    return;
  }

  if (debug) {
    console.log(`Прочитано ${tepKeys.length} пар (event → widget). Примеры:`, tepKeys.slice(0, 5).map((k) => `${k} → ${uniqueMapping[k]}`));
  }

  const offers = await prisma.eventOffer.findMany({
    where: {
      source: 'TEPLOHOD',
      externalEventId: { in: tepKeys },
      isDeleted: false,
    },
    select: { id: true, eventId: true, externalEventId: true, widgetPayload: true },
  });

  const eventIdsToReactivate = new Set<string>();
  let updated = 0;
  for (const offer of offers) {
    const extId = offer.externalEventId!;
    const widgetId = uniqueMapping[extId] ?? uniqueMapping[`tep-${extId.replace(/^tep-/, '')}`];
    if (widgetId == null) continue;

    const payload = (offer.widgetPayload as Record<string, unknown>) || {};
    const merged = {
      ...payload,
      v: payload.v ?? 1,
      tepWidgetId: widgetId,
      tepEventId: payload.tepEventId ?? parseInt(extId.replace(/^tep-/, ''), 10),
    };

    await prisma.eventOffer.update({
      where: { id: offer.id },
      data: {
        widgetPayload: merged,
        status: 'ACTIVE', // Реактивация: sync отключает оффер при fail checkWidgetStatus (старый embed)
      },
    });
    eventIdsToReactivate.add(offer.eventId);
    updated++;
    console.log(`  ${extId} → tepWidgetId=${widgetId}`);
  }

  // Реактивируем события и сессии — иначе они не попадут в каталог (isActive: true)
  if (eventIdsToReactivate.size > 0) {
    const ids = [...eventIdsToReactivate];
    await prisma.event.updateMany({
      where: { id: { in: ids } },
      data: { isActive: true },
    });
    await prisma.eventSession.updateMany({
      where: { eventId: { in: ids } },
      data: { isActive: true },
    });
    console.log(`Реактивировано событий: ${eventIdsToReactivate.size}`);
  }

  const totalTepOffers = await prisma.eventOffer.count({ where: { source: 'TEPLOHOD', isDeleted: false } });
  console.log(`\nОбновлено офферов: ${updated} из ${offers.length} найденных (всего TEPLOHOD-офферов в БД: ${totalTepOffers}).`);
  if (updated === 0 && totalTepOffers > 0 && tepKeys.length > 0) {
    const sampleIds = await prisma.eventOffer.findMany({
      where: { source: 'TEPLOHOD', isDeleted: false },
      select: { externalEventId: true },
      take: 5,
    });
    console.log('Примеры ID в БД:', sampleIds.map((o) => o.externalEventId).join(', '));
    console.log('Примеры ID из файла:', tepKeys.slice(0, 5).join(', '));
    console.log('→ Убедитесь, что в xlsx используются те же ID событий, что и в API teplohod (tep.id).');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
