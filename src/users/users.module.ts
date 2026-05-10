import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller';
import { UsersService } from './users.service';
import { CategoryPersonalizationService } from './category-personalization.service';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import {
  User,
  UserArchive,
  Verification,
  Provider,
  ConversationParticipant,
  SavedItem,
  SavedLocation,
  Review,
  Booking,
  SearchLog,
  UserCategoryInteraction,
  Category,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserArchive,
      Verification,
      Provider,
      ConversationParticipant,
      SavedItem,
      SavedLocation,
      Review,
      Booking,
      SearchLog,
      UserCategoryInteraction,
      Category,
    ]),
    AuthModule,
    SupabaseModule,
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService, CategoryPersonalizationService],
  exports: [UsersService, CategoryPersonalizationService],
})
export class UsersModule {}
