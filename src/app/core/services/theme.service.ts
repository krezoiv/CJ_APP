import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiSuccessResponse, ThemePreference, ThemePreferencesResponse } from '../models';
import { NotificationService } from './notification.service';

const THEME_CACHE_KEY = 'cj_theme';
const THEME_ATTR = 'data-theme';
const PREFERENCES_URL = `${environment.apiUrl}/users/me/preferences`;
const UPDATE_THEME_URL = `${PREFERENCES_URL}/theme`;
/** Same key `AuthService` uses for the JWT — duplicated on purpose instead of importing `AuthService` here, which would create a real cycle (`AuthService` already injects `ThemeService`). */
const AUTH_TOKEN_KEY = 'cj_auth_token';

/**
 * The single source of truth for "Light Mode / Dark Mode" across the
 * frontend — no component should read or write the `data-theme` attribute
 * or `localStorage` directly; everything goes through here (see the
 * toggle button in `DashboardTopbarComponent`).
 *
 * The database (the authenticated user's own preference) is the real
 * source of truth — `localStorage` is only a cache used to paint the
 * correct theme immediately on app load (avoiding a light→dark flash
 * while the `GET /users/me/preferences` call is still in flight) and is
 * never consulted again after boot. `AuthService` decides WHEN to call
 * `loadUserTheme()` (after `restoreSession()` and after a successful
 * login) — this service knows nothing about authentication itself;
 * `authInterceptor` already attaches the JWT to any call to
 * `environment.apiUrl` automatically.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  readonly theme = signal<ThemePreference>(this.readCachedTheme());

  constructor() {
    // Applies the cached value synchronously as soon as this service is
    // constructed (one of the first `root` providers the app boots) — as
    // early as practical without needing an `APP_INITIALIZER`, and equally
    // effective for the real goal: the first paint already uses the
    // correct theme in the overwhelming majority of cases. Only when a
    // session actually exists — "Light Mode/Dark Mode" is an authenticated-
    // panel preference and must never leak into the public site (landing,
    // login) for a visitor with no session, or right after logging out.
    if (this.hasSession()) {
      this.applyTheme(this.theme());
    }
  }

  getTheme(): ThemePreference {
    return this.theme();
  }

  /**
   * Optimistic update: applies and caches immediately (the whole app
   * reacts to the signal in the same tick), then persists to the backend.
   * If the save fails, it visually reverts to the previous value and
   * notifies — the frontend is never left "believing" a theme the backend
   * never actually accepted.
   */
  setTheme(theme: ThemePreference): void {
    if (this.theme() === theme) {
      return;
    }
    const previous = this.theme();
    this.applyAndCache(theme);

    this.http
      .patch<ApiSuccessResponse<ThemePreferencesResponse>>(UPDATE_THEME_URL, { theme })
      .pipe(
        catchError(() => {
          this.applyAndCache(previous);
          this.notificationService.error('No se pudo guardar la preferencia de tema. Se mantuvo el tema anterior.');
          return of(null);
        }),
      )
      .subscribe();
  }

  /**
   * "The backend takes priority" on login — called from `AuthService`
   * after restoring a session and after a successful login, never from a
   * UI component. A network failure here just leaves the cached theme as
   * it was (a possibly stale preference is better than no theme applied
   * at all).
   */
  loadUserTheme(): void {
    this.http
      .get<ApiSuccessResponse<ThemePreferencesResponse>>(PREFERENCES_URL)
      .pipe(
        tap(({ data }) => this.applyAndCache(data.theme)),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  /** Called by `AuthService.logout()` — removes the document attribute immediately so the public site never inherits the dark theme of the session that just ended. */
  reset(): void {
    this.theme.set('LIGHT');
    localStorage.removeItem(THEME_CACHE_KEY);
    document.documentElement.removeAttribute(THEME_ATTR);
  }

  private applyAndCache(theme: ThemePreference): void {
    this.theme.set(theme);
    this.applyTheme(theme);
    localStorage.setItem(THEME_CACHE_KEY, theme);
  }

  private applyTheme(theme: ThemePreference): void {
    document.documentElement.setAttribute(THEME_ATTR, theme === 'DARK' ? 'dark' : 'light');
  }

  private readCachedTheme(): ThemePreference {
    return localStorage.getItem(THEME_CACHE_KEY) === 'DARK' ? 'DARK' : 'LIGHT';
  }

  private hasSession(): boolean {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
  }
}
