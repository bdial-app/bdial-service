import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities';
import { SendAdminOtpDto, VerifyAdminOtpDto } from './dto/admin-auth.dto';

const adminOtpStore = new Map<string, { otp: string; expiresAt: Date }>();

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  private normalizeMobileNumber(mobileNumber: string): string {
    return mobileNumber.replace(/^\+91/, '');
  }

  async sendOtp(dto: SendAdminOtpDto) {
    const normalizedMobile = this.normalizeMobileNumber(dto.mobileNumber);
    const user = await this.userRepo.findOneBy({ mobileNumber: normalizedMobile });

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
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    adminOtpStore.set(normalizedMobile, { otp, expiresAt });
    console.log(`Admin OTP for ${normalizedMobile}: ${otp}`);

    return { message: 'OTP sent successfully to admin mobile number', otp };
  }

  async verifyOtp(dto: VerifyAdminOtpDto) {
    const normalizedMobile = this.normalizeMobileNumber(dto.mobileNumber);
    const record = adminOtpStore.get(normalizedMobile);

    if (!record) throw new BadRequestException('OTP not found or expired');
    if (new Date() > record.expiresAt) {
      adminOtpStore.delete(normalizedMobile);
      throw new BadRequestException('OTP expired');
    }
    if (record.otp !== dto.otp) throw new BadRequestException('Invalid OTP');

    adminOtpStore.delete(normalizedMobile);

    const user = await this.userRepo.findOneBy({ mobileNumber: normalizedMobile });
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
      },
    };
  }
}
