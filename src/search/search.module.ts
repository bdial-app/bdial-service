import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from '../entities/provider.entity';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { SearchLog } from '../entities/search-log.entity';
import { ProviderAnalyticsEvent } from '../entities/provider-analytics-event.entity';
import { SponsoredListing } from '../entities/sponsored-listing.entity';
import { SearchSynonym } from '../entities/search-synonym.entity';
import { UserCategoryInteraction } from '../entities/user-category-interaction.entity';
import { User } from '../entities/user.entity';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { CategoryPersonalizationService } from '../users/category-personalization.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Provider, Product, Category, SearchLog, ProviderAnalyticsEvent, SponsoredListing, SearchSynonym, UserCategoryInteraction, User]),
  ],
  controllers: [SearchController],
  providers: [SearchService, CategoryPersonalizationService],
  exports: [SearchService],
})
export class SearchModule {}
