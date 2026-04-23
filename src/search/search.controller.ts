import {
  Controller,
  Get,
  Delete,
  Query,
  Request,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SuggestionsQueryDto } from './dto/suggestions-query.dto';
import { TrendingQueryDto, RecentQueryDto } from './dto/trending-query.dto';

/**
 * Optional JWT guard — extracts user if token present, doesn't reject anonymous.
 */
class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return user || null;
  }
}

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // ────────────────────────────────────────────────────────────
  // GET /search — Unified multi-entity search
  // ────────────────────────────────────────────────────────────

  @Get()
  @UseGuards(OptionalJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Unified search across providers, products, and categories',
    description:
      'Full-text + fuzzy search with relevance ranking, geo-filtering, ' +
      'category filters, rating filters, and server-side sorting.',
  })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  async search(@Query() dto: SearchQueryDto, @Request() req: any) {
    const userId = req.user?.id ?? undefined;
    return this.searchService.search(dto, userId);
  }

  // ────────────────────────────────────────────────────────────
  // GET /search/suggestions — Autocomplete
  // ────────────────────────────────────────────────────────────

  @Get('suggestions')
  @ApiOperation({
    summary: 'Get autocomplete suggestions',
    description:
      'Fast prefix + fuzzy matching across providers, products, and categories. ' +
      'Returns grouped suggestions for typeahead UI.',
  })
  @ApiResponse({ status: 200, description: 'Suggestions returned' })
  async getSuggestions(@Query() dto: SuggestionsQueryDto) {
    return this.searchService.getSuggestions(dto);
  }

  // ────────────────────────────────────────────────────────────
  // GET /search/trending — Popular search queries
  // ────────────────────────────────────────────────────────────

  @Get('trending')
  @ApiOperation({
    summary: 'Get trending search queries',
    description: 'Returns top search queries in the last 7 days, optionally filtered by city.',
  })
  @ApiResponse({ status: 200, description: 'Trending queries returned' })
  async getTrending(@Query() dto: TrendingQueryDto) {
    return this.searchService.getTrending(dto.city, dto.limit);
  }

  // ────────────────────────────────────────────────────────────
  // GET /search/recent — User's recent searches
  // ────────────────────────────────────────────────────────────

  @Get('recent')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get authenticated user\'s recent searches',
    description: 'Returns the last N unique search queries for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Recent searches returned' })
  async getRecent(@Query() dto: RecentQueryDto, @Request() req: any) {
    return this.searchService.getRecent(req.user.id, dto.limit);
  }

  // ────────────────────────────────────────────────────────────
  // DELETE /search/recent — Clear search history
  // ────────────────────────────────────────────────────────────

  @Delete('recent')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Clear search history',
    description: 'Deletes all search log entries for the authenticated user.',
  })
  @ApiResponse({ status: 204, description: 'Search history cleared' })
  async clearRecent(@Request() req: any) {
    await this.searchService.clearRecent(req.user.id);
  }
}
