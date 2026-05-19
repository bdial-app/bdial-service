import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoucherService } from './voucher.service';
import { VoucherController } from './voucher.controller';
import { Voucher } from '../entities/voucher.entity';
import { VoucherRedemption } from '../entities/voucher-redemption.entity';
import { Provider } from '../entities';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Voucher, VoucherRedemption, Provider]),
    NotificationsModule,
  ],
  controllers: [VoucherController],
  providers: [VoucherService],
  exports: [VoucherService],
})
export class VoucherModule {}
