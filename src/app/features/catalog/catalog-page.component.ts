import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { SITE } from '../../core/data';
import { CatalogService } from '../../core/services/catalog.service';
import { BadgeComponent, ButtonComponent, CardComponent, IconComponent, SectionComponent } from '../../shared/ui';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [AsyncPipe, SectionComponent, CardComponent, BadgeComponent, ButtonComponent, IconComponent],
  templateUrl: './catalog-page.component.html',
  styleUrl: './catalog-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPageComponent {
  private readonly catalogService = inject(CatalogService);
  readonly site = SITE;
  readonly categories$ = this.catalogService.getCategories();
}
