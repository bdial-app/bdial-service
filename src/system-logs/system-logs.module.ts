import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemLog } from '../entities/system-log.entity';
import { SystemLogsService } from './system-logs.service';
import {
  AdminLogsController,
  ClientLogsController,
} from './system-logs.controller';

/** Global so any service can record a log entry (SystemLogsService.record). */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SystemLog])],
  controllers: [ClientLogsController, AdminLogsController],
  providers: [SystemLogsService],
  exports: [SystemLogsService],
})
export class SystemLogsModule {}
