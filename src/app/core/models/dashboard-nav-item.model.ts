export interface DashboardNavItem {
  label: string;
  icon: string;
  /** Path segment relative to /dashboard, '' for the overview page. */
  path: string;
  /** Sub-items rendered nested under this one, e.g. Inventario under Librería. */
  children?: DashboardNavItem[];
  /** Restricts visibility to these roles. Omit for "visible to every authenticated role". UI-only — the backend re-checks on every request. */
  roles?: string[];
}
