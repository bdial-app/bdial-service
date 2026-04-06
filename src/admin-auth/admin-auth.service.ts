import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SendAdminOtpDto, VerifyAdminOtpDto } from './dto/admin-auth.dto';

// In-memory OTP store for admin (replace with Redis in production)
const adminOtpStore = new Map<string, { otp: string; expiresAt: Date }>();

@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Normalize mobile number to 10-digit format for database lookup
  private normalizeMobileNumber(mobileNumber: string): string {
    // Remove +91 if present and ensure it's 10 digits
    return mobileNumber.replace(/^\+91/, '');
  }

  async sendOtp(dto: SendAdminOtpDto) {
    const normalizedMobile = this.normalizeMobileNumber(dto.mobileNumber);
    
    // Check if user exists and has admin role
    const user = await this.prisma.user.findUnique({
      where: { mobileNumber: normalizedMobile },
    });

    if (!user) {
      throw new NotFoundException('User not found with this mobile number');
    }

    if (user.role !== 'admin') {
      throw new BadRequestException('User does not have admin privileges');
    }

    if (user.status !== 'active') {
      throw new BadRequestException('Admin account is not active');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store with normalized mobile number
    adminOtpStore.set(normalizedMobile, { otp, expiresAt });

    // TODO: Integrate SMS provider (e.g., Twilio, MSG91) for admin OTP
    console.log(`Admin OTP for ${normalizedMobile}: ${otp}`);

    return { 
      message: 'OTP sent successfully to admin mobile number',
      // Only include in development for testing
      otp
      // ...(process.env.NODE_ENV === 'development' && { otp })
    };
  }

  async verifyOtp(dto: VerifyAdminOtpDto) {
    const normalizedMobile = this.normalizeMobileNumber(dto.mobileNumber);
    const record = adminOtpStore.get(normalizedMobile);

    if (!record) {
      throw new BadRequestException('OTP not found or expired');
    }

    if (new Date() > record.expiresAt) {
      adminOtpStore.delete(normalizedMobile);
      throw new BadRequestException('OTP expired');
    }

    if (record.otp !== dto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    adminOtpStore.delete(normalizedMobile);

    // Verify user is still admin and active
    const user = await this.prisma.user.findUnique({
      where: { mobileNumber: normalizedMobile },
    });

    if (!user || user.role !== 'admin' || user.status !== 'active') {
      throw new BadRequestException('Admin access revoked or account inactive');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      mobile: user.mobileNumber,
      role: user.role,
    });

    return { 
      accessToken: token, 
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        name: user.name,
        role: user.role,
      }
    };
  }
}
