export interface DashboardSummaryItem {
  id: string;
  icon: string;
  title: string;
  value: string;
  description: string;
  /** Path segment relative to /dashboard this card links to. */
  path: string;
}
