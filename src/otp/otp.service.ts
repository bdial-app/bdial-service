import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Msg91Service } from '../msg91/msg91.service';

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
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly isDevelopment: boolean;
  private readonly countryCode: string;
  private readonly otpExpiryMs: number;
  private readonly resendCooldownMs: number;
  private readonly reviewPhone: string | undefined;
  private readonly reviewOtp: string | undefined;
  private readonly reviewPhone2: string | undefined;
  private readonly reviewOtp2: string | undefined;
  private readonly reviewPhone3: string | undefined;
  private readonly reviewOtp3: string | undefined;

  /** In-memory store used ONLY in development mode */
  private readonly devOtpStore = new Map<string, OtpRecord>();

  constructor(
    private readonly config: ConfigService,
    private readonly msg91: Msg91Service,
  ) {
    this.isDevelopment = config.get<string>('NODE_ENV', 'development') === 'development';
    this.countryCode = config.get<string>('SMS_COUNTRY_CODE', '+91');
    this.otpExpiryMs = 5 * 60 * 1000; // 5 minutes
    this.resendCooldownMs = 60 * 1000; // 60 seconds
    this.reviewPhone = config.get<string>('APPLE_REVIEW_PHONE');
    this.reviewOtp = config.get<string>('APPLE_REVIEW_OTP');
    this.reviewPhone2 = config.get<string>('APPLE_REVIEW_PHONE_2');
    this.reviewOtp2 = config.get<string>('APPLE_REVIEW_OTP_2');
    this.reviewPhone3 = config.get<string>('APPLE_REVIEW_PHONE_3');
    this.reviewOtp3 = config.get<string>('APPLE_REVIEW_OTP_3');

    if (!this.isDevelopment) {
      if (!this.msg91.isConfigured()) {
        this.logger.error(
          'MSG91 is not configured. Cannot start in production without OTP provider. ' +
          'Ensure MSG91_AUTH_KEY and MSG91_TEMPLATE_ID are set.',
        );
        throw new Error('MSG91 configuration is incomplete for production.');
      }
      this.logger.log('MSG91 initialized for production OTP delivery');
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

    // Apple App Review demo account — skip actual SMS
    if (this.isReviewPhone(phone)) {
      return { success: true, message: 'OTP sent successfully', expiresIn: '5 minutes' };
    }

    if (this.isDevelopment) {
      return this.sendOtpDev(phone);
    }
    return this.sendOtpMsg91(phone);
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

    // Apple App Review demo account bypass
    if (this.isReviewAccount(phone, otp)) {
      return { valid: true, message: 'OTP verified successfully' };
    }

    if (this.isDevelopment) {
      return this.verifyOtpDev(phone, otp);
    }
    return this.verifyOtpMsg91(phone, otp);
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

    // Apple App Review demo account — skip actual SMS
    if (this.isReviewPhone(phone)) {
      return { success: true, message: 'OTP sent successfully', expiresIn: '5 minutes' };
    }

    if (this.isDevelopment) {
      return this.sendOtpDev(key, metadata);
    }
    // In production, MSG91 uses the phone number directly — keys don't matter
    return this.sendOtpMsg91(phone);
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

    // Apple App Review demo account bypass
    if (this.isReviewAccount(phone, otp)) {
      return { valid: true, message: 'OTP verified successfully' };
    }

    if (this.isDevelopment) {
      return this.verifyOtpDev(key, otp);
    }
    return this.verifyOtpMsg91(phone, otp);
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

  // ─── Apple App Review bypass ───────────────────────────────────

  private isReviewAccount(phone: string, otp: string): boolean {
    return (
      !!(this.reviewPhone && this.reviewOtp && phone === this.reviewPhone && otp === this.reviewOtp) ||
      !!(this.reviewPhone2 && this.reviewOtp2 && phone === this.reviewPhone2 && otp === this.reviewOtp2) ||
      !!(this.reviewPhone3 && this.reviewOtp3 && phone === this.reviewPhone3 && otp === this.reviewOtp3)
    );
  }

  private isReviewPhone(phone: string): boolean {
    return (
      !!(this.reviewPhone && phone === this.reviewPhone) ||
      !!(this.reviewPhone2 && phone === this.reviewPhone2) ||
      !!(this.reviewPhone3 && phone === this.reviewPhone3)
    );
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

  // ─── Production mode (MSG91 OTP API) ─────────────────────────

  private async sendOtpMsg91(phone: string): Promise<SendOtpResult> {
    const result = await this.msg91.sendOtp(phone);

    if (!result.success) {
      this.logger.error(`MSG91 OTP send failed for ${phone}: ${result.error}`);

      if (result.error?.includes('rate') || result.error?.includes('limit') || result.error?.includes('already sent')) {
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
      // No OTP returned in production — MSG91 manages it
      expiresIn: '5 minutes',
    };
  }

  private async verifyOtpMsg91(phone: string, code: string): Promise<VerifyOtpResult> {
    const result = await this.msg91.verifyOtp(phone, code);

    if (!result.valid) {
      this.logger.warn(`MSG91 OTP verify failed for ${phone}: ${result.error}`);

      if (result.error?.includes('expired') || result.error?.includes('Expired')) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'OTP has expired. Please request a new one.',
          error_code: 'OTP_EXPIRED',
        });
      }
      if (result.error?.includes('invalid') || result.error?.includes('Invalid') || result.error?.includes('not match')) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'Invalid OTP',
          error_code: 'INVALID_OTP',
        });
      }
      if (result.error?.includes('already verified')) {
        throw new BadRequestException({
          statusCode: 400,
          message: 'OTP has already been used',
          error_code: 'OTP_ALREADY_VERIFIED',
        });
      }

      throw new BadRequestException({
        statusCode: 400,
        message: 'OTP verification failed. Please try again.',
        error_code: 'VERIFICATION_FAILED',
      });
    }

    return { valid: true, message: 'OTP verified successfully' };
  }
}
