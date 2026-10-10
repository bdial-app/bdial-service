import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query, BadRequestException, UseGuards, Request, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { SystemLogsService } from '../system-logs/system-logs.service';
import { Public } from '../common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import {
  SendOtpDto,
  VerifyOtpDto,
  GoogleSignInDto,
  SupabaseOAuthSessionDto,
  RegisterWithPhoneDto,
  RegisterWithEmailDto,
  VerifyEmailOtpDto,
  CompleteProfileDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
@Public()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly logs: SystemLogsService,
  ) {}

  /**
   * Sign-in attempts into the admin Logs — sent, signed in, or why it failed
   * — with the phone or email, so "I can't log in" can be looked up even when
   * no account exists yet.
   */
  private async track<T>(event: string, label: string, who: { mobile?: string; email?: string }, req: unknown, run: () => Promise<T>): Promise<T> {
    const base = { ...this.logs.fromRequest(req as never), source: 'server' as const, category: 'auth', details: { mobile: who.mobile, email: who.email } };
    const id = who.mobile ?? who.email ?? 'unknown';
    try {
      const result = await run();
      const user = (result as { user?: { id?: string } } | undefined)?.user;
      this.logs.record({ ...base, level: 'info', event: `${event}_ok`, message: `${label} — ${id}`, userId: user?.id ?? null });
      return result;
    } catch (err) {
      const e = err as { message?: string; getStatus?: () => number; response?: { message?: unknown } };
      const reason = Array.isArray(e.response?.message) ? (e.response?.message as string[]).join('; ') : String(e.response?.message ?? e.message ?? 'failed');
      this.logs.record({ ...base, level: 'warn', event: `${event}_failed`, message: `${label} failed — ${id}: ${reason}`, statusCode: e.getStatus?.() ?? 500 });
      throw err;
    }
  }

  @Post('send-otp')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to mobile number' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  sendOtp(@Body() dto: SendOtpDto, @Request() req) {
    return this.track('otp_send', 'Sign-in OTP sent', { mobile: dto.mobileNumber }, req, () => this.authService.sendOtp(dto));
  }

  @Post('admin/send-otp')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to admin mobile number' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  sendAdminOtp(@Body() dto: SendOtpDto, @Request() req) {
    return this.track('admin_otp_send', 'Admin OTP sent', { mobile: dto.mobileNumber }, req, () => this.authService.sendAdminOtp(dto));
  }

  @Post('verify-otp')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and get JWT token' })
  @ApiResponse({ status: 200, description: 'Returns JWT access token and user' })
  verifyOtp(@Body() dto: VerifyOtpDto, @Request() req) {
    return this.track('otp_verify', 'Signed in with OTP', { mobile: dto.mobileNumber }, req, () => this.authService.verifyOtp(dto));
  }

  // ─────────────────────── REGISTRATION FLOW ────────────────────────

  @Post('register/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to a mobile number for new-user registration' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  sendRegistrationOtp(@Body() dto: SendOtpDto, @Request() req) {
    return this.track('register_otp_send', 'Sign-up OTP sent', { mobile: dto.mobileNumber }, req, () => this.authService.sendRegistrationOtp(dto));
  }

  @Post('register/check-availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if email or phone is available' })
  @ApiResponse({ status: 200, description: 'Returns availability status' })
  async checkAvailability(@Query('email') email?: string, @Query('phone') phone?: string) {
    return this.authService.checkAvailability(email, phone);
  }

  @Post('register/phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register with phone number (Step 1)',
    description: 'Initiate registration with phone number. OTP will be sent.',
  })
  @ApiResponse({ status: 200, description: 'OTP sent to phone' })
  async registerWithPhone(@Body() dto: RegisterWithPhoneDto) {
    return this.authService.registerWithPhone(dto);
  }

  @Post('register/verify-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify phone OTP and create user (Step 2)',
    description: 'Verify OTP sent to phone and create user account',
  })
  @ApiResponse({
    status: 200,
    description: 'User created. Returns JWT token.',
  })
  async verifyPhoneAndRegister(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyPhoneAndRegister(dto);
  }

  @Post('register/email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Register with email and password (Step 1)',
    description: 'Initiate email registration. Verification OTP will be sent.',
  })
  @ApiResponse({ status: 201, description: 'Verification OTP sent to email' })
  async registerWithEmail(@Body() dto: RegisterWithEmailDto) {
    return this.authService.registerWithEmail(dto);
  }

  @Post('register/verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email OTP and create user (Step 2)',
    description: 'Verify OTP sent to email and create user account',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified. User created. Returns JWT token.',
  })
  async verifyEmailAndRegister(@Body() dto: VerifyEmailOtpDto) {
    return this.authService.verifyEmailAndRegister(dto);
  }

  @Post('register/complete-profile')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Complete user profile (Step 3)',
    description: 'Add location and other optional details to complete registration',
  })
  @ApiResponse({ status: 200, description: 'Profile completed' })
  async completeProfile(@Request() req, @Body() dto: CompleteProfileDto) {
    return this.authService.completeProfile(req.user.id, dto);
  }

  // ─────────────────────── GOOGLE SSO ────────────────────────

  @Post('google/signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Direct Google SSO sign-in with email' })
  @ApiResponse({
    status: 200,
    description: 'Returns JWT token and user data after Google authentication',
  })
  async googleSignIn(@Body() dto: GoogleSignInDto, @Request() req) {
    return this.track('google_signin', 'Signed in with Google', { email: dto.email }, req, async () => {
      if (!dto.email) {
        throw new BadRequestException('email is required');
      }
      return this.authService.googleSignIn(dto);
    });
  }

  // ─────────────────────── SUPABASE OAUTH ────────────────────────

  @Post('supabase/oauth/session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange Supabase OAuth token for local JWT',
    description:
      'Called after Supabase OAuth redirect. Frontend sends the OAuth token received from Supabase.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns local JWT token and user data',
  })
  async handleSupabaseOAuthSession(@Body() dto: SupabaseOAuthSessionDto) {
    if (!dto.accessToken) {
      throw new BadRequestException('accessToken is required');
    }
    return this.authService.handleSupabaseOAuthSession(dto.accessToken);
  }

  @Post('oauth/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle OAuth provider callback',
    description:
      'Exchanges OAuth code for session. Called by Supabase after user authorizes with Google/other providers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns local JWT token and user data',
  })
  async handleOAuthCallback(@Query('code') code: string) {
    if (!code) {
      throw new BadRequestException('OAuth code is required in query parameter');
    }
    return this.authService.handleOAuthCallback(code);
  }

  @Get('supabase/oauth/url')
  @ApiOperation({
    summary: 'Get Supabase OAuth authorization URL',
    description: 'Returns the URL to redirect user to for Supabase OAuth',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns Supabase OAuth URL for frontend redirect',
  })
  async getSupabaseOAuthUrl(@Query('redirectUrl') redirectUrl: string) {
    if (!redirectUrl) {
      throw new BadRequestException('redirectUrl query parameter is required');
    }
    // Frontend should use Supabase client directly for OAuth
    // This endpoint provides guidance
    return {
      message:
        'Use Supabase client library on frontend to initiate OAuth. Backend handles token verification.',
      oauthRedirectUrl: this.config.get<string>('SUPABASE_OAUTH_REDIRECT_URL'),
      successRedirectUrl: this.config.get<string>('OAUTH_SUCCESS_REDIRECT_URL'),
    };
  }

  @Get('oauth/config')
  @ApiOperation({
    summary: 'Get OAuth configuration',
    description: 'Returns OAuth configuration needed by frontend',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns OAuth configuration',
  })
  async getOAuthConfig() {
    return this.authService.getOAuthConfiguration();
  }

  // ─────────────────────── TOKEN REFRESH ────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Refresh JWT token',
    description: 'Exchange a valid (non-expired) JWT for a fresh token with renewed expiry. Call this proactively before token expiry to keep users signed in.',
  })
  @ApiResponse({ status: 200, description: 'Returns a new access token' })
  async refreshToken(@Request() req) {
    return this.authService.refreshToken(req.user.id);
  }
}
