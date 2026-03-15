import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { streamCsv } from '../common/csv-stream.util';
import { ReportsService } from '../reports/reports.service';
import { ReportQueryDto } from '../reports/dto/report-query.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reports: ReportsService) {}

  // ─── JSON endpoints ─────────────────────────────────────────────────────────

  @Get('sales')
  @ApiOperation({ summary: 'Продажи по дням × оператор × источник' })
  async getSales(@Query() query: ReportQueryDto) {
    return this.reports.getSalesByOperatorDay(query);
  }

  @Get('events')
  @ApiOperation({ summary: 'Продажи по событиям' })
  async getEvents(@Query() query: ReportQueryDto) {
    return this.reports.getSalesByEvent(query);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Заполняемость сеансов' })
  async getSessions(@Query() query: ReportQueryDto) {
    return this.reports.getSessionOccupancy(query);
  }

  // ─── CSV endpoints ──────────────────────────────────────────────────────────

  @Get('sales.csv')
  @ApiOperation({ summary: 'Экспорт продаж по операторам в CSV' })
  async exportSalesCsv(@Res() res: Response, @Query() query: ReportQueryDto) {
    const rows = await this.reports.getSalesByOperatorDay(query);
    let offset = 0;
    const rowsWithId = rows.map((row, index) => ({ id: String(index + 1), ...row }));

    await streamCsv({
      res,
      filename: 'admin-sales-by-operator',
      fields: [
        { header: 'Дата', accessor: (r) => (r.day instanceof Date ? r.day.toISOString().split('T')[0] : '') },
        { header: 'Оператор', accessor: (r) => r.operatorId ?? '' },
        { header: 'Источник', accessor: (r) => r.source },
        { header: 'Заказы', accessor: (r) => r.ordersCount },
        { header: 'Билеты', accessor: (r) => r.ticketsSold },
        { header: 'Выручка (коп)', accessor: (r) => r.grossRevenue },
        { header: 'Комиссия (коп)', accessor: (r) => r.commissionAmount },
        { header: 'Нетто (коп)', accessor: (r) => r.netAmount },
      ],
      fetchBatch: async (_cursor, take) => {
        const batch = rowsWithId.slice(offset, offset + take);
        offset += batch.length;
        return batch;
      },
    });
  }

  @Get('events.csv')
  @ApiOperation({ summary: 'Экспорт продаж по событиям в CSV' })
  async exportEventsCsv(@Res() res: Response, @Query() query: ReportQueryDto) {
    const rows = await this.reports.getSalesByEvent(query);
    let offset = 0;
    const rowsWithId = rows.map((row, index) => ({ id: String(index + 1), ...row }));

    await streamCsv({
      res,
      filename: 'admin-sales-by-event',
      fields: [
        { header: 'Событие', accessor: (r) => r.title },
        { header: 'ID события', accessor: (r) => r.eventId },
        { header: 'Город', accessor: (r) => r.cityId },
        { header: 'Оператор', accessor: (r) => r.operatorId ?? '' },
        { header: 'Источник', accessor: (r) => r.source },
        { header: 'Билеты', accessor: (r) => r.ticketsSold },
        { header: 'Выручка (коп)', accessor: (r) => r.revenue },
        { header: 'Средний чек (коп)', accessor: (r) => Math.round(r.avgTicketPrice) },
        {
          header: 'Последняя продажа',
          accessor: (r) => (r.lastSaleAt instanceof Date ? r.lastSaleAt.toISOString() : ''),
        },
      ],
      fetchBatch: async (_cursor, take) => {
        const batch = rowsWithId.slice(offset, offset + take);
        offset += batch.length;
        return batch;
      },
    });
  }

  @Get('sessions.csv')
  @ApiOperation({ summary: 'Экспорт заполняемости сеансов в CSV' })
  async exportSessionsCsv(@Res() res: Response, @Query() query: ReportQueryDto) {
    const rows = await this.reports.getSessionOccupancy(query);
    let offset = 0;
    const rowsWithId = rows.map((row, index) => ({ id: String(index + 1), ...row }));

    await streamCsv({
      res,
      filename: 'admin-session-occupancy',
      fields: [
        {
          header: 'Дата/время',
          accessor: (r) => (r.startsAt instanceof Date ? r.startsAt.toISOString() : ''),
        },
        { header: 'Событие', accessor: (r) => r.title },
        { header: 'Оператор', accessor: (r) => r.operatorId ?? '' },
        { header: 'Вместимость', accessor: (r) => r.capacityTotal ?? 0 },
        { header: 'Продано', accessor: (r) => r.soldQty },
        { header: 'Доступно', accessor: (r) => r.availableQty },
        { header: 'Заполняемость (%)', accessor: (r) => r.occupancyPct },
      ],
      fetchBatch: async (_cursor, take) => {
        const batch = rowsWithId.slice(offset, offset + take);
        offset += batch.length;
        return batch;
      },
    });
  }
}

