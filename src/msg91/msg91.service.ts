import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Msg91SendResult {
  success: boolean;
  message: string;
  requestId?: string;
  error?: string;
}

export interface Msg91VerifyResult {
  valid: boolean;
  message: string;
  error?: string;
}

@Injectable()
export class Msg91Service {
  private readonly logger = new Logger(Msg91Service.name);
  private readonly authKey: string;
  private readonly templateId: string;
  private readonly otpLength: number;
  private readonly countryCode: string;
  private readonly baseUrl = 'https://control.msg91.com/api/v5';

  constructor(private readonly config: ConfigService) {
    this.authKey = this.config.get<string>('MSG91_AUTH_KEY', '');
    this.templateId = this.config.get<string>('MSG91_TEMPLATE_ID', '');
    this.otpLength = this.config.get<number>('MSG91_OTP_LENGTH', 6);
    this.countryCode = this.config.get<string>('SMS_COUNTRY_CODE', '+91');
  }

  /** Returns true if MSG91 credentials are configured */
  isConfigured(): boolean {
    return !!(this.authKey && this.templateId);
  }

  /**
   * Send OTP to a phone number via MSG91
   * @param phoneNumber - 10-digit phone number (without country code)
   */
  async sendOtp(phoneNumber: string): Promise<Msg91SendResult> {
    const mobile = `${this.countryCode.replace('+', '')}${phoneNumber}`;

    try {
      const url = `${this.baseUrl}/otp`;
      const params = new URLSearchParams({
        template_id: this.templateId,
        mobile,
        otp_length: this.otpLength.toString(),
      });

      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'POST',
        headers: {
          authkey: this.authKey,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.type === 'success') {
        this.logger.debug(`OTP sent successfully to ${mobile}`);
        return {
          success: true,
          message: 'OTP sent successfully',
          requestId: data.request_id,
        };
      }

      this.logger.error(`MSG91 send OTP failed for ${mobile}: ${JSON.stringify(data)}`);
      return {
        success: false,
        message: data.message || 'Failed to send OTP',
        error: data.message || 'Unknown error',
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`MSG91 send OTP exception for ${mobile}: ${errMsg}`);
      return {
        success: false,
        message: 'Failed to send OTP. Please try again.',
        error: errMsg,
      };
    }
  }

  /**
   * Verify OTP via MSG91
   * @param phoneNumber - 10-digit phone number (without country code)
   * @param otp - 6-digit OTP code
   */
  async verifyOtp(phoneNumber: string, otp: string): Promise<Msg91VerifyResult> {
    const mobile = `${this.countryCode.replace('+', '')}${phoneNumber}`;

    try {
      const url = `${this.baseUrl}/otp/verify`;
      const params = new URLSearchParams({
        otp,
        mobile,
      });

      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'POST',
        headers: {
          authkey: this.authKey,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.type === 'success') {
        this.logger.debug(`OTP verified successfully for ${mobile}`);
        return { valid: true, message: 'OTP verified successfully' };
      }

      // MSG91 returns specific error messages for invalid/expired OTPs
      const errorMsg = data.message || 'OTP verification failed';
      this.logger.warn(`MSG91 verify OTP failed for ${mobile}: ${errorMsg}`);

      return {
        valid: false,
        message: errorMsg,
        error: errorMsg,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`MSG91 verify OTP exception for ${mobile}: ${errMsg}`);
      return {
        valid: false,
        message: 'OTP verification failed. Please try again.',
        error: errMsg,
      };
    }
  }

  /**
   * Resend OTP via MSG91 (retry)
   * @param phoneNumber - 10-digit phone number (without country code)
   * @param retryType - 'text' for SMS, 'voice' for voice call
   */
  async resendOtp(
    phoneNumber: string,
    retryType: 'text' | 'voice' = 'text',
  ): Promise<Msg91SendResult> {
    const mobile = `${this.countryCode.replace('+', '')}${phoneNumber}`;

    try {
      const url = `${this.baseUrl}/otp/retry`;
      const params = new URLSearchParams({
        mobile,
        retrytype: retryType,
      });

      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'POST',
        headers: {
          authkey: this.authKey,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.type === 'success') {
        this.logger.debug(`OTP resent successfully to ${mobile} via ${retryType}`);
        return {
          success: true,
          message: 'OTP resent successfully',
          requestId: data.request_id,
        };
      }

      this.logger.error(`MSG91 resend OTP failed for ${mobile}: ${JSON.stringify(data)}`);
      return {
        success: false,
        message: data.message || 'Failed to resend OTP',
        error: data.message || 'Unknown error',
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`MSG91 resend OTP exception for ${mobile}: ${errMsg}`);
      return {
        success: false,
        message: 'Failed to resend OTP. Please try again.',
        error: errMsg,
      };
    }
  }
}
