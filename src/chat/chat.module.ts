import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import {
  Conversation,
  ConversationParticipant,
  Message,
  User,
  Provider,
  Product,
} from '../entities';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationParticipant,
      Message,
      User,
      Provider,
      Product,
    ]),
    SupabaseModule,
    AuthModule,
    NotificationsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
