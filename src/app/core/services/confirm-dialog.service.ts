import { Injectable, signal } from '@angular/core';

/**
 * Drives the copy/icon/button-variant defaults for `ConfirmDialogComponent`
 * — the exact type list from the "IMPLEMENTACIÓN GLOBAL DE CONFIRMACIONES"
 * ticket. Every field on `ConfirmDialogOptions` can still override the
 * type's default, since real usage always wants entity-specific copy
 * (exactly like every one of the 28 existing hand-built confirm modals
 * already has its own bespoke title/message).
 */
export type ConfirmDialogType =
  | 'SAVE'
  | 'UPDATE'
  | 'DELETE'
  | 'CANCEL'
  | 'CLOSE'
  | 'OPEN_DAY'
  | 'CLOSE_DAY'
  | 'FINANCIAL_OPERATION';

export type ConfirmDialogVariant = 'primary' | 'danger';

export interface ConfirmDialogOptions {
  type: ConfirmDialogType;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Overrides the type's default icon/button-variant pairing — rarely needed. */
  variant?: ConfirmDialogVariant;
  icon?: string;
}

export interface ResolvedConfirmDialogOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: ConfirmDialogVariant;
  icon: string;
}

interface ConfirmDialogTypeDefaults {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: ConfirmDialogVariant;
  icon: string;
}

const DEFAULT_CANCEL_TEXT = 'Cancelar';

/**
 * Defaults per type — copy/tone matched to what the 28 existing hand-built
 * confirm modals already established (past-tense "correctamente" success
 * toasts follow separately, via `NotificationService`; this only covers
 * the confirmation step itself). `icon`/`variant` fall into the same 3
 * clusters already observed across those modals: brand/primary for
 * save-type confirms, gold-toned caution for reopen/close-day type
 * actions (still `primary` variant — not destructive, just consequential),
 * and danger/red for delete.
 */
const TYPE_DEFAULTS: Record<ConfirmDialogType, ConfirmDialogTypeDefaults> = {
  SAVE: {
    title: 'Confirmar guardado',
    message: '¿Está seguro de que desea guardar esta información?',
    confirmText: 'Confirmar y Guardar',
    cancelText: DEFAULT_CANCEL_TEXT,
    variant: 'primary',
    icon: 'file-check',
  },
  UPDATE: {
    title: 'Confirmar actualización',
    message: '¿Está seguro de que desea guardar los cambios realizados?',
    confirmText: 'Confirmar cambios',
    cancelText: DEFAULT_CANCEL_TEXT,
    variant: 'primary',
    icon: 'file-check',
  },
  DELETE: {
    title: 'Confirmar eliminación',
    message: '¿Está seguro de que desea realizar esta acción? Esta operación puede afectar la información existente.',
    confirmText: 'Confirmar',
    cancelText: DEFAULT_CANCEL_TEXT,
    variant: 'danger',
    icon: 'alert-triangle',
  },
  CANCEL: {
    title: 'Descartar cambios',
    message: 'Tiene cambios sin guardar. ¿Está seguro de que desea descartarlos?',
    confirmText: 'Sí, descartar',
    cancelText: 'Continuar editando',
    variant: 'danger',
    icon: 'alert-triangle',
  },
  CLOSE: {
    title: 'Cambios sin guardar',
    message: 'Tiene cambios que aún no han sido guardados. ¿Está seguro de que desea cerrar?',
    confirmText: 'Sí, descartar',
    cancelText: 'Continuar editando',
    variant: 'danger',
    icon: 'alert-triangle',
  },
  OPEN_DAY: {
    title: 'Confirmar apertura del día',
    message: '¿Desea aperturar el día para comenzar a registrar operaciones?',
    confirmText: 'Aperturar Día',
    cancelText: DEFAULT_CANCEL_TEXT,
    variant: 'primary',
    icon: 'lock',
  },
  CLOSE_DAY: {
    title: 'Confirmar cierre del día',
    message: 'Está a punto de cerrar el día actual. Después del cierre, las operaciones quedarán bloqueadas. ¿Desea continuar?',
    confirmText: 'Confirmar cierre',
    cancelText: DEFAULT_CANCEL_TEXT,
    variant: 'primary',
    icon: 'lock',
  },
  FINANCIAL_OPERATION: {
    title: 'Confirmar operación financiera',
    message: '¿Está seguro de que desea realizar esta operación financiera?',
    confirmText: 'Confirmar',
    cancelText: DEFAULT_CANCEL_TEXT,
    variant: 'primary',
    icon: 'file-check',
  },
};

interface PendingConfirmDialog {
  options: ResolvedConfirmDialogOptions;
  resolve: (confirmed: boolean) => void;
}

/**
 * Global, reusable "are you sure?" mechanism — the `ConfirmDialogService`/
 * `ConfirmDialogComponent` pair mirrors `NotificationService`/
 * `ToastContainerComponent` exactly (root-provided signal-based service +
 * one component mounted once in `AppComponent`). Only one dialog can be
 * open at a time — `confirm()` is always awaited before the next user
 * action is possible, so a second concurrent request is not a real case.
 *
 * Deliberately does NOT own a loading/`isSaving` state: the promise
 * resolves and the dialog closes the instant the user clicks the confirm
 * button, and the caller's own existing `isSubmitting` signal (already
 * present on every CRUD form-modal) takes over immediately after — see
 * the plan's own reasoning for why this keeps the rollout to a one-line
 * `await` insertion per form instead of restructuring every consumer.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly pending = signal<PendingConfirmDialog | null>(null);

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    const defaults = TYPE_DEFAULTS[options.type];
    const resolved: ResolvedConfirmDialogOptions = {
      title: options.title ?? defaults.title,
      message: options.message ?? defaults.message,
      confirmText: options.confirmText ?? defaults.confirmText,
      cancelText: options.cancelText ?? defaults.cancelText,
      variant: options.variant ?? defaults.variant,
      icon: options.icon ?? defaults.icon,
    };

    return new Promise<boolean>((resolve) => {
      this.pending.set({
        options: resolved,
        resolve: (confirmed) => {
          this.pending.set(null);
          resolve(confirmed);
        },
      });
    });
  }

  /** Called by `ConfirmDialogComponent` only — resolves the in-flight promise and closes the dialog. */
  respond(confirmed: boolean): void {
    this.pending()?.resolve(confirmed);
  }
}
