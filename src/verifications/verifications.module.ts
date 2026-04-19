import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationsController } from './verifications.controller';
import { VerificationsService } from './verifications.service';
import { AuthModule } from '../auth/auth.module';
import { Verification, Provider } from '../entities';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Verification, Provider])],
  controllers: [VerificationsController],
  providers: [VerificationsService],
})
export class VerificationsModule {}
