import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn } from 'class-validator';
import {
  AdminAttentionService,
  FRESH_KEYS,
  type FreshKey,
} from './admin-attention.service';

type AuthedRequest = { user: { id: string; role?: string } };

export class MarkSeenDto {
  @IsArray()
  @ArrayMaxSize(FRESH_KEYS.length)
  @IsIn(FRESH_KEYS, { each: true })
  sections: FreshKey[];
}

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/attention')
export class AdminAttentionController {
  constructor(private readonly attention: AdminAttentionService) {}

  @Get()
  @ApiOperation({
    summary:
      'Sidebar counts: work waiting on admins, and what is new since you last opened each section',
  })
  get(@Request() req: AuthedRequest, @Query('refresh') refresh?: string) {
    return this.attention.get(req.user, refresh === '1');
  }

  @Post('seen')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark admin sections as seen now' })
  markSeen(@Request() req: AuthedRequest, @Body() body: MarkSeenDto) {
    return this.attention.markSeen(req.user, body.sections);
  }
}
