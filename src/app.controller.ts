import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('config/feature-flags')
  @Public()
  getFeatureFlags() {
    return this.appService.getPublicFeatureFlags();
  }

  @Get('config/monetization')
  @Public()
  getMonetizationConfig() {
    return this.appService.getMonetizationConfig();
  }
}
