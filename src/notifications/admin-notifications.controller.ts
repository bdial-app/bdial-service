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
import { SendNotificationDto, GetBatchesQueryDto } from './dto/notification.dto';
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
  ) {}

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

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get a notification template by ID' })
  getTemplate(@Request() req, @Param('id') id: string) {
    return this.templateService.findById(id);
  }

  @Roles('admin')
  @Post('templates')
  @ApiOperation({ summary: 'Create a new notification template' })
  createTemplate(@Request() req, @Body() body: any) {
    return this.templateService.create(body);
  }

  @Roles('admin')
  @Put('templates/:id')
  @ApiOperation({ summary: 'Update a notification template' })
  updateTemplate(@Request() req, @Param('id') id: string, @Body() body: any) {
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
