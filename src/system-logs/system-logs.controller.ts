import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { SystemLogsService } from './system-logs.service';
import { ClientLogBatchDto, LogFeedQueryDto } from './dto/system-logs.dto';

/** Signed in or not: an app error from a guest is still worth having. */
class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return user || null;
  }
}

@ApiTags('Logs')
@Controller('logs')
export class ClientLogsController {
  constructor(private readonly logs: SystemLogsService) {}

  @Post('client')
  @Public()
  @UseGuards(OptionalJwtGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @HttpCode(202)
  @ApiOperation({
    summary:
      'Apps report errors here (crashes, failed calls) for the admin Logs',
  })
  report(@Request() req, @Body() body: ClientLogBatchDto) {
    return this.logs.ingestClient(body.events, req);
  }
}

const csvCell = (v: unknown) => {
  const s =
    v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/logs')
export class AdminLogsController {
  constructor(private readonly logs: SystemLogsService) {}

  @Get()
  @ApiOperation({
    summary: 'Every kind of activity and error as one timeline, newest first',
  })
  feed(@Request() req, @Query() q: LogFeedQueryDto) {
    this.logs.assertCanRead(req.user);
    return this.logs.feed(q);
  }

  @Get('counts')
  @ApiOperation({
    summary: 'How many entries of each source and level match the filters',
  })
  counts(@Request() req, @Query() q: LogFeedQueryDto) {
    this.logs.assertCanRead(req.user);
    return this.logs.counts(q);
  }

  @Get('export')
  @ApiOperation({ summary: 'The filtered timeline as CSV (up to 5,000 rows)' })
  async export(
    @Request() req,
    @Res() res: Response,
    @Query() q: LogFeedQueryDto,
  ) {
    this.logs.assertCanRead(req.user);
    // Up to ten pages of 500.
    const rows: Awaited<ReturnType<SystemLogsService['feed']>>['items'] = [];
    let before: string | undefined;
    for (let i = 0; i < 10; i++) {
      const page = await this.logs.feed({ ...q, limit: 500, before });
      rows.push(...page.items);
      if (!page.nextCursor) break;
      before = page.nextCursor;
    }
    const head = [
      'time',
      'source',
      'level',
      'event',
      'message',
      'user',
      'mobile',
      'business',
      'entity_type',
      'entity_id',
      'path',
      'status',
      'platform',
      'app_version',
      'session_id',
      'request_id',
      'details',
    ];
    const body = rows.map((r) =>
      [
        r.at,
        r.source,
        r.level,
        r.event,
        r.message,
        r.userName,
        r.userMobile,
        r.businessName,
        r.entityType,
        r.entityId,
        r.path,
        r.statusCode,
        r.platform,
        r.appVersion,
        r.sessionId,
        r.requestId,
        r.details,
      ]
        .map(csvCell)
        .join(','),
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="logs-${new Date().toISOString().slice(0, 16).replace(':', '')}.csv"`,
    );
    res.send('﻿' + [head.join(','), ...body].join('\r\n'));
  }
}
