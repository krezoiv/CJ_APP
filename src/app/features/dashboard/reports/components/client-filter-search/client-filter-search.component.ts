import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Client } from '../../../../../core/models';
import { ClientService } from '../../../../../core/services/client.service';
import { IconComponent } from '../../../../../shared/ui';

/**
 * A near-copy of this same folder's `ProductFilterSearchComponent`, adapted
 * for clients: filtering is client-side over the full active-clients list
 * (fetched once), since `ClientsModule` has no server-side search endpoint
 * — this app's established convention for small/medium catalogs. Shared by
 * both the Cuentas por Cobrar and Activos reports (same reasoning
 * `ProductFilterSearchComponent` is already shared by Sales'/Purchases'
 * own reports), rather than duplicated a third/fourth time — it has no
 * report-specific logic baked in.
 */
@Component({
  selector: 'app-report-client-filter',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './client-filter-search.component.html',
  styleUrl: './client-filter-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientFilterSearchComponent {
  @Input() selectedClient: Client | null = null;
  @Output() selectionChange = new EventEmitter<Client | null>();

  private readonly clientService = inject(ClientService);

  private readonly clients = signal<Client[]>([]);
  private readonly clientsLoaded = signal(false);

  readonly query = signal('');
  readonly open = signal(false);
  readonly loading = computed(() => !this.clientsLoaded());

  readonly filteredClients = computed(() => {
    const term = this.query().trim().toLowerCase();
    const clients = this.clients();
    if (!term) {
      return clients;
    }
    return clients.filter((c) => c.name.toLowerCase().includes(term));
  });

  constructor() {
    this.clientService.getClients().subscribe({
      next: (clients) => {
        this.clients.set(clients);
        this.clientsLoaded.set(true);
      },
      error: () => this.clientsLoaded.set(true),
    });
  }

  onInput(value: string): void {
    this.query.set(value);
    this.open.set(true);
  }

  onFocus(): void {
    this.open.set(true);
  }

  onBlur(): void {
    setTimeout(() => this.open.set(false), 150);
  }

  select(client: Client): void {
    this.selectionChange.emit(client);
    this.query.set('');
    this.open.set(false);
  }

  clear(): void {
    this.selectionChange.emit(null);
  }
}
