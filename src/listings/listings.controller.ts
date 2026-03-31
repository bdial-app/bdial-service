import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ListingsService } from './listings.service';
import {
  CreateListingDto,
  UpdateListingDto,
  ListingSearchDto,
} from './dto/listing.dto';

@ApiTags('Listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  @ApiOperation({ summary: 'Search/browse listings (public)' })
  search(@Query() query: ListingSearchDto) {
    return this.listingsService.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get listing detail (public)' })
  findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new listing' })
  create(@Request() req, @Body() dto: CreateListingDto) {
    return this.listingsService.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update my listing (triggers re-approval)' })
  update(@Param('id') id: string, @Request() req, @Body() dto: UpdateListingDto) {
    return this.listingsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Deactivate / soft-delete my listing' })
  deactivate(@Param('id') id: string, @Request() req) {
    return this.listingsService.deactivate(id, req.user.id);
  }
}
