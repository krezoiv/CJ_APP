import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { StatsService } from '../../../../core/services/stats.service';
import { SectionComponent, StatCardComponent } from '../../../../shared/ui';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-credibility',
  standalone: true,
  imports: [AsyncPipe, SectionComponent, StatCardComponent, RevealOnScrollDirective],
  templateUrl: './credibility.component.html',
  styleUrl: './credibility.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CredibilityComponent {
  private readonly statsService = inject(StatsService);
  readonly stats$ = this.statsService.getStats();
}
