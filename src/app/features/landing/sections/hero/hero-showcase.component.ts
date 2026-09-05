import { ChangeDetectionStrategy, Component } from '@angular/core';

import { IconComponent } from '../../../../shared/ui';

interface FlowStep {
  icon: string;
  label: string;
}

/**
 * Purely decorative "product dashboard" visual for the hero: a flow card
 * plus a couple of floating stat chips. Built with CSS/SVG only so it stays
 * lightweight and easy to restyle without touching markup.
 */
@Component({
  selector: 'app-hero-showcase',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './hero-showcase.component.html',
  styleUrl: './hero-showcase.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroShowcaseComponent {
  readonly steps: FlowStep[] = [
    { icon: 'book', label: 'Catálogo' },
    { icon: 'shopping-bag', label: 'Venta' },
    { icon: 'bank', label: 'Agente bancario' },
    { icon: 'shield-check', label: 'Cliente feliz' },
  ];
}
