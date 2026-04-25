import { Controller, Post, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BugReportsService } from './bug-reports.service';
import { CreateBugReportDto } from './dto/create-bug-report.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Bug Reports')
@Controller('bug-reports')
export class BugReportsController {
  constructor(private readonly bugReportsService: BugReportsService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Submit a bug report (auth optional)' })
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  create(@Request() req, @Body() dto: CreateBugReportDto) {
    // req.user may or may not exist depending on auth
    const userId = req.user?.id ?? null;
    return this.bugReportsService.create(userId, dto);
  }
}
