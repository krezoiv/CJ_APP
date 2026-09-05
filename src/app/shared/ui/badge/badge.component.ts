import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type BadgeTone = 'brand' | 'gold' | 'success' | 'danger' | 'neutral-dark' | 'neutral-light';

@Component({
  selector: 'app-badge',
  standalone: true,
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
  @Input() tone: BadgeTone = 'brand';
}
