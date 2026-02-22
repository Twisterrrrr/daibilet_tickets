import { Module } from '@nestjs/common';

import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportExportService } from './report-export.service';
import { ReportService } from './report.service';

@Module({
  imports: [PrismaModule, MailModule],
  providers: [ReportService, ReportExportService],
  exports: [ReportService, ReportExportService],
})
export class ReportsModule {}
