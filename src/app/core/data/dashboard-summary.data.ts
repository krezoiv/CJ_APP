import { DashboardSummaryItem } from '../models';

/** Mock figures — phase 2 replaces these with real aggregates from the backend. */
export const DASHBOARD_SUMMARY: DashboardSummaryItem[] = [
  {
    id: 'sistema',
    icon: 'briefcase',
    title: 'Sistema',
    value: '4',
    description: 'módulos activos',
    path: 'sistema',
  },
  {
    id: 'finanzas',
    icon: 'trending-up',
    title: 'Finanzas',
    value: 'S/ 12,450',
    description: 'ingresos estimados este mes',
    path: 'finanzas',
  },
  {
    id: 'bancos',
    icon: 'bank',
    title: 'Bancos',
    value: '128',
    description: 'operaciones este mes',
    path: 'bancos',
  },
  {
    id: 'libreria',
    icon: 'book',
    title: 'Librería',
    value: '512',
    description: 'productos en catálogo',
    path: 'libreria',
  },
];
