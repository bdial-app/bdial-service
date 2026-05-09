import {
  Controller,
  Post,
  Headers,
  Req,
  Body,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PaymentService } from './payment.service';

@ApiTags('Webhooks')
@Controller('payments')
export class PaymentWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('webhook/razorpay')
  @Public()
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: any,
  ) {
    return this.paymentService.handleRazorpayWebhook(signature, req.rawBody);
  }

  @Post('webhook/apple')
  @Public()
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleAppleWebhook(@Body() body: any) {
    return this.paymentService.handleAppleWebhook(body);
  }
}
