import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

// Generous enough to cover a cold lazy-route chunk fetch + compile in dev
// mode (unbundled Vite serving) before we give up looking for the anchor.
const MAX_RETRIES = 150;

/**
 * Owns all scroll-on-navigation behavior, replacing the router's built-in
 * `withInMemoryScrolling` (see app.config.ts for why): scrolls to top on a
 * plain route change, or to the element matching the URL fragment
 * (e.g. #contacto) otherwise. Reads the fragment straight off the root
 * route rather than NavigationEnd, since NavigationEnd does not fire for a
 * fragment-only change on an already-active route.
 */
@Injectable({ providedIn: 'root' })
export class FragmentScrollService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  listen(): void {
    this.router.routerState.root.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((fragment) => {
      if (fragment) {
        this.scrollWhenReady(fragment, MAX_RETRIES);
      } else {
        window.scrollTo({ top: 0 });
      }
    });
  }

  private scrollWhenReady(fragment: string, retriesLeft: number): void {
    const element = document.getElementById(fragment);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (retriesLeft > 0) {
      requestAnimationFrame(() => this.scrollWhenReady(fragment, retriesLeft - 1));
    }
  }
}
