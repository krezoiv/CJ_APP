import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { TransactionBank } from '../../../../../core/models';
import { CardComponent, IconComponent } from '../../../../../shared/ui';

interface SummaryTile {
  icon: string;
  title: string;
  value: string;
  description: string;
}

@Component({
  selector: 'app-transaction-bank-summary',
  standalone: true,
  imports: [CardComponent, IconComponent],
  templateUrl: './transaction-bank-summary.component.html',
  styleUrl: './transaction-bank-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionBankSummaryComponent {
  private readonly transactionBanks = signal<TransactionBank[]>([]);

  @Input({ required: true })
  set data(value: TransactionBank[]) {
    this.transactionBanks.set(value);
  }

  readonly tiles = computed<SummaryTile[]>(() => {
    const transactionBanks = this.transactionBanks();
    const active = transactionBanks.filter((a) => a.isActive).length;
    const inactive = transactionBanks.length - active;

    return [
      {
        icon: 'bank',
        title: 'Total de bancos agente',
        value: `${transactionBanks.length}`,
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
