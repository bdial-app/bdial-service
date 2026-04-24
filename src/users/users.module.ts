import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import {
  User,
  Verification,
  Provider,
  ConversationParticipant,
  SavedItem,
  SavedLocation,
  Review,
  Booking,
  SearchLog,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Verification,
      Provider,
      ConversationParticipant,
      SavedItem,
      SavedLocation,
      Review,
      Booking,
      SearchLog,
    ]),
    AuthModule,
    SupabaseModule,
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
