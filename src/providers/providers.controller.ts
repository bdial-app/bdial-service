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
import { Public } from '../common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a new provider' })
  @ApiResponse({ status: 201, description: 'Provider created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Provider already exists for user' })
  create(@Body() createProviderDto: CreateProviderDto) {
    return this.providersService.create(createProviderDto);
  }

  @Post('send-otp')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to provider contact number for verification' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  sendProviderOtp(@Body() body: { mobileNumber: string }) {
    return this.providersService.sendProviderOtp(body.mobileNumber);
  }

  @Post('verify-otp')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
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
  ], {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  }))
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
  @Public()
  @ApiOperation({ summary: 'Get providers near a location with Haversine distance (Flow 1-c)' })
  @ApiResponse({ status: 200, description: 'Nearby providers with distance in km' })
  getNearbyProviders(@Query() dto: NearbyProvidersDto) {
    return this.providersService.findNearby(dto);
  }

  @Get('women-led')
  @Public()
  @ApiOperation({ summary: 'Get approved women-led providers with stats (Women-Led Hub)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'categoryIds', required: false, type: String, description: 'Comma-separated category IDs' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, enum: ['rating', 'newest', 'reviews'] })
  @ApiQuery({ name: 'minRating', required: false, type: Number })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  getWomenLedProviders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('city') city?: string,
    @Query('categoryIds') categoryIds?: string,
    @Query('sortBy') sortBy?: string,
    @Query('minRating') minRating?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    return this.providersService.getWomenLedHub({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 12,
      city,
      categoryIds: categoryIds ? categoryIds.split(',') : undefined,
      sortBy: sortBy as any,
      minRating: minRating ? parseFloat(minRating) : undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
    });
  }

  @Get('featured')
  @Public()
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
  @Public()
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

  @Get('my-offers/limits')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get deal limits for the authenticated provider' })
  @ApiResponse({ status: 200, description: 'Limits retrieved' })
  getOfferLimits(@Request() req) {
    return this.providersService.getOfferLimits(req.user.id);
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
  @Public()
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
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  }))
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
  @Public()
  @ApiOperation({ summary: 'Get provider by ID' })
  @ApiResponse({ status: 200, description: 'Provider retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiParam({ name: 'id', description: 'Provider ID (UUID)' })
  getProviderById(@Param('id', ParseUUIDPipe) id: string) {
    return this.providersService.findOne(id);
  }

  @Get(':id/details')
  @Public()
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

  @Patch(':id/categories')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update provider categories (max 2)' })
  @ApiResponse({ status: 200, description: 'Categories updated successfully' })
  @ApiResponse({ status: 400, description: 'Max 2 categories allowed' })
  @ApiParam({ name: 'id', description: 'Provider ID (UUID)' })
  updateProviderCategories(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() body: { categoryIds: string[] },
  ) {
    if (!body.categoryIds || !Array.isArray(body.categoryIds) || body.categoryIds.length > 2) {
      throw new BadRequestException('You can select up to 2 categories');
    }
    return this.providersService.updateCategories(id, req.user.id, body.categoryIds);
  }

  @Get('my-warnings')
  @ApiOperation({ summary: 'Get warnings for the authenticated provider' })
  getMyWarnings(@Request() req) {
    return this.providersService.getMyWarnings(req.user.id);
  }

  @Get('my-warnings/unread-count')
  @ApiOperation({ summary: 'Get unread warning count for the authenticated provider' })
  getMyWarningsUnreadCount(@Request() req) {
    return this.providersService.getMyWarningsUnreadCount(req.user.id);
  }

  @Patch('my-warnings/:warningId/read')
  @ApiOperation({ summary: 'Mark a warning as read' })
  @ApiParam({ name: 'warningId', description: 'Warning ID (UUID)' })
  markWarningRead(
    @Param('warningId', ParseUUIDPipe) warningId: string,
    @Request() req,
  ) {
    return this.providersService.markWarningRead(req.user.id, warningId);
  }

  // ─── Provider Disable / Enable / Delete ────────────────────────

  @Get('my-provider/cooldown-status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get cooldown status for provider disable/enable' })
  @ApiResponse({ status: 200, description: 'Cooldown status returned' })
  getCooldownStatus(@Request() req) {
    return this.providersService.getCooldownStatus(req.user.id);
  }

  @Post('my-provider/disable')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable (hide) the authenticated user\'s provider profile' })
  @ApiResponse({ status: 200, description: 'Provider disabled successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  disableMyProvider(@Request() req) {
    return this.providersService.disableMyProvider(req.user.id);
  }

  @Post('my-provider/enable')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-enable a disabled provider profile' })
  @ApiResponse({ status: 200, description: 'Provider enabled successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  enableMyProvider(@Request() req) {
    return this.providersService.enableMyProvider(req.user.id);
  }

  @Delete('my-provider')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Soft-delete the authenticated user\'s provider profile' })
  @ApiResponse({ status: 200, description: 'Provider deleted successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  deleteMyProvider(@Request() req) {
    return this.providersService.deleteMyProvider(req.user.id);
  }
}
