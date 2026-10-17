import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AuditLog,
  LegalAcceptance,
  LegalDocument,
  LegalDocumentVersion,
  Provider,
} from '../entities';
import { LegalAdminController } from './legal-admin.controller';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LegalDocument,
      LegalDocumentVersion,
      LegalAcceptance,
      Provider,
      AuditLog,
    ]),
  ],
  controllers: [LegalController, LegalAdminController],
  providers: [LegalService],
  exports: [LegalService],
})
export class LegalModule {}
