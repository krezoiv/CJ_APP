export interface TicketItem {
  id: string;
  productId: string;
  productName: string;
  presentationName: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  observation: string | null;
}

/** A Ticket is explicitly NOT a real sale — it never affects inventory, reports, or the dashboard. See the backend's own `create_ticket` function for the structural guarantee. */
export interface Ticket {
  id: string;
  ticketNumber: string;
  clientId: string | null;
  clientName: string | null;
  userId: string;
  username: string;
  subtotal: number;
  discount: number;
  total: number;
  isVoided: boolean;
  voidedAt: string | null;
  voidedBy: string | null;
  voidedByUsername: string | null;
  voidReason: string | null;
  items: TicketItem[];
  createdAt: string;
  updatedAt: string;
}

/** `GET /tickets` list rows — no line items, mirrors `SaleSummary`'s own shape. */
export interface TicketSummary {
  id: string;
  ticketNumber: string;
  clientId: string | null;
  clientName: string | null;
  userId: string;
  username: string;
  total: number;
  isVoided: boolean;
  createdAt: string;
}

export interface CreateTicketItemInput {
  productId: string;
  quantity: number;
  observation?: string;
  /** Optional manual price override for this line — saved only on this ticket, never written back to the product's own real price. */
  unitPrice?: number;
}

export interface CreateTicketInput {
  clientId?: string;
  items: CreateTicketItemInput[];
}

export interface ListTicketsQuery {
  page?: number;
  limit?: number;
}

/** A cart line while a ticket is still being built on-screen — never sent to the backend as-is, only `{productId, quantity}` is. */
export interface TicketDraftItem {
  productId: string;
  name: string;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  observation: string;
}

export function calculateTicketDraftItemTotal(item: TicketDraftItem): number {
  return item.unitPrice * item.quantity;
}

export function calculateTicketDraftTotal(items: TicketDraftItem[]): number {
  return items.reduce((sum, item) => sum + calculateTicketDraftItemTotal(item), 0);
}
