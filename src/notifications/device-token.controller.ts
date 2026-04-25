import { Controller, Post, Delete, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceDto, UnregisterDeviceDto } from './dto/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications/devices')
export class DeviceTokenController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a device token for push notifications' })
  registerDevice(@Request() req, @Body() dto: RegisterDeviceDto) {
    return this.notificationsService.registerDevice(req.user.id, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Unregister a device token' })
  unregisterDevice(@Request() req, @Body() dto: UnregisterDeviceDto) {
    return this.notificationsService.unregisterDevice(req.user.id, dto.token);
  }
}
