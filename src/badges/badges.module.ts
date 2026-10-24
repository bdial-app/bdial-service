import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, Provider, ProviderBadge, SystemSetting } from '../entities';
import { BadgesAdminController, BadgesController } from './badges.controller';
import { BadgesService } from './badges.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProviderBadge,
      Provider,
      SystemSetting,
      AuditLog,
    ]),
  ],
  controllers: [BadgesController, BadgesAdminController],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class BadgesModule {}
