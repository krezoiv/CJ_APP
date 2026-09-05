import { ChangeDetectionStrategy, Component, Input, booleanAttribute } from '@angular/core';

export type CardTone = 'light' | 'dark' | 'glass';

@Component({
  selector: 'app-card',
  standalone: true,
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {
  @Input() tone: CardTone = 'light';
  @Input({ transform: booleanAttribute }) hoverable = true;
  @Input() padding: 'sm' | 'md' | 'lg' = 'md';
}
