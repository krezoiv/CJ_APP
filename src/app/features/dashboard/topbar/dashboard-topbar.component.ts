import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { IconComponent } from '../../../shared/ui';
import { AlertBellComponent } from './components/alert-bell/alert-bell.component';

function deepestRouteTitle(snapshot: ActivatedRouteSnapshot): string | undefined {
  let current = snapshot;
  while (current.firstChild) {
    current = current.firstChild;
  }
  return current.title;
}

@Component({
  selector: 'app-dashboard-topbar',
  standalone: true,
  imports: [DatePipe, RouterLink, IconComponent, AlertBellComponent],
  templateUrl: './dashboard-topbar.component.html',
  styleUrl: './dashboard-topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardTopbarComponent {
  @Output() menuToggled = new EventEmitter<void>();
  @Output() changePasswordRequested = new EventEmitter<void>();
  @Output() logoutRequested = new EventEmitter<void>();

  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;
  readonly now = signal(new Date());
  readonly isUserMenuOpen = signal(false);
  /** Igual mecanismo que el navbar público (`NavbarComponent.onWindowScroll`) — la barra se "asienta" con más opacidad al hacer scroll. */
  readonly isScrolled = signal(false);

  /** "Modo Claro / Modo Oscuro" — `ThemeService` es la única fuente; este componente solo lee su signal y le pide cambiar. */
  readonly isDarkTheme = computed(() => this.themeService.theme() === 'DARK');

  /**
   * El `title` de cada ruta (`app.routes.ts`, ya usado para la pestaña del
   * navegador — "Reporte de Ventas — Sistema") es la única fuente que
   * cubre TODAS las rutas, incluidas las de parámetro dinámico
   * (`/inventario/:id`) — reutilizarlo evita duplicar un segundo mapa de
   * nombres de página que podría desincronizarse del real.
   */
  private readonly routeTitle = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => deepestRouteTitle(this.router.routerState.snapshot.root)),
    ),
    { initialValue: deepestRouteTitle(this.router.routerState.snapshot.root) },
  );

  readonly currentPageLabel = computed(() => {
    const title = this.routeTitle();
    const base = title?.split(' — ')[0]?.trim();
    return base ? `Módulo ${base}` : null;
  });

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isScrolled.set(window.scrollY > 8);
  }

  toggleTheme(): void {
    this.themeService.setTheme(this.isDarkTheme() ? 'LIGHT' : 'DARK');
  }

  constructor() {
    const intervalId = setInterval(() => this.now.set(new Date()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalId));
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen.update((open) => !open);
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  requestChangePassword(): void {
    this.closeUserMenu();
    this.changePasswordRequested.emit();
  }

  requestLogout(): void {
    this.closeUserMenu();
    this.logoutRequested.emit();
  }
}
