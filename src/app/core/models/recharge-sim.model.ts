/** SIM Claro / SIM Tigo — physical, stock-tracked products administered exclusively from Recargas Electrónicas. Fully separate from `RechargeType` (electronic balance) — never mix the two. */
export interface SimType {
  id: string;
  name: string;
  costPrice: number;
  publicPrice: number;
  isActive: boolean;
}

/**
 * One SIM type's stock row for a given day. `purchasedQuantity`/`soldQuantity`
 * (and their totals) are real, backend-computed sums of that day's
 * movements — informational, never derivable from `previousStock`/
 * `currentStock` alone, since a purchase and a sale on the same day both
 * move `currentStock` in opposite directions.
 */
export interface SimDailyStock {
  id: string;
  simTypeId: string;
  simTypeName: string;
  date: string;
  previousStock: number;
  purchasedQuantity: number;
  purchasedTotal: number;
  soldQuantity: number;
  soldTotal: number;
  currentStock: number;
  createdByUsername: string;
  updatedByUsername: string | null;
}

export interface RegisterSimPurchaseInput {
  simTypeId: string;
  quantity: number;
  /** `yyyy-MM-dd` — the operation-date picker's current value, not necessarily today. */
  operationDate: string;
}

export interface RegisterSimSaleInput {
  simTypeId: string;
  quantity: number;
  operationDate: string;
}
