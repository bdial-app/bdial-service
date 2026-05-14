import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLE_HIERARCHY } from '../enums/admin-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // If endpoint is public, skip role check
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Get required roles from decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no @Roles() decorator, allow (non-admin endpoints don't need role check)
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Authentication required');
    }

    const userRoleWeight = ROLE_HIERARCHY[user.role] ?? 0;

    // Check if user's role meets the minimum required role (hierarchical)
    // The decorator specifies the minimum role(s) — user must meet at least one
    const hasAccess = requiredRoles.some((requiredRole) => {
      const requiredWeight = ROLE_HIERARCHY[requiredRole] ?? 99;
      return userRoleWeight >= requiredWeight;
    });

    if (!hasAccess) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Insufficient permissions for this action',
        code: 'INSUFFICIENT_ROLE',
        required: requiredRoles,
        current: user.role,
      });
    }

    return true;
  }
}
