import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PaymentService } from './payment.service';

@ApiTags('Webhooks')
@Controller('payments')
export class PaymentWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: any,
  ) {
    return this.paymentService.handleWebhook(signature, req.rawBody);
  }
}
