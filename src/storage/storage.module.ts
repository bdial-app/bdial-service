import { Global, Module } from '@nestjs/common';
import { StorageBackupModule } from '../storage-backup/storage-backup.module';
import { StorageService } from './storage.service';

@Global()
@Module({
  imports: [StorageBackupModule],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
