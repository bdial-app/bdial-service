import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { WhatsAppConsentService } from './whatsapp-consent.service';

type AuthedRequest = { user: { id: string } };

export class SetOwnerConsentDto {
  @IsIn(['opted_in', 'opted_out'])
  consent: 'opted_in' | 'opted_out';

  /** Where in the app the owner decided. */
  @IsIn(['app_onboarding', 'app_prompt', 'app_settings'])
  source: 'app_onboarding' | 'app_prompt' | 'app_settings';
}

/** A signed-in business owner's own WhatsApp alerts choice. */
@ApiTags('WhatsApp')
@ApiBearerAuth()
@Controller('whatsapp/consent')
export class WhatsAppConsentController {
  constructor(private readonly consent: WhatsAppConsentService) {}

  @Get('me')
  @ApiOperation({
    summary: 'My WhatsApp alerts status, and whether the app should ask me now',
  })
  me(@Request() req: AuthedRequest) {
    return this.consent.ownerStatus(req.user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Turn my WhatsApp alerts on or off' })
  set(@Request() req: AuthedRequest, @Body() dto: SetOwnerConsentDto) {
    return this.consent.setByOwner(req.user.id, dto.consent, dto.source);
  }

  @Post('me/later')
  @HttpCode(200)
  @ApiOperation({ summary: '"Not now": ask me again later' })
  later(@Request() req: AuthedRequest) {
    return this.consent.ownerLater(req.user.id);
  }
}
