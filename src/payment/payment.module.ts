import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RazorpayProvider } from './razorpay.provider';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { AdminPaymentController } from './admin-payment.controller';
import { PaymentWebhookController } from './payment-webhook.controller';
import { Payment } from '../entities/payment.entity';
import { Provider } from '../entities/provider.entity';
import { SponsoredListing } from '../entities/sponsored-listing.entity';
import { ProviderLead } from '../entities/provider-lead.entity';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { Voucher } from '../entities/voucher.entity';
import { VoucherRedemption } from '../entities/voucher-redemption.entity';
import { SystemSetting } from '../entities/system-setting.entity';
import { ProviderOffer } from '../entities/provider-offer.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Provider,
      SponsoredListing,
      ProviderLead,
      Subscription,
      SubscriptionPlan,
      Voucher,
      VoucherRedemption,
      SystemSetting,
      ProviderOffer,
    ]),
    NotificationsModule,
  ],
  controllers: [PaymentController, AdminPaymentController, PaymentWebhookController],
  providers: [RazorpayProvider, PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
