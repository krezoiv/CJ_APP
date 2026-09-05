import { ChangeDetectionStrategy, Component, Input, booleanAttribute } from '@angular/core';

@Component({
  selector: 'app-container',
  standalone: true,
  template: `<div class="container" [class.container--wide]="wide"><ng-content></ng-content></div>`,
  styleUrl: './container.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerComponent {
  @Input({ transform: booleanAttribute }) wide = false;
}
