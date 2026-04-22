import { Body, Controller, Get, Logger, NotFoundException, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Prisma } from '@/prisma-client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { FinanceDocumentStorageService } from '../supplier-finance/finance-document-storage.service';
import { SupplierDocumentIssueService } from '../supplier-finance/supplier-document-issue.service';
import { SupplierDocumentPolicyService } from '../supplier-finance/supplier-document-policy.service';
import { SupplierSettlementService } from '../supplier-finance/supplier-settlement.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/finance')
export class AdminFinanceSettlementsController {
  private readonly logger = new Logger(AdminFinanceSettlementsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settlements: SupplierSettlementService,
    private readonly docPolicy: SupplierDocumentPolicyService,
    private readonly docIssue: SupplierDocumentIssueService,
    private readonly financeDocStorage: FinanceDocumentStorageService,
  ) {}

  @Get('settlements')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Список settlement (admin)' })
  async listSettlements(@Query('operatorId') operatorId?: string) {
    try {
      return await this.prisma.supplierSettlement.findMany({
        where: operatorId ? { operatorId } : {},
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    } catch (error) {
      this.logger.error('Failed to load finance settlements list', error instanceof Error ? error.stack : undefined);
      return [];
    }
  }

  /**
   * UI wiring endpoint (paginated list + filters).
   * Non-breaking: keeps legacy GET /settlements returning an array.
   */
  @Get('settlements/list')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Список settlement (admin) — paginated для UI' })
  async listSettlementsForUi(
    @Query('operatorId') operatorId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const take = Math.min(Math.max(Number(pageSize ?? 20) || 20, 1), 200);
    const skip = Math.max(((Number(page ?? 1) || 1) - 1) * take, 0);

    const where: Prisma.SupplierSettlementWhereInput = {};
    if (operatorId) where.operatorId = operatorId;
    if (status) where.status = status as Prisma.SupplierSettlementWhereInput['status'];
    if (from || to) {
      where.periodStart = {};
      if (from) (where.periodStart as Prisma.DateTimeFilter).gte = new Date(from);
      if (to) (where.periodStart as Prisma.DateTimeFilter).lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      this.prisma.supplierSettlement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { operator: { select: { id: true, name: true } } },
      }),
      this.prisma.supplierSettlement.count({ where }),
    ]);

    return {
      items: items.map((s) => ({
        id: s.id,
        supplierId: s.operatorId,
        supplierName: s.operator?.name ?? null,
        periodStart: s.periodStart.toISOString(),
        periodEnd: s.periodEnd.toISOString(),
        status: s.status,
        gross: s.grossAmount,
        commission: s.commissionAmount,
        adjustment: s.adjustmentAmount,
        net: s.netAmount,
        currency: s.currency,
        approvedAt: s.approvedAt?.toISOString() ?? null,
        finalizedAt: s.finalizedAt?.toISOString() ?? null,
        paidAt: s.paidAt?.toISOString() ?? null,
        updatedAt: s.updatedAt.toISOString(),
      })),
      page: Number(page ?? 1) || 1,
      pageSize: take,
      total,
    };
  }

  @Get('settlements/:id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Деталь settlement (admin)' })
  async getSettlement(@Param('id') id: string) {
    const s = await this.prisma.supplierSettlement.findUnique({
      where: { id },
      include: { operator: { select: { id: true, name: true, slug: true } } },
    });
    if (!s) throw new NotFoundException('Settlement not found');

    return {
      id: s.id,
      supplier: {
        id: s.operatorId,
        name: s.operator?.name ?? null,
        slug: s.operator?.slug ?? null,
      },
      periodStart: s.periodStart.toISOString(),
      periodEnd: s.periodEnd.toISOString(),
      status: s.status,
      amounts: {
        gross: s.grossAmount,
        commission: s.commissionAmount,
        adjustment: s.adjustmentAmount,
        net: s.netAmount,
        currency: s.currency,
      },
      timestamps: {
        approvedAt: s.approvedAt?.toISOString() ?? null,
        finalizedAt: s.finalizedAt?.toISOString() ?? null,
        paidAt: s.paidAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      },
      meta: (s.metaJson ?? null) as Record<string, unknown> | null,
    };
  }

  /**
   * “Orders” for settlement: ledger entries within settlement period.
   * We keep the naming “orders” in the URL for UI wiring, but data source is supplier ledger.
   */
  @Get('settlements/:id/orders')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Проводки/строки периода (admin) — для вкладки Orders' })
  async getSettlementOrders(@Param('id') id: string) {
    const s = await this.prisma.supplierSettlement.findUnique({
      where: { id },
      select: { operatorId: true, periodStart: true, periodEnd: true },
    });
    if (!s) throw new NotFoundException('Settlement not found');

    const entries = await this.prisma.supplierLedgerEntry.findMany({
      where: {
        operatorId: s.operatorId,
        createdAt: { gte: s.periodStart, lt: s.periodEnd },
      },
      orderBy: { createdAt: 'asc' },
      take: 5000,
    });

    return {
      items: entries.map((e) => ({
        id: e.id,
        createdAt: e.createdAt.toISOString(),
        type: e.type,
        amount: e.amount,
        currency: e.currency,
        referenceType: e.referenceType ?? null,
        referenceId: e.referenceId ?? null,
        note: e.note ?? null,
      })),
      total: entries.length,
    };
  }

  /**
   * Reconciliation for settlement:
   * Compares “system” vs “source” based on existing persisted links:
   * - system: FulfillmentItems (provider + externalOrderId + status) attached to paid supplier checkout sessions
   * - source: ExternalOrderLink (provider + externalOrderId + status + integrationState) attached to same checkout sessions
   *
   * Also compares settlement net to ledger sum (structural control), and surfaces duplicates.
   */
  @Get('settlements/:id/reconciliation')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Reconciliation (MVP) — сверка settlement vs книга проводок' })
  async reconcileSettlement(@Param('id') id: string) {
    const s = await this.prisma.supplierSettlement.findUnique({
      where: { id },
      select: { id: true, operatorId: true, periodStart: true, periodEnd: true, netAmount: true, currency: true },
    });
    if (!s) throw new NotFoundException('Settlement not found');

    const [ledgerAgg, ledgerEntries, paidIntents] = await Promise.all([
      this.prisma.supplierLedgerEntry.aggregate({
        where: { operatorId: s.operatorId, createdAt: { gte: s.periodStart, lt: s.periodEnd } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.supplierLedgerEntry.findMany({
        where: { operatorId: s.operatorId, createdAt: { gte: s.periodStart, lt: s.periodEnd } },
        select: { referenceType: true, referenceId: true, amount: true, type: true, createdAt: true, id: true },
        take: 5000,
      }),
      this.prisma.paymentIntent.findMany({
        where: {
          supplierId: s.operatorId,
          status: 'PAID',
          paidAt: { gte: s.periodStart, lt: s.periodEnd },
        },
        select: {
          id: true,
          paidAt: true,
          grossAmount: true,
          platformFee: true,
          supplierAmount: true,
          currency: true,
          checkoutSession: {
            select: {
              id: true,
              shortCode: true,
              fulfillmentItems: {
                select: {
                  id: true,
                  provider: true,
                  externalOrderId: true,
                  status: true,
                  amount: true,
                  refundedAmount: true,
                },
              },
              externalOrderLinks: {
                select: {
                  id: true,
                  provider: true,
                  externalOrderId: true,
                  status: true,
                  integrationState: true,
                  lastError: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
        take: 2000,
      }),
    ]);

    const ledgerSum = ledgerAgg._sum.amount ?? s.netAmount;
    type SystemRef = {
      paymentIntentId: string;
      checkoutSessionId: string;
      shortCode: string | null;
      fulfillmentItemId: string;
      fulfillmentStatus: string;
      amount: number;
    };
    type SourceRef = {
      externalOrderLinkId: string;
      checkoutSessionId: string;
      shortCode: string | null;
      status: string;
      integrationState: string;
      lastError: string | null;
      updatedAt: string;
    };

    const mismatchItems: Array<{
      id: string;
      mismatchType: string;
      severity: 'WARNING' | 'ERROR';
      resolutionStatus: 'OPEN' | 'UNKNOWN';
      orderReference?: string | null;
      systemValue?: string | null;
      sourceValue?: string | null;
      message: string;
      systemRefs?: SystemRef[];
      sourceRefs?: SourceRef[];
    }> = [];

    // Helpers
    const normProvider = (p: string | null | undefined): string => {
      const raw = (p ?? '').trim().toUpperCase();
      if (!raw) return 'UNKNOWN';
      // Normalize common legacy aliases
      if (raw === 'TC' || raw === 'TICKETSCLOUD' || raw === 'TICKETS_CLOUD') return 'TICKETS_CLOUD';
      if (raw === 'TEP' || raw === 'TEPLOHOD') return 'TEPLOHOD';
      if (raw === 'INTERNAL') return 'INTERNAL';
      return raw;
    };
    const key = (provider: string, externalOrderId: string) => `${provider}:${externalOrderId}`;

    // 1) Structural reconciliation: settlement net vs ledger sum
    const okNet = (s.netAmount as unknown as Prisma.Decimal).equals(ledgerSum as Prisma.Decimal);
    if (!okNet) {
      mismatchItems.push({
        id: `net:${s.id}`,
        mismatchType: 'AMOUNT_MISMATCH',
        severity: 'ERROR',
        resolutionStatus: 'OPEN',
        orderReference: null,
        systemValue: (s.netAmount as unknown as Prisma.Decimal).toString(),
        sourceValue: (ledgerSum as Prisma.Decimal).toString(),
        message: 'Settlement net does not match ledger sum for period',
      });
    }

    // 2) Duplicates in ledger references (heuristic)
    const byRef = new Map<string, { count: number; sampleId: string }>();
    for (const e of ledgerEntries) {
      const ref = e.referenceId ? String(e.referenceId) : null;
      if (!ref) continue;
      const k = `${e.referenceType ?? 'UNKNOWN'}:${ref}`;
      const cur = byRef.get(k);
      if (!cur) byRef.set(k, { count: 1, sampleId: e.id });
      else byRef.set(k, { count: cur.count + 1, sampleId: cur.sampleId });
    }
    for (const [k, v] of byRef.entries()) {
      if (v.count > 1) {
        mismatchItems.push({
          id: `dup:${k}`,
          mismatchType: 'DUPLICATE',
          severity: 'WARNING',
          resolutionStatus: 'UNKNOWN',
          orderReference: k,
          systemValue: String(v.count),
          sourceValue: null,
          message: `Duplicate reference in ledger entries: ${k} (count=${v.count})`,
        });
      }
    }

    // 3) System vs source: build maps by externalOrderId
    const systemByKey = new Map<string, SystemRef[]>();
    const sourceByKey = new Map<string, SourceRef[]>();

    for (const pi of paidIntents) {
      const cs = pi.checkoutSession;
      const sessionCode = cs.shortCode ?? null;

      for (const fi of cs.fulfillmentItems) {
        const ext = fi.externalOrderId ? String(fi.externalOrderId) : '';
        if (!ext) continue;
        const prov = normProvider(fi.provider);
        const k = key(prov, ext);
        const arr = systemByKey.get(k) ?? [];
        arr.push({
          paymentIntentId: pi.id,
          checkoutSessionId: cs.id,
          shortCode: sessionCode,
          fulfillmentItemId: fi.id,
          fulfillmentStatus: String(fi.status),
          amount: fi.amount,
        });
        systemByKey.set(k, arr);
      }

      for (const link of cs.externalOrderLinks) {
        const prov = normProvider(String(link.provider));
        const ext = String(link.externalOrderId);
        const k = key(prov, ext);
        const arr = sourceByKey.get(k) ?? [];
        arr.push({
          externalOrderLinkId: link.id,
          checkoutSessionId: cs.id,
          shortCode: sessionCode,
          status: String(link.status),
          integrationState: String(link.integrationState),
          lastError: link.lastError ?? null,
          updatedAt: link.updatedAt.toISOString(),
        });
        sourceByKey.set(k, arr);
      }
    }

    // DUPLICATE: duplicates on either side by (provider, externalOrderId)
    for (const [k, arr] of systemByKey.entries()) {
      if (arr.length > 1) {
        mismatchItems.push({
          id: `sysdup:${k}`,
          mismatchType: 'DUPLICATE',
          severity: 'WARNING',
          resolutionStatus: 'UNKNOWN',
          orderReference: k,
          systemValue: String(arr.length),
          sourceValue: sourceByKey.has(k) ? String(sourceByKey.get(k)!.length) : '0',
          message: 'Duplicate externalOrderId referenced by multiple fulfillment items',
          systemRefs: arr.slice(0, 20),
          sourceRefs: sourceByKey.get(k)?.slice(0, 20) ?? [],
        });
      }
    }
    for (const [k, arr] of sourceByKey.entries()) {
      if (arr.length > 1) {
        mismatchItems.push({
          id: `srcdup:${k}`,
          mismatchType: 'DUPLICATE',
          severity: 'WARNING',
          resolutionStatus: 'UNKNOWN',
          orderReference: k,
          systemValue: systemByKey.has(k) ? String(systemByKey.get(k)!.length) : '0',
          sourceValue: String(arr.length),
          message: 'Duplicate externalOrderId links found in ExternalOrderLink',
          systemRefs: systemByKey.get(k)?.slice(0, 20) ?? [],
          sourceRefs: arr.slice(0, 20),
        });
      }
    }

    // Missing cross-links
    for (const [k] of sourceByKey.entries()) {
      if (!systemByKey.has(k)) {
        mismatchItems.push({
          id: `missing:system:${k}`,
          mismatchType: 'MISSING_IN_PROJECTION',
          severity: 'ERROR',
          resolutionStatus: 'OPEN',
          orderReference: k,
          systemValue: null,
          sourceValue: 'present',
          message: 'ExternalOrderLink exists but no fulfillment item references this external order',
          systemRefs: [],
          sourceRefs: sourceByKey.get(k)?.slice(0, 20) ?? [],
        });
      }
    }
    for (const [k] of systemByKey.entries()) {
      if (!sourceByKey.has(k)) {
        mismatchItems.push({
          id: `missing:source:${k}`,
          mismatchType: 'MISSING_IN_SOURCE',
          severity: 'WARNING',
          resolutionStatus: 'UNKNOWN',
          orderReference: k,
          systemValue: 'present',
          sourceValue: null,
          message: 'Fulfillment item references external order id but ExternalOrderLink is missing',
          systemRefs: systemByKey.get(k)?.slice(0, 20) ?? [],
          sourceRefs: [],
        });
      }
    }

    // Status mismatches (heuristic): if source says FAILED/RECONCILE_REQUIRED but system looks CONFIRMED
    for (const [k, srcArr] of sourceByKey.entries()) {
      const sysArr = systemByKey.get(k);
      if (!sysArr) continue;
      const srcStates = srcArr.map((x) => `${x.status}/${x.integrationState}`).join(', ');
      const sysStates = sysArr.map((x) => x.fulfillmentStatus).join(', ');
      const sourceHasFail = srcArr.some((x) => String(x.status).toUpperCase() === 'FAILED' || String(x.integrationState).toUpperCase().includes('RECONCILE'));
      const systemHasConfirmed = sysArr.some((x) => String(x.fulfillmentStatus).toUpperCase() === 'CONFIRMED');
      if (sourceHasFail && systemHasConfirmed) {
        mismatchItems.push({
          id: `status:${k}`,
          mismatchType: 'STATUS_MISMATCH',
          severity: 'ERROR',
          resolutionStatus: 'OPEN',
          orderReference: k,
          systemValue: sysStates,
          sourceValue: srcStates,
          message: 'Source indicates failure/reconcile required while system fulfillment is confirmed',
          systemRefs: sysArr.slice(0, 20),
          sourceRefs: srcArr.slice(0, 20),
        });
      }
    }

    const systemOrders = paidIntents.length;
    const sourceOrders = Array.from(sourceByKey.keys()).length;
    const systemGrossCents = paidIntents.reduce((sum, pi) => sum + (pi.grossAmount ?? 0), 0);

    return {
      summary: {
        systemOrders,
        sourceOrders,
        systemGross: (systemGrossCents / 100).toFixed(2),
        sourceGross: null,
        mismatchCount: mismatchItems.length,
        ok: mismatchItems.length === 0,
        currency: s.currency,
      },
      items: mismatchItems,
    };
  }

  @Get('settlements/:id/reconciliation/items')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({
    summary:
      'Reconciliation items (filters + evidence) — для UI: фильтры severity/type и детальный drawer без хранения mismatch в БД',
  })
  async reconcileSettlementItems(
    @Param('id') id: string,
    @Query('severity') severity?: string,
    @Query('type') type?: string,
  ) {
    const raw = (await this.reconcileSettlement(id)) as { summary: unknown; items: unknown[] };
    const sev = (severity ?? '').trim().toUpperCase();
    const typ = (type ?? '').trim().toUpperCase();
    const items = (raw.items ?? []) as Array<{ severity?: string; mismatchType?: string }>;
    const filtered = items.filter((it) => {
      const okSev = !sev || String(it.severity ?? '').toUpperCase() === sev;
      const okType = !typ || String(it.mismatchType ?? '').toUpperCase() === typ;
      return okSev && okType;
    });
    return { summary: raw.summary, items: filtered, total: filtered.length };
  }

  @Get('settlements/:id/reconciliation/items/:mismatchId')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Reconciliation mismatch detail (read-only)' })
  async getReconciliationMismatchDetail(@Param('id') id: string, @Param('mismatchId') mismatchId: string) {
    const raw = (await this.reconcileSettlement(id)) as { summary: unknown; items: unknown[] };
    const items = (raw.items ?? []) as Array<{ id?: string }>;
    const found = items.find((i) => i.id === mismatchId);
    if (!found) {
      throw new NotFoundException('Mismatch not found');
    }
    return { summary: raw.summary, item: found };
  }

  @Get('documents')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Список документов (admin)' })
  async listDocuments(@Query('operatorId') operatorId?: string) {
    try {
      const docs = await this.prisma.supplierDocument.findMany({
        where: operatorId ? { operatorId } : {},
        include: { files: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      return docs.map((d) => ({
        id: d.id,
        operatorId: d.operatorId,
        settlementId: d.settlementId ?? null,
        type: d.type,
        status: d.status,
        title: d.title,
        createdAt: d.createdAt,
        htmlPath: d.files.find((f) => f.mimeType === 'text/html')?.storageKey ?? null,
        pdfPath: d.files.find((f) => f.kind === 'PDF')?.storageKey ?? null,
      }));
    } catch (error) {
      this.logger.error('Failed to load finance documents list', error instanceof Error ? error.stack : undefined);
      return [];
    }
  }

  @Post('settlements/calculate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Ручной расчёт draft settlement' })
  async calculateSettlement(
    @Body() body: { operatorId: string; periodStart: string; periodEnd: string },
  ) {
    return this.settlements.calculateDraftSettlement(
      body.operatorId,
      new Date(body.periodStart),
      new Date(body.periodEnd),
    );
  }

  @Post('settlements/:id/approve')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Approve settlement' })
  async approveSettlement(@Param('id') id: string) {
    return this.settlements.approveSettlement(id);
  }

  @Post('settlements/:id/finalize')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Finalize settlement (manual-first, no auto issue)' })
  async finalizeSettlement(@Param('id') id: string) {
    return this.settlements.finalizeSettlement(id);
  }

  @Post('settlements/:id/mark-paid')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Mark settlement paid' })
  async markSettlementPaid(@Param('id') id: string, @Body() body: { payoutId?: string }) {
    return this.settlements.markSettlementPaid(id, body?.payoutId);
  }

  @Get('settlements/:id/document-policy-preview')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Preview required docs for settlement by policy' })
  async getPolicyPreview(@Param('id') id: string) {
    return this.docPolicy.getRequiredDocumentsForSettlement(id);
  }

  @Post('settlements/:id/issue-documents')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Manual issue document set for settlement' })
  async issueDocuments(@Param('id') id: string) {
    return this.docIssue.issueDocumentsForSettlement(id);
  }

  @Post('documents/:id/regenerate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Manual document regeneration' })
  async regenerateDocument(@Param('id') id: string) {
    return this.docIssue.regenerateDocument(id);
  }

  @Get('documents/:id/html')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'HTML превью финансового документа' })
  async getDocumentHtml(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.prisma.supplierDocument.findUnique({
      where: { id },
      include: { files: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    const file = doc.files.find((f) => f.mimeType === 'text/html');
    if (!file?.storageKey) throw new NotFoundException('HTML not available');
    const buf = await this.financeDocStorage.readBinaryRelative(file.storageKey);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(buf);
  }

  @Get('documents/:id/pdf')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Скачать PDF финансового документа' })
  async getDocumentPdf(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.prisma.supplierDocument.findUnique({
      where: { id },
      include: { files: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    const file = doc.files.find((f) => f.kind === 'PDF');
    if (!file?.storageKey) throw new NotFoundException('PDF not available');
    const buf = await this.financeDocStorage.readBinaryRelative(file.storageKey);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="admin-${doc.type}-${id.slice(0, 8)}.pdf"`);
    res.send(buf);
  }
}

