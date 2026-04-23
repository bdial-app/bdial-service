import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InviteController } from './invite.controller';
import { InviteService } from './invite.service';
import { AppInvite } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([AppInvite])],
  controllers: [InviteController],
  providers: [InviteService],
})
export class InviteModule {}
