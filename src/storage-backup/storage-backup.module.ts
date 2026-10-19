import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from '../entities';
import { StorageBackupController } from './storage-backup.controller';
import { StorageBackupService } from './storage-backup.service';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting])],
  controllers: [StorageBackupController],
  providers: [StorageBackupService],
  exports: [StorageBackupService],
})
export class StorageBackupModule {}
