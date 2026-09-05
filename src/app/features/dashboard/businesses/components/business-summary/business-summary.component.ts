import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { Business } from '../../../../../core/models';
import { CardComponent, IconComponent } from '../../../../../shared/ui';

interface SummaryTile {
  icon: string;
  title: string;
  value: string;
  description: string;
}

@Component({
  selector: 'app-business-summary',
  standalone: true,
  imports: [CardComponent, IconComponent],
  templateUrl: './business-summary.component.html',
  styleUrl: './business-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessSummaryComponent {
  private readonly businesses = signal<Business[]>([]);

  @Input({ required: true })
  set data(value: Business[]) {
    this.businesses.set(value);
  }

  readonly tiles = computed<SummaryTile[]>(() => {
    const businesses = this.businesses();
    const active = businesses.filter((b) => b.isActive).length;
    const inactive = businesses.length - active;

    return [
      {
        icon: 'shopping-bag',
        title: 'Total de negocios',
        value: `${businesses.length}`,
        description: 'líneas de negocio registradas',
      },
      {
        icon: 'check',
        title: 'Activos',
        value: `${active}`,
        description: 'disponibles para productos',
      },
      {
        icon: 'x-circle',
        title: 'Inactivos',
        value: `${inactive}`,
        description: 'desactivados',
      },
    ];
  });
}
