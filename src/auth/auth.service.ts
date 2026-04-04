import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SendOtpDto, VerifyOtpDto } from './dto/auth.dto';

// In-memory OTP store (replace with Redis in production)
const otpStore = new Map<string, { otp: string; expiresAt: Date }>();

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async sendOtp(dto: SendOtpDto) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    otpStore.set(dto.mobileNumber, { otp, expiresAt });

    // TODO: Integrate SMS provider (e.g., Twilio, MSG91)
    console.log(`OTP for ${dto.mobileNumber}: ${otp}`);

    return { message: 'OTP sent successfully' };
  }

  async sendAdminOtp(dto: SendOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { mobileNumber: dto.mobileNumber },
    });

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('this user is not admin');
    }

    return this.sendOtp(dto);
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const record = otpStore.get(dto.mobileNumber);

    if (!record) {
      throw new BadRequestException('OTP not found or expired');
    }

    if (new Date() > record.expiresAt) {
      otpStore.delete(dto.mobileNumber);
      throw new BadRequestException('OTP expired');
    }

    if (record.otp !== dto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    otpStore.delete(dto.mobileNumber);

    // Upsert user on first login
    let user = await this.prisma.user.findUnique({
      where: { mobileNumber: dto.mobileNumber },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          mobileNumber: dto.mobileNumber,
          name: '',
          gender: 'other',
        },
      });
    }

    const token = this.jwtService.sign({
      sub: user.id,
      mobile: user.mobileNumber,
    });

    return { accessToken: token, user };
  }
}
