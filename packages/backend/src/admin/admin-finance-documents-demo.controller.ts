import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/dev/finance-documents-demo')
export class AdminFinanceDocumentsDemoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Список demo finance документов с путями к HTML/PDF' })
  async listDemo() {
    const operator = await this.prisma.operator.findUnique({
      where: { slug: 'demo-finance-supplier' },
      select: { id: true, slug: true, name: true },
    });
    if (!operator) {
      return { items: [], message: 'Demo operator not found. Run db:seed:finance-docs-demo.' };
    }

    const docs = await this.prisma.supplierDocument.findMany({
      where: {
        operatorId: operator.id,
        title: { startsWith: 'DEMO ' },
      },
      include: {
        files: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      operator,
      items: docs.map((doc) => {
        const html = doc.files.find((f) => f.mimeType === 'text/html');
        const pdf = doc.files.find((f) => f.kind === 'PDF');
        const payload = (doc.payloadJson as Record<string, unknown> | null) ?? {};
        const storage = (payload.storage as Record<string, unknown> | undefined) ?? {};
        const number = (payload.number as string | undefined) ?? doc.title.replace('DEMO ', '');
        return {
          id: doc.id,
          type: doc.type,
          number,
          status: doc.status,
          htmlPath: html?.storageKey ?? (storage.htmlPath as string | null) ?? null,
          htmlUrl: html?.storageKey ? `/${html.storageKey}` : null,
          pdfPath: pdf?.storageKey ?? (storage.pdfPath as string | null) ?? null,
          pdfUrl: pdf?.storageKey ? `/${pdf.storageKey}` : null,
          exists: Boolean(html || pdf),
          generatedAt: (storage.generatedAt as string | null) ?? doc.updatedAt.toISOString(),
        };
      }),
    };
  }
}

