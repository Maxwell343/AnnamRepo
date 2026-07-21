/** Supported user roles in the platform. */
export type UserRole = 'farmer' | 'ngo' | 'driver' | 'customer';

/** Core user object stored in localStorage after authentication. */
export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  address?: string;
  organization?: string;
  vehicle_number?: string;
  profileComplete?: boolean;
}

/** Validated role values for runtime type guards. */
export const VALID_ROLES: readonly UserRole[] = ['farmer', 'ngo', 'driver', 'customer'] as const;

/** Type guard: checks if a string is a valid UserRole. */
export function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole);
}
