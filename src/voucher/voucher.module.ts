import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoucherService } from './voucher.service';
import { VoucherController } from './voucher.controller';
import { Voucher } from '../entities/voucher.entity';
import { VoucherRedemption } from '../entities/voucher-redemption.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Voucher, VoucherRedemption])],
  controllers: [VoucherController],
  providers: [VoucherService],
  exports: [VoucherService],
})
export class VoucherModule {}
