import { Controller, Post, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a report against a provider, product, or message' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  createReport(@Request() req, @Body() dto: CreateReportDto) {
    return this.reportsService.createReport(req.user, dto);
  }
}
