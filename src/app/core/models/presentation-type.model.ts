export interface PresentationType {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByUsername: string;
  updatedBy: string | null;
  updatedByUsername: string | null;
}

/** List rows carry `usageCount` — how many `product_presentations` rows currently reference this type — the plain `PresentationType` shape (create/update responses) does not. */
export interface PresentationTypeListItem extends PresentationType {
  usageCount: number;
}

/** Payload for create/update — the backend assigns id/timestamps/audit fields. */
export interface PresentationTypeInput {
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface PresentationTypeFilters {
  includeInactive?: boolean;
  search?: string;
}
