import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Client } from '../../../../../core/models';
import { ClientService } from '../../../../../core/services/client.service';
import { IconComponent } from '../../../../../shared/ui';

let nextInstanceId = 0;

/**
 * Searchable client select — a near-copy of Reportería's own
 * `ProductFilterSearchComponent` (search box + dropdown + persistent
 * "selected" chip), adapted for clients: filtering is client-side over the
 * full active-clients list (fetched once), since ClientsModule has no
 * server-side search endpoint — this app's established convention for
 * small/medium catalogs (see Categorías/Negocios/Bancos) is a client-side
 * filter over a fully-fetched active list, not a new backend endpoint.
 */
@Component({
  selector: 'app-client-search-select',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './client-search-select.component.html',
  styleUrl: './client-search-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientSearchSelectComponent {
  /**
   * The currently selected client's id, or null if none — set from the parent (e.g. when
   * editing an existing record). Signal inputs (not plain @Input()) are required here: the
   * `selectedClient` computed below reads them, and a `computed()` only reacts to signal
   * reads — a plain @Input() property read inside computed() never invalidates the cache.
   */
  readonly selectedClientId = input<string | null>(null);
  /** Shown while the full client list is still loading, so an edit form doesn't flash "cliente no encontrado". */
  readonly selectedClientName = input<string | null>(null);
  @Input() clearable = true;
  @Input() placeholder = 'Buscar cliente…';

  @Output() selectionChange = new EventEmitter<Client | null>();

  private readonly clientService = inject(ClientService);

  readonly inputId = `client-search-select-${nextInstanceId++}`;

  private readonly clients = signal<Client[]>([]);
  private readonly clientsLoaded = signal(false);

  readonly query = signal('');
  readonly open = signal(false);
  readonly loading = computed(() => !this.clientsLoaded());

  readonly selectedClient = computed<Client | null>(() => {
    const id = this.selectedClientId();
    if (!id) {
      return null;
    }
    const fromList = this.clients().find((c) => c.id === id);
    if (fromList) {
      return fromList;
    }
    // List hasn't loaded yet (or the client is inactive/missing from it) — fall back to the
    // display name the parent already knows, so an edit form shows something immediately.
    const name = this.selectedClientName();
    return name ? { id, name, isActive: true, createdAt: '', updatedAt: '' } : null;
  });

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

    effect(() => {
      if (!this.selectedClientId()) {
        this.query.set('');
      }
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
    this.query.set('');
  }
}
