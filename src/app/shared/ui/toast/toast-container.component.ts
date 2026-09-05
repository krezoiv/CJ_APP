import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NotificationService } from '../../../core/services/notification.service';
import { IconComponent } from '../icon/icon.component';

const ICON_BY_TYPE: Record<string, string> = {
  success: 'check-circle',
  error: 'x-circle',
  warning: 'alert-triangle',
  info: 'alert-circle',
};

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastContainerComponent {
  private readonly notificationService = inject(NotificationService);

  readonly toasts = this.notificationService.toasts;

  iconFor(type: string): string {
    return ICON_BY_TYPE[type] ?? 'alert-circle';
  }

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }
}
