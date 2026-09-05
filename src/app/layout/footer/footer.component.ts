import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NAV_LINKS, SITE } from '../../core/data';
import { ContactService } from '../../core/services/contact.service';
import { ContainerComponent, IconComponent } from '../../shared/ui';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, ContainerComponent, IconComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  private readonly contactService = inject(ContactService);

  readonly site = SITE;
  readonly navLinks = NAV_LINKS;
  readonly year = new Date().getFullYear();
  readonly channels = this.contactService.getChannels();
  readonly socialLinks = this.contactService.getSocialLinks();
}
