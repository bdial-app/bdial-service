import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import { User, Verification } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([User, Verification]), AuthModule],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
