export interface UnitOfMeasure {
  id: string;
  name: string;
  abbreviation: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByUsername: string;
  updatedBy: string | null;
  updatedByUsername: string | null;
}

/** List rows carry `usageCount` — how many `products` rows currently reference this unit — the plain `UnitOfMeasure` shape (create/update responses) does not. */
export interface UnitOfMeasureListItem extends UnitOfMeasure {
  usageCount: number;
}

/** Payload for create/update — the backend assigns id/timestamps/audit fields. */
export interface UnitOfMeasureInput {
  name: string;
  abbreviation: string;
  description?: string;
  isActive?: boolean;
}

export interface UnitOfMeasureFilters {
  includeInactive?: boolean;
  search?: string;
}
