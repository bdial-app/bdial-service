import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AudienceService } from './audience.service';

/** Same audience as the Analytics page: admins and up. */
@ApiTags('Admin - Audience')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/audience')
export class AudienceController {
  constructor(private readonly service: AudienceService) {}

  @Get('live')
  @ApiOperation({
    summary: 'Online now, and active in the last 15 min / 1 h / 24 h',
  })
  live() {
    return this.service.live();
  }

  @Get('overview')
  @ApiOperation({
    summary: 'Active users, concurrency, growth and busiest hours',
  })
  @ApiQuery({ name: 'days', required: false, description: '7–90, default 30' })
  overview(@Query('days') days?: string) {
    return this.service.overview(days);
  }

  @Get('retention')
  @ApiOperation({ summary: 'Weekly sign-up cohorts and how many came back' })
  @ApiQuery({ name: 'weeks', required: false, description: '4–12, default 8' })
  retention(@Query('weeks') weeks?: string) {
    return this.service.retention(weeks);
  }

  @Get('reach')
  @ApiOperation({
    summary: 'Active users by city, customer vs business, and platform',
  })
  @ApiQuery({ name: 'days', required: false })
  reach(@Query('days') days?: string) {
    return this.service.reach(days);
  }

  @Get('ads')
  @ApiOperation({
    summary: 'Ad delivery, reach, CTR, top ads and the listing funnel',
  })
  @ApiQuery({ name: 'days', required: false })
  ads(@Query('days') days?: string) {
    return this.service.ads(days);
  }
}
