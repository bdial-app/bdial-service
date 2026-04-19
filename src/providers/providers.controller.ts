import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderPaginationDto } from './dto/provider-pagination.dto';
import { BecomeProviderDto } from './dto/become-provider.dto';
import { NearbyProvidersDto } from './dto/nearby-providers.dto';

@ApiTags('Providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new provider' })
  @ApiResponse({ status: 201, description: 'Provider created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Provider already exists for user' })
  create(@Body() createProviderDto: CreateProviderDto) {
    return this.providersService.create(createProviderDto);
  }

  @Post('become-provider')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Become a provider (creates provider and verification records)' })
  @ApiResponse({ status: 201, description: 'Provider and verification created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Provider already exists for user' })
  becomeProvider(
    @Body() becomeProviderDto: BecomeProviderDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.providersService.becomeProvider(becomeProviderDto, file);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get providers near a location with Haversine distance (Flow 1-c)' })
  @ApiResponse({ status: 200, description: 'Nearby providers with distance in km' })
  getNearbyProviders(@Query() dto: NearbyProvidersDto) {
    return this.providersService.findNearby(dto);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured/top providers near a location (Flow 1-b)' })
  @ApiResponse({ status: 200, description: 'Top 10 nearest active providers' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  @ApiQuery({ name: 'radius', required: false, type: Number, example: 25 })
  getFeaturedProviders(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.providersService.findFeatured(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseFloat(radius) : 25,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get providers list with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Providers retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'suspended'] })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  getProvidersList(@Query() paginationDto: ProviderPaginationDto) {
    return this.providersService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get provider by ID' })
  @ApiResponse({ status: 200, description: 'Provider retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  getProviderById(@Param('id') id: string) {
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Valid provider ID is required');
    }
    return this.providersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update provider by ID' })
  @ApiResponse({ status: 200, description: 'Provider updated successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiResponse({ status: 409, description: 'Provider already exists for user' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  updateProvider(
    @Param('id') id: string,
    @Body() updateProviderDto: UpdateProviderDto,
  ) {
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Valid provider ID is required');
    }
    return this.providersService.update(id, updateProviderDto);
  }
}
