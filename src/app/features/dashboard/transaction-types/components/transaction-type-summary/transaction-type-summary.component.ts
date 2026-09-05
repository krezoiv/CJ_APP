import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { TransactionType } from '../../../../../core/models';
import { CardComponent, IconComponent } from '../../../../../shared/ui';

interface SummaryTile {
  icon: string;
  title: string;
  value: string;
  description: string;
}

@Component({
  selector: 'app-transaction-type-summary',
  standalone: true,
  imports: [CardComponent, IconComponent],
  templateUrl: './transaction-type-summary.component.html',
  styleUrl: './transaction-type-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionTypeSummaryComponent {
  private readonly transactionTypes = signal<TransactionType[]>([]);

  @Input({ required: true })
  set data(value: TransactionType[]) {
    this.transactionTypes.set(value);
  }

  readonly tiles = computed<SummaryTile[]>(() => {
    const transactionTypes = this.transactionTypes();
    const active = transactionTypes.filter((a) => a.isActive).length;
    const inactive = transactionTypes.length - active;

    return [
      {
        icon: 'bank',
        title: 'Total de tipos de transacción',
        value: `${transactionTypes.length}`,
        description: 'registrados',
      },
      {
        icon: 'check',
        title: 'Activos',
        value: `${active}`,
        description: 'disponibles para Transaccionar',
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
