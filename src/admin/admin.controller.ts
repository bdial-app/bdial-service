import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, Query, UseInterceptors, UploadedFile, UploadedFiles, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor, FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminService } from './admin.service';
import { AdminCreateUserDto, AdminCreateProviderWithUserDto, AdminSendOtpDto, AdminVerifyOtpDto } from './dto/admin-create-user.dto';
import { BulkValidateProvidersDto, BulkImportProvidersDto } from './dto/bulk-provider-import.dto';
import { ImportProviderImageUrlsDto } from './dto/provider-images.dto';
import {
  AdminCreateSponsorshipDto,
  AdminUpdateSponsorshipDto,
  StopSponsorshipDto,
  TopUpSponsorshipDto,
  BulkSponsorshipDto,
  StopAllSponsorshipsDto,
} from './dto/sponsorship-admin.dto';

/**
 * Bulk provider import fires hundreds of requests from one admin session
 * (row chunks plus up to three image requests per business). The global
 * 300/min-per-IP limit would 429 a large import, so these admin-only,
 * JWT-protected routes get a much higher ceiling rather than none at all.
 */
const BULK_IMPORT_THROTTLE = { default: { ttl: 60_000, limit: 3000 } };

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard stats' })
  getDashboard(@Request() req) {
    return this.adminService.getDashboard(req.user);
  }

  @Get('providers/pending')
  @ApiOperation({ summary: 'Get all pending providers' })
  getPendingProviders(@Request() req) {
    return this.adminService.getPendingProviders(req.user);
  }

  @Patch('providers/:id/approve')
  @ApiOperation({ summary: 'Approve a provider' })
  approveProvider(@Param('id') id: string, @Request() req) {
    return this.adminService.approveProvider(req.user, id);
  }

  @Patch('providers/:id/suspend')
  @ApiOperation({ summary: 'Suspend a provider' })
  suspendProvider(@Param('id') id: string, @Request() req) {
    return this.adminService.suspendProvider(req.user, id);
  }

  @Patch('providers/:id/unsuspend')
  @ApiOperation({ summary: 'Revoke suspension of a provider' })
  unsuspendProvider(@Param('id') id: string, @Request() req) {
    return this.adminService.unsuspendProvider(req.user, id);
  }

  //get all verifications by pagination
  @Get('verifications')
  @ApiOperation({ summary: 'Get verification submissions with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'rows', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by aadhaarStatus: pending, approved, rejected' })
  @ApiQuery({ name: 'search', required: false, type: String })
  getVerifications(
    @Request() req,
    @Query('page') page?: number,
    @Query('rows') rows?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getVerifications(req.user, page, rows, status, search);
  }

  @Get('verifications/stats')
  @ApiOperation({ summary: 'Get verification stats' })
  getVerificationStats(@Request() req) {
    return this.adminService.getVerificationStats(req.user);
  }

  //get verification by id
  @Get('verifications/:id')
  @ApiOperation({ summary: 'Get verification details by ID' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  getVerificationById(@Param('id') id: string, @Request() req) {
    return this.adminService.getVerificationById(req.user, id);
  }

  @Patch('verifications/:id/review')
  @ApiOperation({ summary: 'Approve or reject a verification' })
  @ApiBody({
    schema: {
      properties: {
        aadhaarStatus: { type: 'string', enum: ['approved', 'rejected'] },
        ijamatStatus: { type: 'string', enum: ['approved', 'rejected', 'not_submitted'] },
        adminNotes: { type: 'string' },
      },
    },
  })
  reviewVerification(
    @Param('id') id: string,
    @Request() req,
    @Body('aadhaarStatus') aadhaarStatus: 'approved' | 'rejected',
    @Body('ijamatStatus') ijamatStatus: string,
    @Body('adminNotes') adminNotes: string,
  ) {
    return this.adminService.reviewVerification(req.user, id, aadhaarStatus, ijamatStatus, adminNotes);
  }

  //update verification status by id
  @Patch('verifications/:id/status')
  @ApiOperation({ summary: 'Update verification status' })
  @ApiParam({ name: 'id', description: 'Verification ID' })
  @ApiBody({ 
    schema: {
      properties: {
        aadhaarStatus: { type: 'string', enum: ['pending', 'approved', 'rejected'], description: 'Aadhaar verification status' },
        ijamatStatus: { type: 'string', enum: ['pending', 'approved', 'rejected', 'not_submitted'], description: 'Ijamat verification status' },
        status: { type: 'string', enum: ['pending', 'approved', 'rejected'], description: 'Overall verification status' }
      }
    }
  })
  updateVerificationStatus(
    @Param('id') id: string,
    @Request() req,
    @Body('aadhaarStatus') aadhaarStatus?: 'pending' | 'approved' | 'rejected',
    @Body('ijamatStatus') ijamatStatus?: 'pending' | 'approved' | 'rejected' | 'not_submitted',
    @Body('status') status?: 'pending' | 'approved' | 'rejected',
  ) {
    return this.adminService.updateVerificationStatus(req.user, id, aadhaarStatus, ijamatStatus, status);
  }

  @Get('reviews/reports')
  @ApiOperation({ summary: 'Get pending review reports' })
  getPendingReports(@Request() req) {
    return this.adminService.getPendingReports(req.user);
  }

  @Patch('reviews/:id/remove')
  @ApiOperation({ summary: 'Remove a review' })
  removeReview(@Param('id') id: string, @Request() req) {
    return this.adminService.removeReview(req.user, id);
  }

  @Patch('users/:id/pause')
  @ApiOperation({ summary: 'Pause a user (blocks login, hides provider, deactivates chats)' })
  pauseUser(@Param('id') id: string, @Request() req) {
    return this.adminService.pauseUser(req.user, id);
  }

  // ============================================
  // Report Management
  // ============================================

  @Get('reports')
  @ApiOperation({ summary: 'Get paginated report queue with optional filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'rows', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status: pending, under_review, action_taken, dismissed' })
  @ApiQuery({ name: 'entityType', required: false, type: String, description: 'Filter by entity type: provider, product, message' })
  getReportQueue(
    @Request() req,
    @Query('page') page?: number,
    @Query('rows') rows?: number,
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.adminService.getReportQueue(req.user, page, rows, status, entityType);
  }

  @Get('reports/stats')
  @ApiOperation({ summary: 'Get report statistics' })
  getReportStats(@Request() req) {
    return this.adminService.getReportStats(req.user);
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get detailed report with context (reporter credibility, target info, other reports)' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  getReportDetail(@Param('id') id: string, @Request() req) {
    return this.adminService.getReportDetail(req.user, id);
  }

  @Patch('reports/:id/review')
  @ApiOperation({ summary: 'Review a report: dismiss, warn, suspend, or ban' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiBody({
    schema: {
      properties: {
        action: { type: 'string', enum: ['dismiss', 'warn', 'suspend', 'ban'] },
        adminNotes: { type: 'string' },
      },
      required: ['action'],
    },
  })
  reviewEntityReport(
    @Param('id') id: string,
    @Request() req,
    @Body('action') action: 'dismiss' | 'warn' | 'suspend' | 'ban',
    @Body('adminNotes') adminNotes?: string,
  ) {
    return this.adminService.reviewEntityReport(req.user, id, action, adminNotes);
  }

  @Get('providers/:id/warnings')
  @ApiOperation({ summary: 'Get all warnings for a specific provider' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  getProviderWarnings(@Param('id') id: string, @Request() req) {
    return this.adminService.getProviderWarnings(req.user, id);
  }

  @Patch('providers/:id/confirm-suspension')
  @ApiOperation({ summary: 'Confirm a provider suspension (prevents auto-lift after 48h)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  confirmSuspension(@Param('id') id: string, @Request() req) {
    return this.adminService.confirmSuspension(req.user, id);
  }

  // ============================================
  // Users Management
  // ============================================

  @Get('users')
  @ApiOperation({ summary: 'Paginated user list with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'hasProvider', required: false, type: String, description: 'Filter by provider status: true/false' })
  getUsers(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('city') city?: string,
    @Query('hasProvider') hasProvider?: string,
  ) {
    return this.adminService.getUsers(req.user, page, limit, search, status, role, city, hasProvider);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get detailed user info' })
  @ApiParam({ name: 'id', description: 'User ID' })
  getUserById(@Param('id') id: string, @Request() req) {
    return this.adminService.getUserById(req.user, id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Admin update user fields' })
  @ApiParam({ name: 'id', description: 'User ID' })
  updateUser(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.adminService.updateUserAdmin(req.user, id, body);
  }

  // ============================================
  // Providers Management (expanded)
  // ============================================

  @Get('providers')
  @ApiOperation({ summary: 'Paginated provider list with filters (all statuses)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'isFeatured', required: false, type: String })
  @ApiQuery({ name: 'isWomenLed', required: false, type: String })
  getProvidersList(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('city') city?: string,
    @Query('isFeatured') isFeatured?: string,
    @Query('isWomenLed') isWomenLed?: string,
  ) {
    return this.adminService.getProvidersList(req.user, page, limit, search, status, city, isFeatured, isWomenLed);
  }

  @Get('providers/:id')
  @ApiOperation({ summary: 'Get full provider detail with all relations' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  getProviderDetail(@Param('id') id: string, @Request() req) {
    return this.adminService.getProviderDetail(req.user, id);
  }

  @Patch('providers/:id')
  @ApiOperation({ summary: 'Admin update provider fields' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  updateProvider(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.adminService.updateProviderAdmin(req.user, id, body);
  }

  @Post('providers/:id/photos')
  @Throttle(BULK_IMPORT_THROTTLE)
  @ApiOperation({ summary: 'Admin add gallery photos to a provider (10 per provider in total)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('photos', 10, { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadProviderPhotos(
    @Param('id') id: string,
    @Request() req,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.adminService.adminUploadProviderPhotos(req.user, id, files ?? []);
  }

  @Post('providers/:id/images/from-urls')
  @Throttle(BULK_IMPORT_THROTTLE)
  @ApiOperation({
    summary: 'Attach logo, banner and gallery images from links',
    description: 'Downloads each link server-side (Google Drive and Dropbox share links supported) with SSRF protection. Returns a result per image.',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  importProviderImageUrls(@Param('id') id: string, @Request() req, @Body() dto: ImportProviderImageUrlsDto) {
    return this.adminService.importProviderImagesFromUrls(req.user, id, dto);
  }

  @Patch('providers/:id/images')
  @Throttle(BULK_IMPORT_THROTTLE)
  @ApiOperation({ summary: 'Admin update provider logo and/or banner image' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ], { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  updateProviderImages(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { removeLogo?: string; removeBanner?: string },
    @UploadedFiles() files?: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  ) {
    return this.adminService.updateProviderImages(req.user, id, {
      logo: files?.logo?.[0],
      banner: files?.banner?.[0],
      removeLogo: body?.removeLogo === 'true',
      removeBanner: body?.removeBanner === 'true',
    });
  }

  @Patch('providers/:id/categories')
  @ApiOperation({ summary: 'Admin update provider categories (max 2)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiBody({ schema: { properties: { categoryIds: { type: 'array', items: { type: 'string' } } } } })
  updateProviderCategories(@Param('id') id: string, @Request() req, @Body() body: { categoryIds: string[] }) {
    return this.adminService.updateProviderCategories(req.user, id, body?.categoryIds);
  }

  @Patch('providers/:id/contact-number')
  @ApiOperation({ summary: 'Admin update provider contact number with OTP verification' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiBody({ schema: { properties: { contactNumber: { type: 'string' }, otp: { type: 'string' } } } })
  updateContactNumber(@Param('id') id: string, @Request() req, @Body() body: { contactNumber: string; otp: string }) {
    return this.adminService.updateProviderContactNumber(req.user, id, body.contactNumber, body.otp);
  }

  // ============================================
  // Products Management
  // ============================================

  @Get('products/stats')
  @ApiOperation({ summary: 'Product statistics' })
  getProductStats(@Request() req) {
    return this.adminService.getProductStats(req.user);
  }

  @Get('products')
  @ApiOperation({ summary: 'Paginated product list with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'providerId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: String })
  getProducts(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('providerId') providerId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminService.getProducts(req.user, page, limit, search, providerId, isActive);
  }

  @Post('products')
  @ApiOperation({ summary: 'Admin create a product for a provider' })
  createProduct(@Request() req, @Body() body: any) {
    return this.adminService.createProductAdmin(req.user, body);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product detail' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  getProduct(@Param('id') id: string, @Request() req) {
    return this.adminService.getProductById(req.user, id);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Admin update product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  updateProduct(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.adminService.updateProductAdmin(req.user, id, body);
  }

  @Patch('products/:id/delete')
  @ApiOperation({ summary: 'Admin soft-delete product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  deleteProduct(@Param('id') id: string, @Request() req) {
    return this.adminService.deleteProductAdmin(req.user, id);
  }

  @Delete('products/:id/images')
  @ApiOperation({ summary: 'Remove a single image from a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiBody({ schema: { properties: { url: { type: 'string' } }, required: ['url'] } })
  deleteProductImage(@Param('id') id: string, @Request() req, @Body('url') url: string) {
    return this.adminService.deleteProductImage(req.user, id, url);
  }

  @Post('products/:id/images')
  @ApiOperation({ summary: 'Upload images for a product (max 5 files, 10MB each)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 5, { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadProductImages(
    @Param('id') id: string,
    @Request() req,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.adminService.uploadProductImages(req.user, id, files ?? []);
  }

  // ============================================
  // Reviews Management
  // ============================================

  @Get('reviews')
  @ApiOperation({ summary: 'Paginated review list with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'providerId', required: false, type: String })
  @ApiQuery({ name: 'minRating', required: false, type: Number })
  @ApiQuery({ name: 'maxRating', required: false, type: Number })
  getReviews(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('providerId') providerId?: string,
    @Query('minRating') minRating?: number,
    @Query('maxRating') maxRating?: number,
  ) {
    return this.adminService.getReviews(req.user, page, limit, status, providerId, minRating, maxRating);
  }

  @Get('reviews/:id')
  @ApiOperation({ summary: 'Get review detail with relations' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  getReview(@Param('id') id: string, @Request() req) {
    return this.adminService.getReviewById(req.user, id);
  }

  @Patch('reviews/:id/status')
  @ApiOperation({ summary: 'Update review status (active/removed)' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiBody({ schema: { properties: { status: { type: 'string', enum: ['active', 'removed'] } }, required: ['status'] } })
  updateReviewStatus(
    @Param('id') id: string,
    @Request() req,
    @Body('status') status: 'active' | 'removed',
  ) {
    return this.adminService.updateReviewStatus(req.user, id, status);
  }

  // ============================================
  // Google Reviews Management (Admin)
  // ============================================

  @Get('google-reviews/providers')
  @ApiOperation({ summary: 'List providers with Google link status and trust levels' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'trustLevel', required: false, type: String })
  @ApiQuery({ name: 'linked', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  getGoogleLinkedProviders(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('trustLevel') trustLevel?: string,
    @Query('linked') linked?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getGoogleLinkedProviders(req.user, page, limit, {
      trustLevel,
      linked: linked === 'true' ? true : linked === 'false' ? false : undefined,
      search,
    });
  }

  @Get('google-reviews/trust-overview')
  @ApiOperation({ summary: 'Trust level distribution overview' })
  getTrustOverview(@Request() req) {
    return this.adminService.getTrustOverview(req.user);
  }

  @Post('google-reviews/verify/:providerId')
  @ApiOperation({ summary: 'Admin: Find Google Place candidates for a provider' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  adminVerifyGooglePlace(
    @Param('providerId') providerId: string,
    @Request() req,
    @Body() body: { phoneNumber?: string },
  ) {
    return this.adminService.adminVerifyGooglePlace(req.user, providerId, body.phoneNumber);
  }

  @Post('google-reviews/confirm/:providerId')
  @ApiOperation({ summary: 'Admin: Link a Google Place to a provider' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  @ApiBody({ schema: { properties: { placeId: { type: 'string' } }, required: ['placeId'] } })
  adminConfirmGooglePlace(
    @Param('providerId') providerId: string,
    @Request() req,
    @Body('placeId') placeId: string,
  ) {
    return this.adminService.adminConfirmGooglePlace(req.user, providerId, placeId);
  }

  @Delete('google-reviews/unlink/:providerId')
  @ApiOperation({ summary: 'Admin: Unlink Google Place from a provider' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  adminUnlinkGooglePlace(
    @Param('providerId') providerId: string,
    @Request() req,
  ) {
    return this.adminService.adminUnlinkGooglePlace(req.user, providerId);
  }

  @Post('google-reviews/refresh/:providerId')
  @ApiOperation({ summary: 'Admin: Force refresh Google aggregates for a provider' })
  @ApiParam({ name: 'providerId', description: 'Provider ID' })
  adminRefreshGoogleAggregates(
    @Param('providerId') providerId: string,
    @Request() req,
  ) {
    return this.adminService.adminRefreshGoogleAggregates(req.user, providerId);
  }

  // ============================================
  // Global Warnings Management
  // ============================================

  @Get('warnings')
  @ApiOperation({ summary: 'Paginated warnings list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'providerId', required: false, type: String })
  @ApiQuery({ name: 'warningType', required: false, type: String })
  getWarnings(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('providerId') providerId?: string,
    @Query('warningType') warningType?: string,
  ) {
    return this.adminService.getWarnings(req.user, page, limit, providerId, warningType);
  }

  @Get('warnings/:id')
  @ApiOperation({ summary: 'Get warning detail' })
  @ApiParam({ name: 'id', description: 'Warning ID' })
  getWarning(@Param('id') id: string, @Request() req) {
    return this.adminService.getWarningById(req.user, id);
  }

  @Post('warnings')
  @ApiOperation({ summary: 'Manually issue a warning to a provider' })
  createWarning(@Request() req, @Body() body: { providerId: string; warningType: string; title: string; message: string }) {
    return this.adminService.createWarning(req.user, body);
  }

  @Patch('warnings/:id')
  @ApiOperation({ summary: 'Update a warning' })
  @ApiParam({ name: 'id', description: 'Warning ID' })
  updateWarning(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.adminService.updateWarning(req.user, id, body);
  }

  // ============================================
  // Chat Moderation
  // ============================================

  @Get('chat/conversations')
  @ApiOperation({ summary: 'Paginated conversation list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  getChatConversations(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getChatConversations(req.user, page, limit, status, search);
  }

  @Get('chat/conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getChatMessages(
    @Param('id') id: string,
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getChatMessages(req.user, id, page, limit);
  }

  @Patch('chat/messages/:id/remove')
  @ApiOperation({ summary: 'Redact a message' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  redactMessage(@Param('id') id: string, @Request() req) {
    return this.adminService.redactMessage(req.user, id);
  }

  @Patch('chat/conversations/:id/close')
  @ApiOperation({ summary: 'Force close a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  closeConversation(@Param('id') id: string, @Request() req) {
    return this.adminService.closeConversation(req.user, id);
  }

  @Get('chat/stats')
  @ApiOperation({ summary: 'Chat moderation stats' })
  getChatStats(@Request() req) {
    return this.adminService.getChatStats(req.user);
  }

  // ============================================
  // Promo Banners Management
  // ============================================

  @Get('banners')
  @ApiOperation({ summary: 'List all banners with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: String })
  getBanners(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminService.getBanners(req.user, page, limit, isActive);
  }

  @Get('banners/:id')
  @ApiOperation({ summary: 'Get banner detail' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  getBanner(@Param('id') id: string, @Request() req) {
    return this.adminService.getBannerById(req.user, id);
  }

  @Post('banners')
  @ApiOperation({ summary: 'Create a new banner' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  createBanner(@Request() req, @Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    // Parse JSON string fields that come through FormData
    const parsed = this.parseBannerBody(body);
    return this.adminService.createBanner(req.user, parsed, file);
  }

  @Patch('banners/:id')
  @ApiOperation({ summary: 'Update a banner' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  updateBanner(@Param('id') id: string, @Request() req, @Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    const parsed = this.parseBannerBody(body);
    return this.adminService.updateBanner(req.user, id, parsed, file);
  }

  private parseBannerBody(body: any) {
    const parsed = { ...body };
    if (parsed.isActive !== undefined) {
      parsed.isActive = parsed.isActive === 'true' || parsed.isActive === true;
    }
    // Handle null string from FormData
    for (const key of ['imageUrl', 'subtitle', 'gradient', 'emoji', 'cta', 'tag', 'linkUrl', 'startsAt', 'endsAt']) {
      if (parsed[key] === 'null' || parsed[key] === '') parsed[key] = null;
    }
    return parsed;
  }

  @Delete('banners/:id')
  @ApiOperation({ summary: 'Delete a banner' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  deleteBanner(@Param('id') id: string, @Request() req) {
    return this.adminService.deleteBanner(req.user, id);
  }

  @Patch('banners/reorder')
  @ApiOperation({ summary: 'Batch reorder banners' })
  @ApiBody({ schema: { properties: { items: { type: 'array', items: { properties: { id: { type: 'string' }, displayOrder: { type: 'number' } } } } } } })
  reorderBanners(@Request() req, @Body('items') items: { id: string; displayOrder: number }[]) {
    return this.adminService.reorderBanners(req.user, items);
  }

  // ============================================
  // Sponsored Listings Management
  //
  // Route order matters: every literal path must be declared before
  // `sponsorships/:id`, or Nest matches the literal as an id.
  // ============================================

  @Get('sponsorships')
  @ApiOperation({ summary: 'List all sponsored listings' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'approvalStatus', required: false, type: String })
  @ApiQuery({ name: 'source', required: false, type: String, description: 'provider_paid | admin_granted' })
  @ApiQuery({ name: 'billingMode', required: false, type: String, description: 'paid | free' })
  @ApiQuery({ name: 'providerId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  getSponsoredListings(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: string,
    @Query('type') type?: string,
    @Query('approvalStatus') approvalStatus?: string,
    @Query('source') source?: string,
    @Query('billingMode') billingMode?: string,
    @Query('providerId') providerId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getSponsoredListings(req.user, page, limit, isActive, type, {
      approvalStatus, source, billingMode, providerId, search,
    });
  }

  @Post('sponsorships')
  @ApiOperation({
    summary: 'Place a sponsorship for any provider',
    description: 'Complimentary (billingMode: free) or paid, with an optional manually recorded payment. No provider checkout required.',
  })
  createSponsorship(@Request() req, @Body() dto: AdminCreateSponsorshipDto) {
    return this.adminService.createSponsorship(req.user, dto);
  }

  @Get('sponsorships/stats')
  @ApiOperation({ summary: 'Sponsored listings stats' })
  getSponsoredStats(@Request() req) {
    return this.adminService.getSponsoredStats(req.user);
  }

  @Get('sponsorships/pending')
  @ApiOperation({ summary: 'List sponsorships pending approval' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPendingSponsorships(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getPendingSponsorships(req.user, page, limit);
  }

  @Get('sponsorships/eligible-providers')
  @ApiOperation({ summary: 'Providers an admin can place a sponsorship for' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getSponsorshipEligibleProviders(
    @Request() req,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getSponsorshipEligibleProviders(req.user, search, limit);
  }

  @Post('sponsorships/bulk')
  @ApiOperation({ summary: 'Stop, resume, approve, reject or delete many sponsorships at once' })
  bulkSponsorshipAction(@Request() req, @Body() dto: BulkSponsorshipDto) {
    return this.adminService.bulkSponsorshipAction(req.user, dto);
  }

  @Post('sponsorships/stop-all')
  @ApiOperation({
    summary: 'Kill switch — stop every running sponsorship',
    description: 'Optionally also turns the sponsorships_enabled feature flag off so nothing sponsored is served platform-wide.',
  })
  stopAllSponsorships(@Request() req, @Body() dto: StopAllSponsorshipsDto) {
    return this.adminService.stopAllSponsorships(req.user, dto);
  }

  @Get('sponsorships/:id')
  @ApiOperation({ summary: 'Get sponsored listing detail' })
  @ApiParam({ name: 'id', description: 'Sponsored listing ID' })
  getSponsored(@Param('id') id: string, @Request() req) {
    return this.adminService.getSponsoredById(req.user, id);
  }

  @Get('sponsorships/:id/analytics')
  @ApiOperation({ summary: 'Daily impressions, clicks and spend for one sponsorship' })
  @ApiParam({ name: 'id', description: 'Sponsored listing ID' })
  @ApiQuery({ name: 'period', required: false, type: String, description: '7d | 14d | 30d' })
  getSponsorshipAnalytics(
    @Param('id') id: string,
    @Request() req,
    @Query('period') period?: string,
  ) {
    return this.adminService.getSponsorshipAnalytics(req.user, id, period);
  }

  @Patch('sponsorships/:id')
  @ApiOperation({ summary: 'Update a sponsored listing' })
  @ApiParam({ name: 'id', description: 'Sponsored listing ID' })
  updateSponsored(@Param('id') id: string, @Request() req, @Body() dto: AdminUpdateSponsorshipDto) {
    return this.adminService.updateSponsored(req.user, id, dto);
  }

  @Patch('sponsorships/:id/stop')
  @ApiOperation({ summary: 'Stop (pause) a running sponsorship' })
  @ApiParam({ name: 'id', description: 'Sponsored listing ID' })
  stopSponsorship(@Param('id') id: string, @Request() req, @Body() dto: StopSponsorshipDto) {
    return this.adminService.stopSponsorship(req.user, id, dto);
  }

  @Patch('sponsorships/:id/resume')
  @ApiOperation({ summary: 'Resume a stopped sponsorship' })
  @ApiParam({ name: 'id', description: 'Sponsored listing ID' })
  resumeSponsorship(@Param('id') id: string, @Request() req) {
    return this.adminService.resumeSponsorship(req.user, id);
  }

  @Patch('sponsorships/:id/top-up')
  @ApiOperation({ summary: 'Add budget (and optionally days) to a paid sponsorship' })
  @ApiParam({ name: 'id', description: 'Sponsored listing ID' })
  topUpSponsorship(@Param('id') id: string, @Request() req, @Body() dto: TopUpSponsorshipDto) {
    return this.adminService.topUpSponsorship(req.user, id, dto);
  }

  @Patch('sponsorships/:id/approve')
  @ApiOperation({ summary: 'Approve a sponsorship' })
  @ApiParam({ name: 'id', description: 'Sponsored listing ID' })
  approveSponsorship(@Param('id') id: string, @Request() req) {
    return this.adminService.approveSponsorship(req.user, id);
  }

  @Patch('sponsorships/:id/reject')
  @ApiOperation({ summary: 'Reject a sponsorship' })
  @ApiParam({ name: 'id', description: 'Sponsored listing ID' })
  @ApiBody({ schema: { properties: { adminNotes: { type: 'string' } } } })
  rejectSponsorship(@Param('id') id: string, @Request() req, @Body('adminNotes') adminNotes?: string) {
    return this.adminService.rejectSponsorship(req.user, id, adminNotes);
  }

  @Delete('sponsorships/:id')
  @ApiOperation({ summary: 'Permanently delete a sponsorship' })
  @ApiParam({ name: 'id', description: 'Sponsored listing ID' })
  deleteSponsorship(@Param('id') id: string, @Request() req) {
    return this.adminService.deleteSponsorship(req.user, id);
  }

  // ============================================
  // Provider Offers Management
  // ============================================

  @Get('offers')
  @ApiOperation({ summary: 'List all offers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: String })
  @ApiQuery({ name: 'providerId', required: false, type: String })
  getOffers(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: string,
    @Query('providerId') providerId?: string,
  ) {
    return this.adminService.getOffers(req.user, page, limit, isActive, providerId);
  }

  @Get('offers/stats')
  @ApiOperation({ summary: 'Offer statistics' })
  getOfferStats(@Request() req) {
    return this.adminService.getOfferStats(req.user);
  }

  @Get('offers/:id')
  @ApiOperation({ summary: 'Get offer detail' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  getOffer(@Param('id') id: string, @Request() req) {
    return this.adminService.getOfferById(req.user, id);
  }

  @Patch('offers/:id')
  @ApiOperation({ summary: 'Update an offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  updateOffer(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.adminService.updateOffer(req.user, id, body);
  }

  @Delete('offers/:id')
  @ApiOperation({ summary: 'Deactivate an offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  deleteOffer(@Param('id') id: string, @Request() req) {
    return this.adminService.deleteOffer(req.user, id);
  }

  // ============================================
  // Provider Badges Management
  // ============================================

  @Get('badges')
  @ApiOperation({ summary: 'List all badges' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: String })
  getBadges(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminService.getBadges(req.user, page, limit, type, isActive);
  }

  @Get('badges/:id')
  @ApiOperation({ summary: 'Get badge detail' })
  @ApiParam({ name: 'id', description: 'Badge ID' })
  getBadge(@Param('id') id: string, @Request() req) {
    return this.adminService.getBadgeById(req.user, id);
  }

  @Post('badges')
  @ApiOperation({ summary: 'Manually award a badge to a provider' })
  createBadge(@Request() req, @Body() body: { providerId: string; type: string; source?: string; expiresAt?: string }) {
    return this.adminService.createBadge(req.user, body);
  }

  @Patch('badges/:id')
  @ApiOperation({ summary: 'Update a badge' })
  @ApiParam({ name: 'id', description: 'Badge ID' })
  updateBadge(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.adminService.updateBadge(req.user, id, body);
  }

  @Delete('badges/:id')
  @ApiOperation({ summary: 'Revoke a badge' })
  @ApiParam({ name: 'id', description: 'Badge ID' })
  deleteBadge(@Param('id') id: string, @Request() req) {
    return this.adminService.deleteBadge(req.user, id);
  }

  // ============================================
  // Dashboard Time Series
  // ============================================

  @Get('dashboard/time-series')
  @ApiOperation({ summary: 'Dashboard time-series data for charts' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days (7-90, default 30)' })
  getDashboardTimeSeries(@Request() req, @Query('days') days?: number) {
    return this.adminService.getDashboardTimeSeries(req.user, days ? Number(days) : 30);
  }

  // ============================================
  // Analytics
  // ============================================

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Analytics overview: events, leads, search, ad performance' })
  getAnalyticsOverview(@Request() req) {
    return this.adminService.getAnalyticsOverview(req.user);
  }

  @Get('analytics/search-trends')
  @ApiOperation({ summary: 'Search query analytics: top queries, zero-result queries, volume by day' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getSearchTrends(@Request() req, @Query('days') days?: number, @Query('limit') limit?: number) {
    return this.adminService.getSearchTrends(req.user, days ? Number(days) : 30, limit ? Number(limit) : 50);
  }

  @Get('analytics/geographic')
  @ApiOperation({ summary: 'Geographic distribution: users, providers, searches by city' })
  getGeographicStats(@Request() req) {
    return this.adminService.getGeographicStats(req.user);
  }

  // ============================================
  // Admin User Management
  // ============================================

  @Get('admins')
  @ApiOperation({ summary: 'List admin users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'rows', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  getAdminUsers(@Request() req, @Query('page') page?: number, @Query('rows') rows?: number, @Query('search') search?: string) {
    return this.adminService.getAdminUsers(req.user, page, rows, search);
  }

  @Post('admins')
  @ApiOperation({ summary: 'Create or promote admin user' })
  @ApiBody({ schema: { type: 'object', properties: { mobileNumber: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, gender: { type: 'string' } } } })
  createAdminUser(@Request() req, @Body() body: any) {
    return this.adminService.createAdminUser(req.user, body);
  }

  @Patch('admins/:id')
  @ApiOperation({ summary: 'Update admin user' })
  @ApiParam({ name: 'id', description: 'Admin user ID' })
  updateAdminUser(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.adminService.updateAdminUser(req.user, id, body);
  }

  @Delete('admins/:id')
  @ApiOperation({ summary: 'Remove admin access (demote to customer)' })
  @ApiParam({ name: 'id', description: 'Admin user ID' })
  removeAdminUser(@Param('id') id: string, @Request() req) {
    return this.adminService.removeAdminUser(req.user, id);
  }

  // ============================================
  // Audit Logs
  // ============================================

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'rows', required: false, type: Number })
  @ApiQuery({ name: 'adminId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  getAuditLogs(
    @Request() req,
    @Query('page') page?: number,
    @Query('rows') rows?: number,
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getAuditLogs(req.user, page, rows, { adminId, action, entityType, startDate, endDate });
  }

  @Get('audit-logs/stats')
  @ApiOperation({ summary: 'Get audit log statistics' })
  getAuditLogStats(@Request() req) {
    return this.adminService.getAuditLogStats(req.user);
  }

  // ============================================
  // System Settings
  // ============================================

  @Get('settings')
  @ApiOperation({ summary: 'Get all system settings' })
  getSettings(@Request() req) {
    return this.adminService.getSettings(req.user);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update settings in batch' })
  @ApiBody({ schema: { type: 'object', properties: { settings: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } } } } } } })
  updateSettings(@Request() req, @Body() body: { settings: { key: string; value: string }[] }) {
    return this.adminService.updateSettings(req.user, body.settings);
  }

  @Post('settings')
  @ApiOperation({ summary: 'Create a new system setting' })
  createSetting(@Request() req, @Body() body: any) {
    return this.adminService.createSetting(req.user, body);
  }

  @Delete('settings/:id')
  @ApiOperation({ summary: 'Delete a system setting' })
  @ApiParam({ name: 'id', description: 'Setting ID' })
  deleteSetting(@Param('id') id: string, @Request() req) {
    return this.adminService.deleteSetting(req.user, id);
  }

  // ============================================
  // Bug Reports Management
  // ============================================

  @Get('bug-reports')
  @ApiOperation({ summary: 'Paginated bug report list with optional filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'open | in_progress | resolved | closed' })
  @ApiQuery({ name: 'category', required: false, type: String })
  getBugReports(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.adminService.getBugReports(req.user, page ? Number(page) : 1, limit ? Number(limit) : 20, status, category);
  }

  @Get('bug-reports/:id')
  @ApiOperation({ summary: 'Get bug report detail' })
  @ApiParam({ name: 'id', description: 'Bug Report ID' })
  getBugReport(@Param('id') id: string, @Request() req) {
    return this.adminService.getBugReportById(req.user, id);
  }

  @Patch('bug-reports/:id')
  @ApiOperation({ summary: 'Update bug report status and/or admin notes' })
  @ApiParam({ name: 'id', description: 'Bug Report ID' })
  @ApiBody({
    schema: {
      properties: {
        status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] },
        adminNotes: { type: 'string' },
      },
    },
  })
  updateBugReport(
    @Param('id') id: string,
    @Request() req,
    @Body('status') status: string,
    @Body('adminNotes') adminNotes?: string,
  ) {
    return this.adminService.updateBugReport(req.user, id, status, adminNotes);
  }

  // ============================================
  // Admin User & Provider Creation
  // ============================================

  @Post('create-user')
  @ApiOperation({ summary: 'Admin creates a new user with all details (OTP optional)' })
  createUser(@Request() req, @Body() body: AdminCreateUserDto) {
    return this.adminService.adminCreateUser(req.user, body);
  }

  @Post('create-provider-with-user')
  @ApiOperation({ summary: 'Admin creates user + provider + products in one atomic flow' })
  createProviderWithUser(@Request() req, @Body() body: AdminCreateProviderWithUserDto) {
    return this.adminService.adminCreateProviderWithUser(req.user, body);
  }

  @Post('providers/bulk-validate')
  @Throttle(BULK_IMPORT_THROTTLE)
  @ApiOperation({
    summary: 'Dry-run a CSV/XLSX provider batch',
    description: 'Writes nothing. Reports per row which users/providers/contact numbers already exist so the sheet can be vetted before import.',
  })
  bulkValidateProviders(@Request() req, @Body() dto: BulkValidateProvidersDto) {
    return this.adminService.bulkValidateProviders(req.user, dto);
  }

  @Post('providers/bulk-import')
  @Throttle(BULK_IMPORT_THROTTLE)
  @ApiOperation({
    summary: 'Create many providers (with users) from a vetted sheet',
    description: 'Each row runs through the same path as the single-provider form in its own transaction. Returns a per-row report.',
  })
  bulkImportProviders(@Request() req, @Body() dto: BulkImportProvidersDto) {
    return this.adminService.bulkImportProviders(req.user, dto);
  }

  @Get('check-user/:mobileNumber')
  @ApiOperation({ summary: 'Check if a user exists by mobile number (for pre-flight validation)' })
  @ApiParam({ name: 'mobileNumber', description: '10-digit mobile number' })
  checkUser(@Param('mobileNumber') mobileNumber: string, @Request() req) {
    return this.adminService.adminCheckUser(req.user, mobileNumber);
  }

  @Post('otp/send')
  @ApiOperation({ summary: 'Admin-triggered OTP send for user/business number verification' })
  adminSendOtp(@Request() req, @Body() body: AdminSendOtpDto) {
    return this.adminService.adminSendOtp(req.user, body.mobileNumber, body.purpose);
  }

  @Post('otp/verify')
  @ApiOperation({ summary: 'Admin-triggered OTP verification' })
  adminVerifyOtp(@Request() req, @Body() body: AdminVerifyOtpDto & { purpose?: string }) {
    return this.adminService.adminVerifyOtp(req.user, body.mobileNumber, body.otp, body.purpose);
  }

  // ============================================
  // Provider Lifecycle (Disable / Enable / Delete)
  // ============================================

  @Patch('providers/:id/disable')
  @ApiOperation({ summary: 'Disable a provider (provider can re-enable)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  disableProvider(@Param('id') id: string, @Request() req) {
    return this.adminService.disableProvider(req.user, id);
  }

  @Patch('providers/:id/enable')
  @ApiOperation({ summary: 'Re-enable a disabled provider' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  enableProvider(@Param('id') id: string, @Request() req) {
    return this.adminService.enableProvider(req.user, id);
  }

  @Delete('providers/:id')
  @ApiOperation({ summary: 'Soft-delete a provider' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  softDeleteProvider(@Param('id') id: string, @Request() req) {
    return this.adminService.softDeleteProvider(req.user, id);
  }

  @Patch('providers/:id/feature')
  @ApiOperation({ summary: 'Toggle featured status of a provider' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiBody({ schema: { properties: { isFeatured: { type: 'boolean' } }, required: ['isFeatured'] } })
  toggleFeaturedProvider(@Param('id') id: string, @Request() req, @Body('isFeatured') isFeatured: boolean) {
    return this.adminService.toggleFeaturedProvider(req.user, id, isFeatured);
  }

  // ============================================
  // Women-Led Business Approval
  // ============================================

  @Get('providers/women-led/pending')
  @ApiOperation({ summary: 'Get providers with pending women-led approval' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getWomenLedPending(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getWomenLedPending(req.user, page, limit);
  }

  @Patch('providers/:id/women-led/approve')
  @ApiOperation({ summary: 'Approve women-led status for a provider' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  approveWomenLed(@Param('id') id: string, @Request() req) {
    return this.adminService.reviewWomenLedStatus(req.user, id, 'approved');
  }

  @Patch('providers/:id/women-led/reject')
  @ApiOperation({ summary: 'Reject women-led status for a provider' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  rejectWomenLed(@Param('id') id: string, @Request() req) {
    return this.adminService.reviewWomenLedStatus(req.user, id, 'rejected');
  }

  @Get('analytics/women-led')
  @ApiOperation({ summary: 'Get women-led business analytics and stats' })
  getWomenLedAnalytics(@Request() req) {
    return this.adminService.getWomenLedAnalytics(req.user);
  }

  // ============================================
  // User Lifecycle (Unsuspend / Delete)
  // ============================================

  @Patch('users/:id/unpause')
  @ApiOperation({ summary: 'Unpause a user (restores login, provider, chats)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  unpauseUser(@Param('id') id: string, @Request() req) {
    return this.adminService.unpauseUser(req.user, id);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Soft-delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  softDeleteUser(@Param('id') id: string, @Request() req) {
    return this.adminService.softDeleteUser(req.user, id);
  }

  // ============================================
  // Photo Moderation
  // ============================================

  @Get('photos')
  @ApiOperation({ summary: 'Paginated list of all photos for moderation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'provider | product | review' })
  getPhotos(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
  ) {
    return this.adminService.getPhotosForModeration(req.user, page, limit, type);
  }

  @Delete('photos/:id')
  @ApiOperation({ summary: 'Remove a photo (provider gallery photo)' })
  @ApiParam({ name: 'id', description: 'Photo ID' })
  @ApiQuery({ name: 'type', required: true, type: String, description: 'provider | product | review' })
  removePhoto(@Param('id') id: string, @Request() req, @Query('type') type: string) {
    return this.adminService.removePhoto(req.user, id, type);
  }

  // ============================================
  // Bulk Actions
  // ============================================

  @Post('providers/bulk-action')
  @ApiOperation({ summary: 'Bulk action on providers (approve, suspend, unsuspend, disable)' })
  @ApiBody({
    schema: {
      properties: {
        ids: { type: 'array', items: { type: 'string' } },
        action: { type: 'string', enum: ['approve', 'suspend', 'unsuspend', 'disable'] },
      },
      required: ['ids', 'action'],
    },
  })
  bulkProviderAction(
    @Request() req,
    @Body('ids') ids: string[],
    @Body('action') action: 'approve' | 'suspend' | 'unsuspend' | 'disable',
  ) {
    return this.adminService.bulkProviderAction(req.user, ids, action);
  }

  @Post('users/bulk-action')
  @ApiOperation({ summary: 'Bulk action on users (suspend, unsuspend)' })
  @ApiBody({
    schema: {
      properties: {
        ids: { type: 'array', items: { type: 'string' } },
        action: { type: 'string', enum: ['suspend', 'unsuspend'] },
      },
      required: ['ids', 'action'],
    },
  })
  bulkUserAction(
    @Request() req,
    @Body('ids') ids: string[],
    @Body('action') action: 'suspend' | 'unsuspend',
  ) {
    return this.adminService.bulkUserAction(req.user, ids, action);
  }

  @Post('products/bulk-action')
  @ApiOperation({ summary: 'Bulk action on products (activate, deactivate, delete)' })
  @ApiBody({
    schema: {
      properties: {
        ids: { type: 'array', items: { type: 'string' } },
        action: { type: 'string', enum: ['activate', 'deactivate', 'delete'] },
      },
      required: ['ids', 'action'],
    },
  })
  bulkProductAction(
    @Request() req,
    @Body('ids') ids: string[],
    @Body('action') action: 'activate' | 'deactivate' | 'delete',
  ) {
    return this.adminService.bulkProductAction(req.user, ids, action);
  }

  // ============================================
  // Offer Approval Workflow
  // ============================================

  @Get('offers/pending')
  @ApiOperation({ summary: 'List offers pending approval' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPendingOffers(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getPendingOffers(req.user, page, limit);
  }

  @Patch('offers/:id/approve')
  @ApiOperation({ summary: 'Approve an offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  approveOffer(@Param('id') id: string, @Request() req) {
    return this.adminService.approveOffer(req.user, id);
  }

  @Patch('offers/:id/reject')
  @ApiOperation({ summary: 'Reject an offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiBody({ schema: { properties: { adminNotes: { type: 'string' } } } })
  rejectOffer(@Param('id') id: string, @Request() req, @Body('adminNotes') adminNotes?: string) {
    return this.adminService.rejectOffer(req.user, id, adminNotes);
  }

  // ============================================
  // Feature Flags
  // ============================================

  @Get('feature-flags')
  @ApiOperation({ summary: 'Get all feature flags (settings in feature_flags group)' })
  getFeatureFlags(@Request() req) {
    return this.adminService.getFeatureFlags(req.user);
  }

  @Patch('feature-flags')
  @ApiOperation({ summary: 'Update feature flags in batch' })
  @ApiBody({
    schema: {
      properties: {
        flags: { type: 'array', items: { properties: { key: { type: 'string' }, value: { type: 'string' } } } },
      },
    },
  })
  updateFeatureFlags(@Request() req, @Body('flags') flags: { key: string; value: string }[]) {
    return this.adminService.updateFeatureFlags(req.user, flags);
  }

  // ============================================
  // CSV Export
  // ============================================

  @Get('export/:entity')
  @ApiOperation({ summary: 'Export entity data as CSV' })
  @ApiParam({ name: 'entity', description: 'Entity to export: users, providers, products, reviews, reports' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  exportData(
    @Param('entity') entity: string,
    @Request() req,
    @Query('status') status?: string,
    @Query('city') city?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.exportData(req.user, entity, { status, city, search });
  }

  // ============================================
  // Moderation Queue (Unified)
  // ============================================

  @Get('moderation/queue')
  @ApiOperation({ summary: 'Unified moderation queue with counts of all pending items' })
  getModerationQueue(@Request() req) {
    return this.adminService.getModerationQueue(req.user);
  }

  // ============================================
  // Serviceable Cities
  // ============================================

  @Get('serviceable-cities')
  @ApiOperation({ summary: 'Get all serviceable cities with request counts' })
  getServiceableCities(@Request() req) {
    return this.adminService.getServiceableCities(req.user);
  }

  @Patch('serviceable-cities/:id')
  @ApiOperation({ summary: 'Update a serviceable city status' })
  @ApiParam({ name: 'id', description: 'City ID' })
  @ApiBody({ schema: { properties: { status: { type: 'string', enum: ['active', 'coming_soon', 'disabled'] } } } })
  updateServiceableCity(
    @Param('id') id: string,
    @Request() req,
    @Body('status') status: 'active' | 'coming_soon' | 'disabled',
  ) {
    return this.adminService.updateServiceableCity(req.user, id, status);
  }

  @Get('city-requests/stats')
  @ApiOperation({ summary: 'Get aggregated city request stats' })
  getCityRequestStats(@Request() req) {
    return this.adminService.getCityRequestStats(req.user);
  }

  @Get('city-requests/insights')
  @ApiOperation({ summary: 'Get platform/device breakdown and recent city requests' })
  getCityRequestInsights(@Request() req) {
    return this.adminService.getCityRequestInsights(req.user);
  }
}
