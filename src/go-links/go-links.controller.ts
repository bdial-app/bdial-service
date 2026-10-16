import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { GoLinksService } from './go-links.service';

export class OpenGoLinkDto {
  /** The web page is sending them to the app store. */
  @IsOptional()
  @IsBoolean()
  withoutApp?: boolean;
}

@ApiTags('Links')
@Controller('go')
export class GoLinksController {
  constructor(private readonly links: GoLinksService) {}

  @Get('pending')
  @ApiOperation({
    summary: 'After sign-in: the screen I tried to open before installing',
  })
  pending(@Request() req: { user: { id: string } }) {
    return this.links.takePending(req.user.id);
  }

  @Get(':code')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Where a message link goes' })
  resolve(@Param('code') code: string) {
    return this.links.resolve(code.slice(0, 16));
  }

  @Post(':code/open')
  @Public()
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Record that a message link was opened' })
  open(@Param('code') code: string, @Body() dto: OpenGoLinkDto) {
    return this.links.open(code.slice(0, 16), !!dto.withoutApp);
  }
}
