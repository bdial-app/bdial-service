import { Controller, Get, Query } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AppVersionService } from '../app-version/app-version.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private appVersion: AppVersionService,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 256 * 1024 * 1024), // 256 MB
    ]);
  }

  /**
   * App version check — clients send their current version; server responds
   * with the latest version and whether an update is required/recommended.
   * Versions are set per platform from the admin panel (App Versions).
   */
  @Get('app-version')
  @Public()
  @ApiOperation({ summary: 'Check if app update is available' })
  @ApiQuery({ name: 'platform', required: false, enum: ['ios', 'android', 'web'] })
  @ApiQuery({ name: 'currentVersion', required: false, description: 'Client current version e.g. 1.2.0' })
  getAppVersion(
    @Query('platform') platform?: string,
    @Query('currentVersion') currentVersion?: string,
  ) {
    return this.appVersion.check(platform, currentVersion);
  }
}
