import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { PresentationTypesTabComponent } from './components/presentation-types-tab/presentation-types-tab.component';
import { UnitsOfMeasureTabComponent } from './components/units-of-measure-tab/units-of-measure-tab.component';

type TabValue = 'presentaciones' | 'unidades';

/**
 * `Sistema → Presentaciones y Medidas` — the two master catalogs that
 * replace free-text presentation/unit names across the app (see the
 * backend `CLAUDE.md`'s "Catálogos maestros" section for the full
 * migration/architecture writeup). Each tab is a fully self-contained
 * component; this page only decides which one is visible.
 */
@Component({
  selector: 'app-presentation-units-page',
  standalone: true,
  imports: [PresentationTypesTabComponent, UnitsOfMeasureTabComponent],
  templateUrl: './presentation-units-page.component.html',
  styleUrl: './presentation-units-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresentationUnitsPageComponent {
  readonly activeTab = signal<TabValue>('presentaciones');

  selectTab(tab: TabValue): void {
    this.activeTab.set(tab);
  }
}
