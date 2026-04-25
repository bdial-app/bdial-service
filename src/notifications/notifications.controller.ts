import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { GetNotificationsQueryDto, UpdatePreferencesDto } from './dto/notification.dto';
import { Body } from '@nestjs/common';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notification history (paginated)' })
  getNotifications(@Request() req, @Query() query: GetNotificationsQueryDto) {
    return this.notificationsService.getNotifications(req.user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  getPreferences(@Request() req) {
    return this.notificationsService.getPreferences(req.user.id);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  updatePreferences(@Request() req, @Body() dto: UpdatePreferencesDto) {
    return this.notificationsService.updatePreferences(req.user.id, dto);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  markAsRead(@Request() req, @Param('id') id: string) {
    return this.notificationsService.markAsRead(req.user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  deleteNotification(@Request() req, @Param('id') id: string) {
    return this.notificationsService.deleteNotification(req.user.id, id);
  }
}
