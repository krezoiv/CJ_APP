import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { NAV_LINKS, NAV_LOGIN_LINK, SITE } from '../../core/data';
import { AuthService } from '../../core/services/auth.service';
import {
  ButtonComponent,
  ContainerComponent,
  IconComponent,
} from '../../shared/ui';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, ContainerComponent, ButtonComponent, IconComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly authService = inject(AuthService);

  readonly site = SITE;
  readonly navLinks = NAV_LINKS;

  readonly isScrolled = signal(false);
  readonly isMenuOpen = signal(false);

  readonly accountLink = computed(() =>
    this.authService.isAuthenticated()
      ? { label: 'Sistema', path: '/dashboard', icon: 'grid' }
      : { ...NAV_LOGIN_LINK, icon: 'log-in' },
  );

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isScrolled.set(window.scrollY > 8);
  }

  toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }
}
