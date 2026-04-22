import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { Provider, User, Verification, Review, ReviewReport } from '../entities';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Provider, User, Verification, Review, ReviewReport]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
