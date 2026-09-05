/** An extensible stock location (Bodega, Vitrina, ...) — adding a new one is a backend admin action, never a frontend code change. */
export interface InventoryLocation {
  id: string;
  name: string;
  isActive: boolean;
}

/** A configurable unit of sale/purchase for one product (Unidad, Caja, Paquete...) — every product always has at least "Unidad" (factor 1, immutable). `name` is resolved from the master `PresentationType` catalog (`Sistema → Presentaciones y Medidas`) via `presentationTypeId` — never free text. */
export interface ProductPresentation {
  id: string;
  productId: string;
  presentationTypeId: string;
  name: string;
  conversionFactor: number;
  costPrice: number;
  publicPrice: number;
  isActive: boolean;
}

export type InventoryMovementType =
  | 'ENTRADA_COMPRA'
  | 'SALIDA_VENTA'
  | 'TRASLADO_SALIDA'
  | 'TRASLADO_ENTRADA';

export interface InventoryMovement {
  id: string;
  presentationName: string;
  locationFromName: string | null;
  locationToName: string | null;
  movementType: InventoryMovementType;
  quantityPresentation: number;
  conversionFactor: number;
  quantityBaseUnits: number;
  username: string;
  reason: string | null;
  createdAt: string;
}

export interface ProductInventoryDetail {
  productId: string;
  productName: string;
  sku: string | null;
  categoryName: string;
  totalStock: number;
  stockByLocation: { locationId: string; locationName: string; quantity: number; minStock: number }[];
  presentations: ProductPresentation[];
  recentMovements: InventoryMovement[];
}

export interface TransferInventoryInput {
  productId: string;
  presentationId?: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  reason?: string;
}

export interface CreatePresentationInput {
  presentationTypeId: string;
  conversionFactor: number;
  costPrice: number;
  publicPrice: number;
}

export interface UpdatePresentationInput {
  presentationTypeId?: string;
  conversionFactor?: number;
  costPrice?: number;
  publicPrice?: number;
  isActive?: boolean;
}

export const MOVEMENT_TYPE_LABEL: Record<InventoryMovementType, string> = {
  ENTRADA_COMPRA: 'Entrada por compra',
  SALIDA_VENTA: 'Salida por venta',
  TRASLADO_SALIDA: 'Salida por traslado',
  TRASLADO_ENTRADA: 'Entrada por traslado',
};
