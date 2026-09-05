import { Directive, ElementRef, HostListener, Input, Renderer2, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const NAVIGATION_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
]);

/**
 * The one reusable way to accept a number from the user across this app —
 * every price/monto/saldo/stock/cantidad field should use
 * `<input type="text" inputmode="decimal" appDecimalInput ...>` (or
 * `[appDecimalInput]="0"` for an integer-only field like stock) instead of
 * `<input type="number">`.
 *
 * `type="number"` is what created the bugs this directive exists to close
 * for good: its native up/down spinner steps the value on an accidental
 * arrow-key press or a mouse-wheel scroll while the field happens to be
 * focused, and it silently accepts things like "1e5" or a second "-" that
 * don't parse back predictably. A plain text input has none of that
 * built in — nothing to disable, because none of it exists — so this
 * directive only needs to add back the one thing a text input is missing:
 * restricting *what* can be typed.
 *
 * When applied to a `formControlName`/`[(ngModel)]` host, this directive
 * doubles as that control's `ControlValueAccessor` (see the
 * `NG_VALUE_ACCESSOR` provider below) — Angular's own `DefaultValueAccessor`
 * would otherwise store the raw display string, but the fields this
 * directive is meant for (`Validators.min`, `.getRawValue().amount`, etc.
 * throughout the app) all assume a real `number | null`. Used instead as a
 * plain `[value]`/`(input)`-bound cell (most per-row table cells in this
 * app, e.g. `PurchaseItemsTableComponent`), the CVA half is simply never
 * invoked — nothing to change there, those handlers already read
 * `$event.target.value` as a string themselves.
 */
@Directive({
  selector: 'input[appDecimalInput]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DecimalInputDirective),
      multi: true,
    },
  ],
})
export class DecimalInputDirective implements ControlValueAccessor {
  /** Max decimal places allowed — 2 for money (the default), 0 for an integer-only field (stock, cantidades). */
  @Input() appDecimalInput: number | '' = 2;
  /** Set true only for the rare field that may legitimately go negative (e.g. a "resultado del cuadre" difference is never typed directly, but a future signed field could opt in). */
  @Input() allowNegative = false;

  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  private get decimals(): number {
    return this.appDecimalInput === '' ? 2 : this.appDecimalInput;
  }

  // ---- ControlValueAccessor — only ever exercised under formControlName/ngModel ----

  writeValue(value: number | string | null): void {
    const display = value === null || value === undefined || value === '' ? '' : String(value);
    this.renderer.setProperty(this.el.nativeElement, 'value', display);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.renderer.setProperty(this.el.nativeElement, 'disabled', isDisabled);
  }

  @HostListener('input')
  onInput(): void {
    const raw = this.el.nativeElement.value.trim();
    if (raw === '' || raw === '-') {
      this.onChange(null);
      return;
    }
    const parsed = Number(raw);
    this.onChange(Number.isFinite(parsed) ? parsed : null);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
  }

  // ---- Keystroke/paste filtering — applies no matter how the value is bound ----

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || NAVIGATION_KEYS.has(event.key)) {
      return;
    }

    const input = this.el.nativeElement;
    const value = input.value;

    if (event.key === '-') {
      const cursorAtStart = input.selectionStart === 0;
      if (!this.allowNegative || value.includes('-') || !cursorAtStart) {
        event.preventDefault();
      }
      return;
    }

    if (event.key === '.') {
      if (this.decimals === 0 || value.includes('.')) {
        event.preventDefault();
      }
      return;
    }

    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      return;
    }

    // A digit — still reject it if it would push an already-typed
    // fractional part past the allowed number of decimal places. Cursor
    // position is fully reliable here (unlike on a native `type="number"`
    // input, where `selectionStart` throws in Firefox), so this correctly
    // still allows inserting a digit into the integer part of a value that
    // already has a full set of decimals.
    const dotIndex = value.indexOf('.');
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    if (dotIndex !== -1 && start > dotIndex && start === end) {
      const decimalsAfterCursor = value.length - dotIndex - 1;
      if (decimalsAfterCursor >= this.decimals) {
        event.preventDefault();
      }
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const pasted = (event.clipboardData?.getData('text') ?? '').trim();
    const sign = this.allowNegative ? '-?' : '';
    const pattern =
      this.decimals > 0
        ? new RegExp(`^${sign}\\d*(\\.\\d{0,${this.decimals}})?$`)
        : new RegExp(`^${sign}\\d*$`);
    if (!pattern.test(pasted)) {
      event.preventDefault();
    }
  }
}
