import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { ContainerComponent } from '../container/container.component';

export type SectionTone = 'light' | 'muted' | 'dark';
export type SectionSpacing = 'sm' | 'md' | 'lg';

/**
 * Standard section shell: consistent vertical rhythm, background tone and a
 * centered container. Every landing block should be wrapped in this so
 * spacing stays uniform and easy to retune from one place.
 */
@Component({
  selector: 'app-section',
  standalone: true,
  imports: [ContainerComponent],
  templateUrl: './section.component.html',
  styleUrl: './section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionComponent {
  /** Anchor id used by in-page navigation (e.g. #quienes-somos). */
  @Input() sectionId?: string;
  @Input() tone: SectionTone = 'light';
  @Input() spacing: SectionSpacing = 'md';
  @Input() wideContainer = false;
}
