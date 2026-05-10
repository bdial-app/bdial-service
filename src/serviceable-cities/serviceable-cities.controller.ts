import { Controller, Get, Post, Body, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ServiceableCitiesService } from './serviceable-cities.service';
import { RequestCityDto } from './dto/request-city.dto';
import { CheckServiceabilityDto } from './dto/check-serviceability.dto';
import { Public } from '../common/decorators/public.decorator';

/**
 * Optional JWT guard — extracts user if present, but doesn't reject anonymous requests.
 */
class OptionalJwtGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return user || null;
  }
}

@ApiTags('Serviceable Cities')
@Controller('config')
@Public()
export class ServiceableCitiesController {
  constructor(private readonly service: ServiceableCitiesService) {}

  @Get('serviceable-cities')
  @ApiOperation({ summary: 'Get all serviceable cities with their status and coordinates' })
  @ApiResponse({ status: 200, description: 'List of cities with status' })
  getCities() {
    return this.service.getAllCities();
  }

  @Get('check-serviceability')
  @ApiOperation({ summary: 'Check if a location is serviceable (name match + proximity fallback)' })
  @ApiResponse({ status: 200, description: 'Returns { serviceable, matchedCity }' })
  checkServiceability(@Query() dto: CheckServiceabilityDto) {
    return this.service.checkServiceability(dto.city, dto.lat, dto.lng);
  }

  @Post('city-requests')
  @UseGuards(OptionalJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a city to be launched (rate-limited: 1 per city per user/device per day)' })
  @ApiResponse({ status: 201, description: 'City request recorded' })
  @ApiResponse({ status: 409, description: 'Already requested this city today' })
  requestCity(@Body() dto: RequestCityDto, @Request() req: any) {
    const userId = req.user?.id ?? undefined;
    return this.service.createCityRequest(dto.city, userId, dto.deviceId, {
      platform: dto.platform,
      deviceType: dto.deviceType,
      osVersion: dto.osVersion,
      appVersion: dto.appVersion,
      lat: dto.lat,
      lng: dto.lng,
    });
  }
}
