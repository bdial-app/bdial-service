import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
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

  @Get('listings/pending')
  @ApiOperation({ summary: 'Get all pending listings' })
  getPendingListings(@Request() req) {
    return this.adminService.getPendingListings(req.user);
  }

  @Patch('listings/:id/approve')
  @ApiOperation({ summary: 'Approve a listing' })
  approveListing(@Param('id') id: string, @Request() req) {
    return this.adminService.approveListing(req.user, id);
  }

  @Patch('listings/:id/reject')
  @ApiOperation({ summary: 'Reject a listing with a note' })
  @ApiBody({ schema: { properties: { note: { type: 'string' } } } })
  rejectListing(@Param('id') id: string, @Request() req, @Body('note') note: string) {
    return this.adminService.rejectListing(req.user, id, note);
  }

  @Get('verifications')
  @ApiOperation({ summary: 'Get all pending verification submissions' })
  getVerifications(@Request() req) {
    return this.adminService.getVerifications(req.user);
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
}
