import { Controller, Post, Get, Patch, Body, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { VerificationsService } from './verifications.service';
import { CreateVerificationDto } from './dto/verification.dto';

@ApiTags('Verifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('verifications')
export class VerificationsController {
  constructor(private readonly verService: VerificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit or update verification documents' })
  submit(@Request() req, @Body() dto: CreateVerificationDto) {
    return this.verService.submit(req.user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my verification status (without doc URLs)' })
  getMe(@Request() req) {
    return this.verService.getMyVerification(req.user.id);
  }

  @Get('status-check/:userId')
  @ApiOperation({ summary: 'Check verification status by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID to check' })
  async getStatus(@Param('userId') userId: string) {
    const status = await this.verService.getVerificationStatus(userId);
    return { status };
  }

  @Patch('aadhaar-status/:userId')
  @ApiOperation({ summary: 'Update Aadhaar card document status' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async updateAadhaarStatus(
    @Param('userId') userId: string,
    @Body('status') status: string,
  ) {
    return this.verService.updateAadhaarStatus(userId, status);
  }
}
