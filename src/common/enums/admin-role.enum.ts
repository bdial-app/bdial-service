/**
 * Admin role hierarchy (lowest → highest):
 * associate < moderator < admin < super_admin
 *
 * Higher roles inherit ALL permissions of lower roles.
 */
export enum AdminRole {
  ASSOCIATE = 'associate',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

/**
 * Numeric weight for hierarchical comparison.
 * Used by the RolesGuard to determine if a user's role meets the minimum requirement.
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  customer: 0,
  associate: 1,
  moderator: 2,
  admin: 3,
  super_admin: 4,
};

/** All valid admin roles (excludes 'customer') */
export const ADMIN_ROLES = [
  AdminRole.ASSOCIATE,
  AdminRole.MODERATOR,
  AdminRole.ADMIN,
  AdminRole.SUPER_ADMIN,
];

/** All valid user roles (includes 'customer') */
export const ALL_ROLES = ['customer', ...ADMIN_ROLES];
