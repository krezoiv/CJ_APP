import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { ICONS } from './icon-registry';

@Component({
  selector: 'app-icon',
  standalone: true,
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--icon-size.px]': 'size',
  },
})
export class IconComponent {
  @Input({ required: true }) name!: string;
  @Input() size = 24;

  constructor(private readonly sanitizer: DomSanitizer) {}

  // Icon markup comes exclusively from the trusted, hand-authored ICONS
  // registry above — never from user input — so bypassing is safe here.
  get markup(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name] ?? '');
  }
}
