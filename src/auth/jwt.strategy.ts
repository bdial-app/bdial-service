import { Injectable, UnauthorizedException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../entities';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'bohri-connect-secret',
    });
  }

  async validate(payload: { sub: string; mobile: string }) {
    let user: User | null;
    try {
      user = await this.userRepo.findOneBy({ id: payload.sub });
    } catch (err) {
      // DB errors (connection pool exhaustion, timeout, etc.) should NOT
      // return 401 — that causes the client to clear valid tokens.
      this.logger.error(`DB error during JWT validation: ${err instanceof Error ? err.message : err}`);
      throw new InternalServerErrorException('Temporary server error, please retry');
    }
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.status === 'suspended') {
      throw new ForbiddenException({ statusCode: 403, message: 'User account is suspended', code: 'ACCOUNT_SUSPENDED' });
    }
    if (user.status === 'paused') {
      throw new ForbiddenException({ statusCode: 403, message: 'User account is paused', code: 'ACCOUNT_PAUSED' });
    }
    return user;
  }
}
