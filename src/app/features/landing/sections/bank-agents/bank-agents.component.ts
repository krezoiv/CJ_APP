import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { SITE } from '../../../../core/data';
import { BankAgentService } from '../../../../core/services/bank-agent.service';
import {
  ButtonComponent,
  CardComponent,
  IconComponent,
  SectionComponent,
  SectionHeadingComponent,
} from '../../../../shared/ui';
import { RevealOnScrollDirective } from '../../../../shared/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-bank-agents',
  standalone: true,
  imports: [
    AsyncPipe,
    SectionComponent,
    SectionHeadingComponent,
    CardComponent,
    ButtonComponent,
    IconComponent,
    RevealOnScrollDirective,
  ],
  templateUrl: './bank-agents.component.html',
  styleUrl: './bank-agents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BankAgentsComponent {
  private readonly bankAgentService = inject(BankAgentService);
  readonly site = SITE;
  readonly operations$ = this.bankAgentService.getOperations();
  readonly trustPoints$ = this.bankAgentService.getTrustPoints();
}
