import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: LOCALE_ID, useValue: 'es' },
    // Scroll behavior (both "scroll to top on route change" and "scroll to
    // #anchor") is handled entirely by FragmentScrollService instead of
    // withInMemoryScrolling: the router's built-in scroll restoration races
    // with — and wins over — a manual scroll on the very same navigation,
    // and its anchorScrolling doesn't retry once a lazy-loaded route's DOM
    // is ready, nor does it fire when only the fragment changes on an
    // already-active route.
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
