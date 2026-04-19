import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';
import {
  SendOtpDto,
  VerifyOtpDto,
  GoogleSignInDto,
  RegisterWithPhoneDto,
  RegisterWithEmailDto,
  VerifyEmailOtpDto,
  CompleteProfileDto,
} from './dto/auth.dto';

// In-memory OTP store (replace with Redis in production)
const otpStore = new Map<string, { otp: string; expiresAt: Date }>();

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private supabaseAuth: SupabaseAuthService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    // ──── Input Validation ────
    if (!dto.mobileNumber) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Mobile number is required',
        required: ['mobileNumber'],
      });
    }

    const mobileNumber = dto.mobileNumber.trim();

    if (!mobileNumber) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Mobile number cannot be empty or whitespace only',
        field: 'mobileNumber',
      });
    }

    if (!/^\d{10}$/.test(mobileNumber)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Mobile number must be exactly 10 digits',
        field: 'mobileNumber',
        received_length: mobileNumber.length,
      });
    }

    // ──── Check if OTP was already sent recently ────
    const existingOtp = otpStore.get(mobileNumber);
    if (existingOtp && new Date() < existingOtp.expiresAt) {
      const remainingTime = Math.ceil((existingOtp.expiresAt.getTime() - Date.now()) / 1000);
      throw new BadRequestException({
        statusCode: 429,
        message: 'OTP already sent to this phone number',
        field: 'mobileNumber',
        retryAfterSeconds: remainingTime,
        detail: `Please wait ${Math.ceil(remainingTime / 60)} minutes before requesting a new OTP`,
        error_code: 'OTP_RATE_LIMITED',
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    otpStore.set(mobileNumber, { otp, expiresAt });

    // TODO: Integrate SMS provider (e.g., Twilio, MSG91)
    console.log(`[Login OTP] ${mobileNumber}: ${otp} (Expires: ${expiresAt.toISOString()})`);

    return { message: 'OTP sent successfully', data: { mobileNumber, expiresIn: '5 minutes' } };
  }

  async sendAdminOtp(dto: SendOtpDto) {
    // ──── Input Validation ────
    if (!dto.mobileNumber) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Mobile number is required',
        required: ['mobileNumber'],
      });
    }

    const mobileNumber = dto.mobileNumber.trim();

    if (!mobileNumber) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Mobile number cannot be empty or whitespace only',
        field: 'mobileNumber',
      });
    }

    // ──── Check if user exists and is admin ────
    const user = await this.prisma.user.findUnique({
      where: { mobileNumber },
    });

    if (!user) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'User not found',
        field: 'mobileNumber',
        detail: 'This mobile number is not registered in the system',
        error_code: 'USER_NOT_FOUND',
      });
    }

    if (user.role !== 'admin') {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Access denied',
        detail: 'This mobile number is not associated with an admin account',
        error_code: 'NOT_ADMIN',
      });
    }

    return this.sendOtp(dto);
  }

  async verifyOtp(dto: VerifyOtpDto) {
    // ──── Input Validation ────
    if (!dto.mobileNumber || !dto.otp) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Missing required fields',
        required: ['mobileNumber', 'otp'],
        provided: {
          mobileNumber: !!dto.mobileNumber,
          otp: !!dto.otp,
        },
      });
    }

    const mobileNumber = dto.mobileNumber.trim();
    const otp = dto.otp.trim();

    if (!mobileNumber || !otp) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Fields cannot be empty or whitespace only',
        fields: ['mobileNumber', 'otp'],
      });
    }

    if (!/^\d{10}$/.test(mobileNumber)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Mobile number must be exactly 10 digits',
        field: 'mobileNumber',
        received_length: mobileNumber.length,
      });
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'OTP must be exactly 6 digits',
        field: 'otp',
        received_length: otp.length,
        error_code: 'INVALID_OTP_FORMAT',
      });
    }

    // ──── Check OTP ────
    const record = otpStore.get(mobileNumber);

    if (!record) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'No OTP found for this phone number',
        field: 'mobileNumber',
        detail: 'Please request an OTP first',
        error_code: 'OTP_NOT_FOUND',
      });
    }

    if (new Date() > record.expiresAt) {
      otpStore.delete(mobileNumber);
      throw new BadRequestException({
        statusCode: 400,
        message: 'OTP has expired',
        field: 'otp',
        expired_at: record.expiresAt.toISOString(),
        detail: 'Please request a new OTP',
        error_code: 'OTP_EXPIRED',
      });
    }

    if (record.otp !== otp) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Invalid OTP',
        field: 'otp',
        detail: 'The OTP you provided is incorrect. Please try again.',
        error_code: 'INVALID_OTP',
      });
    }

    otpStore.delete(mobileNumber);

    // ──── Create or update user ────
    try {
      const supabaseId: string | null = await this.supabaseAuth.createOrUpdateUser(
        `${mobileNumber}@tijarahconnect.local`,
        mobileNumber,
      );

      // Upsert user in local database
      let user = await this.prisma.user.findUnique({
        where: { mobileNumber },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            mobileNumber,
            name: '',
            gender: 'other',
            supabaseId: supabaseId || undefined,
          } as any,
        });
      } else if (supabaseId && !user.supabaseId) {
        // Update existing user with Supabase ID if not already set
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { supabaseId },
        } as any);
      }

      const token = this.jwtService.sign({
        sub: user.id,
        mobile: user.mobileNumber,
      });

      return { accessToken: token, user };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication or database error';
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to complete OTP verification',
        detail: errorMessage,
        error_code: 'VERIFICATION_FAILED',
      });
    }
  }

  /**
   * Google SSO direct sign-in with email
   */
  async googleSignIn(dto: GoogleSignInDto) {
    if (!dto.email) {
      throw new BadRequestException('Email is required');
    }

    // Check if user exists by email or googleId
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          ...(dto.googleId ? [{ googleId: dto.googleId }] : []),
        ],
      },
    } as any);

    if (user) {
      // Update existing user with Google info if not already set
      if (!user.googleId && dto.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: dto.googleId,
            googleEmail: dto.email,
            googleName: dto.name,
            ssoProvider: 'google',
          } as any,
        });
      }
    } else {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name || '',
          googleId: dto.googleId,
          googleEmail: dto.email,
          googleName: dto.name,
          ssoProvider: 'google',
          gender: 'other',
        } as any,
      });
    }

    return this.generateAuthResponse(user);
  }

  /**
   * Generate JWT and return auth response
   */
  private generateAuthResponse(user: any) {
    const token = this.jwtService.sign({
      sub: user.id,
      mobile: user.mobileNumber,
      email: user.email,
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        email: user.email || null,
        name: user.name,
        role: user.role,
        ssoProvider: user.ssoProvider || null,
      },
    };
  }

  /**
   * Handle Supabase OAuth session
   * Called when frontend sends Supabase OAuth token
   * Verifies the token and creates/updates local user
   */
  async handleSupabaseOAuthSession(supabaseToken: string) {
    const { user: supabaseUser, error } = await this.supabaseAuth.verifySupabaseToken(supabaseToken);

    if (error || !supabaseUser) {
      throw new BadRequestException(`Invalid Supabase token: ${error}`);
    }

    // Find or create user in local database
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: supabaseUser.email },
          { supabaseId: supabaseUser.id },
        ],
      },
    } as any);

    if (user) {
      // Update existing user with Supabase info if not already set
      if (!user.supabaseId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            supabaseId: supabaseUser.id,
            ssoProvider: 'supabase',
          } as any,
        });
      }
    } else {
      // Create new user from Supabase OAuth
      user = await this.prisma.user.create({
        data: {
          email: supabaseUser.email || `${supabaseUser.id}@tijarahconnect.local`,
          name: '',
          supabaseId: supabaseUser.id,
          ssoProvider: 'supabase',
          gender: 'other',
        } as any,
      });
    }

    // Generate our own JWT for the local user
    return this.generateAuthResponse(user);
  }

  /**
   * Handle OAuth callback code exchange
   * Called when user is redirected back from OAuth provider (Google, GitHub, etc.)
   */
  async handleOAuthCallback(code: string) {
    if (!code) {
      throw new BadRequestException('OAuth code is required');
    }

    const { session, error } = await this.supabaseAuth.handleOAuthCallback(code);

    if (error || !session) {
      throw new BadRequestException(`OAuth callback failed: ${error}`);
    }

    const supabaseUserId = session.user.id;
    const { user: supabaseUser, error: validateError } = await this.supabaseAuth.validateOAuthUser(
      supabaseUserId,
    );

    if (validateError || !supabaseUser) {
      throw new BadRequestException(`Failed to validate OAuth user: ${validateError}`);
    }

    // Find or create user in local database
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: supabaseUser.email },
          { supabaseId: supabaseUser.id },
        ],
      },
    } as any);

    if (user) {
      // Update existing user with Supabase OAuth info
      if (!user.supabaseId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            supabaseId: supabaseUser.id,
            ssoProvider: supabaseUser.ssoProvider,
          } as any,
        });
      }
    } else {
      // Create new user from Supabase OAuth
      user = await this.prisma.user.create({
        data: {
          email: supabaseUser.email || `${supabaseUser.id}@tijarahconnect.local`,
          name: supabaseUser.user_metadata?.name || '',
          supabaseId: supabaseUser.id,
          ssoProvider: supabaseUser.ssoProvider,
          gender: 'other',
        } as any,
      });
    }

    // Generate our own JWT for the local user
    return this.generateAuthResponse(user);
  }

  /**
   * Get OAuth configuration for frontend
   * Returns necessary info for frontend to initiate OAuth
   */
  async getOAuthConfiguration() {
    return this.supabaseAuth.getOAuthConfig();
  }

  // ─────────────────────── REGISTRATION FLOW ────────────────────────

  /**
   * Step 1: Register with phone number
   * Initiates registration process and sends OTP to phone
   */
  async registerWithPhone(dto: RegisterWithPhoneDto) {
    // ──── Input Validation ────
    if (!dto.mobileNumber || !dto.name || !dto.gender) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Missing required fields',
        required: ['mobileNumber', 'name', 'gender'],
      });
    }

    const mobileNumber = dto.mobileNumber.trim();
    const name = dto.name.trim();

    if (!mobileNumber || !name) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Fields cannot be empty or whitespace only',
        fields: ['mobileNumber', 'name'],
      });
    }

    if (name.length < 2 || name.length > 100) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Name must be between 2 and 100 characters',
        field: 'name',
        current_length: name.length,
      });
    }

    if (!['male', 'female', 'other'].includes(dto.gender.toLowerCase())) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Gender must be one of: male, female, other',
        field: 'gender',
        allowedValues: ['male', 'female', 'other'],
        received: dto.gender,
      });
    }

    // ──── Check for Existing User in Local DB ────
    const existingUser = await this.prisma.user.findUnique({
      where: { mobileNumber },
    });

    if (existingUser) {
      throw new ConflictException({
        statusCode: 409,
        message: 'This mobile number is already registered',
        field: 'mobileNumber',
        detail: 'An account with this phone number already exists. Please login or use a different number.',
        error_code: 'PHONE_ALREADY_EXISTS',
      });
    }

    // ──── Check if OTP was already sent recently ────
    const existingOtp = otpStore.get(`reg_phone_${mobileNumber}`);
    if (existingOtp && new Date() < existingOtp.expiresAt) {
      const remainingTime = Math.ceil((existingOtp.expiresAt.getTime() - Date.now()) / 1000);
      throw new BadRequestException({
        statusCode: 429,
        message: 'OTP already sent to this phone number',
        field: 'mobileNumber',
        retryAfterSeconds: remainingTime,
        detail: `Please wait ${Math.ceil(remainingTime / 60)} minutes before requesting a new OTP`,
        error_code: 'OTP_RATE_LIMITED',
      });
    }

    // ──── Generate OTP ────
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP with registration data
    otpStore.set(`reg_phone_${mobileNumber}`, {
      otp,
      expiresAt,
      mobileNumber,
      name,
      gender: dto.gender.toLowerCase(),
    } as any);

    // TODO: Send SMS via provider (Twilio, MSG91, etc.)
    console.log(`[Phone Registration OTP] ${mobileNumber}: ${otp} (Expires: ${expiresAt.toISOString()})`);

    return {
      step: 'phone_verification',
      message: 'OTP sent to your phone. Please verify to complete registration.',
      data: {
        mobileNumber,
        expiresIn: '5 minutes',
      },
    };
  }

  /**
   * Step 2: Verify phone OTP and create user
   * Creates user after phone verification
   */
  async verifyPhoneAndRegister(dto: VerifyOtpDto) {
    // ──── Input Validation ────
    if (!dto.mobileNumber || !dto.otp) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Missing required fields',
        required: ['mobileNumber', 'otp'],
        provided: {
          mobileNumber: !!dto.mobileNumber,
          otp: !!dto.otp,
        },
      });
    }

    const mobileNumber = dto.mobileNumber.trim();
    const otp = dto.otp.trim();

    if (!mobileNumber || !otp) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Fields cannot be empty or whitespace only',
        fields: ['mobileNumber', 'otp'],
      });
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'OTP must be exactly 6 digits',
        field: 'otp',
        received_length: otp.length,
        error_code: 'INVALID_OTP_FORMAT',
      });
    }

    // ──── Check OTP ────
    const otpKey = `reg_phone_${mobileNumber}`;
    const record = otpStore.get(otpKey) as any;

    if (!record) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'No OTP found for this phone number',
        field: 'mobileNumber',
        detail: 'Please request a new OTP first',
        error_code: 'OTP_NOT_FOUND',
      });
    }

    if (new Date() > record.expiresAt) {
      otpStore.delete(otpKey);
      throw new BadRequestException({
        statusCode: 400,
        message: 'OTP has expired',
        field: 'otp',
        expired_at: record.expiresAt.toISOString(),
        detail: 'Please request a new OTP',
        error_code: 'OTP_EXPIRED',
      });
    }

    if (record.otp !== otp) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Invalid OTP',
        field: 'otp',
        detail: 'The OTP you provided is incorrect. Please try again.',
        error_code: 'INVALID_OTP',
      });
    }

    otpStore.delete(otpKey);

    // ──── Check if user already exists (might have been created by another request) ────
    const existingUser = await this.prisma.user.findUnique({
      where: { mobileNumber },
    });

    if (existingUser) {
      throw new ConflictException({
        statusCode: 409,
        message: 'User account already exists for this phone number',
        field: 'mobileNumber',
        detail: 'This phone number has already been registered',
        error_code: 'PHONE_ALREADY_REGISTERED',
        suggestion: 'Please login to your account',
      });
    }

    // ──── Prepare metadata for Supabase ────
    const metadata = {
      name: record.name,
      gender: record.gender,
      phone: mobileNumber,
      registration_source: 'phone_otp',
      created_at_local: new Date().toISOString(),
    };

    // ──── Create user in Supabase with metadata ────
    let supabaseId: string | null;
    try {
      supabaseId = await this.supabaseAuth.createOrUpdateUser(
        `${mobileNumber}@tijarahconnect.local`,
        mobileNumber,
        metadata,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication service error';
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to create user account',
        detail: errorMessage,
        error_code: 'SUPABASE_ERROR',
      });
    }

    // ──── Update Supabase user metadata ────
    if (supabaseId) {
      try {
        await this.supabaseAuth.updateUserMetadata(supabaseId, metadata);
      } catch (error) {
        console.error('Failed to update Supabase metadata:', error);
        // Don't fail the registration, just log the error
      }
    }

    // ──── Create user in local database ────
    let user: any;
    try {
      user = await this.prisma.user.create({
        data: {
          mobileNumber,
          name: record.name,
          gender: record.gender,
          supabaseId: supabaseId || undefined,
          status: 'active',
        } as any,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Database error';
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to create user account in database',
        detail: errorMessage,
        error_code: 'DATABASE_ERROR',
      });
    }

    // ──── Generate JWT ────
    const token = this.jwtService.sign({
      sub: user.id,
      mobile: user.mobileNumber,
    });

    return {
      step: 'profile_completion',
      message: 'Phone verified! Complete your profile.',
      accessToken: token,
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        name: user.name,
        gender: user.gender,
        role: user.role,
      },
    };
  }

  /**
   * Step 1: Register with email and password
   * Creates user account and sends verification OTP
   */
  async registerWithEmail(dto: RegisterWithEmailDto) {
    // ──── Input Validation ────
    if (!dto.email || !dto.name || !dto.password || !dto.gender) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Missing required fields',
        required: ['email', 'name', 'password', 'gender'],
      });
    }

    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    const password = dto.password.trim();

    if (!email || !name || !password) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Fields cannot be empty or whitespace only',
        fields: ['email', 'name', 'password'],
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Invalid email format',
        field: 'email',
        received: dto.email,
      });
    }

    if (name.length < 2 || name.length > 100) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Name must be between 2 and 100 characters',
        field: 'name',
        current_length: name.length,
      });
    }

    if (password.length < 8 || password.length > 100) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Password must be between 8 and 100 characters',
        field: 'password',
        current_length: password.length,
      });
    }

    if (!['male', 'female', 'other'].includes(dto.gender.toLowerCase())) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Gender must be one of: male, female, other',
        field: 'gender',
        allowedValues: ['male', 'female', 'other'],
        received: dto.gender,
      });
    }

    // ──── Check for Existing User in Local DB ────
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException({
        statusCode: 409,
        message: 'This email is already registered',
        field: 'email',
        detail: 'An account with this email already exists. Please login or use a different email.',
        error_code: 'EMAIL_ALREADY_EXISTS',
      });
    }

    // ──── Check if OTP was already sent recently ────
    const existingOtp = otpStore.get(`reg_email_${email}`);
    if (existingOtp && new Date() < existingOtp.expiresAt) {
      const remainingTime = Math.ceil((existingOtp.expiresAt.getTime() - Date.now()) / 1000);
      throw new BadRequestException({
        statusCode: 429,
        message: 'Verification OTP already sent to this email',
        field: 'email',
        retryAfterSeconds: remainingTime,
        detail: `Please wait ${Math.ceil(remainingTime / 60)} minutes before requesting a new OTP`,
        error_code: 'OTP_RATE_LIMITED',
      });
    }

    // ──── Generate verification OTP ────
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store OTP and email registration data
    otpStore.set(`reg_email_${email}`, { otp, expiresAt });

    // Store pending registration
    const pendingData: any = {
      email,
      name,
      password, // In production, hash this!
      gender: dto.gender.toLowerCase(),
      otp,
      expiresAt,
    };
    otpStore.set(`pending_reg_${email}`, pendingData);

    // TODO: Send email with OTP
    console.log(`[Email Registration OTP] ${email}: ${otp} (Expires: ${expiresAt.toISOString()})`);

    return {
      step: 'email_verification',
      message: 'Verification OTP sent to your email. Please verify to complete registration.',
      data: {
        email,
        expiresIn: '15 minutes',
      },
    };
  }

  /**
   * Step 2: Verify email OTP and create user
   */
  async verifyEmailAndRegister(dto: VerifyEmailOtpDto) {
    // ──── Input Validation ────
    if (!dto.email || !dto.otp) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Missing required fields',
        required: ['email', 'otp'],
        provided: {
          email: !!dto.email,
          otp: !!dto.otp,
        },
      });
    }

    const email = dto.email.trim().toLowerCase();
    const otp = dto.otp.trim();

    if (!email || !otp) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Fields cannot be empty or whitespace only',
        fields: ['email', 'otp'],
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Invalid email format',
        field: 'email',
        received: dto.email,
      });
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'OTP must be exactly 6 digits',
        field: 'otp',
        received_length: otp.length,
        error_code: 'INVALID_OTP_FORMAT',
      });
    }

    // ──── Check OTP and Pending Registration ────
    const otpKey = `reg_email_${email}`;
    const record = otpStore.get(otpKey);
    const pendingReg = otpStore.get(`pending_reg_${email}`) as any;

    if (!record || !pendingReg) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'No pending registration found for this email',
        field: 'email',
        detail: 'Please start registration again by requesting a verification OTP',
        error_code: 'NO_PENDING_REGISTRATION',
      });
    }

    if (new Date() > record.expiresAt) {
      otpStore.delete(otpKey);
      otpStore.delete(`pending_reg_${email}`);
      throw new BadRequestException({
        statusCode: 400,
        message: 'OTP has expired',
        field: 'otp',
        expired_at: record.expiresAt.toISOString(),
        detail: 'Please request a new verification OTP',
        error_code: 'OTP_EXPIRED',
      });
    }

    if (record.otp !== otp) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Invalid OTP',
        field: 'otp',
        detail: 'The OTP you provided is incorrect. Please try again.',
        error_code: 'INVALID_OTP',
      });
    }

    otpStore.delete(otpKey);
    otpStore.delete(`pending_reg_${email}`);

    // ──── Check if user already exists (might have been created by another request) ────
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException({
        statusCode: 409,
        message: 'User account already exists for this email',
        field: 'email',
        detail: 'This email address has already been registered',
        error_code: 'EMAIL_ALREADY_REGISTERED',
        suggestion: 'Please login to your account',
      });
    }

    // ──── Prepare metadata for Supabase ────
    const metadata = {
      name: pendingReg.name,
      gender: pendingReg.gender,
      email,
      registration_source: 'email',
      created_at_local: new Date().toISOString(),
    };

    // ──── Create user in Supabase with metadata ────
    let supabaseId: string | null;
    try {
      supabaseId = await this.supabaseAuth.createOrUpdateUser(email, undefined, metadata);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication service error';
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to create user account',
        detail: errorMessage,
        error_code: 'SUPABASE_ERROR',
      });
    }

    // ──── Update Supabase user metadata ────
    if (supabaseId) {
      try {
        await this.supabaseAuth.updateUserMetadata(supabaseId, metadata);
      } catch (error) {
        console.error('Failed to update Supabase metadata:', error);
        // Don't fail the registration, just log the error
      }
    }

    // ──── Create user in local database ────
    let user: any;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          name: pendingReg.name,
          gender: pendingReg.gender,
          supabaseId: supabaseId || undefined,
          status: 'active',
        } as any,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Database error';
      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to create user account in database',
        detail: errorMessage,
        error_code: 'DATABASE_ERROR',
      });
    }

    // ──── Generate JWT ────
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      step: 'profile_completion',
      message: 'Email verified! Complete your profile to finish registration.',
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        gender: user.gender,
        role: user.role,
      },
    };
  }

  /**
   * Step 3: Complete user profile
   * Updates user profile with additional information
   */
  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user profile
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        city: dto.city || user.city,
        area: dto.area || user.area,
        pincode: dto.pincode || user.pincode,
      },
    });

    return {
      step: 'registration_complete',
      message: 'Registration completed successfully!',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        mobileNumber: updatedUser.mobileNumber,
        name: updatedUser.name,
        gender: updatedUser.gender,
        city: updatedUser.city,
        area: updatedUser.area,
        pincode: updatedUser.pincode,
        role: updatedUser.role,
      },
    };
  }

  /**
   * Check if phone or email is available for registration
   */
  async checkAvailability(email?: string, phone?: string) {
    const checks = {};

    if (email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email },
      });
      checks['email'] = !emailExists;
    }

    if (phone) {
      const phoneExists = await this.prisma.user.findUnique({
        where: { mobileNumber: phone },
      });
      checks['phone'] = !phoneExists;
    }

    return {
      available: Object.values(checks).every(v => v),
      details: checks,
    };
  }
}
