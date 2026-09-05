# Comercial Jhoel — Landing page

Landing page premium orientada a conversión para Comercial Jhoel (librería, útiles
escolares, fotocopias, agente bancario y servicios administrativos). Angular 19
standalone, servido con el build system oficial basado en esbuild + Vite
(`ng serve` ya usa Vite bajo el capó, no hay configuración extra que mantener).

## Levantar el proyecto

```bash
npm install
npm start        # ng serve — http://localhost:4200
npm run build    # build de producción en dist/
```

## Cómo está organizado

```
src/app/
  core/
    models/       interfaces de dominio (ServiceItem, CatalogCategory, ...)
    data/         contenido editable (textos, listas) — SIN lógica
    services/     un servicio por recurso, hoy devuelve los `data/*` con of(),
                  mañana hace el fetch real (ver "Fase 2")
  shared/
    ui/           componentes atómicos reutilizables: Button, Card, Badge,
                  Icon, Section, SectionHeading, Container, StatCard
    directives/   RevealOnScrollDirective (fade-in al hacer scroll)
  layout/         Navbar y Footer (usados en todas las páginas)
  features/
    landing/      la home: cada sección (hero, servicios, catálogo,
                  agentes bancarios, quiénes somos, testimonios, contacto)
                  es su propio componente en sections/
    catalog/      página /catalogo
    auth/login/   página /login, conectada al backend real (ver "Fase 2")
```

## Editar el diseño

Todo el look & feel sale de **`src/styles/_tokens.scss`**: colores, tipografía,
espaciado, radios, sombras — son variables CSS (`--color-primary`, `--space-4`,
etc.), así que también se pueden tocar en vivo desde el inspector del navegador
mientras se itera el diseño. Los breakpoints están en `_breakpoints.scss` y se
usan con el mixin `respond()` (mobile-first: `@include respond(lg) { ... }`).

Cada sección de la landing es un componente independiente bajo
`features/landing/sections/`, con su propio `.html`/`.scss`, para poder
recortar layout y espaciado sección por sección sin tocar el resto.

El contenido de texto (servicios, categorías, métricas, testimonios, datos de
contacto) vive en `core/data/*.ts` — para cambiar un texto no hace falta tocar
ningún componente.

## Fase 2 (NestJS + PostgreSQL)

`src/environments/environment.ts` / `environment.development.ts` tienen `apiUrl` apuntando a
`http://localhost:3000/api` — el backend real vive en el proyecto hermano `comercial-jhoel-api`
(NestJS + PostgreSQL + JWT, ver su propio README/CLAUDE.md).

**Autenticación: ya conectada.** `AuthService` (`core/services/`) habla con
`POST /auth/login` (`identifier` — usuario o teléfono — + `password`) y `POST /auth/change-password`
contra el backend real, guarda el JWT en `localStorage`, y `authInterceptor` lo adjunta automáticamente
a cada request y limpia la sesión ante un 401. `/dashboard` está protegido por `authGuard`. Detalles en
`CLAUDE.md`.

El resto sigue pendiente de conectar:

- Cada otro servicio en `core/services/` (`CatalogService`, `OffersService`, `StatsService`,
  `TestimonialsService`, `BankAgentService`, `ContactService`) tiene un comentario indicando exactamente
  qué línea cambiar para pasar de `of(DATA)` a `this.http.get(...)` — es un cambio de una línea por
  servicio, sin tocar componentes.
- `ContactService.submit()` ya simula la llamada async (`delay(600)`); solo hay que reemplazar el cuerpo
  por el `POST` real.
- El catálogo completo (productos reales, no solo categorías) necesitará un nuevo endpoint
  (`/catalog/products`) y una página de listado/detalle nueva bajo `features/catalog/`; las categorías
  actuales sirven de filtro.
# CJ_APP
