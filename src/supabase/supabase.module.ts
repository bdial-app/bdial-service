import { Module } from '@nestjs/common';
import { SupabaseAuthService } from './supabase-auth.service';
import { SupabaseRealtimeService } from './supabase-realtime.service';

@Module({
  providers: [SupabaseAuthService, SupabaseRealtimeService],
  exports: [SupabaseAuthService, SupabaseRealtimeService],
})
export class SupabaseModule {}
