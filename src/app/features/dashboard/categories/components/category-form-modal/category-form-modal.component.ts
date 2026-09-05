import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Category } from '../../../../../core/models';
import { CategoryService } from '../../../../../core/services/category.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

@Component({
  selector: 'app-category-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  templateUrl: './category-form-modal.component.html',
  styleUrl: './category-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryFormModalComponent implements OnChanges {
  @Input() open = false;
  /** null = create mode, a Category = edit mode (form is pre-filled from it). */
  @Input() category: Category | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Category>();

  private readonly fb = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    description: ['', Validators.maxLength(255)],
  });

  get isEditMode(): boolean {
    return this.category !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] || !this.open) {
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(false);

    if (this.category) {
      this.form.reset({ name: this.category.name, description: this.category.description ?? '' });
    } else {
      this.form.reset({ name: '', description: '' });
    }
  }

  async submit(): Promise<void> {
    this.errorMessage.set(null);

    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      type: this.isEditMode ? 'UPDATE' : 'SAVE',
    });
    if (!confirmed) {
      return;
    }

    const { name, description } = this.form.getRawValue();
    const input = { name, description: description || undefined };
    this.isSubmitting.set(true);

    const request$ = this.isEditMode
      ? this.categoryService.updateCategory(this.category!.id, input)
      : this.categoryService.createCategory(input);

    request$.subscribe({
      next: (category) => {
        this.isSubmitting.set(false);
        this.saved.emit(category);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'No se pudo guardar la categoría. Inténtalo de nuevo.'));
      },
    });
  }

  async close(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }
    if (this.form.dirty) {
      const discard = await this.confirmDialogService.confirm({ type: 'CANCEL' });
      if (!discard) {
        return;
      }
    }
    this.closed.emit();
  }
}
