import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

// Only attach the token to calls aimed at our own API — never to third-party
// requests a future feature might make (fonts, maps, etc.).
function isApiRequest(url: string): boolean {
  return url.startsWith(environment.apiUrl);
}

/**
 * Registered once in `app.config.ts` via `provideHttpClient(withInterceptors([authInterceptor]))`
 * — every outgoing request to our own API gets the bearer token attached
 * here, and a 401 from our own API is what triggers the network-wide
 * "session expired" handling (logout + redirect), rather than each
 * component/service having to check for it individually.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  const authorizedReq =
    token && isApiRequest(req.url) ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && isApiRequest(req.url)) {
        authService.logout();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
