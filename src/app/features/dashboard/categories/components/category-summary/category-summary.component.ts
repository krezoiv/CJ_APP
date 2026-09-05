import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { Category } from '../../../../../core/models';
import { CardComponent, IconComponent } from '../../../../../shared/ui';

interface SummaryTile {
  icon: string;
  title: string;
  value: string;
  description: string;
}

@Component({
  selector: 'app-category-summary',
  standalone: true,
  imports: [CardComponent, IconComponent],
  templateUrl: './category-summary.component.html',
  styleUrl: './category-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategorySummaryComponent {
  private readonly categories = signal<Category[]>([]);

  @Input({ required: true })
  set data(value: Category[]) {
    this.categories.set(value);
  }

  readonly tiles = computed<SummaryTile[]>(() => {
    const categories = this.categories();
    const active = categories.filter((c) => c.isActive).length;
    const inactive = categories.length - active;

    return [
      {
        icon: 'layers',
        title: 'Total de categorías',
        value: `${categories.length}`,
        description: 'categorías registradas',
      },
      {
        icon: 'check',
        title: 'Activas',
        value: `${active}`,
        description: 'disponibles para productos',
      },
      {
        icon: 'x-circle',
        title: 'Inactivas',
        value: `${inactive}`,
        description: 'desactivadas',
      },
    ];
  });
}
