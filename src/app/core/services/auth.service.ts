import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { extractErrorMessage } from '../utils/extract-error-message';
import { ApiSuccessResponse } from '../models';
import { ThemeService } from './theme.service';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN'];

export interface AuthUser {
  id: string;
  username: string;
  phone: string;
  role: UserRole;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

const TOKEN_KEY = 'cj_auth_token';
const SESSION_KEY = 'cj_auth_session';

// Real backend now in place (see README "Fase 2"): this talks to
// `${environment.apiUrl}/auth/*`. The public signals (`currentUser`,
// `isAuthenticated`) are the contract the rest of the app depends on and
// haven't changed shape beyond AuthUser now carrying {id, username, phone}
// instead of {name, email}.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly themeService = inject(ThemeService);

  readonly currentUser = signal<AuthUser | null>(this.restoreSession());
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  /** ADMIN/SUPER_ADMIN can manage inventory; USER is read-only. Hides UI only — the backend re-checks on every request. */
  readonly isAdmin = computed(() => ADMIN_ROLES.includes(this.currentUser()?.role as UserRole));

  constructor() {
    // The backend is always the source of truth for theme, never the
    // client cache: a restored session (page reload) immediately re-fetches
    // the real preference from `GET /users/me/preferences` rather than
    // trusting `ThemeService`'s own cached value (which already painted
    // *something* on boot purely to avoid a flash of the wrong theme, and
    // may be stale if the user changed theme from another device/tab).
    if (this.currentUser()) {
      this.themeService.loadUserTheme();
    }
  }

  login(identifier: string, password: string): Observable<AuthResult> {
    return this.http
      .post<ApiSuccessResponse<LoginResponse>>(`${environment.apiUrl}/auth/login`, { identifier, password })
      .pipe(
        tap(({ data }) => {
          this.setSession(data.accessToken, data.user);
          this.themeService.loadUserTheme();
        }),
        map(() => ({ success: true }) as AuthResult),
        catchError((error: HttpErrorResponse) =>
          of({ success: false, error: extractErrorMessage(error, 'No se pudo iniciar sesión. Inténtalo de nuevo.') })
        ),
      );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<AuthResult> {
    return this.http
      .post(`${environment.apiUrl}/auth/change-password`, { currentPassword, newPassword })
      .pipe(
        map(() => ({ success: true }) as AuthResult),
        catchError((error: HttpErrorResponse) =>
          of({
            success: false,
            error: extractErrorMessage(error, 'No se pudo completar la solicitud. Inténtalo de nuevo.'),
          })
        ),
      );
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    this.themeService.reset();
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private setSession(accessToken: string, user: AuthUser): void {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private restoreSession(): AuthUser | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(SESSION_KEY);
    if (!token || !raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
