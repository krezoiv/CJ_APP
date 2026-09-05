import { ChangeDetectionStrategy, Component } from '@angular/core';

import { BadgeComponent, IconComponent, SectionComponent } from '../../../../shared/ui';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

interface Value {
  icon: string;
  title: string;
  text: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [SectionComponent, BadgeComponent, IconComponent, RevealOnScrollDirective],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
  readonly values: Value[] = [
    {
      icon: 'shield-check',
      title: 'Confianza',
      text: 'Más de una década construyendo relaciones honestas con nuestros clientes y vecinos.',
    },
    {
      icon: 'users',
      title: 'Cercanía',
      text: 'Atención personalizada, como el negocio de barrio en el que siempre puedes confiar.',
    },
    {
      icon: 'sparkles',
      title: 'Innovación',
      text: 'Sumamos nuevos servicios financieros y digitales sin perder la calidez de siempre.',
    },
  ];
}
