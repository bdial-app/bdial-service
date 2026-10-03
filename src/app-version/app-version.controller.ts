import { Body, Controller, Get, Put, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AppVersionService } from './app-version.service';
import { UpdateAppVersionDto } from './dto/update-app-version.dto';

/**
 * Super admin only: a minimum version locks every older install out of the
 * app until it updates, so it sits with the same people as feature flags.
 */
@ApiTags('Admin - App Versions')
@ApiBearerAuth()
@Roles('super_admin')
@Controller('admin/app-version')
export class AppVersionController {
  constructor(private readonly service: AppVersionService) {}

  @Get()
  @ApiOperation({ summary: 'Store and minimum versions per platform' })
  get() {
    return this.service.getConfig();
  }

  @Put()
  @ApiOperation({ summary: 'Set store and minimum versions per platform' })
  update(
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateAppVersionDto,
  ) {
    return this.service.update(req.user.id, dto);
  }
}
