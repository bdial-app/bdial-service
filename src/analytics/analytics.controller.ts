import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { TrackEventsDto } from './dto/track-events.dto';
import { AnalyticsSummaryDto, LeadsQueryDto } from './dto/analytics-query.dto';

class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return user || null;
  }
}

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ─── Event Ingestion (fire-and-forget, 204) ───────────────────────

  @Post('events')
  @UseGuards(OptionalJwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Batch-track analytics events' })
  @ApiResponse({ status: 204, description: 'Events queued' })
  trackEvents(@Request() req, @Body() dto: TrackEventsDto) {
    const userId = req.user?.id ?? null;
    // Fire-and-forget — don't await
    this.analyticsService.trackEvents(userId, dto.sessionId, dto.events).catch(() => {});
  }

  // ─── Provider Analytics Summary ───────────────────────────────────

  @Get('summary')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get analytics summary for the authenticated provider' })
  @ApiResponse({ status: 200, description: 'Summary retrieved' })
  getSummary(@Request() req, @Query() dto: AnalyticsSummaryDto) {
    return this.analyticsService.getAnalyticsSummary(req.user.id, dto.period);
  }

  // ─── Leads ────────────────────────────────────────────────────────

  @Get('leads')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get leads list for the authenticated provider' })
  @ApiResponse({ status: 200, description: 'Leads retrieved' })
  getLeads(@Request() req, @Query() dto: LeadsQueryDto) {
    return this.analyticsService.getLeads(req.user.id, dto.tier, dto.page, dto.limit);
  }

  @Get('leads/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get lead detail with timeline' })
  @ApiParam({ name: 'id', description: 'Lead ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Lead detail retrieved' })
  getLeadDetail(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.analyticsService.getLeadDetail(req.user.id, id);
  }

  @Post('leads/:id/unlock')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Unlock a lead (payment placeholder)' })
  @ApiResponse({ status: 200, description: 'Lead unlocked' })
  unlockLead(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.analyticsService.unlockLead(req.user.id, id);
  }

  // ─── Product Performance ──────────────────────────────────────────

  @Get('top-products')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get top products by views' })
  @ApiResponse({ status: 200, description: 'Top products retrieved' })
  getTopProducts(@Request() req, @Query() dto: AnalyticsSummaryDto) {
    return this.analyticsService.getTopProducts(req.user.id, dto.period);
  }

  // ─── Peak Hours ───────────────────────────────────────────────────

  @Get('peak-hours')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get peak visitor hours' })
  @ApiResponse({ status: 200, description: 'Peak hours retrieved' })
  getPeakHours(@Request() req, @Query() dto: AnalyticsSummaryDto) {
    return this.analyticsService.getPeakHours(req.user.id, dto.period);
  }
}
