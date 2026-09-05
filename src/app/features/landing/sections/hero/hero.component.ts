import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SITE } from '../../../../core/data';
import { BadgeComponent, ButtonComponent, ContainerComponent, IconComponent } from '../../../../shared/ui';
import { HeroShowcaseComponent } from './hero-showcase.component';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [ContainerComponent, BadgeComponent, ButtonComponent, IconComponent, HeroShowcaseComponent],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroComponent {
  readonly site = SITE;
}
