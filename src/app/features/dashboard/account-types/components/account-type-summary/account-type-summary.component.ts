import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { AccountType } from '../../../../../core/models';
import { CardComponent, IconComponent } from '../../../../../shared/ui';

interface SummaryTile {
  icon: string;
  title: string;
  value: string;
  description: string;
}

@Component({
  selector: 'app-account-type-summary',
  standalone: true,
  imports: [CardComponent, IconComponent],
  templateUrl: './account-type-summary.component.html',
  styleUrl: './account-type-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTypeSummaryComponent {
  private readonly accountTypes = signal<AccountType[]>([]);

  @Input({ required: true })
  set data(value: AccountType[]) {
    this.accountTypes.set(value);
  }

  readonly tiles = computed<SummaryTile[]>(() => {
    const accountTypes = this.accountTypes();
    const active = accountTypes.filter((a) => a.isActive).length;
    const inactive = accountTypes.length - active;

    return [
      {
        icon: 'bank',
        title: 'Total de tipos de cuenta',
        value: `${accountTypes.length}`,
        description: 'tipos registrados',
      },
      {
        icon: 'check',
        title: 'Activos',
        value: `${active}`,
        description: 'disponibles para bancos',
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
