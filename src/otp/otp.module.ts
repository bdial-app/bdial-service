import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '../supabase/supabase.module';
import { OtpService } from './otp.service';

@Global()
@Module({
  imports: [ConfigModule, SupabaseModule],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
