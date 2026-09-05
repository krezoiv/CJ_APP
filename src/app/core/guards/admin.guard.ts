import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Blocks direct-URL access to admin-only pages (Usuarios, Roles) for a USER
 * account — redirects to the dashboard overview instead of a 404/blank page.
 * UI-only, same as the sidebar's own role filtering: the backend's RolesGuard
 * is what actually rejects a USER-role token calling the API directly.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  if (authService.isAdmin()) {
    return true;
  }
  return inject(Router).parseUrl('/dashboard');
};
