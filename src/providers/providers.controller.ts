import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
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
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { CreateSponsorshipDto, UpdateSponsorshipDto } from './dto/sponsorship.dto';

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

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to provider contact number for verification' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  sendProviderOtp(@Body() body: { mobileNumber: string }) {
    return this.providersService.sendProviderOtp(body.mobileNumber);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify provider contact number OTP' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  verifyProviderOtp(@Body() body: { mobileNumber: string; otp: string }) {
    return this.providersService.verifyProviderOtp(body.mobileNumber, body.otp);
  }

  @Post('become-provider')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'file', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 },
    { name: 'productImages', maxCount: 20 },
  ]))
  @ApiOperation({ summary: 'Become a provider (creates provider, uploads photos, creates products, and verification records)' })
  @ApiResponse({ status: 201, description: 'Provider and verification created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Provider already exists for user' })
  becomeProvider(
    @Request() req,
    @Body() becomeProviderDto: BecomeProviderDto,
    @UploadedFiles() files: {
      file?: Express.Multer.File[];
      bannerImage?: Express.Multer.File[];
      profileImage?: Express.Multer.File[];
      productImages?: Express.Multer.File[];
    },
  ) {
    // Always use the authenticated user's ID — never trust the client-provided userId
    becomeProviderDto.userId = req.user.id;
    return this.providersService.becomeProvider(
      becomeProviderDto,
      files?.file?.[0],
      files?.bannerImage?.[0],
      files?.profileImage?.[0],
      files?.productImages,
    );
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

  @Get('my-status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current user provider & verification status' })
  @ApiResponse({ status: 200, description: 'Provider status retrieved' })
  getMyProviderStatus(@Request() req) {
    return this.providersService.getMyProviderStatus(req.user.id);
  }

  @Get('my-analytics')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get provider analytics (reviews, ratings, enquiries, products)' })
  @ApiResponse({ status: 200, description: 'Analytics data retrieved' })
  getMyAnalytics(@Request() req) {
    return this.providersService.getAnalytics(req.user.id);
  }

  // ─── Offers / Deals CRUD ────────────────────────────────────────

  @Post('my-offers')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new offer/deal for the authenticated provider' })
  @ApiResponse({ status: 201, description: 'Offer created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  createOffer(@Request() req, @Body() dto: CreateOfferDto) {
    return this.providersService.createOffer(req.user.id, dto);
  }

  @Get('my-offers')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get all offers/deals for the authenticated provider' })
  @ApiResponse({ status: 200, description: 'Offers retrieved successfully' })
  getMyOffers(@Request() req) {
    return this.providersService.getMyOffers(req.user.id);
  }

  @Patch('my-offers/:offerId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update an offer/deal' })
  @ApiResponse({ status: 200, description: 'Offer updated successfully' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  @ApiParam({ name: 'offerId', description: 'Offer ID (UUID)' })
  updateOffer(
    @Request() req,
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.providersService.updateOffer(req.user.id, offerId, dto);
  }

  @Delete('my-offers/:offerId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete an offer/deal' })
  @ApiResponse({ status: 200, description: 'Offer deleted successfully' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  @ApiParam({ name: 'offerId', description: 'Offer ID (UUID)' })
  deleteOffer(
    @Request() req,
    @Param('offerId', ParseUUIDPipe) offerId: string,
  ) {
    return this.providersService.deleteOffer(req.user.id, offerId);
  }

  // ─── Sponsorship Endpoints ─────────────────────────────────────

  @Get('sponsorship-plans')
  @ApiOperation({ summary: 'Get available sponsorship plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved' })
  getSponsorshipPlans() {
    return this.providersService.getSponsorshipPlans();
  }

  @Post('my-sponsorships')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new sponsorship for the authenticated provider' })
  @ApiResponse({ status: 201, description: 'Sponsorship created' })
  createSponsorship(@Request() req, @Body() dto: CreateSponsorshipDto) {
    return this.providersService.createSponsorship(req.user.id, dto);
  }

  @Get('my-sponsorships')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get all sponsorships for the authenticated provider' })
  @ApiResponse({ status: 200, description: 'Sponsorships retrieved' })
  getMySponsorships(@Request() req) {
    return this.providersService.getMySponsorships(req.user.id);
  }

  @Patch('my-sponsorships/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update a sponsorship' })
  @ApiParam({ name: 'id', description: 'Sponsorship ID (UUID)' })
  updateSponsorship(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSponsorshipDto,
  ) {
    return this.providersService.updateSponsorship(req.user.id, id, dto);
  }

  @Post('submit-verification')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Submit identity verification document for existing provider' })
  @ApiResponse({ status: 201, description: 'Verification submitted successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiResponse({ status: 409, description: 'Verification already approved' })
  submitVerification(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body('docType') docType?: string,
  ) {
    if (!file) throw new BadRequestException('Identity document file is required');
    return this.providersService.submitVerification(req.user.id, file, docType);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get provider by ID' })
  @ApiResponse({ status: 200, description: 'Provider retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiParam({ name: 'id', description: 'Provider ID (UUID)' })
  getProviderById(@Param('id', ParseUUIDPipe) id: string) {
    return this.providersService.findOne(id);
  }

  @Get(':id/details')
  @ApiOperation({
    summary:
      'Get provider details aggregate (provider + listings + photos + products + reviews + stats)',
  })
  @ApiResponse({ status: 200, description: 'Provider details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiParam({ name: 'id', description: 'Provider ID (UUID)' })
  getProviderDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.providersService.findDetails(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update provider by ID' })
  @ApiResponse({ status: 200, description: 'Provider updated successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiResponse({ status: 409, description: 'Provider already exists for user' })
  @ApiParam({ name: 'id', description: 'Provider ID (UUID)' })
  updateProvider(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProviderDto: UpdateProviderDto,
  ) {
    return this.providersService.update(id, updateProviderDto);
  }
}
