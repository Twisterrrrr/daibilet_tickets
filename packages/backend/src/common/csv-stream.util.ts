/**
 * CSV cursor-based streaming — экспорт больших выборок без OOM.
 *
 * Использует Prisma cursor pagination (cursor + take) и пишет
 * в Node.js Response по батчам.
 *
 * Защита:
 *   - Max period (dateFrom/dateTo): ограничивается вызывающим кодом.
 *   - Batch size: 500 записей за запрос.
 *   - Hard limit: 50 000 строк (safety net).
 */

import { Logger } from '@nestjs/common';
import { Response } from 'express';

const logger = new Logger('CsvStream');

const BATCH_SIZE = 500;
const HARD_LIMIT = 50_000;

export interface CsvFieldDef {
  /** Заголовок CSV */
  header: string;
  /** Извлечь значение из записи (any — намеренно, CSV-утилита работает с произвольными моделями) */
  accessor: (row: any) => string | number | null | undefined;
}

export interface CsvStreamOptions {
  /** Express Response object */
  res: Response;
  /** Имя файла (без расширения) */
  filename: string;
  /** Определения полей CSV */
  fields: CsvFieldDef[];
  /**
   * Функция для загрузки батча записей.
   * @param cursor — UUID курсора (undefined для первого батча)
   * @param take — количество записей
   * @returns массив записей с обязательным полем `id`
   */
  fetchBatch: (cursor: string | undefined, take: number) => Promise<{ id: string; [key: string]: any }[]>;
}

/**
 * Стримить CSV в Response по батчам через cursor pagination.
 *
 * @example
 *   await streamCsv({
 *     res,
 *     filename: 'order-requests',
 *     fields: [
 *       { header: 'ID', accessor: (r) => r.id },
 *       { header: 'Status', accessor: (r) => r.status },
 *     ],
 *     fetchBatch: (cursor, take) => prisma.orderRequest.findMany({
 *       where,
 *       orderBy: { createdAt: 'desc' },
 *       take,
 *       ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
 *     }),
 *   });
 */
export async function streamCsv(options: CsvStreamOptions): Promise<void> {
  const { res, filename, fields, fetchBatch } = options;

  // Заголовки HTTP
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}-${Date.now()}.csv"`,
  );

  // BOM для Excel + заголовки CSV
  const headerLine = fields.map((f) => f.header).join(',');
  res.write('\uFEFF' + headerLine + '\n');

  let cursor: string | undefined;
  let totalWritten = 0;

  while (totalWritten < HARD_LIMIT) {
    const batch = await fetchBatch(cursor, BATCH_SIZE);

    if (batch.length === 0) break;

    for (const row of batch) {
      const line = fields
        .map((f) => {
          const val = f.accessor(row);
          if (val == null) return '';
          const str = String(val);
          // Escape CSV: если содержит запятую, кавычку или перевод строки — обернуть
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',');
      res.write(line + '\n');
      totalWritten++;
    }

    // Курсор = последний элемент батча
    cursor = batch[batch.length - 1].id;

    // Если батч меньше BATCH_SIZE — данные закончились
    if (batch.length < BATCH_SIZE) break;
  }

  if (totalWritten >= HARD_LIMIT) {
    logger.warn(`CSV export hit hard limit (${HARD_LIMIT} rows) for file=${filename}`);
  }

  logger.log(`CSV export complete: file=${filename}, rows=${totalWritten}`);
  res.end();
}
