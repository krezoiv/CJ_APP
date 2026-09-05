export interface ServiceItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  /** Short tag shown as a pill on the card, e.g. "Más solicitado". */
  tag?: string;
}
