import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GeocodeService } from './geocode.service';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';
import { SearchLocationDto } from './dto/search-location.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Geocode')
@Controller('geocode')
@Public()
export class GeocodeController {
  constructor(private readonly geocodeService: GeocodeService) {}

  @Post('reverse')
  @ApiOperation({ summary: 'Reverse geocode lat/lng to readable address (Flow 1-a)' })
  @ApiResponse({ status: 200, description: 'Returns label, city, area, fullAddress' })
  reverseGeocode(@Body() dto: ReverseGeocodeDto) {
    return this.geocodeService.reverseGeocode(dto.lat, dto.lng);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search locations by text query with autocomplete (Flow 2-a)' })
  @ApiResponse({ status: 200, description: 'Returns list of location suggestions with lat/lng' })
  searchLocations(@Query() dto: SearchLocationDto) {
    return this.geocodeService.searchLocations(dto.query, dto.sessionToken);
  }
}
