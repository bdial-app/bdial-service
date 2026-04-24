import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ExploreService } from './explore.service';
import { ExploreFeedDto } from './dto/explore-feed.dto';
import { TrackAdEventDto } from './dto/track-ad-event.dto';
import { Public } from '../common/decorators/public.decorator';

class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return user || null;
  }
}

@ApiTags('Explore')
@Controller('explore')
export class ExploreController {
  constructor(private readonly exploreService: ExploreService) {}

  @Get('feed')
  @Public()
  @UseGuards(OptionalJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get aggregated explore feed data',
    description:
      'Returns all explore page sections: sponsored carousel, offers, categories, nearby, top rated, spotlight, new arrivals, banners, and stats.',
  })
  @ApiResponse({ status: 200, description: 'Explore feed data returned' })
  async getFeed(@Query() dto: ExploreFeedDto, @Request() req: any) {
    const userId = req.user?.id ?? null;
    return this.exploreService.getFeed(dto, userId);
  }

  @Post('track')
  @Public()
  @UseGuards(OptionalJwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Track ad impression or click event',
    description: 'Fire-and-forget tracking for sponsored listings, banners, and offers.',
  })
  @ApiResponse({ status: 204, description: 'Event tracked' })
  async trackEvent(@Body() dto: TrackAdEventDto, @Request() req: any) {
    const userId = req.user?.id ?? null;
    await this.exploreService.trackEvent(dto, userId);
  }

  @Post('award-badges')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Trigger badge auto-award for all eligible providers',
    description: 'Awards earned badges (top_rated, rising_star, trusted) based on metrics.',
  })
  @ApiResponse({ status: 200, description: 'Badges awarded' })
  async awardBadges() {
    return this.exploreService.awardEarnedBadges();
  }
}
