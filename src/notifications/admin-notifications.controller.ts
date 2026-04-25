import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import { SendNotificationDto, GetBatchesQueryDto } from './dto/notification.dto';
import { NotificationType } from '../entities/notification.entity';

@ApiTags('Admin Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly dispatchService: NotificationDispatchService,
  ) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a notification (broadcast, segment, or individual)' })
  async sendNotification(@Request() req, @Body() dto: SendNotificationDto) {
    this.assertAdmin(req.user);

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
    this.assertAdmin(req.user);
    return this.notificationsService.getBatches(query);
  }

  @Get('batches/:id')
  @ApiOperation({ summary: 'Get batch detail' })
  @ApiParam({ name: 'id', description: 'Batch UUID' })
  getBatch(@Request() req, @Param('id') id: string) {
    this.assertAdmin(req.user);
    return this.notificationsService.getBatchById(id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get aggregate notification statistics' })
  getStats(@Request() req) {
    this.assertAdmin(req.user);
    return this.notificationsService.getStats();
  }

  private assertAdmin(user: any): void {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
  }
}
