import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { Bank } from '../../../../../core/models';
import { CardComponent, IconComponent } from '../../../../../shared/ui';

interface SummaryTile {
  icon: string;
  title: string;
  value: string;
  description: string;
}

@Component({
  selector: 'app-bank-summary',
  standalone: true,
  imports: [CardComponent, IconComponent],
  templateUrl: './bank-summary.component.html',
  styleUrl: './bank-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BankSummaryComponent {
  private readonly banks = signal<Bank[]>([]);

  @Input({ required: true })
  set data(value: Bank[]) {
    this.banks.set(value);
  }

  readonly tiles = computed<SummaryTile[]>(() => {
    const banks = this.banks();
    const active = banks.filter((b) => b.isActive).length;
    const inactive = banks.length - active;

    return [
      {
        icon: 'bank',
        title: 'Total de bancos',
        value: `${banks.length}`,
        description: 'bancos registrados',
      },
      {
        icon: 'check',
        title: 'Activos',
        value: `${active}`,
        description: 'disponibles para cuadre',
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
