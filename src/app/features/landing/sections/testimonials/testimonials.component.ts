import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TestimonialsService } from '../../../../core/services/testimonials.service';
import { CardComponent, IconComponent, SectionComponent, SectionHeadingComponent } from '../../../../shared/ui';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [AsyncPipe, SectionComponent, SectionHeadingComponent, CardComponent, IconComponent, RevealOnScrollDirective],
  templateUrl: './testimonials.component.html',
  styleUrl: './testimonials.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestimonialsComponent {
  private readonly testimonialsService = inject(TestimonialsService);
  readonly testimonials$ = this.testimonialsService.getTestimonials();
  readonly stars = [1, 2, 3, 4, 5];
}
