import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';
import { OtpService } from '../otp/otp.service';
import {
  SendOtpDto,
  VerifyOtpDto,
  GoogleSignInDto,
  RegisterWithPhoneDto,
  RegisterWithEmailDto,
  VerifyEmailOtpDto,
  CompleteProfileDto,
} from './dto/auth.dto';

const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60s cooldown between resends

/** In-memory store for email OTPs and pending registrations (dev/non-SMS flows) */
const emailOtpStore = new Map<string, { otp: string; expiresAt: Date; sentAt: Date }>();
const pendingRegStore = new Map<string, { email: string; name: string; password: string; gender: string; otp: string; expiresAt: Date }>();

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
    private supabaseAuth: SupabaseAuthService,
    private otpService: OtpService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    if (!dto.mobileNumber) {
      throw new BadRequestException({ statusCode: 400, message: 'Mobile number is required', required: ['mobileNumber'] });
    }
    const mobileNumber = dto.mobileNumber.trim();
    if (!mobileNumber) {
      throw new BadRequestException({ statusCode: 400, message: 'Mobile number cannot be empty or whitespace only', field: 'mobileNumber' });
    }
    if (!/^\d{10}$/.test(mobileNumber)) {
      throw new BadRequestException({ statusCode: 400, message: 'Mobile number must be exactly 10 digits', field: 'mobileNumber', received_length: mobileNumber.length });
    }

    // Check if user exists — new users go straight to registration
    const existingUser = await this.userRepo.findOneBy({ mobileNumber });
    if (!existingUser) {
      return { userExists: false, message: 'User not found. Please register.', data: { mobileNumber } };
    }

    const result = await this.otpService.sendOtpWithKey(`login_${mobileNumber}`, mobileNumber);
    return { userExists: true, message: 'OTP sent successfully', data: { mobileNumber, expiresIn: result.expiresIn, ...(result.otp ? { otp: result.otp } : {}) } };
  }

  // Send OTP for new-user registration (no user-existence check)
  async sendRegistrationOtp(dto: SendOtpDto) {
    if (!dto.mobileNumber) {
      throw new BadRequestException({ statusCode: 400, message: 'Mobile number is required', required: ['mobileNumber'] });
    }
    const mobileNumber = dto.mobileNumber.trim();
    if (!mobileNumber) {
      throw new BadRequestException({ statusCode: 400, message: 'Mobile number cannot be empty or whitespace only', field: 'mobileNumber' });
    }
    if (!/^\d{10}$/.test(mobileNumber)) {
      throw new BadRequestException({ statusCode: 400, message: 'Mobile number must be exactly 10 digits', field: 'mobileNumber', received_length: mobileNumber.length });
    }

    const result = await this.otpService.sendOtpWithKey(`login_${mobileNumber}`, mobileNumber);
    return { message: 'OTP sent successfully', data: { mobileNumber, expiresIn: result.expiresIn, ...(result.otp ? { otp: result.otp } : {}) } };
  }

  async sendAdminOtp(dto: SendOtpDto) {
    if (!dto.mobileNumber) {
      throw new BadRequestException({ statusCode: 400, message: 'Mobile number is required', required: ['mobileNumber'] });
    }
    const mobileNumber = dto.mobileNumber.trim();
    if (!mobileNumber) {
      throw new BadRequestException({ statusCode: 400, message: 'Mobile number cannot be empty or whitespace only', field: 'mobileNumber' });
    }
    const user = await this.userRepo.findOneBy({ mobileNumber });
    if (!user) {
      throw new NotFoundException({ statusCode: 404, message: 'User not found', field: 'mobileNumber', error_code: 'USER_NOT_FOUND' });
    }
    if (user.role !== 'admin') {
      throw new ForbiddenException({ statusCode: 403, message: 'Access denied', error_code: 'NOT_ADMIN' });
    }
    return this.sendOtp(dto);
  }

  async verifyOtp(dto: VerifyOtpDto) {
    if (!dto.mobileNumber || !dto.otp) {
      throw new BadRequestException({ statusCode: 400, message: 'Missing required fields', required: ['mobileNumber', 'otp'] });
    }
    const mobileNumber = dto.mobileNumber.trim();
    const otp = dto.otp.trim();
    if (!mobileNumber || !otp) {
      throw new BadRequestException({ statusCode: 400, message: 'Fields cannot be empty or whitespace only' });
    }
    if (!/^\d{10}$/.test(mobileNumber)) {
      throw new BadRequestException({ statusCode: 400, message: 'Mobile number must be exactly 10 digits', field: 'mobileNumber' });
    }
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      throw new BadRequestException({ statusCode: 400, message: 'OTP must be exactly 6 digits', field: 'otp', error_code: 'INVALID_OTP_FORMAT' });
    }

    // Verify via OtpService (dev: in-memory, prod: MSG91)
    await this.otpService.verifyOtpWithKey(`login_${mobileNumber}`, mobileNumber, otp);

    try {
      const supabaseId: string | null = await this.supabaseAuth.createOrUpdateUser(
        `${mobileNumber}@tijarahconnect.local`, mobileNumber,
      );

      let user = await this.userRepo.findOneBy({ mobileNumber });
      if (!user) {
        user = this.userRepo.create({ mobileNumber, name: '', gender: 'other', supabaseId: supabaseId || undefined });
        user = await this.userRepo.save(user);
      } else if (supabaseId && !user.supabaseId) {
        user.supabaseId = supabaseId;
        user = await this.userRepo.save(user);
      }

      const token = this.jwtService.sign({ sub: user.id, mobile: user.mobileNumber });
      return { accessToken: token, user };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const errorMessage = error instanceof Error ? error.message : 'Authentication or database error';
      throw new BadRequestException({ statusCode: 400, message: 'Failed to complete OTP verification', detail: errorMessage, error_code: 'VERIFICATION_FAILED' });
    }
  }

  async googleSignIn(dto: GoogleSignInDto) {
    if (!dto.email) throw new BadRequestException('Email is required');

    let user = await this.userRepo.findOne({
      where: [{ email: dto.email }, ...(dto.googleId ? [{ googleId: dto.googleId }] : [])],
    });

    if (user) {
      if (!user.googleId && dto.googleId) {
        user.googleId = dto.googleId;
        user.googleEmail = dto.email;
        user.googleName = dto.name ?? null;
        user.ssoProvider = 'google';
        user = await this.userRepo.save(user);
      }
    } else {
      user = this.userRepo.create({
        email: dto.email, name: dto.name || '', googleId: dto.googleId,
        googleEmail: dto.email, googleName: dto.name, ssoProvider: 'google', gender: 'other',
      });
      user = await this.userRepo.save(user);
    }
    return this.generateAuthResponse(user);
  }

  private generateAuthResponse(user: any) {
    const token = this.jwtService.sign({ sub: user.id, mobile: user.mobileNumber, email: user.email });
    return {
      accessToken: token,
      user: { id: user.id, mobileNumber: user.mobileNumber, email: user.email || null, name: user.name, role: user.role, ssoProvider: user.ssoProvider || null },
    };
  }

  async handleSupabaseOAuthSession(supabaseToken: string) {
    const { user: supabaseUser, error } = await this.supabaseAuth.verifySupabaseToken(supabaseToken);
    if (error || !supabaseUser) throw new BadRequestException(`Invalid Supabase token: ${error}`);

    let user = await this.userRepo.findOne({
      where: [{ email: supabaseUser.email }, { supabaseId: supabaseUser.id }],
    });

    if (user) {
      if (!user.supabaseId) {
        user.supabaseId = supabaseUser.id;
        user.ssoProvider = 'supabase';
        user = await this.userRepo.save(user);
      }
    } else {
      user = this.userRepo.create({
        email: supabaseUser.email || `${supabaseUser.id}@tijarahconnect.local`,
        name: '', supabaseId: supabaseUser.id, ssoProvider: 'supabase', gender: 'other',
      });
      user = await this.userRepo.save(user);
    }
    return this.generateAuthResponse(user);
  }

  async handleOAuthCallback(code: string) {
    if (!code) throw new BadRequestException('OAuth code is required');
    const { session, error } = await this.supabaseAuth.handleOAuthCallback(code);
    if (error || !session) throw new BadRequestException(`OAuth callback failed: ${error}`);

    const supabaseUserId = session.user.id;
    const { user: supabaseUser, error: validateError } = await this.supabaseAuth.validateOAuthUser(supabaseUserId);
    if (validateError || !supabaseUser) throw new BadRequestException(`Failed to validate OAuth user: ${validateError}`);

    let user = await this.userRepo.findOne({
      where: [{ email: supabaseUser.email }, { supabaseId: supabaseUser.id }],
    });

    if (user) {
      if (!user.supabaseId) {
        user.supabaseId = supabaseUser.id;
        user.ssoProvider = supabaseUser.ssoProvider;
        user = await this.userRepo.save(user);
      }
    } else {
      user = this.userRepo.create({
        email: supabaseUser.email || `${supabaseUser.id}@tijarahconnect.local`,
        name: supabaseUser.user_metadata?.name || '',
        supabaseId: supabaseUser.id, ssoProvider: supabaseUser.ssoProvider, gender: 'other',
      });
      user = await this.userRepo.save(user);
    }
    return this.generateAuthResponse(user);
  }

  async getOAuthConfiguration() {
    return this.supabaseAuth.getOAuthConfig();
  }

  async registerWithPhone(dto: RegisterWithPhoneDto) {
    if (!dto.mobileNumber || !dto.name || !dto.gender) {
      throw new BadRequestException({ statusCode: 400, message: 'Missing required fields', required: ['mobileNumber', 'name', 'gender'] });
    }
    const mobileNumber = dto.mobileNumber.trim();
    const name = dto.name.trim();
    if (!mobileNumber || !name) {
      throw new BadRequestException({ statusCode: 400, message: 'Fields cannot be empty or whitespace only' });
    }
    if (name.length < 2 || name.length > 100) {
      throw new BadRequestException({ statusCode: 400, message: 'Name must be between 2 and 100 characters', field: 'name' });
    }
    if (!['male', 'female', 'other'].includes(dto.gender.toLowerCase())) {
      throw new BadRequestException({ statusCode: 400, message: 'Gender must be one of: male, female, other', field: 'gender' });
    }

    const existingUser = await this.userRepo.findOneBy({ mobileNumber });
    if (existingUser) {
      throw new ConflictException({ statusCode: 409, message: 'This mobile number is already registered', error_code: 'PHONE_ALREADY_EXISTS' });
    }

    const metadata = { name, gender: dto.gender.toLowerCase(), phone: mobileNumber };
    const result = await this.otpService.sendOtpWithKey(`reg_phone_${mobileNumber}`, mobileNumber, metadata);

    return { step: 'phone_verification', message: 'OTP sent to your phone. Please verify to complete registration.', data: { mobileNumber, expiresIn: result.expiresIn, ...(result.otp ? { otp: result.otp } : {}) } };
  }

  async verifyPhoneAndRegister(dto: VerifyOtpDto) {
    if (!dto.mobileNumber || !dto.otp) {
      throw new BadRequestException({ statusCode: 400, message: 'Missing required fields', required: ['mobileNumber', 'otp'] });
    }
    const mobileNumber = dto.mobileNumber.trim();
    const otp = dto.otp.trim();
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      throw new BadRequestException({ statusCode: 400, message: 'OTP must be exactly 6 digits', error_code: 'INVALID_OTP_FORMAT' });
    }

    const otpKey = `reg_phone_${mobileNumber}`;

    // Get stored metadata (dev mode only — in prod, metadata is stored separately before OTP send)
    const devMetadata = this.otpService.getDevMetadata(otpKey);

    // Verify OTP (dev: in-memory, prod: MSG91)
    await this.otpService.verifyOtpWithKey(otpKey, mobileNumber, otp);

    const existingUser = await this.userRepo.findOneBy({ mobileNumber });
    if (existingUser) {
      throw new ConflictException({ statusCode: 409, message: 'User account already exists', error_code: 'PHONE_ALREADY_REGISTERED' });
    }

    const regName = devMetadata?.name || dto.mobileNumber;
    const regGender = devMetadata?.gender || 'other';

    const metadata = { name: regName, gender: regGender, phone: mobileNumber, registration_source: 'phone_otp' };
    let supabaseId: string | null;
    try {
      supabaseId = await this.supabaseAuth.createOrUpdateUser(`${mobileNumber}@tijarahconnect.local`, mobileNumber, metadata);
    } catch (error) {
      throw new BadRequestException({ statusCode: 400, message: 'Failed to create user account', error_code: 'SUPABASE_ERROR' });
    }

    if (supabaseId) {
      try { await this.supabaseAuth.updateUserMetadata(supabaseId, metadata); } catch (e) { console.error('Failed to update Supabase metadata:', e); }
    }

    let user: User;
    try {
      user = this.userRepo.create({ mobileNumber, name: regName, gender: regGender, supabaseId: supabaseId || undefined, status: 'active' });
      user = await this.userRepo.save(user);
    } catch (error) {
      throw new BadRequestException({ statusCode: 400, message: 'Failed to create user account in database', error_code: 'DATABASE_ERROR' });
    }

    const token = this.jwtService.sign({ sub: user.id, mobile: user.mobileNumber });
    return {
      step: 'profile_completion', message: 'Phone verified! Complete your profile.', accessToken: token,
      user: { id: user.id, mobileNumber: user.mobileNumber, name: user.name, gender: user.gender, role: user.role },
    };
  }

  async registerWithEmail(dto: RegisterWithEmailDto) {
    if (!dto.email || !dto.name || !dto.password || !dto.gender) {
      throw new BadRequestException({ statusCode: 400, message: 'Missing required fields', required: ['email', 'name', 'password', 'gender'] });
    }
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    const password = dto.password.trim();
    if (!email || !name || !password) {
      throw new BadRequestException({ statusCode: 400, message: 'Fields cannot be empty' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new BadRequestException({ statusCode: 400, message: 'Invalid email format', field: 'email' });
    if (name.length < 2 || name.length > 100) throw new BadRequestException({ statusCode: 400, message: 'Name must be between 2 and 100 characters', field: 'name' });
    if (password.length < 8 || password.length > 100) throw new BadRequestException({ statusCode: 400, message: 'Password must be between 8 and 100 characters', field: 'password' });
    if (!['male', 'female', 'other'].includes(dto.gender.toLowerCase())) throw new BadRequestException({ statusCode: 400, message: 'Gender must be one of: male, female, other', field: 'gender' });

    const existingUser = await this.userRepo.findOneBy({ email });
    if (existingUser) throw new ConflictException({ statusCode: 409, message: 'This email is already registered', error_code: 'EMAIL_ALREADY_EXISTS' });

    const existingOtp = emailOtpStore.get(email);
    if (existingOtp && new Date() < existingOtp.expiresAt) {
      const timeSinceSent = Date.now() - existingOtp.sentAt.getTime();
      if (timeSinceSent < OTP_RESEND_COOLDOWN_MS) {
        const remainingCooldown = Math.ceil((OTP_RESEND_COOLDOWN_MS - timeSinceSent) / 1000);
        throw new BadRequestException({ statusCode: 429, message: 'OTP recently sent. Please wait before resending.', retryAfterSeconds: remainingCooldown, error_code: 'OTP_RATE_LIMITED' });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    emailOtpStore.set(email, { otp, expiresAt, sentAt: new Date() });
    pendingRegStore.set(email, { email, name, password, gender: dto.gender.toLowerCase(), otp, expiresAt });
    console.log(`[Email Registration OTP] ${email}: ${otp}`);

    return { step: 'email_verification', message: 'Verification OTP sent to your email.', data: { email, expiresIn: '15 minutes' } };
  }

  async verifyEmailAndRegister(dto: VerifyEmailOtpDto) {
    if (!dto.email || !dto.otp) throw new BadRequestException({ statusCode: 400, message: 'Missing required fields', required: ['email', 'otp'] });
    const email = dto.email.trim().toLowerCase();
    const otp = dto.otp.trim();
    if (!email || !otp) throw new BadRequestException({ statusCode: 400, message: 'Fields cannot be empty' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new BadRequestException({ statusCode: 400, message: 'Invalid email format', field: 'email' });
    if (otp.length !== 6 || !/^\d+$/.test(otp)) throw new BadRequestException({ statusCode: 400, message: 'OTP must be exactly 6 digits', error_code: 'INVALID_OTP_FORMAT' });

    const record = emailOtpStore.get(email);
    const pendingReg = pendingRegStore.get(email);
    if (!record || !pendingReg) throw new BadRequestException({ statusCode: 400, message: 'No pending registration found', error_code: 'NO_PENDING_REGISTRATION' });
    if (new Date() > record.expiresAt) { emailOtpStore.delete(email); pendingRegStore.delete(email); throw new BadRequestException({ statusCode: 400, message: 'OTP has expired', error_code: 'OTP_EXPIRED' }); }
    if (record.otp !== otp) throw new BadRequestException({ statusCode: 400, message: 'Invalid OTP', error_code: 'INVALID_OTP' });
    emailOtpStore.delete(email);
    pendingRegStore.delete(email);

    const existingUser = await this.userRepo.findOneBy({ email });
    if (existingUser) throw new ConflictException({ statusCode: 409, message: 'User already exists', error_code: 'EMAIL_ALREADY_REGISTERED' });

    const metadata = { name: pendingReg.name, gender: pendingReg.gender, email, registration_source: 'email' };
    let supabaseId: string | null;
    try {
      supabaseId = await this.supabaseAuth.createOrUpdateUser(email, undefined, metadata);
    } catch (error) {
      throw new BadRequestException({ statusCode: 400, message: 'Failed to create user account', error_code: 'SUPABASE_ERROR' });
    }
    if (supabaseId) { try { await this.supabaseAuth.updateUserMetadata(supabaseId, metadata); } catch (e) { console.error('Failed to update metadata:', e); } }

    let user: User;
    try {
      user = this.userRepo.create({ email, name: pendingReg.name, gender: pendingReg.gender, supabaseId: supabaseId || undefined, status: 'active' });
      user = await this.userRepo.save(user);
    } catch (error) {
      throw new BadRequestException({ statusCode: 400, message: 'Failed to create user in database', error_code: 'DATABASE_ERROR' });
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return {
      step: 'profile_completion', message: 'Email verified! Complete your profile.', accessToken: token,
      user: { id: user.id, email: user.email, name: user.name, gender: user.gender, role: user.role },
    };
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    if (dto.city) user.city = dto.city;
    if (dto.area) user.area = dto.area;
    if (dto.pincode) user.pincode = dto.pincode;
    const updatedUser = await this.userRepo.save(user);
    return {
      step: 'registration_complete', message: 'Registration completed successfully!',
      user: { id: updatedUser.id, email: updatedUser.email, mobileNumber: updatedUser.mobileNumber, name: updatedUser.name, gender: updatedUser.gender, city: updatedUser.city, area: updatedUser.area, pincode: updatedUser.pincode, role: updatedUser.role },
    };
  }

  async checkAvailability(email?: string, phone?: string) {
    const checks: any = {};
    if (email) { const exists = await this.userRepo.findOneBy({ email }); checks['email'] = !exists; }
    if (phone) { const exists = await this.userRepo.findOneBy({ mobileNumber: phone }); checks['phone'] = !exists; }
    return { available: Object.values(checks).every((v) => v), details: checks };
  }
}
