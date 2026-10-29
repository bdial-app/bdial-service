import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminLeadsService } from './admin-leads.service';
import {
  AdminLeadInteractionQueryDto,
  AdminLeadListQueryDto,
  AdminLeadRescoreDto,
  AdminLeadsPeriodDto,
} from './dto/admin-leads.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/leads')
export class AdminLeadsController {
  constructor(private readonly leads: AdminLeadsService) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Lead funnel, revenue, interactions and top businesses for a period',
  })
  overview(@Request() req, @Query() query: AdminLeadsPeriodDto) {
    return this.leads.overview(req.user, query.period);
  }

  @Get('interactions')
  @ApiOperation({
    summary:
      'Customer actions on businesses (views, calls, chats, saves…), newest first',
  })
  interactions(@Request() req, @Query() query: AdminLeadInteractionQueryDto) {
    return this.leads.interactions(req.user, query);
  }

  @Post('rescore')
  @ApiOperation({
    summary:
      'Score leads now for one business, or every business active in the last 30 days',
  })
  rescore(@Request() req, @Body() body: AdminLeadRescoreDto) {
    return this.leads.rescore(req.user, body.providerId);
  }

  @Get()
  @ApiOperation({
    summary: 'Leads with their business, customer, unlock and payment',
  })
  list(@Request() req, @Query() query: AdminLeadListQueryDto) {
    return this.leads.list(req.user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'A lead with its interaction timeline' })
  detail(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.leads.detail(req.user, id);
  }
}
