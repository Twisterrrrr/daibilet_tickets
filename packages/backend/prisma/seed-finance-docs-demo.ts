import { SupplierLedgerEntryType } from '../src/prisma-client';
import * as path from 'path';
import * as dotenv from 'dotenv';

import { DocumentNumberService } from '../src/supplier-finance/document-number.service';
import { FinanceDocumentRenderService } from '../src/supplier-finance/finance-document-render.service';
import { FinanceDocumentStorageService } from '../src/supplier-finance/finance-document-storage.service';
import { SupplierDocumentIssueService } from '../src/supplier-finance/supplier-document-issue.service';
import { SupplierDocumentPolicyService } from '../src/supplier-finance/supplier-document-policy.service';
import { SupplierSettlementService } from '../src/supplier-finance/supplier-settlement.service';
import { createScriptPrismaClient } from '../scripts/_prisma';

dotenv.config({ path: path.join(__dirname, '../.env') });

const { prisma, pool } = createScriptPrismaClient();

async function main() {
  const now = new Date();
  const year = now.getFullYear();
  const periodStart = new Date(Date.UTC(year, now.getMonth(), 1, 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(year, now.getMonth() + 1, 1, 0, 0, 0, 0));

  const operator = await prisma.operator.upsert({
    where: { slug: 'demo-finance-supplier' },
    update: { isSupplier: true },
    create: {
      name: 'Demo Finance Supplier',
      slug: 'demo-finance-supplier',
      isSupplier: true,
      commissionRate: 0.2,
      inn: '7812345678',
    },
  });

  await prisma.supplierLegalProfile.upsert({
    where: { operatorId: operator.id },
    update: {
      legalName: 'ООО Речные прогулки',
      inn: '7812345678',
      kpp: '781201001',
      legalAddress: 'г. Санкт-Петербург, Невский пр., д. 1',
      taxMode: 'OSNO',
      isVatPayer: true,
      defaultVatRate: 20,
      status: 'VERIFIED',
      closingDocumentMode: 'UPD',
      generateInvoiceDocuments: true,
    },
    create: {
      operatorId: operator.id,
      legalName: 'ООО Речные прогулки',
      inn: '7812345678',
      kpp: '781201001',
      legalAddress: 'г. Санкт-Петербург, Невский пр., д. 1',
      taxMode: 'OSNO',
      isVatPayer: true,
      defaultVatRate: 20,
      status: 'VERIFIED',
      closingDocumentMode: 'UPD',
      generateInvoiceDocuments: true,
    },
  });

  const profile = await prisma.supplierLegalProfile.findUniqueOrThrow({ where: { operatorId: operator.id } });
  const existingPrimary = await prisma.supplierBankAccount.findFirst({
    where: { supplierLegalProfileId: profile.id, isPrimary: true },
  });
  if (!existingPrimary) {
    await prisma.supplierBankAccount.create({
      data: {
        supplierLegalProfileId: profile.id,
        bankName: 'ПАО Сбербанк',
        bik: '044525225',
        accountNumber: '40702810000000000001',
        correspondentAccount: '30101810400000000225',
        isPrimary: true,
      },
    });
  }

  const existingSettlements = await prisma.supplierSettlement.findMany({
    where: { operatorId: operator.id, metaJson: { path: ['demo'], equals: true } },
    select: { id: true },
  });
  const existingDocs = await prisma.supplierDocument.findMany({
    where: {
      operatorId: operator.id,
      OR: [
        { title: { startsWith: 'DEMO ' } },
        { settlementId: { in: existingSettlements.map((s) => s.id) } },
      ],
    },
    select: { id: true },
  });
  if (existingDocs.length > 0) {
    const ids = existingDocs.map((d) => d.id);
    await prisma.supplierDocumentFile.deleteMany({ where: { supplierDocumentId: { in: ids } } });
    await prisma.supplierDocument.deleteMany({ where: { id: { in: ids } } });
  }
  if (existingSettlements.length > 0) {
    await prisma.supplierSettlement.deleteMany({ where: { id: { in: existingSettlements.map((s) => s.id) } } });
  }

  await prisma.supplierLedgerEntry.createMany({
    data: [
      {
        operatorId: operator.id,
        type: SupplierLedgerEntryType.SALE,
        amount: 5300,
        currency: 'RUB',
        note: 'DEMO settlement sale',
      },
      {
        operatorId: operator.id,
        type: SupplierLedgerEntryType.COMMISSION,
        amount: 1060,
        currency: 'RUB',
        note: 'DEMO settlement commission',
      },
    ],
  });

  const settlementService = new SupplierSettlementService(prisma as never);
  const policyService = new SupplierDocumentPolicyService(prisma as never);
  const numberService = new DocumentNumberService(prisma as never);
  const storageService = new FinanceDocumentStorageService();
  const renderService = new FinanceDocumentRenderService(storageService);
  const issueService = new SupplierDocumentIssueService(
    prisma as never,
    policyService,
    numberService,
    renderService,
  );

  const settlement = await settlementService.calculateDraftSettlement(operator.id, periodStart, periodEnd);
  await prisma.supplierSettlement.update({
    where: { id: settlement.id },
    data: {
      metaJson: { demo: true, scenario: 'toggle-on-vat' },
    },
  });
  await settlementService.approveSettlement(settlement.id);
  await settlementService.finalizeSettlement(settlement.id);
  const issued = await issueService.issueDocumentsForSettlement(settlement.id);
  await settlementService.markSettlementPaid(settlement.id);

  const docs = await prisma.supplierDocument.findMany({
    where: { settlementId: settlement.id },
    include: { files: true },
  });
  console.log('Finance demo documents created:');
  for (const row of issued.results) {
    if (row.number === '-') {
      console.log(`- ${row.type} -> ${row.status} (${row.reason ?? 'no reason'})`);
      continue;
    }
    const doc = docs.find((d) => d.title.endsWith(row.number));
    const pdf = doc?.files.find((f) => f.kind === 'PDF');
    const html = doc?.files.find((f) => f.mimeType === 'text/html');
    console.log(`- ${row.type} (${row.number}) -> ${pdf ? `/${pdf.storageKey}` : `/${html?.storageKey ?? 'n/a'}`}`);
  }
  console.log('Open in browser via backend static route: /uploads/... when API is running.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

