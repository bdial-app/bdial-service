import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';

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

  @Patch('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend a user' })
  suspendUser(@Param('id') id: string, @Request() req) {
    return this.adminService.suspendUser(req.user, id);
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
  getUsers(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('city') city?: string,
  ) {
    return this.adminService.getUsers(req.user, page, limit, search, status, role, city);
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

  // ============================================
  // Products Management
  // ============================================

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
  createBanner(@Request() req, @Body() body: any) {
    return this.adminService.createBanner(req.user, body);
  }

  @Patch('banners/:id')
  @ApiOperation({ summary: 'Update a banner' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  updateBanner(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.adminService.updateBanner(req.user, id, body);
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
  // ============================================

  @Get('sponsorships')
  @ApiOperation({ summary: 'List all sponsored listings' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  getSponsoredListings(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: string,
    @Query('type') type?: string,
  ) {
    return this.adminService.getSponsoredListings(req.user, page, limit, isActive, type);
  }

  @Get('sponsorships/stats')
  @ApiOperation({ summary: 'Sponsored listings stats' })
  getSponsoredStats(@Request() req) {
    return this.adminService.getSponsoredStats(req.user);
  }

  @Get('sponsorships/:id')
  @ApiOperation({ summary: 'Get sponsored listing detail' })
  @ApiParam({ name: 'id', description: 'Sponsored listing ID' })
  getSponsored(@Param('id') id: string, @Request() req) {
    return this.adminService.getSponsoredById(req.user, id);
  }

  @Patch('sponsorships/:id')
  @ApiOperation({ summary: 'Update a sponsored listing' })
  @ApiParam({ name: 'id', description: 'Sponsored listing ID' })
  updateSponsored(@Param('id') id: string, @Request() req, @Body() body: any) {
    return this.adminService.updateSponsored(req.user, id, body);
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
}
