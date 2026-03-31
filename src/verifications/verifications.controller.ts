import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
}
