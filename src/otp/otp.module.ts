import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Msg91Module } from '../msg91/msg91.module';
import { OtpService } from './otp.service';

@Global()
@Module({
  imports: [ConfigModule, Msg91Module],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
