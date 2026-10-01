import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { MetaCloudApiService } from './meta-cloud-api.service';
import { WhatsAppWebhookService } from './whatsapp-webhook.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

/**
 * Meta webhook: GET for the one-time verification handshake, POST for events.
 * Mounted at /api/whatsapp/webhook (global prefix + controller path).
 */
@ApiTags('Webhooks')
@Controller('whatsapp')
@Public()
@SkipThrottle()
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly webhooks: WhatsAppWebhookService,
    private readonly meta: MetaCloudApiService,
  ) {}

  @Get('webhook')
  @ApiExcludeEndpoint()
  verify(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') token: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() res: Response,
  ): void {
    const expected = this.meta.verifyToken;
    if (mode === 'subscribe' && expected && token === expected && challenge) {
      res.status(200).type('text/plain').send(challenge);
      return;
    }
    res.status(403).type('text/plain').send('Forbidden');
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async receive(
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() req: RawBodyRequest,
    @Body() body: unknown,
  ): Promise<{ received: true }> {
    if (!this.webhooks.verifySignature(req.rawBody, signature)) {
      this.logger.warn('WhatsApp webhook signature mismatch');
      throw new UnauthorizedException('Invalid signature');
    }
    try {
      await this.webhooks.handle(body);
    } catch (err) {
      this.logger.error(
        `Webhook processing failed: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
    return { received: true };
  }
}
