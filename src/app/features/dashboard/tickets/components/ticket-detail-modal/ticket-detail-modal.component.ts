import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, inject, signal } from '@angular/core';

import { Ticket, formatCurrency } from '../../../../../core/models';
import { TicketsService } from '../../../../../core/services/tickets.service';
import { IconComponent } from '../../../../../shared/ui';

/** Read-only line-item detail for one ticket — reached from Historial's "Ver detalle" action. */
@Component({
  selector: 'app-ticket-detail-modal',
  standalone: true,
  imports: [DatePipe, IconComponent],
  templateUrl: './ticket-detail-modal.component.html',
  styleUrl: './ticket-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketDetailModalComponent implements OnChanges {
  @Input() ticketId: string | null = null;
  @Output() closed = new EventEmitter<void>();

  private readonly ticketsService = inject(TicketsService);

  readonly ticket = signal<Ticket | null>(null);
  readonly loading = signal(false);

  formatCurrency = formatCurrency;

  ngOnChanges(): void {
    if (!this.ticketId) {
      this.ticket.set(null);
      return;
    }
    this.loading.set(true);
    this.ticketsService.getTicketById(this.ticketId).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
