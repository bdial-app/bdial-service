import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AppVersionModule } from '../app-version/app-version.module';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, AppVersionModule],
  controllers: [HealthController],
})
export class HealthModule {}
