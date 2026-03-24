import { Body, Controller, Get, Logger, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
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
}

