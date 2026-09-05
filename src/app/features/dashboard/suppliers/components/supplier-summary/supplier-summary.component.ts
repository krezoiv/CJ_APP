import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { Supplier } from '../../../../../core/models';
import { CardComponent, IconComponent } from '../../../../../shared/ui';

interface SummaryTile {
  icon: string;
  title: string;
  value: string;
  description: string;
}

@Component({
  selector: 'app-supplier-summary',
  standalone: true,
  imports: [CardComponent, IconComponent],
  templateUrl: './supplier-summary.component.html',
  styleUrl: './supplier-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierSummaryComponent {
  private readonly suppliers = signal<Supplier[]>([]);

  @Input({ required: true })
  set data(value: Supplier[]) {
    this.suppliers.set(value);
  }

  readonly tiles = computed<SummaryTile[]>(() => {
    const suppliers = this.suppliers();
    const active = suppliers.filter((s) => s.isActive).length;
    const inactive = suppliers.length - active;

    return [
      {
        icon: 'truck',
        title: 'Total de proveedores',
        value: `${suppliers.length}`,
        description: 'proveedores registrados',
      },
      {
        icon: 'check',
        title: 'Activos',
        value: `${active}`,
        description: 'disponibles para compras',
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
