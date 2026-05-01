import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities';
import { OtpService } from '../otp/otp.service';
import { SendAdminOtpDto, VerifyAdminOtpDto } from './dto/admin-auth.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
    private otpService: OtpService,
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

    const result = await this.otpService.sendOtpWithKey(`admin_${normalizedMobile}`, normalizedMobile);

    return { message: 'OTP sent successfully to admin mobile number', ...(result.otp ? { otp: result.otp } : {}) };
  }

  async verifyOtp(dto: VerifyAdminOtpDto) {
    const normalizedMobile = this.normalizeMobileNumber(dto.mobileNumber);

    // Verify OTP (dev: in-memory, prod: MSG91)
    await this.otpService.verifyOtpWithKey(`admin_${normalizedMobile}`, normalizedMobile, dto.otp);

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
