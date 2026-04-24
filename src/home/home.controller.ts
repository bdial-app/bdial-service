import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { HomeService } from './home.service';
import { HomeFeedDto } from './dto/home-feed.dto';
import { Public } from '../common/decorators/public.decorator';

/**
 * Optional JWT guard — extracts user if token is present, but doesn't reject anonymous requests.
 */
class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return user || null;
  }
}

@ApiTags('Home')
@Controller('home')
@Public()
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('feed')
  @UseGuards(OptionalJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get aggregated home feed data',
    description:
      'Returns nearby providers, category-specific providers, promo banners, trending categories, community reviews, platform stats, and last booking (if authenticated).',
  })
  @ApiResponse({ status: 200, description: 'Home feed data returned' })
  async getFeed(@Query() dto: HomeFeedDto, @Request() req: any) {
    const userId = req.user?.id ?? null;
    return this.homeService.getFeed(dto, userId);
  }

  @Get('banners')
  @ApiOperation({ summary: 'Get active promotional banners' })
  @ApiResponse({ status: 200, description: 'Promo banners returned' })
  async getBanners() {
    // Exposed separately for caching / CDN edge scenarios
    return this.homeService.getFeed({} as HomeFeedDto).then((f) => f.promoBanners);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending service categories' })
  @ApiResponse({ status: 200, description: 'Trending categories returned' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 6 })
  async getTrending(@Query('limit') limit?: string) {
    const feed = await this.homeService.getFeed({} as HomeFeedDto);
    return feed.trendingCategories;
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Get recent community reviews for the home page' })
  @ApiResponse({ status: 200, description: 'Community reviews returned' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getReviews(@Query('limit') limit?: string) {
    const feed = await this.homeService.getFeed({} as HomeFeedDto);
    return feed.communityReviews;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics for trust banner' })
  @ApiResponse({ status: 200, description: 'Platform stats returned' })
  async getStats() {
    const feed = await this.homeService.getFeed({} as HomeFeedDto);
    return feed.platformStats;
  }

  @Get('live-activity')
  @ApiOperation({ summary: 'Get live activity pulse data for social proof' })
  @ApiResponse({ status: 200, description: 'Live activity data returned' })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiQuery({ name: 'city', required: false, type: String })
  async getLiveActivity(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('city') city?: string,
  ) {
    return this.homeService.getLiveActivity(
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
      city,
    );
  }

  @Get('category-providers')
  @ApiOperation({ summary: 'Get providers by category slug for home page sections' })
  @ApiResponse({ status: 200, description: 'Providers returned' })
  @ApiQuery({ name: 'slug', required: true, type: String, example: 'beauty-wellness' })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 6 })
  async getCategoryProviders(
    @Query('slug') slug: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('city') city?: string,
    @Query('limit') limit?: string,
  ) {
    return this.homeService.getProvidersByCategorySlug(
      slug,
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
      city,
      limit ? parseInt(limit, 10) : 6,
    );
  }
}
