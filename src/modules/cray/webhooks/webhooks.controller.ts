import { Body, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { CrayWebhookPayloadDto } from './dto/webhook-payload.dto';
import type { CrayWebhookIngressContext } from '../controllers';

/**
 * Unmounted controller base for receiving Cray webhooks.
 *
 * The host selects and registers the endpoint, applies ingress policy, and must
 * leave WebhooksService provider verification enabled.
 * Docs: docs/cray-api-v1-docs.md § Webhooks
 */
export abstract class CrayWebhooksControllerBase {
  protected constructor(protected readonly webhooksService: WebhooksService) {}

  protected abstract authorizeWebhookIngress(
    context: CrayWebhookIngressContext,
  ): Promise<void> | void;

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: CrayWebhookPayloadDto,
    @Req() req: Request,
  ): Promise<{ received: boolean; eventId?: string }> {
    // Express resolves req.ip according to the host's trusted-proxy policy.
    // Never trust X-Forwarded-For directly at this package boundary.
    const clientIp = req.ip || req.socket?.remoteAddress;

    await this.authorizeWebhookIngress({
      request: req,
      event: payload.event,
      clientIp,
    });

    const result = await this.webhooksService.processWebhook(payload, {
      clientIp,
    });

    return { received: result.received, eventId: result.eventId };
  }
}
