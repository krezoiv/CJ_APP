import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { TicketSummary, formatCurrency } from '../../../../../core/models';
import { AuthService } from '../../../../../core/services/auth.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { TicketsService } from '../../../../../core/services/tickets.service';
import { downloadBlob } from '../../../../../core/utils/download-blob';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { BadgeComponent, EmptyStateComponent, IconComponent } from '../../../../../shared/ui';
import { ReportPaginationComponent } from '../../../reports/components/report-pagination/report-pagination.component';
import { TicketDetailModalComponent } from '../ticket-detail-modal/ticket-detail-modal.component';
import { VoidReasonModalComponent } from '../void-reason-modal/void-reason-modal.component';

const PAGE_LIMIT = 20;

@Component({
  selector: 'app-ticket-history-tab',
  standalone: true,
  imports: [
    DatePipe,
    EmptyStateComponent,
    BadgeComponent,
    IconComponent,
    ReportPaginationComponent,
    TicketDetailModalComponent,
    VoidReasonModalComponent,
  ],
  templateUrl: './ticket-history-tab.component.html',
  styleUrl: './ticket-history-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketHistoryTabComponent {
  private readonly ticketsService = inject(TicketsService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly isAdmin = this.authService.isAdmin;

  readonly tickets = signal<TicketSummary[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);

  readonly detailTicketId = signal<string | null>(null);
  readonly voidTarget = signal<TicketSummary | null>(null);
  readonly generatingPdfId = signal<string | null>(null);

  formatCurrency = formatCurrency;
  readonly limit = PAGE_LIMIT;

  readonly isEmpty = computed(() => !this.loading() && this.tickets().length === 0);

  constructor() {
    this.fetch();
  }

  fetch(): void {
    this.loading.set(true);
    this.ticketsService.getTickets({ page: this.page(), limit: this.limit }).subscribe({
      next: (response) => {
        this.tickets.set(response.items);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notificationService.error('No se pudo cargar el historial de tickets.');
      },
    });
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.fetch();
  }

  viewDetail(ticket: TicketSummary): void {
    this.detailTicketId.set(ticket.id);
  }

  closeDetail(): void {
    this.detailTicketId.set(null);
  }

  regeneratePdf(ticket: TicketSummary): void {
    this.generatingPdfId.set(ticket.id);
    this.ticketsService.exportTicketPdf(ticket.id).subscribe({
      next: (blob) => {
        downloadBlob(blob, `${ticket.ticketNumber}.pdf`);
        this.generatingPdfId.set(null);
      },
      error: (error) => {
        this.notificationService.error(extractErrorMessage(error, 'No se pudo generar el PDF.'));
        this.generatingPdfId.set(null);
      },
    });
  }

  requestVoid(ticket: TicketSummary): void {
    this.voidTarget.set(ticket);
  }

  cancelVoid(): void {
    this.voidTarget.set(null);
  }

  confirmVoid(reason: string): void {
    const target = this.voidTarget();
    if (!target) {
      return;
    }
    this.ticketsService.voidTicket(target.id, reason).subscribe({
      next: () => {
        this.notificationService.success(`Ticket ${target.ticketNumber} anulado correctamente.`);
        this.voidTarget.set(null);
        this.fetch();
      },
      error: (error) => {
        this.notificationService.error(extractErrorMessage(error, 'No se pudo anular el ticket.'));
        this.voidTarget.set(null);
      },
    });
  }
}
