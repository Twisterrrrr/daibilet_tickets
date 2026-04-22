import { Body, Controller, Param, Post, Req, Res, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { parseTicketProviderCodeParam } from './routing/parse-provider-code';
import { ProviderWebhooksService } from './webhooks/provider-webhooks.service';

@ApiTags('webhooks/ticket-providers')
@Controller('webhooks/providers')
export class ProviderInboundWebhookController {
  private readonly logger = new Logger(ProviderInboundWebhookController.name);

  constructor(private readonly webhooks: ProviderWebhooksService) {}

  @Post(':providerCode')
  @ApiOperation({ summary: 'Входящий webhook ticket provider (foundation: лог + no-op 204 или обработка)' })
  async handle(
    @Param('providerCode') providerCode: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const code = parseTicketProviderCodeParam(providerCode);
    const headers = req.headers as Record<string, string | string[] | undefined>;
    const outcome = await this.webhooks.ingest(code, body, headers);
    if (outcome.kind === 'NO_OP') {
      res.status(204).send();
      return;
    }
    if (outcome.kind === 'ERROR') {
      this.logger.warn(`Webhook error ${code}: ${outcome.message}`);
      res.status(500).json({ ok: false, error: outcome.message });
      return;
    }
    res.status(200).json({ ok: true, data: outcome.data });
  }
}
