import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ProviderAnalyticsEvent } from '../entities/provider-analytics-event.entity';
import { ProviderLead } from '../entities/provider-lead.entity';
import { Provider } from '../entities/provider.entity';
import { Product } from '../entities/product.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProviderAnalyticsEvent, ProviderLead, Provider, Product, User]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
