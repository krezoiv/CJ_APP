import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { CatalogService } from '../../../../core/services/catalog.service';
import {
  ButtonComponent,
  CardComponent,
  IconComponent,
  SectionComponent,
  SectionHeadingComponent,
} from '../../../../shared/ui';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-catalog-preview',
  standalone: true,
  imports: [
    AsyncPipe,
    SectionComponent,
    SectionHeadingComponent,
    CardComponent,
    ButtonComponent,
    IconComponent,
    RevealOnScrollDirective,
  ],
  templateUrl: './catalog-preview.component.html',
  styleUrl: './catalog-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPreviewComponent {
  private readonly catalogService = inject(CatalogService);
  readonly categories$ = this.catalogService.getCategories();
}
