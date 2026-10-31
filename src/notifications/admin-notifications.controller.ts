import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import { NotificationTemplateService } from './notification-template.service';
import {
  SendNotificationDto,
  GetBatchesQueryDto,
  CreateCampaignDto,
  PushAudiencePreviewDto,
  TestPushDto,
  TestTemplateDto,
  CreateTemplateDto,
  UpdateTemplateDto,
} from './dto/notification.dto';
import { PushAudienceService } from './push-audience.service';
import { PushCampaignService } from './push-campaign.service';
import { NotificationType } from '../entities/notification.entity';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Roles('associate') // Base: read access for stats/batches/templates
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly dispatchService: NotificationDispatchService,
    private readonly templateService: NotificationTemplateService,
    private readonly audienceService: PushAudienceService,
    private readonly campaignService: PushCampaignService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // Push campaigns
  // ──────────────────────────────────────────────────────────

  @Roles('admin')
  @Get('audience/options')
  @ApiOperation({ summary: 'Cities and categories to narrow a push audience' })
  audienceOptions() {
    return this.audienceService.options();
  }

  @Roles('admin')
  @Post('audience/preview')
  @ApiOperation({ summary: 'How many people a push audience reaches, and a few of them' })
  previewAudience(@Body() dto: PushAudiencePreviewDto) {
    return this.audienceService.preview(dto.audience, (dto.type ?? 'promotional') === 'promotional');
  }

  @Roles('admin')
  @Post('campaigns')
  @ApiOperation({ summary: 'Send a push campaign now, or schedule it' })
  async createCampaign(@Request() req, @Body() dto: CreateCampaignDto) {
    const { audience, scheduledAt, templateId, ...message } = dto;
    const batch = await this.campaignService.create(req.user.id, { ...message, audience, scheduledAt, templateId });
    return { id: batch.id, status: batch.status, scheduledAt: batch.scheduledAt };
  }

  @Roles('admin')
  @Post('test')
  @ApiOperation({ summary: 'Send a test push to yourself or one person' })
  async testPush(@Request() req, @Body() dto: TestPushDto) {
    const { userId, providerId, ...message } = dto;
    const to = userId ?? (providerId ? await this.campaignService.ownerOf(providerId) : req.user.id);
    return this.campaignService.test(to, message);
  }

  @Roles('admin')
  @Delete('batches/:id')
  @ApiOperation({ summary: 'Call off a scheduled campaign before it sends' })
  cancelCampaign(@Param('id') id: string) {
    return this.campaignService.cancel(id);
  }

  @Roles('admin')
  @Post('send')
  @ApiOperation({ summary: 'Send a notification (broadcast, segment, or individual)' })
  async sendNotification(@Request() req, @Body() dto: SendNotificationDto) {
    const result = await this.dispatchService.sendBroadcast(
      req.user.id,
      dto.title,
      dto.body,
      dto.targetType,
      (dto.type || 'promotional') as NotificationType,
      dto.targetCriteria,
      dto.data,
      dto.imageUrl,
    );

    return {
      message: 'Notification sent successfully',
      batchId: result.batchId,
      totalRecipients: result.totalRecipients,
    };
  }

  @Get('batches')
  @ApiOperation({ summary: 'List notification batches with stats' })
  getBatches(@Request() req, @Query() query: GetBatchesQueryDto) {
    return this.notificationsService.getBatches(query);
  }

  @Get('batches/:id')
  @ApiOperation({ summary: 'Get batch detail' })
  @ApiParam({ name: 'id', description: 'Batch UUID' })
  getBatch(@Request() req, @Param('id') id: string) {
    return this.notificationsService.getBatchById(id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get aggregate notification statistics' })
  getStats(@Request() req) {
    return this.notificationsService.getStats();
  }

  // ──────────────────────────────────────────────────────────
  // Notification Templates (Admin Controls)
  // ──────────────────────────────────────────────────────────

  @Get('templates')
  @ApiOperation({ summary: 'List all notification templates' })
  getTemplates(@Request() req, @Query('category') category?: string) {
    return this.templateService.findAll(category);
  }

  @Get('templates/stats')
  @ApiOperation({ summary: 'Sent and opened per template, last 30 days' })
  getTemplateStats(@Query('days') days?: string) {
    const d = Math.min(365, Math.max(1, Number(days) || 30));
    return this.templateService.stats(d);
  }

  @Roles('admin')
  @Post('templates/:id/test')
  @ApiOperation({ summary: 'Send a template to yourself (or one person) with sample values' })
  async testTemplate(@Request() req, @Param('id') id: string, @Body() dto: TestTemplateDto) {
    const r = await this.templateService.render(id, dto.variables ?? {});
    const to = dto.userId ?? (dto.providerId ? await this.campaignService.ownerOf(dto.providerId) : req.user.id);
    return this.campaignService.test(to, {
      title: r.title,
      body: r.body,
      imageUrl: r.imageUrl,
      route: r.route,
      type: r.template.type,
    });
  }

  @Roles('admin')
  @Post('templates/:id/reset')
  @ApiOperation({ summary: 'Put a template back to the wording it shipped with' })
  resetTemplate(@Param('id') id: string) {
    return this.templateService.reset(id);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get a notification template by ID' })
  getTemplate(@Request() req, @Param('id') id: string) {
    return this.templateService.findById(id);
  }

  @Roles('admin')
  @Post('templates')
  @ApiOperation({ summary: 'Create a new notification template' })
  createTemplate(@Request() req, @Body() body: CreateTemplateDto) {
    return this.templateService.create(body);
  }

  @Roles('admin')
  @Put('templates/:id')
  @ApiOperation({ summary: 'Update a notification template' })
  updateTemplate(@Request() req, @Param('id') id: string, @Body() body: UpdateTemplateDto) {
    return this.templateService.update(id, body);
  }

  @Roles('admin')
  @Patch('templates/:id/toggle')
  @ApiOperation({ summary: 'Toggle a notification template active/inactive' })
  toggleTemplate(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.templateService.toggleActive(id, body.isActive);
  }

  @Roles('admin')
  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete a notification template' })
  deleteTemplate(@Request() req, @Param('id') id: string) {
    return this.templateService.delete(id);
  }
}
