/**
 * Dependency Injection (DI) Tokens & Interfaces
 *
 * Used for custom providers (useValue, useFactory) in AuthModule.
 */

export const AUTH_OPTIONS = 'AUTH_OPTIONS';
export const AUTH_DEFAULT_ROLE = 'AUTH_DEFAULT_ROLE';

export interface AuthOptions {
  saltRounds: number;
  adminSecretCode: string;
  sessionDurationDays: number;
}
