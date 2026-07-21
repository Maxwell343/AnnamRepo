import { useState, useCallback, useMemo } from 'react';
import type { User, UserRole } from '../types/user';
import { isValidRole } from '../types/user';

const STORAGE_KEY = 'user';

/**
 * Hook to read, validate, and manage the current user from localStorage.
 *
 * Avoids the repeated `localStorage.getItem('user') + JSON.parse` pattern
 * that appears in 20+ components.
 */
export function useUser() {
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (parsed?.id && parsed?.name && isValidRole(parsed?.role)) {
        return parsed as User;
      }
      return null;
    } catch {
      return null;
    }
  });

  /** Update user in both state and localStorage. */
  const setUser = useCallback((updatedUser: User | null) => {
    if (updatedUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setUserState(updatedUser);
  }, []);

  /** Clear all user-related data from localStorage. */
  const clearUser = useCallback(() => {
    const keysToRemove = [
      STORAGE_KEY,
      'farmerSettings',
      'ngoSettings',
      'userSettings',
      'driverSettings',
      'userPhone',
      'farmName',
      'farmLocation',
      'userLanguage',
      'ngoName',
    ];
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    setUserState(null);
  }, []);

  const isAuthenticated = user !== null;

  const hasRole = useCallback(
    (roles: UserRole | UserRole[]) => {
      if (!user) return false;
      const allowed = Array.isArray(roles) ? roles : [roles];
      return allowed.includes(user.role);
    },
    [user],
  );

  return useMemo(
    () => ({ user, setUser, clearUser, isAuthenticated, hasRole }),
    [user, setUser, clearUser, isAuthenticated, hasRole],
  );
}
