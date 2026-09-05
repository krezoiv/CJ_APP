import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

/**
 * Resuelve la URL pública del backend ANTES de que `bootstrapApplication`
 * cargue el primer componente/servicio — la mayoría de los servicios de
 * `core/services/*.service.ts` capturan `environment.apiUrl` en un
 * `const BASE_URL = \`${environment.apiUrl}/...\`` a nivel de módulo (no
 * dentro de una clase), así que la mutación de abajo debe completarse
 * antes de que esos módulos se evalúen por primera vez. Como son
 * componentes de features con `loadComponent` (carga perezosa por ruta),
 * eso ya ocurre siempre después de este archivo — nunca antes.
 *
 * Precedencia (mayor a menor prioridad):
 * 1. `window.__API_URL__` — override manual sin rebuild, ver
 *    `src/assets/runtime-config.js`. Pensado para cualquier URL pública
 *    temporal (VS Code Ports, un túnel, etc.) sin tocar código.
 * 2. Detección automática del patrón de GitHub Codespaces/VS Code Ports
 *    (`<nombre>-4200.app.github.dev` → `<nombre>-3000.app.github.dev`,
 *    3000 siempre el puerto real del backend) — cero configuración manual
 *    para ese escenario concreto.
 * 3. El valor ya compilado en environment.ts/environment.development.ts
 *    (`http://localhost:3000/api` en desarrollo) — comportamiento local
 *    exactamente igual que antes, si ninguna de las dos condiciones
 *    anteriores aplica.
 */
function resolveApiUrl(): string {
  const manualOverride = (window as unknown as { __API_URL__?: string }).__API_URL__;
  if (manualOverride) {
    return manualOverride;
  }

  const codespacesMatch = window.location.hostname.match(/^(.+)-\d+\.app\.github\.dev$/);
  if (codespacesMatch) {
    const [, namePrefix] = codespacesMatch;
    const apiPathSuffix = new URL(environment.apiUrl, window.location.origin).pathname;
    return `https://${namePrefix}-3000.app.github.dev${apiPathSuffix}`;
  }

  return environment.apiUrl;
}

environment.apiUrl = resolveApiUrl();

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
