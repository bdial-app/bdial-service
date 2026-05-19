import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Specifies the minimum admin role required to access an endpoint.
 * Uses hierarchical comparison: associate < moderator < admin < super_admin.
 *
 * Usage:
 *   @Roles('moderator')  — requires moderator or higher (admin, super_admin)
 *   @Roles('admin')      — requires admin or super_admin
 *   @Roles('super_admin') — requires super_admin only
 *   @Roles('associate')  — any admin role can access
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
