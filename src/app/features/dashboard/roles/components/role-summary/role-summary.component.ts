import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { Role } from '../../../../../core/models';
import { CardComponent, IconComponent } from '../../../../../shared/ui';

interface SummaryTile {
  icon: string;
  title: string;
  value: string;
  description: string;
}

@Component({
  selector: 'app-role-summary',
  standalone: true,
  imports: [CardComponent, IconComponent],
  templateUrl: './role-summary.component.html',
  styleUrl: './role-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleSummaryComponent {
  private readonly roles = signal<Role[]>([]);

  @Input({ required: true })
  set data(value: Role[]) {
    this.roles.set(value);
  }

  readonly tiles = computed<SummaryTile[]>(() => {
    const roles = this.roles();
    const active = roles.filter((r) => r.isActive).length;
    const inactive = roles.length - active;

    return [
      {
        icon: 'shield-check',
        title: 'Total de roles',
        value: `${roles.length}`,
        description: 'roles registrados',
      },
      {
        icon: 'check',
        title: 'Activos',
        value: `${active}`,
        description: 'disponibles para asignar',
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
