import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from '../entities/provider.entity';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { SearchLog } from '../entities/search-log.entity';
import { ProviderAnalyticsEvent } from '../entities/provider-analytics-event.entity';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Provider, Product, Category, SearchLog, ProviderAnalyticsEvent]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
