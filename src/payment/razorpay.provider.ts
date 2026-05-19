import Razorpay from 'razorpay';
import { ConfigService } from '@nestjs/config';

export const RAZORPAY_CLIENT = 'RAZORPAY_CLIENT';

export const RazorpayProvider = {
  provide: RAZORPAY_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Razorpay => {
    const keyId = config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = config.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured');
    }
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  },
};
