import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { WhatsAppMediaService } from './whatsapp-media.service';

/**
 * Public, because Meta's servers fetch these when delivering a message.
 * Unthrottled, because a campaign makes Meta fetch many at once.
 */
@ApiTags('WhatsApp')
@Controller('whatsapp/media')
@Public()
@SkipThrottle()
export class WhatsAppMediaController {
  constructor(private readonly media: WhatsAppMediaService) {}

  @Get('logo-card/:file')
  @ApiOperation({
    summary:
      "A business's logo beside the Tijarah mark, as a JPEG for WhatsApp image headers",
  })
  async logoCard(@Param('file') file: string, @Res() res: Response) {
    const id = file.replace(/\.jpe?g$/i, '');
    const buf = await this.media.card(id);
    if (!buf) throw new NotFoundException();
    res
      .status(200)
      .type('image/jpeg')
      .set('Cache-Control', 'public, max-age=86400')
      .send(buf);
  }
}
