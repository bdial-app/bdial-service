import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
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

  @Patch('providers/:id/reject')
  @ApiOperation({ summary: 'Reject a provider with a note' })
  @ApiBody({ schema: { properties: { note: { type: 'string' } } } })
  rejectProvider(@Param('id') id: string, @Request() req, @Body('note') note: string) {
    return this.adminService.rejectProvider(req.user, id, note);
  }

  //get all verifications by pagination
  @Get('verifications')
  @ApiOperation({ summary: 'Get all pending verification submissions with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'rows', required: false, type: Number, description: 'Number of rows per page (default: 10)' })
  getVerifications(
    @Request() req,
    @Query('page') page?: number,
    @Query('rows') rows?: number,
  ) {
    return this.adminService.getVerifications(req.user, page, rows);
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
}
