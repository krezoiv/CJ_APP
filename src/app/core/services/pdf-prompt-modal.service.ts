import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

export interface PdfPromptOptions {
  title: string;
  message?: string;
  /** Fetches the PDF `Blob` on demand — only ever called when the user clicks "Sí, generar PDF". */
  generate: () => Observable<Blob>;
  filename: string;
}

const DEFAULT_MESSAGE = '¿Desea generar el PDF de esta operación?';

/**
 * A dedicated, small modal for the post-save "¿Generar PDF?" prompt used by
 * Ventas/Compras — deliberately NOT built on `ConfirmDialogService`, which
 * only ever renders exactly two buttons (Cancelar/Confirmar) and has no
 * loading/error state of its own (by design — see its own doc comment).
 * This prompt needs three visible dismiss controls (X/No/Cancelar, all the
 * same logical outcome) plus a fourth "Sí, generar PDF" action that has its
 * own async loading/error lifecycle, so it gets its own small component
 * instead of stretching the generic one.
 *
 * `prompt()` is fire-and-forget, unlike `ConfirmDialogService.confirm()` —
 * the caller's own save flow has already fully completed by the time this
 * modal opens (it only ever appears *after* a successful save), so there is
 * nothing for the caller to await; the modal's own outcome (dismiss or
 * download) is entirely self-contained.
 */
@Injectable({ providedIn: 'root' })
export class PdfPromptModalService {
  readonly pending = signal<PdfPromptOptions | null>(null);

  prompt(options: PdfPromptOptions): void {
    this.pending.set({ message: DEFAULT_MESSAGE, ...options });
  }

  /** Called by `PdfPromptModalComponent` only — closes the dialog (X/No/Cancelar or a successful download). */
  dismiss(): void {
    this.pending.set(null);
  }
}
