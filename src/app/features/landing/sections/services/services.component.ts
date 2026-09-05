import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { OffersService } from '../../../../core/services/offers.service';
import { BadgeComponent, CardComponent, IconComponent, SectionComponent, SectionHeadingComponent } from '../../../../shared/ui';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [
    AsyncPipe,
    SectionComponent,
    SectionHeadingComponent,
    CardComponent,
    BadgeComponent,
    IconComponent,
    RevealOnScrollDirective,
  ],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesComponent {
  private readonly offersService = inject(OffersService);
  readonly services$ = this.offersService.getServices();
}
