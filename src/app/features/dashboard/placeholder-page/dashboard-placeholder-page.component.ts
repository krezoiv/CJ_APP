import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

import { BadgeComponent, IconComponent } from '../../../shared/ui';

export interface DashboardPlaceholderData {
  title: string;
  icon: string;
  description: string;
}

/**
 * Generic "coming soon" page for a dashboard module. Route `data` supplies
 * the copy (see app.routes.ts) so Sistema/Finanzas/Bancos/Librería don't
 * each need their own near-identical component until there is real
 * module-specific UI to build.
 */
@Component({
  selector: 'app-dashboard-placeholder-page',
  standalone: true,
  imports: [BadgeComponent, IconComponent],
  templateUrl: './dashboard-placeholder-page.component.html',
  styleUrl: './dashboard-placeholder-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly data = toSignal(
    this.route.data.pipe(map((data) => data as DashboardPlaceholderData)),
    { requireSync: true }
  );
}
