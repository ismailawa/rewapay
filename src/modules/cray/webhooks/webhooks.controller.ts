import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { CrayWebhookPayloadDto } from './dto/webhook-payload.dto';

/**
 * Controller for receiving Cray webhooks.
 *
 * Endpoint: POST /cray/webhooks
 * Docs: docs/cray-api-v2-docs.md § Webhooks
 */
@Controller('cray/webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: CrayWebhookPayloadDto,
    @Headers('cray-webhook-key') keyHint: string | undefined,
    @Req() req: Request,
  ): Promise<{ received: boolean; eventId?: string }> {
    const rawForwarded = req.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(rawForwarded)
      ? rawForwarded[0]
      : typeof rawForwarded === 'string'
      ? rawForwarded.split(',')[0].trim()
      : undefined;

    const clientIp = forwardedIp || req.ip || req.socket?.remoteAddress;

    const result = await this.webhooksService.processWebhook(payload, {
      keyHint,
      clientIp,
    });

    return { received: result.received, eventId: result.eventId };
  }
}
