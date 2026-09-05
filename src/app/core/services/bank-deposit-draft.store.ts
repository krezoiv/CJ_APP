import { Injectable, computed, inject, signal } from '@angular/core';

import { BANK_DEPOSIT_CASH_DENOMINATIONS } from '../models';
import { AuthService } from './auth.service';

export type CuadreStatus = 'red' | 'yellow' | 'green';

interface PersistedBankDepositDraft {
  transactionTypeId: string;
  transactionTypeName: string;
  transactionBankId: string;
  totalAmount: number;
  cashCounts: Record<string, number>;
  transactionAmounts: number[];
  clientName: string;
}

const STORAGE_PREFIX = 'cj_bank_deposit_draft:';

/** Rounds to 2 decimals before comparing — plain float arithmetic on money (e.g. 0.1 + 0.2) can otherwise miss an exact match by a fraction of a centavo. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function emptyCashCounts(): Record<string, number> {
  return Object.fromEntries(BANK_DEPOSIT_CASH_DENOMINATIONS.map((d) => [String(d), 0]));
}

/**
 * The in-progress "Transaccionar" deposit — a root-provided singleton so it
 * survives route navigation, mirroring `PurchaseDraftStore`'s exact reasoning
 * (see that store's own doc comment): Transaccionar has no server-side draft
 * either — nothing is sent to the backend until "Confirmar y Guardar" — so
 * this store is the only place the in-progress operation lives, persisted to
 * `sessionStorage` (not `localStorage`, same reasoning as Compras: real
 * money data shouldn't linger indefinitely on a shared machine) scoped by
 * the current user's id.
 */
@Injectable({ providedIn: 'root' })
export class BankDepositDraftStore {
  private readonly authService = inject(AuthService);

  /** Selected on Transaccionar's own dashboard before the registration form ever appears — see `TransaccionarPageComponent`'s own doc comment. */
  readonly transactionTypeId = signal('');
  readonly transactionTypeName = signal('');
  readonly transactionBankId = signal('');
  readonly totalAmount = signal(0);
  /** Keyed by denomination (as string, since object keys are always strings) — quantity per fixed denomination row. */
  readonly cashCounts = signal<Record<string, number>>(emptyCashCounts());
  /** One entry per sub-transaction row — length is "cantidad de transacciones". */
  readonly transactionAmounts = signal<number[]>([]);
  /** Free text, never required to save — see `RegisterBankDepositInput.clientName`'s own doc comment. */
  readonly clientName = signal('');

  readonly totalCash = computed(() =>
    round2(
      BANK_DEPOSIT_CASH_DENOMINATIONS.reduce(
        (sum, d) => sum + d * (this.cashCounts()[String(d)] || 0),
        0,
      ),
    ),
  );

  readonly totalDistributed = computed(() =>
    round2(this.transactionAmounts().reduce((sum, amount) => sum + (amount || 0), 0)),
  );

  readonly cashStatus = computed<CuadreStatus>(() => {
    const total = round2(this.totalAmount());
    const cash = this.totalCash();
    // A zero monto has nothing to cuadrar against yet — never claim "green"
    // for an effectively empty draft, even though 0 === 0 mathematically.
    if (total === 0) return 'yellow';
    if (cash === total) return 'green';
    return cash > total ? 'red' : 'yellow';
  });

  readonly transactionsStatus = computed<CuadreStatus>(() => {
    const total = round2(this.totalAmount());
    const distributed = this.totalDistributed();
    if (total === 0) return 'yellow';
    if (distributed === total) return 'green';
    return distributed > total ? 'red' : 'yellow';
  });

  /** The worst of the two sub-statuses — red beats yellow beats green. */
  readonly overallStatus = computed<CuadreStatus>(() => {
    const statuses = [this.cashStatus(), this.transactionsStatus()];
    if (statuses.includes('red')) return 'red';
    if (statuses.includes('yellow')) return 'yellow';
    return 'green';
  });

  /** The one gate that actually matters — mirrors the backend's own exact-match rule inside `register_bank_deposit_operation`. Never true for a zero total: an empty draft is not a valid cuadre. */
  readonly canSave = computed(
    () =>
      this.transactionTypeId() !== '' &&
      this.transactionBankId() !== '' &&
      round2(this.totalAmount()) > 0 &&
      this.transactionAmounts().length > 0 &&
      this.overallStatus() === 'green',
  );

  /** Whether there's anything worth confirming before discarding — deliberately excludes a bare type selection with nothing else entered yet, since going back to the dashboard from an untouched form has nothing to lose. */
  readonly hasMeaningfulProgress = computed(
    () =>
      this.transactionBankId() !== '' ||
      this.totalAmount() > 0 ||
      this.totalCash() > 0 ||
      this.transactionAmounts().length > 0 ||
      this.clientName().trim() !== '',
  );

  readonly hasActiveDraft = computed(
    () => this.transactionTypeId() !== '' || this.hasMeaningfulProgress(),
  );

  constructor() {
    this.restore();
  }

  setTransactionType(id: string, name: string): void {
    this.transactionTypeId.set(id);
    this.transactionTypeName.set(name);
    this.persist();
  }

  setTransactionBank(id: string): void {
    this.transactionBankId.set(id);
    this.persist();
  }

  setTotalAmount(amount: number): void {
    this.totalAmount.set(amount);
    this.persist();
  }

  setCashQuantity(denomination: number, quantity: number): void {
    this.cashCounts.update((counts) => ({ ...counts, [String(denomination)]: quantity }));
    this.persist();
  }

  /** Resizes `transactionAmounts` to `count` rows, padding new rows with `0` and truncating extras — the page component is responsible for confirming with the user before calling this when shrinking would discard already-typed amounts. */
  setTransactionCount(count: number): void {
    this.transactionAmounts.update((amounts) => {
      const next = amounts.slice(0, count);
      while (next.length < count) {
        next.push(0);
      }
      return next;
    });
    this.persist();
  }

  setTransactionAmount(index: number, amount: number): void {
    this.transactionAmounts.update((amounts) =>
      amounts.map((value, i) => (i === index ? amount : value)),
    );
    this.persist();
  }

  setClientName(name: string): void {
    this.clientName.set(name);
    this.persist();
  }

  /** The only sanctioned way to clear a draft — called after a confirmed save, when going back to the type dashboard, or on logout. */
  reset(): void {
    this.transactionTypeId.set('');
    this.transactionTypeName.set('');
    this.transactionBankId.set('');
    this.totalAmount.set(0);
    this.cashCounts.set(emptyCashCounts());
    this.transactionAmounts.set([]);
    this.clientName.set('');
    this.clearStorage();
  }

  private persist(): void {
    const key = this.storageKey();
    if (!key) {
      return;
    }
    const payload: PersistedBankDepositDraft = {
      transactionTypeId: this.transactionTypeId(),
      transactionTypeName: this.transactionTypeName(),
      transactionBankId: this.transactionBankId(),
      totalAmount: this.totalAmount(),
      cashCounts: this.cashCounts(),
      transactionAmounts: this.transactionAmounts(),
      clientName: this.clientName(),
    };
    try {
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // Storage unavailable (private browsing, quota exceeded) — the draft
      // still works for the rest of this tab session via the signals above,
      // it just won't survive a reload. Not worth surfacing to the user.
    }
  }

  private restore(): void {
    const key = this.storageKey();
    if (!key) {
      return;
    }
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as PersistedBankDepositDraft;
      this.transactionTypeId.set(parsed.transactionTypeId ?? '');
      this.transactionTypeName.set(parsed.transactionTypeName ?? '');
      this.transactionBankId.set(parsed.transactionBankId ?? '');
      this.totalAmount.set(parsed.totalAmount ?? 0);
      this.cashCounts.set({ ...emptyCashCounts(), ...(parsed.cashCounts ?? {}) });
      this.transactionAmounts.set(Array.isArray(parsed.transactionAmounts) ? parsed.transactionAmounts : []);
      this.clientName.set(parsed.clientName ?? '');
    } catch {
      sessionStorage.removeItem(key);
    }
  }

  private clearStorage(): void {
    const key = this.storageKey();
    if (key) {
      sessionStorage.removeItem(key);
    }
  }

  /** `null` when nobody is logged in yet — nothing to scope a key to, so persistence is silently skipped rather than falling back to a shared/anonymous key. */
  private storageKey(): string | null {
    const userId = this.authService.currentUser()?.id;
    return userId ? `${STORAGE_PREFIX}${userId}` : null;
  }
}
