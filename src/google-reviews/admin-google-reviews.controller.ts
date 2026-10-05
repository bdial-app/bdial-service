import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { GoogleReviewsSyncService } from './google-reviews-sync.service';

/**
 * Stored-review management for the admin Google Reviews page. Linking,
 * unlinking and the business list stay on the existing admin routes.
 */
@ApiTags('Admin - Google Reviews')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/google-reviews')
export class AdminGoogleReviewsController {
  constructor(private readonly sync: GoogleReviewsSyncService) {}

  @Get('usage')
  @ApiOperation({
    summary: 'Google calls this month against the budget, and coverage',
  })
  usage() {
    return this.sync.usage();
  }

  @Post('auto-match')
  @ApiOperation({
    summary:
      'Link unlinked businesses to Google by phone number, one batch at a time',
  })
  autoMatch(@Query('limit') limit?: string) {
    return this.sync.autoMatchBatch(Number(limit) || 40);
  }

  @Post('sync-due')
  @ApiOperation({
    summary: 'Sync linked businesses that are due, within the monthly budget',
  })
  syncDue(@Query('limit') limit?: string) {
    return this.sync.syncDue(Math.min(Number(limit) || 50, 200));
  }

  @Post('sync/:providerId')
  @ApiOperation({ summary: 'Sync one business from Google now' })
  syncOne(@Param('providerId', ParseUUIDPipe) providerId: string) {
    return this.sync.syncProvider(providerId);
  }

  @Get('reviews/:providerId')
  @ApiOperation({ summary: 'Stored Google reviews for a business' })
  reviews(@Param('providerId', ParseUUIDPipe) providerId: string) {
    return this.sync.listStored(providerId);
  }
}
