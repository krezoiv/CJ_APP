import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing-page.component').then((m) => m.LandingPageComponent),
    title: 'Comercial Jhoel — Librería, Útiles Escolares y Agente Bancario',
  },
  {
    path: 'catalogo',
    loadComponent: () => import('./features/catalog/catalog-page.component').then((m) => m.CatalogPageComponent),
    title: 'Catálogo — Comercial Jhoel',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login-page.component').then((m) => m.LoginPageComponent),
    title: 'Iniciar sesión — Comercial Jhoel',
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard-layout.component').then((m) => m.DashboardLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/home/dashboard-home.component').then((m) => m.DashboardHomeComponent),
        title: 'Resumen — Sistema',
      },
      {
        path: 'sistema',
        loadComponent: () =>
          import('./features/dashboard/placeholder-page/dashboard-placeholder-page.component').then(
            (m) => m.DashboardPlaceholderPageComponent
          ),
        data: {
          title: 'Sistema',
          icon: 'briefcase',
          description: 'Configuración general, usuarios y permisos del panel. Este módulo está en construcción.',
        },
        title: 'Sistema',
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('./features/dashboard/categories/categories-page.component').then((m) => m.CategoriesPageComponent),
        title: 'Categorías — Sistema',
      },
      {
        path: 'negocios',
        loadComponent: () =>
          import('./features/dashboard/businesses/businesses-page.component').then(
            (m) => m.BusinessesPageComponent
          ),
        title: 'Negocios — Sistema',
      },
      {
        path: 'proveedores',
        loadComponent: () =>
          import('./features/dashboard/suppliers/suppliers-page.component').then((m) => m.SuppliersPageComponent),
        title: 'Proveedores — Sistema',
      },
      {
        path: 'usuarios',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/users/users-page.component').then((m) => m.UsersPageComponent),
        title: 'Usuarios — Sistema',
      },
      {
        path: 'roles',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/roles/roles-page.component').then((m) => m.RolesPageComponent),
        title: 'Roles — Sistema',
      },
      {
        path: 'gestion-dias-cerrados',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/closed-days/closed-days-page.component').then(
            (m) => m.ClosedDaysPageComponent,
          ),
        title: 'Gestión de Días Cerrados — Sistema',
      },
      {
        path: 'gestion-dias-recargas',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/recharge-days/recharge-days-page.component').then(
            (m) => m.RechargeDaysPageComponent,
          ),
        title: 'Gestión de Días de Recargas — Sistema',
      },
      {
        path: 'gestion-transacciones',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/transaction-days/transaction-days-page.component').then(
            (m) => m.TransactionDaysPageComponent,
          ),
        title: 'Gestión de Transacciones — Sistema',
      },
      {
        path: 'configuracion-empresa',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/company-settings/company-settings-page.component').then(
            (m) => m.CompanySettingsPageComponent,
          ),
        title: 'Configuración de Empresa — Sistema',
      },
      {
        path: 'configuracion-alertas',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/alert-settings/alert-settings-page.component').then(
            (m) => m.AlertSettingsPageComponent,
          ),
        title: 'Configuración de Alertas — Sistema',
      },
      {
        path: 'bancos',
        loadComponent: () =>
          import('./features/dashboard/banks/banks-page.component').then((m) => m.BanksPageComponent),
        title: 'Bancos — Sistema',
      },
      {
        path: 'tipos-cuenta',
        loadComponent: () =>
          import('./features/dashboard/account-types/account-types-page.component').then(
            (m) => m.AccountTypesPageComponent
          ),
        title: 'Tipos de Cuenta — Sistema',
      },
      {
        path: 'banco-agente',
        loadComponent: () =>
          import('./features/dashboard/transaction-banks/transaction-banks-page.component').then(
            (m) => m.TransactionBanksPageComponent
          ),
        title: 'Banco Agente — Sistema',
      },
      {
        path: 'tipo-transaccion',
        loadComponent: () =>
          import('./features/dashboard/transaction-types/transaction-types-page.component').then(
            (m) => m.TransactionTypesPageComponent
          ),
        title: 'Tipo de Transacción — Sistema',
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/dashboard/clients/clients-page.component').then(
            (m) => m.ClientsPageComponent
          ),
        title: 'Clientes — Sistema',
      },
      {
        path: 'presentaciones-medidas',
        loadComponent: () =>
          import('./features/dashboard/presentation-units/presentation-units-page.component').then(
            (m) => m.PresentationUnitsPageComponent
          ),
        title: 'Presentaciones y Medidas — Sistema',
      },
      {
        path: 'finanzas',
        loadComponent: () =>
          import('./features/dashboard/placeholder-page/dashboard-placeholder-page.component').then(
            (m) => m.DashboardPlaceholderPageComponent
          ),
        data: {
          title: 'Finanzas',
          icon: 'trending-up',
          description: 'Ingresos, egresos y reportes financieros del negocio. Este módulo está en construcción.',
        },
        title: 'Finanzas — Sistema',
      },
      {
        path: 'ventas',
        loadComponent: () =>
          import('./features/dashboard/sales/sales-page.component').then((m) => m.SalesPageComponent),
        title: 'Ventas — Sistema',
      },
      {
        path: 'compras',
        loadComponent: () =>
          import('./features/dashboard/purchases/purchases-page.component').then((m) => m.PurchasesPageComponent),
        title: 'Compras — Sistema',
      },
      {
        path: 'tickets',
        loadComponent: () =>
          import('./features/dashboard/tickets/tickets-page.component').then((m) => m.TicketsPageComponent),
        title: 'Tickets — Sistema',
      },
      {
        path: 'cotizaciones',
        loadComponent: () =>
          import('./features/dashboard/quotations/quotations-page.component').then((m) => m.QuotationsPageComponent),
        title: 'Cotizaciones — Sistema',
      },
      {
        path: 'transaccionar',
        loadComponent: () =>
          import('./features/dashboard/transaccionar/transaccionar-page.component').then(
            (m) => m.TransaccionarPageComponent
          ),
        title: 'Transaccionar — Sistema',
      },
      {
        path: 'recargas',
        loadComponent: () =>
          import('./features/dashboard/recharges/recharges-page.component').then((m) => m.RechargesPageComponent),
        title: 'Recargas Electrónicas — Sistema',
      },
      {
        path: 'cuentas-por-cobrar',
        loadComponent: () =>
          import('./features/dashboard/accounts-receivable/accounts-receivable-page.component').then(
            (m) => m.AccountsReceivablePageComponent
          ),
        title: 'Cuentas por Cobrar — Sistema',
      },
      {
        path: 'activos',
        loadComponent: () =>
          import('./features/dashboard/assets/assets-page.component').then((m) => m.AssetsPageComponent),
        title: 'Activos — Sistema',
      },
      {
        path: 'heladeria-inventario',
        loadComponent: () =>
          import('./features/dashboard/ice-creams/inventory/ice-cream-inventory-page.component').then(
            (m) => m.IceCreamInventoryPageComponent
          ),
        title: 'Heladería · Inventario — Sistema',
      },
      {
        path: 'heladeria-compras',
        loadComponent: () =>
          import('./features/dashboard/ice-creams/purchases/ice-cream-purchases-page.component').then(
            (m) => m.IceCreamPurchasesPageComponent
          ),
        title: 'Heladería · Compras — Sistema',
      },
      {
        path: 'heladeria-ventas',
        loadComponent: () =>
          import('./features/dashboard/ice-creams/sales/ice-cream-sales-page.component').then(
            (m) => m.IceCreamSalesPageComponent
          ),
        title: 'Heladería · Ventas — Sistema',
      },
      {
        path: 'reportes',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/placeholder-page/dashboard-placeholder-page.component').then(
            (m) => m.DashboardPlaceholderPageComponent
          ),
        data: {
          title: 'Reportería',
          icon: 'bar-chart',
          description: 'Selecciona un reporte del menú para consultar, filtrar y exportar la información.',
        },
        title: 'Reportería — Sistema',
      },
      {
        path: 'reportes-ventas',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/reports/sales/sales-report-page.component').then(
            (m) => m.SalesReportPageComponent
          ),
        title: 'Reporte de Ventas — Sistema',
      },
      {
        path: 'reportes-compras',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/reports/purchases/purchases-report-page.component').then(
            (m) => m.PurchasesReportPageComponent
          ),
        title: 'Reporte de Compras — Sistema',
      },
      {
        path: 'reportes-activos-cuentas-por-cobrar',
        canActivate: [adminGuard],
        loadComponent: () =>
          import(
            './features/dashboard/reports/assets-receivables/assets-receivables-report-page.component'
          ).then((m) => m.AssetsReceivablesReportPageComponent),
        title: 'Reportería de Activos y Cuentas por Cobrar — Sistema',
      },
      {
        path: 'reportes-recargas',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/reports/recharges/recharges-report-page.component').then(
            (m) => m.RechargesReportPageComponent
          ),
        title: 'Reporte de Recargas Electrónicas — Sistema',
      },
      {
        path: 'reportes-cuadre-agentes',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/reports/agent-reconciliations/agent-reconciliations-report-page.component').then(
            (m) => m.AgentReconciliationsReportPageComponent
          ),
        title: 'Reporte de Cuadre de Agentes — Sistema',
      },
      {
        path: 'reportes-transacciones',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/reports/bank-deposits/bank-deposits-report-page.component').then(
            (m) => m.BankDepositsReportPageComponent
          ),
        title: 'Reporte de Transacciones — Sistema',
      },
      {
        path: 'reportes-heladeria',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/reports/ice-cream/ice-cream-report-page.component').then(
            (m) => m.IceCreamReportPageComponent
          ),
        title: 'Reportería de Heladería — Sistema',
      },
      {
        path: 'agentes-bancarios-bancos',
        loadComponent: () =>
          import('./features/dashboard/bank-agents/bank-agents-page.component').then(
            (m) => m.BankAgentsPageComponent
          ),
        title: 'Agentes Bancarios — Sistema',
      },
      {
        path: 'agentes-bancarios-cuadre',
        loadComponent: () =>
          import('./features/dashboard/bank-agents/cuadre-agentes-page.component').then(
            (m) => m.CuadreAgentesPageComponent
          ),
        title: 'Cuadre Agentes — Sistema',
      },
      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/dashboard/inventory/inventory-page.component').then((m) => m.InventoryPageComponent),
        title: 'Inventario — Sistema',
      },
      {
        path: 'inventario/:id',
        loadComponent: () =>
          import('./features/dashboard/inventory/product-detail-page.component').then(
            (m) => m.ProductDetailPageComponent
          ),
        title: 'Detalle de producto — Sistema',
      },
      {
        path: 'libreria',
        loadComponent: () =>
          import('./features/dashboard/placeholder-page/dashboard-placeholder-page.component').then(
            (m) => m.DashboardPlaceholderPageComponent
          ),
        data: {
          title: 'Librería',
          icon: 'book',
          description: 'Catálogo de productos, inventario y ventas de la librería. Este módulo está en construcción.',
        },
        title: 'Librería — Sistema',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
