import { AfterViewChecked, ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core';

import { ConfirmDialogService, ConfirmDialogVariant } from '../../../core/services/confirm-dialog.service';
import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';

const ICON_TONE_BY_VARIANT: Record<ConfirmDialogVariant, string> = {
  primary: 'confirm-dialog__icon--primary',
  danger: 'confirm-dialog__icon--danger',
};

/**
 * The single global confirmation dialog — mounted once in `AppComponent`,
 * exactly like `ToastContainerComponent`, and driven by `ConfirmDialogService`.
 * Reuses the exact `.modal-backdrop`/`.modal`/`.modal__icon`/`.modal__title`/
 * `.modal__description`/`.modal__actions` visual pattern already proven
 * (byte-identical for the first two, semantically-varied for the rest)
 * across the 28 existing hand-built confirm modals in this app.
 *
 * Backdrop click and Escape are both deliberately inert — this is the
 * flagship instance of the app-wide "no closing on accidental outside
 * interaction" policy. The only ways to resolve this dialog are the
 * Cancelar button and the Confirmar button.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ButtonComponent, IconComponent],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent implements AfterViewChecked {
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);

  readonly pending = this.confirmDialogService.pending;

  private hasFocusedCurrentDialog = false;

  iconToneClass(variant: ConfirmDialogVariant): string {
    return ICON_TONE_BY_VARIANT[variant];
  }

  /**
   * Moves focus to "Cancelar" (the safe default, so a stray Enter never
   * triggers the confirming/destructive action) the moment the dialog
   * actually renders. Queries the DOM directly for the first native
   * `&lt;button&gt;` inside `.modal__actions` rather than a `@ViewChild` on
   * `&lt;app-button&gt;` itself — `app-button` is a custom element wrapping its
   * own native `&lt;button&gt;`/`&lt;a&gt;`, so focusing its host does nothing;
   * the actual focusable element lives one level inside it.
   * `AfterViewChecked` rather than an `effect()` tied to `pending()`
   * because the button only exists in the DOM once `@if (pending())` has
   * rendered it — a plain effect would race the query on the same change
   * detection pass.
   */
  ngAfterViewChecked(): void {
    if (!this.pending()) {
      this.hasFocusedCurrentDialog = false;
      return;
    }
    if (this.hasFocusedCurrentDialog) {
      return;
    }
    const cancelButton = this.elementRef.nativeElement.querySelector<HTMLButtonElement>('.modal__actions button');
    if (cancelButton) {
      this.hasFocusedCurrentDialog = true;
      cancelButton.focus();
    }
  }

  /** Only two focusable elements ever exist here — Tab/Shift+Tab simply toggles between them, keeping focus from ever escaping to whatever is behind the dialog. */
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }
    event.preventDefault();
    const dialog = (event.currentTarget as HTMLElement) ?? null;
    const focusable = dialog?.querySelectorAll<HTMLButtonElement>('button');
    if (!focusable || focusable.length === 0) {
      return;
    }
    const isShift = event.shiftKey;
    const active = document.activeElement;
    const currentIndex = Array.from(focusable).indexOf(active as HTMLButtonElement);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + (isShift ? -1 : 1) + focusable.length) % focusable.length;
    focusable[nextIndex].focus();
  }

  confirm(): void {
    this.confirmDialogService.respond(true);
  }

  cancel(): void {
    this.confirmDialogService.respond(false);
  }
}
