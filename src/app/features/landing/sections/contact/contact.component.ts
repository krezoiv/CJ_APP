import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { SITE } from '../../../../core/data';
import { ContactService } from '../../../../core/services/contact.service';
import { ButtonComponent, IconComponent, SectionComponent, SectionHeadingComponent } from '../../../../shared/ui';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ReactiveFormsModule, SectionComponent, SectionHeadingComponent, ButtonComponent, IconComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent {
  private readonly fb = inject(FormBuilder);
  private readonly contactService = inject(ContactService);

  readonly site = SITE;
  readonly channels = this.contactService.getChannels();
  readonly interests = this.contactService.getInterests();

  readonly isSubmitting = signal(false);
  readonly isSubmitted = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(6)]],
    interest: [this.interests[0], Validators.required],
    message: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.contactService.submit(this.form.getRawValue()).subscribe(() => {
      this.isSubmitting.set(false);
      this.isSubmitted.set(true);
      this.form.reset({ name: '', phone: '', interest: this.interests[0], message: '' });
    });
  }
}
