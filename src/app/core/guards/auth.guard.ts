import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Gates the entire `/dashboard/*` route tree. `isAuthenticated()` only
 * checks the in-memory signal seeded from `AuthService.restoreSession()`
 * at construction — it never re-validates the token against the backend
 * here. An expired/invalid token is instead caught lazily, the next time
 * a request actually 401s (see `authInterceptor`), which is what redirects
 * to `/login` at that point.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  if (authService.isAuthenticated()) {
    return true;
  }
  return inject(Router).parseUrl('/login');
};
