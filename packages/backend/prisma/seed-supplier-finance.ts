import { PaymentStatus, SupplierDisputeReasonCategory, SupplierLedgerEntryType } from '../src/prisma-client';
import * as path from 'path';
import * as dotenv from 'dotenv';

import { SupplierReportCalculationService } from '../src/supplier-finance/supplier-report-calculation.service';
import { SupplierDocumentService } from '../src/supplier-finance/supplier-document.service';
import { SupplierDisputeService } from '../src/supplier-finance/supplier-dispute.service';
import { SupplierReconciliationService } from '../src/supplier-finance/supplier-reconciliation.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createScriptPrismaClient } from '../scripts/_prisma';

dotenv.config({ path: path.join(__dirname, '../.env') });

const { prisma, pool } = createScriptPrismaClient();

async function main() {
  const operator = await prisma.operator.create({
    data: {
      name: 'ООО Тестовый поставщик',
      slug: `test-supplier-${Date.now()}`,
      isSupplier: true,
      commissionRate: 0.25,
    },
  });

  const session = await prisma.checkoutSession.create({
    data: {
      shortCode: `CS-SEED-${Date.now()}`,
      cartSnapshot: {},
      status: 'COMPLETED',
      totalPrice: 100000,
    },
  });

  const intent = await prisma.paymentIntent.create({
    data: {
      checkoutSessionId: session.id,
      idempotencyKey: `seed-intent-${Date.now()}`,
      amount: 100000,
      status: PaymentStatus.PAID,
      supplierId: operator.id,
      grossAmount: 100000,
      platformFee: 25000,
      supplierAmount: 75000,
      commissionRate: 0.25,
    },
  });

  await prisma.supplierLedgerEntry.createMany({
    data: [
      {
        operatorId: operator.id,
        type: SupplierLedgerEntryType.SALE,
        amount: 1000,
        currency: 'RUB',
        referenceType: 'PaymentIntent',
        referenceId: intent.id,
        note: 'Seed sale',
      },
      {
        operatorId: operator.id,
        type: SupplierLedgerEntryType.COMMISSION,
        amount: 250,
        currency: 'RUB',
        referenceType: 'PaymentIntent',
        referenceId: intent.id,
        note: 'Seed commission',
      },
      {
        operatorId: operator.id,
        type: SupplierLedgerEntryType.PAYOUT,
        amount: 750,
        currency: 'RUB',
        referenceType: 'Manual',
        referenceId: 'seed-payout',
        note: 'Seed payout',
      },
    ],
  });

  const prismaService = new PrismaService();
  // @ts-expect-error reuse underlying client
  prismaService['_client'] = prisma;

  const calc = new SupplierReportCalculationService(prismaService);
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const report = await calc.generateReport({
    operatorId: operator.id,
    periodStart,
    periodEnd,
    basis: 'COMPLETED',
  });

  const docs = new SupplierDocumentService(prismaService);
  await docs.generateDocumentsForReport(report.id);

  const disputeService = new SupplierDisputeService(prismaService);
  await disputeService.openDispute({
    reportId: report.id,
    operatorId: operator.id,
    reasonCategory: SupplierDisputeReasonCategory.WRONG_COMMISSION,
    reasonText: 'Тестовый спор: проверка комиссии',
  });

  const recon = new SupplierReconciliationService(prismaService);
  await recon.reconcileReport(report.id);

  console.log('Seed supplier finance done', {
    operatorId: operator.id,
    reportId: report.id,
  });
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

