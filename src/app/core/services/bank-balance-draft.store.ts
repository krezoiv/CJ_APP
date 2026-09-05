import { Injectable, computed, inject, signal } from '@angular/core';

import { AuthService } from './auth.service';

/** Local-time `yyyy-MM-dd`, no UTC-offset dance — same technique every other date-driven page in this app already uses (Recargas, Reports, Bancos). */
function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface PersistedBankBalanceDraft {
  operationDate: string;
  draftFinalBalances: Record<string, number>;
}

const STORAGE_PREFIX = 'cj_bank_balance_draft:';

/**
 * The in-progress "Agentes Bancarios → Bancos" cuadre — same root-provided,
 * sessionStorage-backed singleton pattern as `PurchaseDraftStore`/
 * `IceCreamPurchaseDraftStore` (see those files' own doc comments for the
 * full reasoning): nothing is sent to the backend until "Guardar Cambios",
 * and navigating away and back must never lose what was typed.
 *
 * Only *entered* saldo final values live here — bank name/account
 * number/tipo/saldo anterior are always re-fetched from the backend (see
 * `BankBalanceService.getBalancesView`), never persisted client-side, so
 * this store can never drift from what Sistema → Bancos currently has
 * configured.
 *
 * `operationDate` is now the single source of truth for the WHOLE
 * "Agentes Bancarios" cycle, not just Bancos — `CuadreAgentesPageComponent`
 * reads it too, so both screens always operate on the exact same date
 * instead of each independently guessing "today" and risking a silent
 * mismatch (the bug this dual-consumption was added to fix). It only
 * injects this store for `operationDate()`; it has no reason to read or
 * write `draftFinalBalances`, which stays exclusively Bancos' own concern.
 */
@Injectable({ providedIn: 'root' })
export class BankBalanceDraftStore {
  private readonly authService = inject(AuthService);

  readonly operationDate = signal(todayIsoDate());
  readonly draftFinalBalances = signal<Record<string, number>>({});

  /** At least one saldo final has been typed — same "operación en proceso" rule used elsewhere to gate the sidebar indicator. */
  readonly hasActiveDraft = computed(() => Object.keys(this.draftFinalBalances()).length > 0);

  constructor() {
    this.restore();
  }

  setFinalBalance(bankId: string, finalBalance: number): void {
    this.draftFinalBalances.update((entries) => ({ ...entries, [bankId]: finalBalance }));
    this.persist();
  }

  /**
   * "Poner Saldos en Cero" — sets every bank in the current list's draft
   * to 0, in a single update. Only touches this store's temporary state
   * (and its `sessionStorage` copy); never calls the backend on its own —
   * real persistence still only happens when the user presses "Guardar
   * Cambios".
   */
  zeroAll(bankIds: string[]): void {
    this.draftFinalBalances.update((entries) => {
      const next = { ...entries };
      for (const bankId of bankIds) {
        next[bankId] = 0;
      }
      return next;
    });
    this.persist();
  }

  removeFinalBalance(bankId: string): void {
    this.draftFinalBalances.update((entries) => {
      const { [bankId]: _removed, ...rest } = entries;
      return rest;
    });
    this.persist();
  }

  /** Picking another date must never mix its data with the previously viewed one — no local merge, just a clean slate for the new date (same rule Recargas' own date picker follows). */
  setOperationDate(date: string): void {
    this.operationDate.set(date);
    this.draftFinalBalances.set({});
    this.persist();
  }

  /** The only sanctioned way to clear a draft — called after a confirmed save. Wipes both the in-memory signal and the persisted sessionStorage entry for the entered values, but keeps the current operation date. */
  reset(): void {
    this.draftFinalBalances.set({});
    this.persist();
  }

  private persist(): void {
    const key = this.storageKey();
    if (!key) {
      return;
    }
    const payload: PersistedBankBalanceDraft = {
      operationDate: this.operationDate(),
      draftFinalBalances: this.draftFinalBalances(),
    };
    try {
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // Storage unavailable (private browsing, quota exceeded) — the draft
      // still works for the rest of this tab session via the signals above.
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
      const parsed = JSON.parse(raw) as PersistedBankBalanceDraft;
      this.operationDate.set(parsed.operationDate ?? todayIsoDate());
      this.draftFinalBalances.set(parsed.draftFinalBalances ?? {});
    } catch {
      sessionStorage.removeItem(key);
    }
  }

  private storageKey(): string | null {
    const userId = this.authService.currentUser()?.id;
    return userId ? `${STORAGE_PREFIX}${userId}` : null;
  }
}
