import { Controller, Get, Query } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
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
   */
  @Get('app-version')
  @Public()
  @ApiOperation({ summary: 'Check if app update is available' })
  @ApiQuery({ name: 'platform', required: false, enum: ['ios', 'android', 'web'] })
  @ApiQuery({ name: 'currentVersion', required: false, description: 'Client current semver e.g. 1.2.0' })
  getAppVersion(
    @Query('platform') platform?: string,
    @Query('currentVersion') currentVersion?: string,
  ) {
    // These should ideally come from env/config/DB — hardcoded for initial deployment
    const LATEST_VERSION = process.env.APP_LATEST_VERSION || '1.0.0';
    const MIN_SUPPORTED_VERSION = process.env.APP_MIN_VERSION || '1.0.0';
    const UPDATE_URL_IOS = process.env.APP_STORE_URL || 'https://apps.apple.com/app/tijarah/id000000000';
    const UPDATE_URL_ANDROID = process.env.PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.tijarah.app';

    const isOutdated = currentVersion ? this.compareSemver(currentVersion, LATEST_VERSION) < 0 : false;
    const isForceUpdate = currentVersion ? this.compareSemver(currentVersion, MIN_SUPPORTED_VERSION) < 0 : false;

    return {
      latestVersion: LATEST_VERSION,
      minSupportedVersion: MIN_SUPPORTED_VERSION,
      currentVersion: currentVersion || null,
      updateAvailable: isOutdated,
      forceUpdate: isForceUpdate,
      updateUrl: platform === 'ios' ? UPDATE_URL_IOS : UPDATE_URL_ANDROID,
      releaseNotes: process.env.APP_RELEASE_NOTES || null,
    };
  }

  private compareSemver(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }
}
