import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseAuthService } from '../supabase/supabase-auth.service';

interface OtpRecord {
  otp: string;
  expiresAt: Date;
  sentAt: Date;
  metadata?: Record<string, any>;
}

export interface SendOtpResult {
  success: boolean;
  message: string;
  /** Only populated in development mode for testing */
  otp?: string;
  expiresIn: string;
}

export interface VerifyOtpResult {
  valid: boolean;
  message: string;
  /** Supabase user ID — available in production after successful verification */
  supabaseUserId?: string;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly isDevelopment: boolean;
  private readonly countryCode: string;
  private readonly otpExpiryMs: number;
  private readonly resendCooldownMs: number;

  /** In-memory store used ONLY in development mode */
  private readonly devOtpStore = new Map<string, OtpRecord>();

  constructor(
    private readonly config: ConfigService,
    private readonly supabaseAuth: SupabaseAuthService,
  ) {
    this.isDevelopment = config.get<string>('NODE_ENV', 'development') === 'development';
    this.countryCode = config.get<string>('SMS_COUNTRY_CODE', '+91');
    this.otpExpiryMs = 5 * 60 * 1000; // 5 minutes
    this.resendCooldownMs = 60 * 1000; // 60 seconds

    if (!this.isDevelopment) {
      if (!this.supabaseAuth.isConfigured()) {
        this.logger.error(
          'Supabase is not configured. Cannot start in production without OTP provider. ' +
          'Ensure SUPABASE_URL, SUPABASE_ANON_KEY are set, and Twilio is configured in Supabase dashboard.',
        );
        throw new Error('Supabase Phone Auth configuration is incomplete for production.');
      }
      this.logger.log('Supabase Phone Auth initialized for production OTP delivery (Twilio via Supabase)');
    } else {
      this.logger.log('Development mode: OTP will be generated locally (no SMS sent)');
    }
  }

  /**
   * Send an OTP to the given phone number.
   * @param phoneNumber - 10-digit phone number (without country code)
   * @param channel - 'sms' or 'whatsapp' (default: 'sms')
   */
  async sendOtp(phoneNumber: string): Promise<SendOtpResult> {
    const phone = phoneNumber.trim();
    if (!/^\d{10}$/.test(phone)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Mobile number must be exactly 10 digits',
        field: 'mobileNumber',
      });
    }

    if (this.isDevelopment) {
      return this.sendOtpDev(phone);
    }
    return this.sendOtpSupabase(phone);
  }

  /**
   * Verify an OTP for the given phone number.
   */
  async verifyOtp(phoneNumber: string, code: string): Promise<VerifyOtpResult> {
    const phone = phoneNumber.trim();
    const otp = code.trim();

    if (!/^\d{10}$/.test(phone)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Mobile number must be exactly 10 digits',
        field: 'mobileNumber',
      });
    }
    if (!/^\d{6}$/.test(otp)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'OTP must be exactly 6 digits',
        field: 'otp',
        error_code: 'INVALID_OTP_FORMAT',
      });
    }

    if (this.isDevelopment) {
      return this.verifyOtpDev(phone, otp);
    }
    return this.verifyOtpSupabase(phone, otp);
  }

  /**
   * Send OTP with a key prefix (e.g. for registration vs login flows).
   * Only relevant in development mode for in-memory store separation.
   */
  async sendOtpWithKey(
    key: string,
    phoneNumber: string,
    metadata?: Record<string, any>,
  ): Promise<SendOtpResult> {
    const phone = phoneNumber.trim();
    if (!/^\d{10}$/.test(phone)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Mobile number must be exactly 10 digits',
        field: 'mobileNumber',
      });
    }

    if (this.isDevelopment) {
      return this.sendOtpDev(key, metadata);
    }
    // In production, Supabase uses the phone number directly — keys don't matter
    return this.sendOtpSupabase(phone);
  }

  /**
   * Verify OTP with a key prefix.
   */
  async verifyOtpWithKey(key: string, phoneNumber: string, code: string): Promise<VerifyOtpResult> {
    const phone = phoneNumber.trim();
    const otp = code.trim();

    if (!/^\d{6}$/.test(otp)) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'OTP must be exactly 6 digits',
        field: 'otp',
        error_code: 'INVALID_OTP_FORMAT',
      });
    }

    if (this.isDevelopment) {
      return this.verifyOtpDev(key, otp);
    }
    return this.verifyOtpSupabase(phone, otp);
  }

  /**
   * Store metadata associated with a pending OTP (dev mode only — for registration flows).
   * In production, metadata should be stored separately (e.g. in a cache or DB).
   */
  getDevMetadata(key: string): Record<string, any> | undefined {
    if (!this.isDevelopment) return undefined;
    return this.devOtpStore.get(key)?.metadata;
  }

  /**
   * Check remaining cooldown in seconds for a key. Returns 0 if no cooldown.
   */
  getRemainingCooldown(key: string): number {
    if (!this.isDevelopment) return 0;
    const record = this.devOtpStore.get(key);
    if (!record || new Date() > record.expiresAt) return 0;
    const elapsed = Date.now() - record.sentAt.getTime();
    if (elapsed >= this.resendCooldownMs) return 0;
    return Math.ceil((this.resendCooldownMs - elapsed) / 1000);
  }

  // ─── Development mode (in-memory) ────────────────────────────────

  private sendOtpDev(key: string, metadata?: Record<string, any>): SendOtpResult {
    this.checkDevCooldown(key);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + this.otpExpiryMs);

    this.devOtpStore.set(key, { otp, expiresAt, sentAt: new Date(), metadata });
    this.logger.debug(`[DEV OTP] ${key}: ${otp} (expires ${expiresAt.toISOString()})`);

    return {
      success: true,
      message: 'OTP sent successfully',
      otp, // Only in development!
      expiresIn: '5 minutes',
    };
  }

  private verifyOtpDev(key: string, code: string): VerifyOtpResult {
    const record = this.devOtpStore.get(key);
    if (!record) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'No OTP found for this number',
        error_code: 'OTP_NOT_FOUND',
      });
    }
    if (new Date() > record.expiresAt) {
      this.devOtpStore.delete(key);
      throw new BadRequestException({
        statusCode: 400,
        message: 'OTP has expired',
        error_code: 'OTP_EXPIRED',
      });
    }
    if (record.otp !== code) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Invalid OTP',
        error_code: 'INVALID_OTP',
      });
    }
    this.devOtpStore.delete(key);
    return { valid: true, message: 'OTP verified successfully' };
  }

  private checkDevCooldown(key: string): void {
    const existing = this.devOtpStore.get(key);
    if (existing && new Date() < existing.expiresAt) {
      const elapsed = Date.now() - existing.sentAt.getTime();
      if (elapsed < this.resendCooldownMs) {
        const remaining = Math.ceil((this.resendCooldownMs - elapsed) / 1000);
        throw new BadRequestException({
          statusCode: 429,
          message: 'OTP recently sent. Please wait before resending.',
          retryAfterSeconds: remaining,
          error_code: 'OTP_RATE_LIMITED',
        });
      }
    }
  }

  // ─── Production mode (Supabase Phone Auth → Twilio Verify) ─────

  private async sendOtpSupabase(phone: string): Promise<SendOtpResult> {
    const fullNumber = `${this.countryCode}${phone}`;

    const { success, error } = await this.supabaseAuth.sendPhoneOtp(fullNumber);

    if (!success) {
      this.logger.error(`Supabase phone OTP send failed for ${fullNumber}: ${error}`);

      if (error?.includes('rate') || error?.includes('limit')) {
        throw new BadRequestException({
          statusCode: 429,
          message: 'Too many OTP requests. Please wait before trying again.',
          error_code: 'OTP_RATE_LIMITED',
        });
      }

      throw new BadRequestException({
        statusCode: 400,
        message: 'Failed to send OTP. Please try again.',
        error_code: 'OTP_SEND_FAILED',
      });
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      // No OTP returned in production — Supabase/Twilio manages it
      expiresIn: '10 minutes',
    };
  }

  private async verifyOtpSupabase(phone: string, code: string): Promise<VerifyOtpResult> {
    const fullNumber = `${this.countryCode}${phone}`;

    const { valid, supabaseUserId, error } = await this.supabaseAuth.verifyPhoneOtp(fullNumber, code);

    if (!valid) {
      this.logger.error(`Supabase phone OTP verify failed for ${fullNumber}: ${error}`);

      if (error?.includes('expired') || error?.includes('Token has expired')) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'OTP has expired. Please request a new one.',
          error_code: 'OTP_EXPIRED',
        });
      }
      if (error?.includes('invalid') || error?.includes('Invalid')) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Invalid OTP',
          error_code: 'INVALID_OTP',
        });
      }

      throw new BadRequestException({
        statusCode: 400,
        message: 'OTP verification failed. Please try again.',
        error_code: 'VERIFICATION_FAILED',
      });
    }

    return { valid: true, message: 'OTP verified successfully', supabaseUserId };
  }
}
