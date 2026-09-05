import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { BadgeComponent, BadgeTone } from '../badge/badge.component';

@Component({
  selector: 'app-section-heading',
  standalone: true,
  imports: [BadgeComponent],
  templateUrl: './section-heading.component.html',
  styleUrl: './section-heading.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionHeadingComponent {
  @Input() eyebrow?: string;
  @Input() eyebrowTone: BadgeTone = 'brand';
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() align: 'left' | 'center' = 'center';
}
