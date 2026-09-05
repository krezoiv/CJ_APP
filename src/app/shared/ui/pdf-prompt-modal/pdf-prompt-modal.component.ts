import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { PdfPromptModalService } from '../../../core/services/pdf-prompt-modal.service';
import { downloadBlob } from '../../../core/utils/download-blob';
import { extractBlobErrorMessage } from '../../../core/utils/extract-blob-error-message';
import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';

/**
 * The single global "¿Generar PDF?" prompt — mounted once in `AppComponent`,
 * exactly like `ConfirmDialogComponent`. X, "No", and "Cancelar" are three
 * visually distinct controls that all resolve to the same outcome (dismiss,
 * no PDF); "Sí, generar PDF" is the only action that fetches anything.
 *
 * Backdrop click is inert (no click handler on `.modal-backdrop` itself,
 * same mechanism `ConfirmDialogComponent` uses) — the only ways to close
 * this dialog are X/No/Cancelar or a successful download.
 */
@Component({
  selector: 'app-pdf-prompt-modal',
  standalone: true,
  imports: [ButtonComponent, IconComponent],
  templateUrl: './pdf-prompt-modal.component.html',
  styleUrl: './pdf-prompt-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfPromptModalComponent {
  private readonly pdfPromptModalService = inject(PdfPromptModalService);

  readonly pending = this.pdfPromptModalService.pending;
  readonly isGenerating = signal(false);
  readonly errorMessage = signal<string | null>(null);

  dismiss(): void {
    if (this.isGenerating()) {
      return;
    }
    this.errorMessage.set(null);
    this.pdfPromptModalService.dismiss();
  }

  generate(): void {
    const options = this.pending();
    if (!options || this.isGenerating()) {
      return;
    }

    this.errorMessage.set(null);
    this.isGenerating.set(true);
    options.generate().subscribe({
      next: (blob) => {
        this.isGenerating.set(false);
        downloadBlob(blob, options.filename);
        this.pdfPromptModalService.dismiss();
      },
      error: async (error: HttpErrorResponse) => {
        this.isGenerating.set(false);
        this.errorMessage.set(await extractBlobErrorMessage(error, 'No se pudo generar el PDF.'));
      },
    });
  }
}
