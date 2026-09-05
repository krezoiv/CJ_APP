import { ChangeDetectionStrategy, Component } from '@angular/core';

import { HeroComponent } from './sections/hero/hero.component';
import { CredibilityComponent } from './sections/credibility/credibility.component';
import { ServicesComponent } from './sections/services/services.component';
import { CatalogPreviewComponent } from './sections/catalog-preview/catalog-preview.component';
import { BankAgentsComponent } from './sections/bank-agents/bank-agents.component';
import { AboutComponent } from './sections/about/about.component';
import { TestimonialsComponent } from './sections/testimonials/testimonials.component';
import { ContactComponent } from './sections/contact/contact.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    HeroComponent,
    CredibilityComponent,
    ServicesComponent,
    CatalogPreviewComponent,
    BankAgentsComponent,
    AboutComponent,
    TestimonialsComponent,
    ContactComponent,
  ],
  templateUrl: './landing-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {}
