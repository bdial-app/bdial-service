import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { StorageBackupService } from './storage-backup.service';

/** Backup of the storage bucket: super admins only. */
@ApiTags('Admin - Storage Backup')
@ApiBearerAuth()
@Roles('super_admin')
@Controller('admin/storage-backup')
export class StorageBackupController {
  constructor(private readonly backup: StorageBackupService) {}

  @Get()
  @ApiOperation({
    summary: 'Whether backup is set up, and how the last run went',
  })
  status() {
    return this.backup.status();
  }

  @Post('run')
  @HttpCode(202)
  @ApiOperation({ summary: 'Back up now (runs in the background)' })
  run() {
    return this.backup.startManual();
  }
}
