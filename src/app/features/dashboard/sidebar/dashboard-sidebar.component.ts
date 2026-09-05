import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';

import { DASHBOARD_NAV_ITEMS, SITE } from '../../../core/data';
import { DashboardNavItem } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { PurchaseDraftStore } from '../../../core/services/purchase-draft.store';
import { SalesDraftStore } from '../../../core/services/sales-draft.store';
import { IceCreamPurchaseDraftStore } from '../../../core/services/ice-cream-purchase-draft.store';
import { IceCreamSaleDraftStore } from '../../../core/services/ice-cream-sale-draft.store';
import { BankBalanceDraftStore } from '../../../core/services/bank-balance-draft.store';
import { DayStatusService } from '../../../core/services/day-status.service';
import { NotificationService } from '../../../core/services/notification.service';
import { IconComponent } from '../../../shared/ui';

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './dashboard-sidebar.component.html',
  styleUrl: './dashboard-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardSidebarComponent {
  @Input() open = false;
  @Input() collapsed = false;
  @Output() closeRequested = new EventEmitter<void>();
  @Output() logoutRequested = new EventEmitter<void>();
  @Output() collapseToggled = new EventEmitter<void>();

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly salesDraftStore = inject(SalesDraftStore);
  private readonly purchaseDraftStore = inject(PurchaseDraftStore);
  private readonly iceCreamPurchaseDraftStore = inject(IceCreamPurchaseDraftStore);
  private readonly iceCreamSaleDraftStore = inject(IceCreamSaleDraftStore);
  private readonly bankBalanceDraftStore = inject(BankBalanceDraftStore);
  private readonly dayStatusService = inject(DayStatusService);
  private readonly notificationService = inject(NotificationService);

  readonly site = SITE;

  /**
   * Acordeón exclusivo: a lo sumo un grupo expandido a la vez — abrir uno
   * cierra automáticamente cualquier otro que estuviera abierto. `null`
   * significa "ninguno expandido".
   */
  private readonly expandedGroup = signal<string | null>(null);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    // Whenever navigation lands inside a group's own children, make sure that
    // group is (auto-)expanded — covers first load/refresh on a deep link,
    // and any navigation that didn't originate from clicking inside this
    // sidebar (e.g. a dashboard home-card shortcut). Con el acordeón
    // exclusivo, esto también cierra cualquier otro grupo que estuviera
    // abierto — es exactamente el mismo `.set()` que usa `toggleGroup`.
    effect(() => {
      const url = this.currentUrl();
      const activeItem = this.navItems().find((item) =>
        item.children?.some((child) => url.includes(`/${child.path}`)),
      );
      if (activeItem) {
        this.expandedGroup.set(activeItem.path);
      }
    });
  }

  /** Drops any item (or child) whose `roles` list excludes the current user's role — e.g. Usuarios/Roles for a USER account. */
  readonly navItems = computed<DashboardNavItem[]>(() => {
    const role = this.authService.currentUser()?.role;
    const isVisible = (item: DashboardNavItem) => !item.roles || (!!role && item.roles.includes(role));

    return DASHBOARD_NAV_ITEMS.filter(isVisible).map((item) =>
      item.children ? { ...item, children: item.children.filter(isVisible) } : item,
    );
  });

  /** Small "en progreso" dot next to Ventas/Compras — non-invasive nudge that a draft is waiting, visible from anywhere in the dashboard. */
  readonly hasSalesDraft = computed(() => this.salesDraftStore.hasActiveDraft());
  readonly hasPurchaseDraft = computed(() => this.purchaseDraftStore.hasActiveDraft());
  readonly hasIceCreamPurchaseDraft = computed(() => this.iceCreamPurchaseDraftStore.hasActiveDraft());
  readonly hasIceCreamSaleDraft = computed(() => this.iceCreamSaleDraftStore.hasActiveDraft());
  readonly hasBankBalanceDraft = computed(() => this.bankBalanceDraftStore.hasActiveDraft());

  hasDraftFor(path: string): boolean {
    if (path === 'ventas') {
      return this.hasSalesDraft();
    }
    if (path === 'compras') {
      return this.hasPurchaseDraft();
    }
    if (path === 'heladeria-compras') {
      return this.hasIceCreamPurchaseDraft();
    }
    if (path === 'heladeria-ventas') {
      return this.hasIceCreamSaleDraft();
    }
    if (path === 'agentes-bancarios-bancos') {
      return this.hasBankBalanceDraft();
    }
    return false;
  }

  draftLabelFor(path: string): string {
    if (path === 'agentes-bancarios-bancos') {
      return 'Cuadre en progreso';
    }
    return path === 'ventas' || path === 'heladeria-ventas' ? 'Venta en progreso' : 'Compra en progreso';
  }

  /**
   * "Apertura del Día" — Cuadre Agentes permanece deshabilitado en el
   * Sidebar hasta que el día de hoy esté aperturado Y sus saldos
   * bancarios estén guardados (`DayStatusService`, el mismo singleton que
   * la página de Bancos actualiza al aperturar/guardar, así que este
   * enlace se habilita de inmediato sin recargar nada). Mientras el
   * estado todavía no se conoce (`loading`), se trata como deshabilitado
   * — nunca se asume "sí se puede" por defecto.
   *
   * "Cierre del Día" — Bancos también se bloquea, una vez que HOY quedó
   * cerrado (`isClosed`). Se vuelve a habilitar solo, sin ningún código
   * extra, al llegar la medianoche: `DayStatusService` siempre representa
   * "hoy", así que en cuanto la fecha real cambia (con una recarga normal
   * del día siguiente), el estado consultado ya corresponde a la nueva
   * fecha — no cerrada — y este mismo chequeo vuelve a devolver `false`.
   */
  isLinkDisabled(path: string): boolean {
    if (path === 'agentes-bancarios-cuadre') {
      return this.dayStatusService.loading() || this.dayStatusService.status()?.canAccessReconciliation !== true;
    }
    if (path === 'agentes-bancarios-bancos') {
      return this.dayStatusService.loading() || this.dayStatusService.status()?.isClosed === true;
    }
    return false;
  }

  linkTooltipFor(path: string): string | null {
    if (!this.isLinkDisabled(path)) {
      return null;
    }
    if (path === 'agentes-bancarios-bancos') {
      return 'El día de hoy ya fue operado y cerrado. Podrá continuar con un nuevo ciclo a partir de mañana.';
    }
    return 'Debe aperturar el día y guardar los saldos bancarios primero';
  }

  /**
   * Clicar un enlace deshabilitado nunca navega (`[routerLink]` ya es
   * `null` en ese estado) — esto solo añade la alerta explícita que pide
   * el ticket para Bancos ya cerrado, en vez de dejar que el único
   * indicio sea el tooltip pasivo del atributo `title`.
   */
  onLinkClick(path: string): void {
    if (!this.isLinkDisabled(path)) {
      this.closeRequested.emit();
      return;
    }
    if (path === 'agentes-bancarios-bancos' && this.dayStatusService.status()?.isClosed === true) {
      this.notificationService.info(
        'El día de hoy ya fue operado y cerrado. Podrá continuar con un nuevo ciclo a partir de mañana.',
      );
    }
  }

  isExpanded(path: string): boolean {
    return this.expandedGroup() === path;
  }

  /**
   * Acordeón exclusivo: clicar el grupo ya abierto lo cierra; clicar
   * cualquier otro lo abre y cierra el anterior. Con el sidebar contraído
   * (solo íconos), un submenú no tiene dónde mostrarse — clicar un grupo
   * ahí primero lo expande de nuevo (vía el padre) y deja ese grupo abierto,
   * en vez de alternar su estado a ciegas.
   */
  toggleGroup(path: string): void {
    if (this.collapsed) {
      this.collapseToggled.emit();
      this.expandedGroup.set(path);
      return;
    }
    this.expandedGroup.update((current) => (current === path ? null : path));
  }
}
