// eslint-disable-next-line @typescript-eslint/no-var-requires
const Stripe = require('stripe');
import { ConfigService } from '@nestjs/config';

export const STRIPE_CLIENT = 'STRIPE_CLIENT';

export const StripeProvider = {
  provide: STRIPE_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): any => {
    const secretKey = config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    return new Stripe(secretKey);
  },
};
