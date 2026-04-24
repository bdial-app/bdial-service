import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { SendAdminOtpDto, VerifyAdminOtpDto } from './dto/admin-auth.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Admin Auth')
@Controller('admin-auth')
@Public()
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to admin mobile number' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully to admin' })
  @ApiResponse({ status: 404, description: 'User not found or not an admin' })
  sendOtp(@Body() dto: SendAdminOtpDto) {
    return this.adminAuthService.sendOtp(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify admin OTP and get JWT token' })
  @ApiResponse({ status: 200, description: 'Returns JWT access token and admin user' })
  @ApiResponse({ status: 401, description: 'Invalid OTP or credentials' })
  verifyOtp(@Body() dto: VerifyAdminOtpDto) {
    return this.adminAuthService.verifyOtp(dto);
  }
}
