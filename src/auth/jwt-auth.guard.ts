import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { ALLOW_PAUSED_KEY } from '../common/decorators/allow-paused.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Run the JWT strategy (validates token, loads user)
    const result = await (super.canActivate(context) as Promise<boolean>);
    if (!result) return false;

    // After JWT validation, check if user is paused
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.status === 'suspended') {
      throw new ForbiddenException({ statusCode: 403, message: 'User account is suspended', code: 'ACCOUNT_SUSPENDED' });
    }

    if (user?.status === 'paused') {
      const allowPaused = this.reflector.getAllAndOverride<boolean>(ALLOW_PAUSED_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (!allowPaused) {
        throw new ForbiddenException({ statusCode: 403, message: 'Account is paused', code: 'ACCOUNT_PAUSED' });
      }
    }

    return true;
  }
}
