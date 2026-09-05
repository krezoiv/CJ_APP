# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start                        # ng serve — dev server on http://localhost:4200 (Vite/esbuild-based)
npm run build                    # production build → dist/comercial-jhoel-app
npm run watch                    # build --watch in development configuration
npm test                         # ng test (Karma/Jasmine) — no spec files exist yet in src/
```

There is no lint script configured (no ESLint set up in this project). To generate a new
standalone component/service in the existing structure, use `ng generate component <path> --skip-tests`
(the project schematics default to SCSS + `skipTests: true`, see `angular.json`).

## Architecture

Angular 19, standalone components only (no NgModules), built with the modern
`@angular-devkit/build-angular:application` builder — this is what makes `ng serve`/`ng build` run on
esbuild + Vite under the hood; there is no separate Vite config file to maintain.

### Layer structure (`src/app/`)

- **`core/`** — framework-agnostic app layer, no UI:
  - `models/` — plain interfaces (`ServiceItem`, `CatalogCategory`, `StatItem`, ...), barreled via `index.ts`.
  - `data/` — the actual editable content (nav links, services copy, stats, catalog categories,
    testimonials, contact channels, site-wide info in `site.data.ts`) as typed constants. Changing
    copy should almost always mean editing a file here, not a component template.
  - `services/` — one injectable per content resource (`CatalogService`, `OffersService`,
    `StatsService`, `TestimonialsService`, `BankAgentService`, `ContactService`). Each currently wraps
    its `data/*` constant in `of(...)` and carries a comment marking the exact line to swap for a real
    `HttpClient` call once that part of the NestJS/PostgreSQL backend exists. `AuthService` is the
    exception — it's already wired to the real backend (see "Auth" below), not a stub.
  - `services/fragment-scroll.service.ts` — see "Fragment scrolling" below; not content-related but
    lives in core because it's an app-wide cross-cutting concern.
  - `interceptors/auth.interceptor.ts` — functional `HttpInterceptorFn` registered in `app.config.ts`
    via `provideHttpClient(withInterceptors([authInterceptor]))`; see "Auth" below.

- **`shared/ui/`** — presentational, reusable atoms consumed everywhere: `ButtonComponent` (variants
  `primary`/`secondary`/`outline`/`ghost`/`danger` — `outline` and its dark border/text are for **dark**
  backgrounds only, e.g. the login page; use `ghost` for a secondary action on a light/white surface like
  a dashboard card or modal, or you'll ship unreadable light-on-light text), `CardComponent`,
  `BadgeComponent` (tones `brand`/`gold`/`success`/`danger`/`neutral-dark`/`neutral-light`),
  `IconComponent` (renders inline SVGs from a name→markup registry in `icon-registry.ts` — add new icons
  there, never inline raw `<svg>` in a feature template), `SectionComponent` (standard `<section>` shell:
  background tone, vertical spacing, container width, anchor id), `SectionHeadingComponent`,
  `StatCardComponent`, `ContainerComponent`, `EmptyStateComponent` (icon/title/description +
  content-projected action button, for "no results"/"nothing yet" states), `ToastContainerComponent`
  (mounted once in `app.component.html`; see "Notifications" below). Boolean `@Input()`s on these
  (`wide`, `fullWidth`, `disabled`, `hoverable`) use `booleanAttribute` transforms so they can be set as
  bare attributes (`<app-button fullWidth>`) under `strictTemplates`.

- **`layout/`** — `NavbarComponent` and `FooterComponent`, rendered once in `AppComponent` around
  `<router-outlet>` so they persist across all routes.

- **`features/`** — routed pages:
  - `landing/` — the home route (`/`). `LandingPageComponent` just composes one component per section
    from `landing/sections/*` (hero, credibility, services, catalog-preview, bank-agents, about,
    testimonials, contact) in order. Each section is self-contained (own `.html`/`.scss`, pulls its
    own data from a `core/services` injectable) so sections can be reordered, restyled, or removed
    independently.
  - `catalog/` — `/catalogo`, a category-listing placeholder page pending the real product catalog.
  - `auth/login/` — `/login`, a real login form (see "Auth" below).
  - `dashboard/inventory/` — `/dashboard/inventario`, full product CRUD (see "Inventory" below).
  - `dashboard/categories/` — `/dashboard/categorias`, full category CRUD (see "Categories" below).
  - `dashboard/businesses/` — `/dashboard/negocios`, full business (línea de negocio) CRUD (see
    "Businesses (Negocios)" below).
  - `dashboard/sales/` — `/dashboard/ventas`, the POS-style checkout screen (see "Sales (Ventas)" below).
  - `dashboard/suppliers/` — `/dashboard/proveedores`, full supplier CRUD (see "Suppliers (Proveedores)
    and Purchases (Compras)" below).
  - `dashboard/purchases/` — `/dashboard/compras`, the purchase-invoice screen (see "Suppliers
    (Proveedores) and Purchases (Compras)" below).
  - `dashboard/recharges/` — `/dashboard/recargas`, the daily electronic-recharge balance screen (see
    "Recargas Electrónicas" below).
  - `dashboard/reports/sales/`, `dashboard/reports/purchases/`, `dashboard/reports/recharges/` —
    `/dashboard/reportes-ventas`, `/dashboard/reportes-compras`, `/dashboard/reportes-recargas`,
    admin-only (see "Reportería" below).
  - `dashboard/users/` — `/dashboard/usuarios`, admin-only user CRUD (see "Users & Roles administration" below).
  - `dashboard/roles/` — `/dashboard/roles`, admin-only role CRUD (see "Users & Roles administration" below).
  - Every route is lazy-loaded via `loadComponent` in `app.routes.ts`.

### Auth

`AuthService` (`core/services/auth.service.ts`) talks to the real backend at
`${environment.apiUrl}/auth/*` (see `../comercial-jhoel-api/CLAUDE.md` for the backend contract). Its
public surface — `currentUser` signal, `isAuthenticated` computed, `login()`, `logout()`,
`changePassword()` — is the contract the rest of the app depends on; don't reach into
`localStorage`/`HttpClient` directly from a component.

- **Login is by `identifier`** (username or phone), not email — `login(identifier, password)` posts
  `{ identifier, password }` to `/auth/login`. `AuthUser` is `{ id, username, phone, role }`; there's no
  `name`/`email` on it anymore (that was the phase-1 fake-auth shape). `role` is
  `'SUPER_ADMIN' | 'ADMIN' | 'USER'` — `AuthService.isAdmin` (a computed signal) is `true` for the first
  two. It's UI-only: it hides admin-only controls (see "Inventory" below) for a better experience, but
  every write endpoint re-checks the role from the JWT server-side regardless of what this signal says.
- **Response envelope**: the backend wraps every successful response as `{ success: true, data: T }`
  (`ResponseInterceptor` on the NestJS side) but returns error bodies flat
  (`{ success: false, statusCode, message }`). `AuthService` unwraps `.data` on the success path only —
  if you add a call to a new authenticated endpoint, remember the wrapper or you'll silently get
  `undefined` back (this bit us once: `tap(({ accessToken, user }) => ...)` on the raw response set both
  to `undefined` and `localStorage.setItem` coerced them to the literal string `"undefined"`).
- **Token storage**: JWT under `localStorage['cj_auth_token']`, user under `localStorage['cj_auth_session']`
  (both set together in `AuthService.setSession`, both cleared together in `logout()`). `restoreSession()`
  requires *both* to be present and parseable or it returns `null` — a session is never "half-restored".
- **`authInterceptor`** (`core/interceptors/auth.interceptor.ts`) attaches
  `Authorization: Bearer <token>` to any request whose URL starts with `environment.apiUrl` (never to
  third-party requests), and on a `401` from that same origin calls `authService.logout()` and navigates
  to `/login` — this is what handles an expired/invalid token network-wide, not per-component error
  handling.
- **`authGuard`** (`core/guards/auth.guard.ts`) is a `CanActivateFn` on the `/dashboard` route tree in
  `app.routes.ts`; it only checks `isAuthenticated()` (an in-memory signal seeded from `restoreSession()`
  at service construction), it doesn't re-validate the token against the backend — that happens lazily,
  the next time a request 401s.
- **Logout** (`DashboardLayoutComponent.logout()`) calls `authService.logout()` then navigates to
  `/login`.

### Inventory

`/dashboard/inventario` (`features/dashboard/inventory/inventory-page.component.ts`) is a full product
CRUD screen, wired to the real backend — **no mock data left**. `InventoryService`
(`core/services/inventory.service.ts`) calls `${environment.apiUrl}/products`; `CategoryService`
(`core/services/category.service.ts`) calls `${environment.apiUrl}/categories` for the form's dropdown.

- **`Product.sku` is the barcode field** (`core/models/product.model.ts`), `string | null` — optional
  everywhere: the create/edit form's SKU input has no `required` validator (only `maxLength(64)` +
  a `[a-zA-Z0-9-]+` pattern, mirroring the backend's `CreateProductRequestDto`/`UpdateProductRequestDto`),
  and `ProductFormModalComponent.submit()` explicitly converts a blank field to `null`
  (`sku.trim() || null`) before sending — the backend's DTOs only skip validation for `null`/omitted, not
  an empty string, so sending `""` would fail the pattern check. `ProductTableComponent` sorts/searches
  null-safely by falling back to `''`. The inventory search box (`InventoryPageComponent.filteredProducts`)
  matches `sku` alongside `name`/`category`, so scanning or typing a barcode finds the product — same
  reason `GET /products`'s server-side `search` also matches `sku` now.
- **`Product` has both `category` (display name) and `categoryId`** (`core/models/product.model.ts`) — the
  backend's `categoryName` is what the table/cards show, `categoryId` is what `ProductInput` actually
  sends on create/update. `InventoryService`'s private `toProduct()` maps the API's
  `{ categoryId, categoryName, ... }` shape into that flat `Product`. `ProductInput` no longer has a
  `category` string field at all — `ProductFormModalComponent`'s category control is `categoryId`, bound
  to a real `<select>` populated from `CategoryService.getCategories()` (via
  `InventoryPageComponent.categoryOptions`), not a free-text/datalist field anymore.
- **`getProducts()` asks for `limit=100`** and still returns the full active list in one call —
  `InventoryPageComponent` keeps doing its own client-side search/filter/sort over that list (see below),
  even though the backend actually supports `search`/`categoryId`/`sortBy`/`sortDirection`/`page`/`limit`
  query params now. Wiring the toolbar to those instead of filtering client-side is a real future
  improvement, not done here — this was a deliberate "swap the data source, don't rearchitect the already-
  working filter UI" call.
- `getStockStatus(stock)` / `LOW_STOCK_THRESHOLD` / `STOCK_STATUS_LABEL` / `formatCurrency` (all in
  `core/models/product.model.ts`) are the single source of truth for "in-stock / low-stock / out-of-stock"
  classification and `Q`-prefixed price formatting — the summary tiles, the stock filter, and the table's
  badges all call the same functions, so the threshold only has one place to change. This is a *display*
  concept, unrelated to the backend's `isActive` (soft-delete flag) — `GET /products` only ever returns
  active products by default, so everything in this list is implicitly "not deleted" already.
- Component split (`features/dashboard/inventory/components/`): `InventorySummaryComponent` (4 KPI
  tiles, computed from the product list — no separate summary endpoint), `InventoryToolbarComponent`
  (search + category `<select>` + stock filter chips + "Agregar producto", two-way bound via `FormsModule`
  since these are live filters, not a submitted form — the rest of the app uses `ReactiveFormsModule` for
  actual forms, keep that split), `ProductTableComponent` (a real `<table>` for `md`+ and a `.card-list`
  of cards below it, same markup rendered twice and toggled with `respond()`/plain `display:none` — no JS
  branching — plus the loading skeleton and empty state), `ProductFormModalComponent` (create **and**
  edit, distinguished by whether `[product]` is `null`; injects `InventoryService` directly and emits
  `saved`, mirroring `ChangePasswordModalComponent`'s self-contained pattern), `DeleteConfirmModalComponent`
  (dumb — parent owns the actual `deleteProduct()` call).
- Filtering/search is entirely client-side (`InventoryPageComponent.filteredProducts` computed signal).
- **Column sorting** lives entirely inside `ProductTableComponent` (`sortColumn`/`sortDirection` signals,
  `sortedProducts` computed) — `@Input() products` is a signal-backed setter for this reason, not a plain
  field. Clicking a `<th>`'s `.sort-btn` toggles `asc`/`desc` on the same column or switches column
  (defaulting to `asc`); both the desktop `<table>` and the mobile `.card-list` iterate the same
  `sortedProducts()`, so sorting applies to both without duplicated logic. It's local-only (like the
  filtering above) — no column/direction params sent anywhere.
- **`canManage` (`AuthService.isAdmin`) gates the admin actions** — `InventoryToolbarComponent` hides
  "Agregar producto" and `ProductTableComponent` hides the entire Acciones column (desktop) / edit-delete
  buttons (mobile cards) when `false`. This is UX only: the backend's `RolesGuard` is the actual
  enforcement, and rejects a `USER`-role token with `403` even if these components are bypassed.
- **`DeleteConfirmModalComponent`'s copy says "se desactivará"**, not "se eliminará permanentemente" — the
  backend does a soft delete (`isActive=false`), the product stays in the DB and can be restored later.
  Don't revert this wording; it was deliberately fixed to stop lying to the user about what the action
  does.
- Error handling (all three mutations): `ProductFormModalComponent.submit()` and
  `InventoryPageComponent.confirmDelete()` extract the backend's real message via
  `core/utils/extract-error-message.ts` (shared with `AuthService`) rather than a generic string — a 409
  (duplicate active name), 400 (invalid/inactive category, bad price/stock), or 403 (role check, though the
  button shouldn't be visible to trigger this) all surface their actual backend message to the user.
- **Inventario is a sidebar sub-item of Librería**, not a top-level nav entry — `DashboardNavItem` has an
  optional `children` array (`core/models/dashboard-nav-item.model.ts`), and `DashboardSidebarComponent`
  renders any item's `children` as an indented `.sidebar__submenu` block right under it. Librería's own
  link still behaves exactly as before (navigates to its placeholder page); the submenu is purely
  additive. This is a general mechanism, not inventory-specific — any future nav item can get `children`
  the same way.

### Categories

`/dashboard/categorias` (`features/dashboard/categories/categories-page.component.ts`) is the
admin management screen for categories, wired to the real backend — mirrors the Inventory module's
structure exactly (component split, soft-delete pattern, `canManage` gating), per an explicit
"sigue el patrón ya establecido" instruction. `CategoryService` (`core/services/category.service.ts`)
now has full CRUD (`getCategories`, `getCategoryById`, `createCategory`, `updateCategory`,
`deleteCategory`) against `${environment.apiUrl}/categories` — the same service the Inventory form's
dropdown already used for `getCategories()` (default `includeInactive=false`).

- **This screen calls `getCategories(true)`** (`includeInactive=true`), unlike the Inventory dropdown's
  default call — it's the admin management view, so inactive categories must stay visible (with a
  status badge and filter chip) rather than disappearing. Don't change the default on
  `CategoryService.getCategories()` itself; pass `true` explicitly where inactive rows are wanted.
- **Soft delete keeps the row in the list, not removed** — `CategoriesPageComponent.confirmDelete()`
  updates the item in place to `{ ...c, isActive: false }` rather than filtering it out (contrast with
  a screen that only shows active items, where a delete would just drop the row). The table's delete
  action button is `[disabled]="!category.isActive"` so an already-inactive row can't be deleted again.
- Component split (`features/dashboard/categories/components/`): `CategorySummaryComponent` (3 KPI
  tiles — Total/Activas/Inactivas), `CategoryToolbarComponent` (search + `all`/`active`/`inactive`
  status chips + "Agregar categoría" gated by `canManage`), `CategoryTableComponent` (sortable by
  name/description/isActive, desktop `<table>` + mobile `.card-list`, pastel-blue header, loading
  skeleton, `EmptyStateComponent`), `CategoryFormModalComponent` (name + description textarea,
  create/edit via `[category]` being `null` or not, calls `CategoryService` directly), and
  `DeleteConfirmModalComponent` (selector `app-category-delete-confirm-modal`; copy says
  "se desactivará", never "eliminará permanentemente" — same non-lying wording rule as Inventory's).
- **"Categorías" is a sidebar sub-item of "Sistema"**, using the same `DashboardNavItem.children`
  mechanism documented under Inventory above — no new nav code was needed.
- `canManage`/`isAdmin` gating and error handling (`extractErrorMessage`) follow the identical pattern
  described under Inventory; see that section rather than duplicating it here.

### Businesses (Negocios)

`/dashboard/negocios` (`features/dashboard/businesses/businesses-page.component.ts`) manages the "Negocio"
lookup table a product belongs to (Librería, Tienda, Heladería, ...) — structurally an exact clone of the
Categories screen (same component split, same soft-delete confirm copy, same sortable table, same
`canManage`/`isAdmin` gating — visible read-only to `USER`, full CRUD for `ADMIN`/`SUPER_ADMIN`, not
admin-route-gated the way Usuarios/Roles are). `BusinessService` (`core/services/business.service.ts`)
mirrors `CategoryService` method-for-method against `${environment.apiUrl}/businesses`. "Negocios" sits in
the sidebar under "Sistema" next to "Categorías" via the same `DASHBOARD_NAV_ITEMS` children mechanism.

- **Every product now carries a required `businessId`** (`Product.businessId`/`business` display name in
  `core/models/product.model.ts`, `ProductInput.businessId`) — the product create/edit form
  (`ProductFormModalComponent`) has a second required `<select>` next to the category one, populated from
  `InventoryPageComponent.businessOptions` (`BusinessService.getBusinesses()`, active-only — fetched
  alongside `categoryOptions` in the same constructor, same pattern).
- **The inventory toolbar's business filter is derived from loaded products**, not fetched separately —
  `InventoryPageComponent.businesses` is `[...new Set(products().map(p => p.business))]`, the identical
  pattern `categories` already used. Don't confuse this with `businessOptions`: the filter dropdown shows
  only businesses *currently in use*, the form's dropdown shows every *active* business (a newly created
  business with no products yet won't appear in the filter until a product uses it — same asymmetry the
  category filter already has, not a bug).
- **`ProductTableComponent` sorts by `business` like any other column** (`ProductSortColumn` includes it);
  the desktop table has a dedicated "Negocio" column, the mobile card shows it appended to the category
  line (`{{ product.category }} · {{ product.business }}`) rather than as a separate row, to keep the card
  compact.

### Sales (Ventas)

`/dashboard/ventas` (`features/dashboard/sales/sales-page.component.ts`) is a POS-style checkout screen —
`SalesService` (`core/services/sales.service.ts`) talks to `${environment.apiUrl}/sales`. Unlike every
other module in this app, it's **not** a list/create/edit/delete management table — it's a single
receipt-building workflow: search → add → adjust quantity → save. "Ventas" sits under "Finanzas" in the
sidebar via the same `DashboardNavItem.children` mechanism Categorías/Inventario already use — `Finanzas`
itself still opens its own (unbuilt) placeholder page, exactly like `Librería` does above `Inventario`.

- **No route guard beyond `authGuard`** — any authenticated role (`SUPER_ADMIN`/`ADMIN`/`USER`) can reach
  this screen and register a sale. This mirrors the backend's own permission decision (see the backend
  `CLAUDE.md`'s Sales section): a cashier is realistically a `USER`-role account, so this can't be
  admin-gated the way Usuarios/Roles are. Don't add `adminGuard` here without also changing the backend.
- **The in-progress receipt is pure component state, not persisted anywhere** —
  `SalesPageComponent.items: signal<SaleDraftItem[]>([])`. Nothing is written to the backend until
  "Guardar venta" is pressed; removing a line only ever mutates this local array, never calls an API
  (per the ticket's explicit rule: inventory changes only on confirmed save, never on cart edits).
- **`core/models/sale.model.ts` centralizes all receipt math** — `calculateItemTotal`,
  `calculateSaleSubtotal`, `calculateSaleTotal` — exactly one place to change if discounts/taxes are added
  later (today `calculateSaleTotal` just calls `calculateSaleSubtotal`; it's kept as its own function
  specifically so that future rule lives in one function body, not a search-and-replace across
  components). `SaleItemsTableComponent`/`SaleSummaryComponent` both call these rather than computing
  inline — never duplicate the multiplication/reduction in a template.
- **Adding a product merges into the existing draft row instead of creating a new one**
  (`SalesPageComponent.onProductSelected`) — looks up by `productId` first; if found, increments quantity
  (capped at `product.stock`, with a toast if already at the cap); if not, pushes a new `SaleDraftItem`.
  This is the "no duplicate rows for the same product" rule from the ticket, enforced purely in this one
  method — no component needs to re-implement it.
- **`SaleDraftItem.availableStock` is a client-side UX guardrail only** — it's the `stock` value the
  product had *at search time*, used to cap the quantity stepper/input so the UI never lets you type past
  what you last saw available. It is not authoritative: the backend's `confirm_sale` Postgres function
  re-checks live stock (with row locking) at save time regardless, and a stale `availableStock` just means
  the save can still fail with a real "insufficient stock" error if the true stock dropped in the
  meantime — the UI cap is convenience, not the actual guarantee.
- **`ProductSearchComponent` is a debounced, server-side live search** (`debounceTime(250)` +
  `distinctUntilChanged()` + `switchMap` into `InventoryService.searchProducts()`, `takeUntilDestroyed()`)
  — the *first* component in this app to actually call the backend's `search=` query param on `/products`;
  every other product list (Inventario) still filters client-side over a full fetched list. Don't copy the
  Inventario pattern for a POS-style picker — a live incremental search against the server is the correct
  shape here, and `InventoryService.searchProducts()` (small `limit`, e.g. 8) exists specifically for it,
  separate from `getProducts()`'s full-list `limit=100` call.
  - A product already at zero stock still appears in results (so the cashier can see it exists) but its
    button is `disabled` and shows "Sin stock" — `select()` also hard-refuses if `stock <= 0`, so even a
    stale/race-y click can't add an out-of-stock item to the draft.
- **After a successful save, the draft resets to `[]`** and a success toast fires — the next search starts
  from an empty receipt. The "Guardar venta" button is disabled whenever the draft is empty **or**
  `isSaving()` is true, which is what prevents a double-submit from a second click while the request is
  in flight (per the ticket's explicit "no duplicar ventas" requirement) — this is the same
  `isSubmitting`-gates-the-button pattern every other create/edit modal in this app already uses.
- **No sales-history/list page was built** — the backend's `GET /sales`/`GET /sales/:id` exist and are
  tested (see backend `CLAUDE.md`), but the ticket's frontend section only specified the receipt-building
  screen; `SalesService.getSales()`/`getSaleById()` are implemented and ready for a future history view,
  just not wired into any route yet. Don't assume a "Ventas" history page exists elsewhere in the app.
- **New `minus` icon** was added to `shared/ui/icon/icon-registry.ts` for the quantity stepper's decrement
  button — nothing else in the app needed it before this module.

#### Real-time inventory reservation (follow-up change — read this before touching the receipt flow)

The component tree/file layout above is unchanged, but **the receipt is no longer purely local component
state** — it's a real, server-persisted `OPEN` sale (see the backend `CLAUDE.md`'s matching section) that's
mutated on every cart action, not just submitted once at the end. This was a deliberate architecture change
requested after the module first shipped; don't revert to the old "build locally, submit once" model.

- **`SalesPageComponent.items`/`total` are never computed locally** — they're always exactly the `Sale`
  object the last successful API call returned (`applySale()`). There is no client-side receipt-math
  (`calculateItemTotal`/`calculateSaleSubtotal`/`calculateSaleTotal` were removed from
  `core/models/sale.model.ts` entirely) and no optimistic update: a rejected change (insufficient stock,
  product deactivated mid-session) just leaves `items`/`total` untouched, because nothing was mutated ahead
  of the response in the first place — the previous quantity is still what's bound in the template.
- **Every add/+/−/direct-edit/remove calls `SalesService.adjustSaleItem(productId, quantityDelta)`**
  (`POST /sales/items`), computing the delta from the *last known server quantity* (`onQuantityChange`/
  `onRemoveItem` in `SalesPageComponent` look up the current item in `items()` first) — never send an
  absolute target quantity, the backend's `adjust_sale_item` function only understands deltas against its
  own authoritative row.
- **`pendingProductIds: Set<string>`** tracks which product's row has an in-flight request — `adjustItem()`
  refuses to start a second request for the same product while one is pending (prevents a rapid double-click
  on `+` from racing itself) and `SaleItemsTableComponent` renders that row visually disabled
  (`.sale-table__row--pending`/`.sale-card--pending`) via a `pendingProductIds` input passed straight through
  from the signal.
- **No more client-side stock ceiling** — `SaleItem` (the real API shape) carries no `availableStock`
  field, unlike the old `SaleDraftItem` it replaced. The quantity stepper's `+` button and direct-edit input
  have no upper clamp anymore; only a floor of 1 (removing is the separate, explicit "Quitar" action). The
  backend is now the live authority on every single change, so an over-limit attempt is simply rejected with
  a real error (toasted via `extractErrorMessage`) instead of being silently capped client-side against a
  number that could already be stale.
- **`SalesPageComponent`'s constructor calls `SalesService.getCurrentSale()`** to restore an in-progress
  receipt after a reload or re-navigation to `/dashboard/ventas` — this isn't just a UX nicety, it's
  necessary correctness: the stock for those items is *already* reserved server-side, so silently starting
  from an empty cart would make that reservation invisible (and un-cancelable) to the user. `getCurrentSale()`
  never throws — a 404 (no draft) or any other failure both resolve to `null`, so the page always just falls
  back to an empty receipt rather than needing special-case error handling for the common "nothing in
  progress" case.
- **New "Cancelar venta" action** (`SaleSummaryComponent`'s `cancel` output → `SalesPageComponent.cancelSale()`
  → `DELETE /sales/current`) — discards the whole receipt and restores every reserved line's stock in one
  call. Disabled whenever the receipt is empty or a save/cancel is already in flight, same `isBusy` gating
  pattern as every other create/edit modal's submit button in this app.
- **`SaleSummaryComponent` dropped the separate "Subtotal" row** — it used to show `Subtotal`/`Total` as two
  identical numbers (no discounts existed to make them differ); now only `Total` is shown, sourced directly
  from `Sale.total`, plus a small hint ("Inventario ya reservado — se confirma al guardar.") explaining that
  saving is a confirmation step, not the moment stock actually changes. If real subtotal/discount/tax logic
  is added later, that's the natural place to reintroduce a distinct subtotal row.
- **"Guardar venta" now calls `SalesService.confirmSale()`** (`POST /sales/confirm`, no body) instead of the
  old bulk `createSale(input)` — the draft's items already exist server-side, so there's nothing left to
  send. `SalesService.createSale()` (bulk, one-shot) is still implemented and exported for any other future
  caller; the Ventas screen itself no longer calls it.

### Suppliers (Proveedores) and Purchases (Compras)

`/dashboard/proveedores` (`features/dashboard/suppliers/`) is a structural clone of the
Categories/Businesses admin screen (same component split, same soft-delete confirm copy
— "se desactivará", never "eliminará permanentemente" — same sortable table, same `canManage`/`isAdmin`
gating). `SupplierService` (`core/services/supplier.service.ts`) mirrors `BusinessService`
method-for-method against `${environment.apiUrl}/suppliers`. `/dashboard/compras`
(`features/dashboard/purchases/`) is a receipt-building workflow shaped like Ventas' original one-shot
model (search → add → adjust → save-as-one-call) rather than its newer real-time reservation model — see
"Why one-shot, not real-time" below. Both sit under the sidebar via the existing
`DashboardNavItem.children` mechanism: "Proveedores" under "Sistema" (a reference table, like
Categorías/Negocios), "Compras" under "Finanzas" next to "Ventas" (an operational screen).

- **Why one-shot, not real-time**: Ventas reserves stock the instant a product is added because
  overselling is a real risk while a cashier is still building the receipt (see the Sales section above).
  Compras has no equivalent risk — increasing stock can't be "oversold" — and the ticket that built this
  screen explicitly requires that "Cancelar" never touch the database at all. A one-shot model gives that
  for free (there's nothing to roll back, because nothing was ever sent to the backend until "Guardar
  compra"), so `PurchaseDraftItem` (`core/models/purchase.model.ts`) is a genuine local-only draft type,
  unlike Sales' now-removed `SaleDraftItem` — Compras really does build its receipt client-side with zero
  round-trips until the final save, and that's a deliberate difference from Ventas' current architecture,
  not a regression back to Ventas' old one.
- **`calculatePurchaseItemTotal`/`calculatePurchaseSubtotal`/`calculatePurchaseTotal`**
  (`core/models/purchase.model.ts`) always multiply by `costPrice`, **never** `publicPrice` — a purchase
  invoice's total is what you paid, not what you'll sell for. `PurchaseItemsTableComponent` and
  `PurchasesPageComponent`'s `total` computed signal both call these rather than computing inline.
- **Adding a product merges into the existing draft row instead of creating a new one**
  (`PurchasesPageComponent.onProductSelected`), identical rule to Ventas — looks up by `productId` first,
  increments quantity on a match, otherwise pushes a new `PurchaseDraftItem` pre-filled with the product's
  *current* `costPrice`/`publicPrice`.
- **`quantity`, `costPrice`, and `publicPrice` are all independently editable per row**, unlike Ventas
  (which only lets you adjust quantity) — `PurchaseItemsTableComponent` emits `quantityChange`/
  `costPriceChange`/`publicPriceChange`, each clamped (`Math.max(...)`, quantity floor 1, prices floor 0)
  in the page component's handlers, with the row's total recalculating live off whichever field just
  changed. This is what lets the invoice's actual paid price differ from the product's last-known price —
  the whole point of the screen is to *set* that price for future purchases/sales.
- **`PurchaseProductSearchComponent` is its own copy of Ventas' `ProductSearchComponent`** (same
  `debounceTime(250)` + `distinctUntilChanged()` + `switchMap` + `takeUntilDestroyed()` shape, same
  `InventoryService.searchProducts()` call), not a shared/imported component — this repo's established
  convention (see Ventas' own note above) is a near-identical copy per feature folder rather than a
  cross-feature import, so each screen can diverge independently. The one real behavioral difference:
  **no out-of-stock disabling** — buying more of a zero-stock product is exactly the normal case for this
  screen, unlike Ventas where zero stock blocks the add.
- **The date picker is a plain native `<input type="date">`**, not a new library — there was no existing
  date-picker component anywhere in this codebase to reuse, and the ticket explicitly forbade adding a new
  dependency for it, so this was the minimal, no-new-dependency choice, not an oversight.
  `PurchasesPageComponent.purchaseDate` is a `signal<string>` in the exact `yyyy-MM-dd` shape the native
  input reads/writes; `purchaseDateAsDate` is a small derived `computed(() => new Date(...))` that exists
  solely so `SaveConfirmModalComponent`'s `@Input() purchaseDate: Date | null` gets a real `Date` rather
  than a string forced through `$any()` — introduced specifically to avoid that type-checker-bypassing
  hack. The `<input>`'s `[max]` is bound to `purchaseDate()` itself (today), so a future date can't be
  picked from the UI at all — the backend's 24-hour grace window (see the backend `CLAUDE.md`) exists for
  timezone-offset edge cases, not because the frontend allows picking tomorrow.
- **"Cancelar" only opens a confirmation dialog if the draft has items** (`requestCancel()` returns early
  otherwise) and, once confirmed, **calls no API at all** — `confirmCancel()` only resets local signals
  (`items`, `supplierId`, `purchaseDate` back to today). This is the one action in the entire dashboard
  that is guaranteed side-effect-free by construction (not just by convention) — there is no service call
  in that code path for a network layer to even intercept.
- **"Guardar compra" shows a second confirmation modal** (`SaveConfirmModalComponent`) summarizing
  Proveedor/Fecha/Productos count/Total *before* the real `PurchasesService.createPurchase()` call — a
  deliberate two-step confirmation (unlike Ventas, which saves on a single click) because a purchase
  invoice both changes stock and overwrites the product's current price, a bigger/harder-to-undo effect
  than a sale. `PurchasesService.createPurchase()` is a single bulk call (unlike Sales' many small
  `adjustSaleItem` calls) — Compras has no server-side draft to keep in sync, so there's nothing to send
  until this one moment.
- **After a successful save, the draft resets** (`resetDraft()`: empty items, cleared supplier, date back
  to today) and a success toast fires — mirrors Ventas' post-save reset.
- **No purchase-history list page was built**, same situation as Sales — `PurchasesService.getPurchases()`/
  `getPurchaseById()` exist and are ready for a future history view, just not wired into any route yet.
- **`SupplierFormModalComponent` has no uniqueness lock on `name`** (unlike `RoleFormModalComponent`'s
  system-role name lock) — only `taxId` is unique on the backend, and only among active suppliers, so
  there's no client-side rule to proactively enforce beyond normal required-field validation; a duplicate
  `taxId` surfaces via the real backend 409 through the same `extractErrorMessage` pattern every other
  form in this app uses.
- **New `truck` icon** was added to `shared/ui/icon/icon-registry.ts` for the Proveedores nav entry —
  nothing else in the app needed it before this module.

#### Draft persistence across navigation (follow-up change — read this before touching either receipt flow)

Both `PurchasesPageComponent` and `SalesPageComponent` used to own their receipt state directly as local
signals — which meant navigating away (e.g. to Inventario to check something) and back destroyed and
recreated the component, losing everything for Compras and forcing an extra network refetch for Ventas.
That state now lives in two root-provided singleton services instead — `PurchaseDraftStore` and
`SalesDraftStore` (`core/services/`) — and the two page components are thin views over them. **No new
state-management library was added**: Angular's own `providedIn: 'root'` singleton + signals is already
the right tool here, since a root service is never destroyed by route navigation, only by a full page
reload — exactly the persistence boundary this needed. `AuthService`'s existing `localStorage`-based
session persistence was the only prior precedent for "survive more than component lifetime" in this app;
the same reasoning (browser storage, scoped correctly) extends naturally to `sessionStorage` for Compras
below.

- **`PurchaseDraftStore` is the actual fix** — Compras has no server-side draft (see "Suppliers
  (Proveedores) and Purchases (Compras)" above: nothing is sent to the backend until "Guardar compra"), so
  before this change there was nothing anywhere holding the in-progress invoice except the doomed page
  component. The store now holds `supplierId`/`purchaseDate`/`items` as signals, exposes the same
  `onProductSelected`/`updateQuantity`/`updateCostPrice`/`updatePublicPrice`/`removeItem`/`setSupplier`/
  `setPurchaseDate`/`reset` surface the page component used to implement inline, and mirrors every mutation
  to `sessionStorage` under a key scoped by the current user's id
  (`cj_purchase_draft:<userId>`) — **`sessionStorage`, not `localStorage`**, was a deliberate choice: it
  survives a reload (the concrete "F5 accidental refresh" scenario) but clears itself when the tab closes,
  so an abandoned draft carrying real cost/price data doesn't linger indefinitely on a shared machine the
  way `localStorage` would. `PurchasesPageComponent` no longer owns `supplierId`/`purchaseDate`/`items` at
  all — every template binding reads `draft.*()` and every handler forwards straight to a store method.
- **`SalesDraftStore` doesn't need `sessionStorage` at all** — Ventas' receipt was already a real,
  server-persisted `OPEN` sale before this change (see the Sales section above: `GET /sales/current`,
  `adjust_sale_item`), so the *only* thing missing was somewhere for that state to live besides the page
  component that kept getting destroyed. Moving the exact same `items`/`total`/`pendingProductIds`/
  `isSaving`/`isCancelling` signals and the exact same `adjustItem`/`confirmSale`/`cancelSale` logic into a
  root singleton means revisiting Ventas after navigating away no longer needs to refetch
  `GET /sales/current` — the state that call would return is already sitting in the store, kept live by
  every mutation. A reload still goes through the constructor's one `getCurrentSale()` call, same as
  before this change.
- **Backend needed no changes for this ticket** — verified explicitly, not assumed: Ventas' `OPEN` sale
  mechanism already satisfied every persistence/validation requirement (survives navigation and reload by
  construction, is inherently scoped to the JWT's user, and `POST /sales/confirm` already re-validates
  stock/product state at save time), and Compras' one-shot `confirm_purchase` model already satisfies "no
  DB writes and no inventory changes while it's still a draft" by never being called until "Guardar
  compra". The only gap was purely a frontend one (state tied to a component's lifetime instead of the
  browser tab's), so only `comercial-jhoel-app` changed.
- **Sales gained a cancel confirmation it didn't have before** — this ticket's "mostrar confirmación al
  cancelar" requirement exposed a real gap: `SalesSummaryComponent`'s cancel button used to call
  `cancelSale()` directly, no confirmation step, unlike Compras which already had one. Fixed by adding
  `SaleCancelConfirmModalComponent` (`features/dashboard/sales/components/cancel-confirm-modal/`, selector
  `app-sale-cancel-confirm-modal`), an exact structural clone of Compras' own cancel modal (same
  `alert-triangle` icon, same "Volver"/danger-button shape), with wording that reflects Ventas' real
  effect: "el inventario reservado se restaurará" rather than Compras' "el inventario no se ha modificado
  todavía" — the two screens have opposite states at cancel time (Ventas has already reserved stock in
  real time; Compras never touched anything), so the copy is deliberately different even though the flow
  is now identical.
- **"Borrador en progreso" indicator**: `DashboardSidebarComponent` injects both stores and renders a
  small `.sidebar__draft-dot` (a plain gold `--color-accent-gold` dot, not a text badge — kept deliberately
  minimal per the ticket's "no debe ser invasivo") next to the "Ventas"/"Compras" sub-links whenever that
  store's `hasActiveDraft()` is `true`. Because the sidebar is part of `DashboardLayoutComponent`, which is
  mounted for every `/dashboard/*` route, both stores end up constructed as soon as any authenticated user
  reaches the dashboard — for `SalesDraftStore` this means its one `getCurrentSale()` call fires on
  dashboard load rather than waiting for the user to open Ventas, a deliberate trade-off (one extra request
  per session) in exchange for the indicator being visible from anywhere, not just the Ventas page itself.
- **`beforeunload` warning is Compras-only, and lives on `DashboardLayoutComponent`** (not on
  `PurchasesPageComponent`) specifically so it's still armed even if the user is on a *different* page (say
  Inventario) with a Compras draft pending — a page-component-scoped listener would have detached the
  moment they navigated away from Compras, which is exactly the scenario most likely to end in an
  accidental tab close. Guarded by `purchaseDraftStore.hasActiveDraft()` only: Ventas never gets this
  warning, deliberately, because its data literally cannot be lost by closing the tab (it's already a real
  DB row) — warning about a data-loss risk that doesn't exist would just be noise. Verified directly: with
  an active Compras draft, attempting to navigate away triggers the browser's native "leave site" prompt;
  with an empty draft (or only a Ventas draft), navigation proceeds unprompted.
- **Logout cleanup, and why the ordering matters**: `DashboardLayoutComponent.logout()` calls
  `salesDraftStore.resetOnLogout()` (clears only the in-memory signals — the real `OPEN` sale stays
  reserved server-side for that user, restored correctly next time they log in) and
  `purchaseDraftStore.reset()` (clears signals *and* removes the `sessionStorage` entry) **before**
  calling `authService.logout()`, not after — `PurchaseDraftStore`'s storage key is derived from
  `authService.currentUser()?.id` at call time, so clearing it after the session was already torn down
  would silently target nothing and leave the draft sitting in `sessionStorage` for whoever uses the tab
  next. Verified directly: building a Compras draft, confirming its `sessionStorage` key exists, logging
  out, and re-checking `sessionStorage` shows the key removed.
- **Cross-user isolation is structural, not just a logout side effect**: the `sessionStorage` key itself is
  scoped by user id (`cj_purchase_draft:<userId>`), so even without the logout cleanup above, a different
  user logging in on the same tab would read their *own* key, never the previous user's — the explicit
  clear-on-logout is hygiene (don't leave stale data sitting around) on top of an isolation guarantee that
  already exists independent of it. `SalesDraftStore` needs no equivalent scoping of its own: it holds
  nothing sensitive beyond what `GET /sales/current` already scopes to the caller's JWT.
- **No speculative re-validation of a restored draft** — the ticket raises the case of a draft referencing
  a product that's since gone inactive, changed price, or a supplier that's been deactivated, and asks
  that nothing be silently rewritten. Rather than pinging the backend per line item every time a draft is
  restored (extra requests, and a race against the very save it's trying to protect), both flows lean on
  the validation that already existed and is guaranteed to run at the one moment it actually matters:
  `POST /sales/confirm` and `POST /purchases` both fully re-validate product/supplier/stock state
  server-side, and any rejection surfaces through the existing `extractErrorMessage`/toast path — the user
  sees a real error naming the actual problem, and can then edit the offending row and retry, rather than
  the app guessing at a "fix" on their behalf.

### Reportería

`/dashboard/reportes-ventas` and `/dashboard/reportes-compras` (`features/dashboard/reports/`) are
admin-only analytics screens over Ventas/Compras history — filter, summarize, view detail, and export a
PDF. Both routes carry `canActivate: [adminGuard]` (same guard as Usuarios/Roles) and the sidebar's
"Reportería" entry (and its two children) carries `roles: ['SUPER_ADMIN', 'ADMIN']`, matching the
backend's own `@Roles('ADMIN', 'SUPER_ADMIN')` on every `/reports/*` route — a `USER` account never sees
the menu entry and gets a real `403` if it calls the API directly regardless.

- **Component split**: `SalesReportPageComponent`/`PurchasesReportPageComponent` are the orchestrators —
  own the filter/pagination/sort/view-mode signals, call `ReportsService`, and own the detail-modal
  open/loading/data state. Three components are genuinely shared between both reports (not duplicated,
  because both reports use them identically): `ReportSummaryComponent` (generic KPI-tile row — checked
  first that no existing summary component was generic enough to reuse directly; every other module's
  summary is bespoke to its own domain shape), `ReportPaginationComponent` (this app had *no* pagination
  component anywhere before this — every other paginated list filters/sorts client-side over a full
  fetched page — so this is the first one, deliberately generic since a future paginated screen can reuse
  it), and `ProductFilterSearchComponent` (`app-report-product-filter`) — adapted from Ventas'/Compras'
  own product-search dropdowns, but for a *filter*: no out-of-stock disabling (a report can reasonably
  filter by a product that's since sold out), and a persistent "selected" chip replaces the search box
  until cleared, since a filter selection sticks around instead of firing once per click like an
  add-to-receipt action does.
- **The results table and detail modal are NOT shared between the two reports** — `SalesReportTableComponent`/
  `PurchasesReportTableComponent` and `SaleDetailModalComponent`/`PurchaseDetailModalComponent` are
  separate, near-identical copies, following this codebase's established convention (see Ventas/Compras'
  own product-search components) of a small per-feature copy over a cross-feature shared component once
  the shapes genuinely diverge (Compras' table has a Proveedor column and its detail modal shows
  cost *and* public price per line; Ventas' doesn't).
- **Desktop-only tables, deliberately** — unlike Inventory/Categories/Suppliers/etc., the report tables
  have no separate mobile card-list. Both wrap in their own `overflow-x: auto` container (this app's
  standing rule for wide content), so they're still usable on a narrow viewport, just not reflowed —
  a scope call for an admin-only analytics screen, not an oversight.
- **Filters apply on an explicit "Aplicar filtros" click, not live** — matches the ticket's own mockup
  (a dedicated apply button, plus a separate "Limpiar filtros"). The date/category/product/user/
  (supplier) fields are plain local signals the form binds to directly; nothing refetches until
  `applyFilters()` runs, which also resets to page 1. Changing the sort column, the page, or the
  Detalle/Por-producto toggle *does* refetch immediately (no separate "apply" step for those) — only the
  filter fields themselves are staged behind the button, consistent with the mockup's own distinction
  between "type into these fields" and "act now" controls (page/sort/tab are the latter).
  `hasActiveFilters()` (used to enable/disable "Limpiar filtros") compares every filter signal against the
  same defaults `clearFilters()` restores, not just "is anything non-empty" — so a date range that's back
  to the default month even after being touched doesn't leave the button stuck enabled.
- **Default filter window is "current month"** (first day of the current month through today), computed
  fresh each time via a small local `firstDayOfMonthIsoDate()`/`todayIsoDate()` pair (plain local-time
  `Date` field math, not the UTC-offset dance Compras' own date picker used to need) — chosen over either
  "no filters" (every sale/purchase ever, on a system that will only grow) or a blank form requiring the
  user to always pick dates first. Both reports use the identical default for consistency.
- **"Por producto" is a second table, not a second page** — a small segmented `Detalle`/`Por producto`
  toggle above the results switches between the per-sale/per-purchase table and the grouped-by-product
  one, sharing the same filter panel and summary tiles above it; switching re-fetches only the table
  (`fetchTable()`), not the summary. The grouped table is written inline in each report page's own
  template rather than as a separate component — it's four columns with no sort/actions, genuinely too
  small to be worth a fourth component pair.
- **PDF export downloads through a real `Blob`**, not a rendered link: `ReportsService.exportSalesReportPdf()`/
  `exportPurchasesReportPdf()` call their endpoint with `responseType: 'blob'`, and
  `core/utils/download-blob.ts`'s `downloadBlob()` does the standard `URL.createObjectURL` +
  synthetic-`<a download>`-click + `URL.revokeObjectURL` dance to trigger the browser's real save-as. A
  failed export needs its own error-message path — `core/utils/extract-blob-error-message.ts`
  (`extractBlobErrorMessage()`) — because Angular hands back a blob-typed error body for a `blob`-typed
  request even when the backend actually returned a normal JSON error (400 invalid date range, 403,
  etc.); it reads the blob back to text and parses it so the real backend message still reaches the user
  instead of a generic "export failed" string.
- **New icons** (`shared/ui/icon/icon-registry.ts`): `download` (the export button), `filter` (the filter
  panel's own header), `bar-chart` (the "Reportería" nav entry) — none of the existing icons fit any of
  these three uses.
- **`businessId` filter** (follow-up addition) — a "Negocio" `<select>` next to Categoría, populated from
  `BusinessService.getBusinesses()`, in both report pages' filter panels.
- **Every filter field is a draft/applied pair, not a single signal** (follow-up change — read this before
  adding another filter field to either page). Originally each filter (`startDate`, `categoryId`, the
  selected product, etc.) was one signal, bound directly to its form control *and* read directly by
  `exportPdf()`/`fetchAll()`. That meant editing a dropdown and immediately clicking "Exportar PDF" —
  without clicking "Aplicar filtros" first — could export different data than the table still on screen
  was showing, since the edited signal was already live even though nothing had been re-fetched yet. Each
  page now keeps two copies of every filter: `draftStartDate`/`draftCategoryId`/`draftBusinessId`/
  `draftSelectedProduct`/`draftUserId`(/`draftSupplierId` for Compras) are what the form inputs are bound
  to — editing a field only ever touches these. The plain-named signals (`startDate`, `categoryId`, etc.)
  are the *applied* filters: the only ones `currentFilters()` reads, so they're the only ones the table,
  the summary tiles, and the PDF export ever see. They change in exactly two places —
  `applyFilters()` (copies draft → applied, then re-fetches) and `clearFilters()` (resets both draft and
  applied to the same defaults) — never anywhere else. This is what makes "the PDF always matches what's
  filtered/displayed" an actual guarantee rather than a best-effort: there is no code path where
  `exportPdf()` can see a filter value the visible table hasn't already re-fetched against.

#### Reporte de Recargas (follow-up — a third report joins the Reportería submenu)

`/dashboard/reportes-recargas` (`features/dashboard/reports/recharges/recharges-report-page.component.ts`)
is the third Reportería screen, added as a new child under the sidebar's "Reportería" item (next to
Reporte de Ventas/Compras), same `roles: ['SUPER_ADMIN', 'ADMIN']` gate and `adminGuard`-guarded route.
**Deliberately simpler** than `SalesReportPageComponent`/`PurchasesReportPageComponent`: no `viewMode`
toggle, no detail modal, no separate sortable-table component — Recargas has no line items to drill into
and no by-product breakdown, so each table row already shows everything (saldo anterior, compra, saldo del
día, saldo final, venta) and the table is written as a plain inline `<table>` in the page's own template,
not a fourth component pair.

- **Reuses the two already-generic Reportería components as-is** — `ReportSummaryComponent` and
  `ReportPaginationComponent`, confirmed fully generic before writing this page (not assumed), zero
  modification needed. `ProductFilterSearchComponent` does **not** apply here — Recargas has no product
  dimension — so the filter panel is just two date inputs and a "Tipo de recarga" `<select>` populated from
  the already-existing `RechargesService.getTypes()` call (no new backend endpoint needed for the
  dropdown).
- **No new `RechargesReportRow` model** — the table binds directly to the existing `RechargeDailyBalance`
  interface from `core/models/recharge.model.ts`, the same shape `RechargesPageComponent`'s own table
  already uses. `RechargesReportFilters`/`RechargesReportSummary` (`core/models/report.model.ts`) are the
  only two new types this feature needed.
  `ReportsService.getRechargesReport()`/`getRechargesReportSummary()`/`exportRechargesReportPdf()`
  (`core/services/reports.service.ts`) mirror the Sales/Purchases report calls method-for-method, including
  `exportRechargesReportPdf()`'s `responseType: 'blob'`.
- **Same draft/applied filter-signal split as Sales/Purchases** (see the note above this section) —
  `draftStartDate`/`draftEndDate`/`draftRechargeTypeId` are what the form binds to; `startDate`/`endDate`/
  `rechargeTypeId` are what `currentFilters()`, the table, the summary tiles, and `exportPdf()` all read,
  changed only by `applyFilters()`/`clearFilters()`. This is the same guarantee the Sales/Purchases pages
  already have: "Exportar PDF" can never export a filter edit that wasn't applied yet.
- **Default filter window is "current month"**, identical `firstDayOfMonthIsoDate()`/`todayIsoDate()`
  helpers (plain local-time `Date` field math) redefined locally in this page's own file rather than
  imported from Sales'/Purchases' report pages — this codebase's established "small per-feature copy over
  cross-feature coupling" convention for a 5-line date helper, same reasoning already documented for
  Purchases'/Recargas' own date-picker helpers elsewhere in this file.
- **Summary tiles**: Total comprado, Total vendido (with "N días cerrados" as its description line),
  Registros, Promedio de venta — icons `shopping-bag`/`trending-up`/`smartphone`/`bar-chart`, all four
  already existing in `icon-registry.ts` from earlier modules; no new icon was needed for this page.
- **PDF export downloads through the same `Blob`/`downloadBlob()`/`extractBlobErrorMessage()` path** the
  Sales/Purchases exports already use — no new download mechanism.
- **New sidebar entry**: `{ label: 'Reporte de Recargas', icon: 'smartphone', path: 'reportes-recargas' }`
  as the third child of `DASHBOARD_NAV_ITEMS`'s "Reportería" item (`core/data/dashboard-nav.data.ts`),
  reusing the same `smartphone` icon the operational Recargas nav entry already uses.
- **Verified directly in the browser**: the page renders with correct sidebar highlighting under
  "Reportería", the default current-month filter loads real data into the summary tiles and table,
  switching "Tipo de recarga" to "Tigo" and clicking "Aplicar filtros" correctly re-filters both the table
  and the summary tiles (recalculated totals, not just a client-side row hide), and clicking "Exportar PDF"
  fires `GET /api/reports/recharges/export` with exactly the applied filters (confirmed via the browser's
  own network panel), returns `200`, and the downloaded PDF's own rows/totals matched the on-screen
  filtered table exactly.
- **Gotcha caught and fixed on review**: the `Fecha` column originally bound `{{ row.date }}` raw, showing
  `2026-08-29` instead of the `dd/MM/yyyy` format every other report table in this app uses
  (`SalesReportTableComponent`, `PurchasesReportTableComponent`) — fixed with `{{ row.date | date:
  'dd/MM/yyyy' }}` (plus importing `DatePipe` from `@angular/common`, not `@angular/common/http`). Angular's
  `DatePipe` parses a plain `yyyy-MM-dd` string correctly as ISO 8601, so no `Date` object conversion was
  needed — same one-line fix pattern already used elsewhere in this codebase for this exact oversight.

### Users & Roles administration

`/dashboard/usuarios` and `/dashboard/roles` are admin-only screens under the "Sistema" submenu —
`UsersPageComponent`/`RolesPageComponent`, structurally identical to Categories (same component split,
soft-delete pattern, sortable table, form/delete modals). `UserService`/`RoleService`
(`core/services/{user,role}.service.ts`) talk to `${environment.apiUrl}/users` and `/roles`.

- **Two-layer access control, both required**: the sidebar hides "Usuarios"/"Roles" for a non-admin (new
  `roles?: string[]` field on `DashboardNavItem`, filtered in `DashboardSidebarComponent.navItems` — a
  computed signal now, not a plain property, so the template calls `navItems()`); a new `adminGuard`
  (`core/guards/admin.guard.ts`) on both routes in `app.routes.ts` blocks direct-URL access and redirects
  to `/dashboard` instead of a blank/broken page. Both are UX only — `RolesController`'s `@Roles(...)` on
  every route (including `GET`) is the real enforcement, and rejects a `USER`-role token with `403` even if
  the frontend is bypassed entirely.
- **No `canManage` gating inside these two pages**, unlike Categories/Inventory — every admin action is
  always shown, because the page itself is already unreachable for a non-admin (route guard + hidden nav).
  Don't add a `canManage` input here "for consistency"; it would be dead code, since `USER` never sees
  these components render at all.
- **`UserFormModalComponent`'s `password` field is conditionally required** — `Validators.required` is
  added/removed on the control in `ngOnChanges` depending on create vs. edit mode (required on create,
  optional-but-validated-if-present on edit — "Nueva contraseña (opcional)"). The role `<select>` is
  populated from `RoleService.getRoles()` (active-only, matching the categories dropdown pattern in
  Inventory).
- **`UserTableComponent`'s own "Desactivar" button is disabled for the logged-in admin's own row**
  (`isSelf(user)`, comparing against a `currentUserId` input sourced from `AuthService.currentUser()?.id`)
  — a proactive UX echo of the backend's `CannotDeactivateSelfError`; the backend still rejects it
  independently if this were ever bypassed.
- **`RoleFormModalComponent` locks the `name` field for the three seeded roles** (`SYSTEM_ROLE_NAMES` in
  `core/models/role.model.ts`, checked via `isSystemRole`) and **locks the `isActive` checkbox whenever the
  role has any assigned users** (`canDeactivate` getter, `role.usersCount === 0`) — both mirror backend
  rules (`SystemRoleImmutableError`, `RoleHasAssignedUsersError`) so the form fails proactively instead of
  round-tripping to the API first.
  - **Gotcha already hit and fixed here**: a plain `[disabled]="someExpression"` template binding on an
    element that also has `formControlName` does **not** reliably control the native `disabled` state —
    `ReactiveFormsModule`'s `FormControlName` directive owns that property itself, and a value-only
    binding can end up cosmetically inert (Angular reflects the binding in `ng-reflect-is-disabled` in dev
    tools, but the checkbox stays genuinely clickable). The fix is to call
    `this.form.controls.x.enable()` / `.disable()` imperatively in `ngOnChanges` instead — which is also
    exactly how the `name` field's system-role lock was already implemented, so both fields now follow the
    same pattern. If a future form needs a conditionally-disabled reactive-forms control, use the
    `.enable()`/`.disable()` approach from the start, not a template `[disabled]` binding.
- **Role table's "Rol" column shows `usersCount`** — this comes straight from the backend's `RoleOutput`
  (a per-role count query, not computed client-side); the delete/desactivar button is disabled whenever
  `usersCount > 0` or the role is already inactive, with a `title` tooltip explaining which.
- **No ADMIN/SUPER_ADMIN distinction anywhere in this module** — `AuthService.isAdmin` already treats both
  as equal (`ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN']`), and nothing in Users/Roles introduces a finer split.
  This was a deliberate decision (see the backend `CLAUDE.md`'s note in the same section), not an oversight
  — don't add SUPER_ADMIN-only UI without a corresponding backend rule to enforce it.

### Recargas Electrónicas

`/dashboard/recargas` (`features/dashboard/recharges/recharges-page.component.ts`) is the daily
register screen for electronic-airtime balances (Claro, Tigo, extensible) — `RechargesService`
(`core/services/recharges.service.ts`) talks to `${environment.apiUrl}/recharges`. Unlike Categorías/
Negocios/Proveedores, it's **not** a create/edit/delete CRUD table — like Ventas/Compras it's an
operational daily workflow, with no `canManage`/`isAdmin` gating on visibility (any authenticated role
reaches the page; the one role-sensitive control is described below). "Recargas Electrónicas" sits under
"Finanzas" in the sidebar next to Ventas/Compras via the existing `DashboardNavItem.children` mechanism,
using the pre-existing `smartphone` icon (already in `icon-registry.ts`, unused elsewhere) — no new icon
was needed for this module.

- **Component split**: `RechargesPageComponent` is the orchestrator — fetches `RechargeType[]` and
  today's `RechargeDailyBalance[]` in parallel (`forkJoin`) on construction, and owns the final-balance
  confirmation modal's open/target/draft/saving state. `RechargeTableComponent` is the main table (Tipo |
  Saldo Anterior | Compra | Saldo del Día | Saldo Final | Venta) — dumb, `@Input() balances`, desktop
  `<table>` + mobile `.card-list` like every other data table in this app. `RegisterPurchaseFormComponent`
  is **self-contained**, like `CategoryFormModalComponent`/`ProductFormModalComponent` — it calls
  `RechargesService.registerPurchase()` directly and emits the updated `RechargeDailyBalance` row, rather
  than emitting raw form values for the page to submit; the page's only job is to merge that row into its
  `balances` signal by id. `FinalBalanceConfirmModalComponent` is **dumb**, like Compras'
  `SaveConfirmModalComponent` — it only computes the `sale` preview (`dailyBalance - finalBalance`) for
  display and emits `confirmed`/`cancelled`; the page owns the actual `registerFinalBalance()` call. This
  split (self-contained form vs. dumb confirm-then-page-calls-the-service) is the same one this app
  already uses elsewhere — followed here, not invented for this module.
- **The "Saldo Final" column is the only editable cell in the table** — `RechargeTableComponent` keeps a
  plain `draftFinalBalance: Partial<Record<string, string>>` keyed by balance id (not a two-way
  `[(ngModel)]`, mirrors Compras' `purchase-items-table` price-input `(change)`-handler pattern), seeded
  from each row's persisted `finalBalance` in `ngOnChanges` **only for ids not already tracked** — so a
  value the user is mid-typing is never clobbered by a `balances` refresh triggered by *another* row's
  save. "Compra" itself has no input in the table at all; it's `totalPurchases`, always
  backend-computed and read-only here — registering an actual purchase only happens through the separate
  "Registrar compra" form.
- **Client-side "Guardar" gating mirrors the backend's own validation** (`canSave()`): the typed value
  must parse as a finite number, `>= 0`, and `<= balance.dailyBalance` — the exact
  `FINAL_BALANCE_EXCEEDS_DAILY`/`INVALID_FINAL_BALANCE` rules the stored function enforces server-side.
  This is a proactive UX echo, not the real guarantee — the backend re-validates independently regardless
  of what this check allowed through.
- **Re-editing an already-closed day is disabled in the UI for a non-admin**
  (`canEditFinalBalance(balance) = balance.finalBalance === null || isAdmin`, `isAdmin` passed down from
  `AuthService.isAdmin`) — the input and "Guardar" button are both `[disabled]`, with a small
  `lock`-icon hint ("Día cerrado — solo un administrador puede corregirlo.") explaining why. This
  mirrors the backend's `FinalBalanceEditForbiddenError` (403) rule exactly (see the backend `CLAUDE.md`'s
  matching section) — proactive UX, not the actual enforcement; a bypassed/stale frontend still gets
  rejected server-side. Verified directly: as a `USER` account, a day already closed by another user shows
  the locked state immediately, while a still-open day (first close) remains fully editable for that same
  `USER` account — matching the backend's "first close is operational, re-edit is admin-only" split.
- **The confirmation modal shows the calculated venta before saving, per the ticket's explicit
  requirement** — `FinalBalanceConfirmModalComponent` displays Saldo del día / Saldo final / **Venta
  calculada** (`dailyBalance - finalBalance`, computed in the modal itself from its own inputs, not
  re-fetched) before the real `PATCH .../final-balance` call ever fires. Verified directly end-to-end:
  typing 300 against an 800 daily balance shows "Venta calculada: Q500.00" in the modal, and the saved
  row's `Venta` column matches exactly after confirming.
- **No client-side receipt/draft state, unlike Ventas/Compras** — there is nothing here analogous to
  `SalesDraftStore`/`PurchaseDraftStore` to persist across navigation, because every mutation
  (`registerPurchase`, `registerFinalBalance`) is a single, already-atomic backend call with no
  multi-step "building" phase beforehand; reloading the page just re-fetches `GET /recharges/daily`, which
  is idempotent and always reflects the true current state.
- **No history/filter screen was built**, same situation as Ventas/Compras — the backend's
  `GET /recharges/history` exists and is ready for a future screen, but `RechargesService` deliberately
  has no `getHistory()` method yet; add one alongside that future screen rather than speculatively now.

#### Resumen de Ventas y Cuadre (follow-up addition — daily cash reconciliation card)

`SalesSummaryCardComponent` (`features/dashboard/recharges/components/sales-summary-card/`, selector
`app-recharge-sales-summary-card`) is a new Card sitting next to "Registrar compra" in a second row below
the main table — `RechargesPageComponent`'s layout changed from a single `2fr 1fr` grid to the table full
width on its own row, then a `.recharges__cards-row` (`1fr 1fr` on `lg+`) holding the purchase-form Card
and this new summary Card side by side.

- **Self-contained, like `RegisterPurchaseFormComponent`** — calls `RechargesService.getSalesSummary()`/
  `.registerSalesClosure()` directly rather than routing through the page; it owns its own
  `summary`/`loading`/`isSaving`/`totalCollectedDraft` signals. **No confirmation modal** — unlike the
  final-balance flow (which does have one), the ticket for this Card specified none: the result/color
  preview already updates live as the user types, which *is* the confirmation before "Guardar cuadre" is
  even clicked.
- **`totalCollectedDraft` is a draft, separate from `summary().totalCollected`** — editing the input only
  ever touches the draft signal; `summary()` only changes on a successful fetch or save. `previewResult`/
  `previewStatus` are `computed()` off `summary().totalSales - totalCollectedDraft()`, so the whole
  Resultado block — number, color, badge — recalculates on every keystroke with **zero network calls**.
  Verified directly: typing 250/300/350 against a totalSales of 300 live-cycled the result through
  naranja (`+Q50.00`, "Diferencia pendiente") → verde (`Q0.00`, "Cuadre correcto") → rojo (`-Q50.00`, "Se
  recaudó de más") with no page or network activity between keystrokes.
- **Colors are never the only signal — icon + badge text is what the ticket's own accessibility
  requirement asked for**: `getSalesClosureStatus()` (`core/models/recharge.model.ts`, pure function,
  `difference > 0 → 'positive' | < 0 → 'negative' | === 0 → 'zero'`) drives three lookup maps
  (`STATUS_TONE`/`STATUS_ICON`/`STATUS_TEXT` in the component) that feed the reused `<app-badge>` —
  `tone="success"`+`check-circle` "Cuadre correcto" (verde), `tone="gold"`+`alert-circle` "Diferencia
  pendiente" (naranja — reuses this app's existing gold accent token rather than inventing a new orange
  one), `tone="danger"`+`x-circle` "Se recaudó de más" (rojo). The big Resultado number itself gets the
  same three-way color via `.result__value--zero/--positive/--negative` CSS classes, sourced from the
  identical `previewStatus()` signal — one status computation, two visual representations, never two
  separate color decisions that could drift. **New `check-circle` icon** added to
  `shared/ui/icon/icon-registry.ts` — the only genuinely new icon this feature needed (`alert-circle`/
  `x-circle`/`lock` already existed from Reportería/Recargas' own final-balance lock hint).
- **Re-saving an already-saved cuadre is disabled in the UI for a non-admin**
  (`canSave = ... !summary.savedClosure || isAdmin()`), mirroring `RechargeTableComponent`'s identical
  `canEditFinalBalance` pattern exactly — the input is `[disabled]`, "Guardar cuadre" is `[disabled]`, and
  a matching lock hint ("Cuadre ya guardado hoy — solo un administrador puede corregirlo.") is shown.
  Proactive UX only; the backend's `SalesClosureEditForbiddenError` (403) is the real enforcement. Verified
  directly: as a `USER` account viewing a day another user already closed, both Claro/Tigo's saldo-final
  cells *and* the summary Card's input/button all show the locked state simultaneously — the two lock
  hints are independent (one per backend rule) but visually consistent.
- **`@Input() refreshTrigger` is how the Card learns today's sale figures changed** — the only action on
  this page that moves `totalClaro`/`totalTigo` is registering a `finalBalance` (a purchase alone never
  does, since a type's `sale` stays `null`/uncounted until it's closed). `RechargesPageComponent` owns a
  `salesSummaryRefreshTick` signal, incremented once inside `confirmFinalBalance()`'s success handler, and
  passes it down as `[refreshTrigger]`; the Card's `ngOnChanges` refetches `getSalesSummary()` whenever
  that input changes (skipping the first, constructor-triggered fetch via `!changes['refreshTrigger'].
  firstChange`). No shared store was introduced for this — a single incrementing counter `@Input()` is the
  simplest correct fix for "one component needs to know when another component's write affects data it
  displays," and this app has no existing cross-component event-bus pattern to reuse instead. Verified
  directly: closing Claro's day updated the summary Card's `Total vendido Claro`/`Total ventas` figures
  immediately, with no manual page reload.
- **`RegisterRechargeSalesClosureInput`/`RechargeSalesSummary` models** (`core/models/recharge.model.ts`)
  and `RechargesService.getSalesSummary()`/`.registerSalesClosure()` mirror the backend's
  `GET /recharges/sales-summary`/`POST /recharges/sales-closure` contract exactly, including
  `totalCollected`/`difference` typed `number | null` (always present, `null` until `savedClosure` is
  `true`) rather than the backend ticket's own example JSON's conditionally-omitted keys — a stable shape
  is simpler to consume from a template than an optional-key one, and every other DTO in this app already
  follows that same stable-shape convention.

#### Operation-date picker (follow-up — every screen in this module now works against a chosen date)

`RechargesPageComponent` owns one new `operationDate` signal (`yyyy-MM-dd`, defaults to today via a
local `todayIsoDate()` — the same field-based, no-UTC-dance technique as Reports' own copy, defined as a
free function at the top of the page component file rather than imported from a shared util, matching
this codebase's established "small per-feature copy over cross-feature coupling" convention for this
exact kind of 5-line helper). A native `<input type="date">` in the page header
(`.recharges__date-field`, `[max]` bound to the browser's own today so a future date can never be picked
from the UI — same reasoning as Purchases' own date input) is the single source of truth; the table, the
purchase form, and the summary Card are all now driven by it instead of an implicit "today" baked into
each one separately.

- **`RechargeTableComponent` needed no changes at all** — it already only ever renders whatever
  `balances` array the page hands it and emits events carrying the target row's own id; it has no
  internal notion of "today" to update.
- **`RegisterPurchaseFormComponent` gained one new required `@Input() operationDate`**, forwarded
  straight into its own `RechargesService.registerPurchase()` call — no other change; its own draft
  reset (amount field clears after a successful save) already satisfied the ticket's reset requirement
  before this follow-up even started.
- **`SalesSummaryCardComponent` is where the real complexity landed** — it now takes `operationDate` as a
  required `@Input()` alongside its pre-existing `refreshTrigger`, and its `ngOnChanges` refetches on
  *either* changing (a date switch also resets `totalCollectedDraft` to `null` first — "no mezclar
  información de diferentes fechas" — so a value typed for one date can never be silently submitted
  against another).
  - **Gotcha caught and fixed here**: the component's constructor used to call `fetchSummary()` directly
    (`RegisterPurchaseFormComponent`-style "self-contained" pattern), but Angular does not set `@Input()`
    values until *after* the constructor runs — so that first fetch was silently firing with
    `operationDate` still at its class-field default (`''`), which `RechargesService.getSalesSummary()`
    then sent as *no* date parameter at all, letting the backend fall back to **its own** `todayIsoDate()`
    rather than the frontend's. This is invisible whenever the browser and the API server happen to
    agree on what day it is, but this session's own Docker dev setup exposed it directly: the API
    container runs on UTC while the host/browser is several hours behind, so "today" briefly disagreed
    between them and the Card loaded a different date's real figures than the table sitting right next to
    it. Fixed by moving the *first* fetch into `ngOnChanges`'s `firstChange` branch (which fires once
    `operationDate` is genuinely set) and removing the constructor call entirely — the general lesson,
    not specific to this component: **never fetch using an `@Input()` from inside a constructor**; the
    earliest a component may safely read a real `@Input()` value is `ngOnChanges`/`ngOnInit`.
  - **The "reset after saving" requirement is satisfied by never pre-filling the draft from the server in
    the first place**, rather than by an explicit clear-after-save step layered on top — `totalCollectedDraft`
    is `null` on every fresh load, every date switch, and every successful save (it used to be seeded
    from `summary().totalCollected` post-save; that line was removed). The just-saved figures are never
    lost, though: a new read-only `saved-closure` block (green, `check-circle`) renders whenever
    `summary().savedClosure` is `true`, showing Recaudado/Resultado from `summary()` itself independent of
    whatever the now-empty input currently holds — "Total recaudado" is relabeled "Corregir total
    recaudado" in that state as a small extra clarity cue for the admin who's allowed to re-save.
  - **Result-preview block is now conditionally rendered** (`@if (previewResult() !== null)`) instead of
    always showing an "—" empty state — since the draft is empty far more often now (right after every
    load/save/date-switch), a persistently-visible empty result card would be more visual noise than
    signal; it only appears once the user is actually typing a value to preview.
- **Duplicate-save protection verified directly at two independent layers**: the frontend's existing
  `isSaving()` guard (unchanged by this follow-up) blocks a second `save()` call while one is in flight,
  and — since JS is single-threaded but a triple `button.click()` fired synchronously in the same tick
  can still race ahead of Angular's own change-detection updating `[disabled]` — the backend's own
  race-handling (see the API's CLAUDE.md, `register_recharge_sales_closure`) is the real, unconditional
  guarantee: three rapid clicks against the same date produced exactly one `recharge_sales_closures` row,
  confirmed via a direct database count immediately after.

#### Cuadre cycles (follow-up — "Guardar cuadre" now also resets the table for a new one)

A second, closely-related follow-up landed right after the operation-date picker: saving a cuadre now
also resets Claro/Tigo's whole row (saldo anterior, compra, saldo del día, saldo final) so a *second*
cuadre can be registered on the same calendar date, with saldo anterior automatically equal to the
previous cuadre's saldo final. This needed no schema/DTO awareness on the frontend at all — the backend's
`GET`/`POST` contracts are byte-for-byte unchanged (see the API's CLAUDE.md's own "Cuadre cycles" section
for the `sequence`-based mechanism that makes it possible) — the only gap was that nothing on this side
was refetching the *table* after a cuadre save.

- **`SalesSummaryCardComponent` gained one new `@Output() closureSaved`**, emitted right after a
  successful save (alongside the pre-existing `summary.set(...)`/toast/draft-reset it already did — none
  of that changed). `RechargesPageComponent` listens via `(closureSaved)="onClosureSaved()"`, which just
  calls the already-existing private `fetchBalances()` — the same method `onDateChange()` already used to
  refetch the table when the user picks a different date. No new fetch logic was written; this follow-up
  only wired an existing capability to a new trigger.
- **Why the summary Card doesn't also need an explicit refetch**: `RegisterRechargeSalesClosureUseCase`
  (backend) already returns the POST response by re-running `GetRechargeSalesSummaryUseCase` *after* the
  reset — so the response the Card's `save()` handler receives already reflects the fresh, empty cycle.
  The Card updating from its own response and the page's table refetching via `closureSaved` are two
  independent reactions to the same one write, not two use cases of the same fetch.
- **Verified directly, end to end**: registering Q600 in Claro purchases and Q300 in Tigo, closing both
  (saldo final Q100/Q50, ventas Q500/Q250), and saving a Q750 cuadre immediately updated the table in
  place — Claro's own row went from `Saldo Anterior Q0.00 / Compra Q600.00 / Saldo Final Q100.00` to
  `Saldo Anterior Q100.00 / Compra Q0.00 / Saldo Final (empty)` with no page reload, and the summary Card
  simultaneously reset to `Total ventas Q0.00` / an empty "Total recaudado" input — both panels reflecting
  the new cycle in the same screenshot.

### Inventario por ubicación y presentaciones (extension to Inventory)

Backend now models "producto → presentaciones → ubicaciones → stock" instead of a single global number —
see the backend `CLAUDE.md`'s matching section for the full stored-function mechanism. The frontend gained
one new route and two new modals rather than a rewrite of the existing Inventario screen.

- **`/dashboard/inventario/:id`** (`product-detail-page.component.ts`) — per-location stock breakdown
  (Bodega/Vitrina), the product's presentations table (Nombre/Factor/Precio costo/Precio público/Estado,
  with edit and, for anything but "Unidad", delete-via-deactivate actions), and a "Movimientos recientes"
  audit table. Reached by clicking a product row's "view" action in `ProductTableComponent`
  (`InventoryPageComponent.router.navigate(['/dashboard/inventario', product.id])`) — the table's own
  columns/sorting/filtering are otherwise unchanged.
- **`Product.stockByLocation?: StockByLocation[]`** (`core/models/product.model.ts`) is optional —
  present whenever the API resolved it alongside the product (the detail page's own fetch), absent
  everywhere else (the main Inventario list still only needs the running total). `stockAt(product,
  locationName)` is the one accessor every caller should use rather than `.find()`-ing the array inline —
  returns `0`, not `undefined`, when a location has no row yet, since "no row" and "zero stock" mean the
  same thing to a caller. `ProductInput.stock` became optional and is documented as create-only — the
  backend rejects it on update now that stock is managed via Compras/Ventas/Traslados, never a direct
  product-form edit.
- **`transfer-inventory-modal`** (`inventory/components/transfer-inventory-modal/`) — reachable from the
  Inventario toolbar's "Trasladar inventario" link, calls `InventoryLocationsService.registerTransfer()`
  directly (self-contained form, same pattern as `ProductFormModalComponent`). Any authenticated active
  account can register a transfer (mirrors the backend's own operational, non-admin-gated policy) — moving
  stock between your own two locations is a daily register task, not an admin action.
- **`presentation-form-modal`** — create/edit a presentation, admin-gated the same way
  `ProductFormModalComponent` already is (`canManage`/`AuthService.isAdmin`); this is UX only, the
  backend's `@Roles('ADMIN', 'SUPER_ADMIN')` on both write endpoints is the real enforcement.
- **`InventoryLocationsService`** (`core/services/inventory-locations.service.ts`) is the new service
  wrapping `${environment.apiUrl}/inventory/*` — `getLocations()`, `getPresentations(productId)`,
  `createPresentation()`, `updatePresentation()`, `getProductInventory(productId)` (the detail page's own
  fetch), `registerTransfer()`. Deliberately separate from `InventoryService` (which still owns plain
  product CRUD against `/products`) rather than merged into it — the two map to genuinely different
  backend modules (`products` vs. `inventory`).

### Venta por mayor — wholesale pricing (extension to Sales)

`SalePricingBarComponent` (`sales/components/sale-pricing-bar/`), rendered above the product search on
`/dashboard/ventas`, lets the cashier pick an optional client and a price list (Público/Mayorista) for the
receipt about to be built — mirrors the backend's `configure_open_sale`/`PATCH /sales/current/pricing`
contract (see the backend `CLAUDE.md`).

- **Reuses `ClientSearchSelectComponent`** (already built for Cuentas por Cobrar) rather than duplicating
  a client picker — the one cross-feature import in this app's product-search family, justified because
  the two screens need the exact same "search a client, pick one" behavior, unlike Ventas'/Compras' own
  deliberately-duplicated product-search components (which diverge in real, feature-specific ways).
- **`locked` (an `@Input()`, driven by the parent's `items().length > 0`) disables the price-list toggle**
  once the receipt has any line item — pure UX echo of the backend's own lock (see
  `configure_open_sale`'s doc comment); a stale/bypassed frontend still gets rejected server-side
  regardless.
- **`SalesDraftStore`/`SalesPageComponent`** gained `clientId`/`clientName`/`priceList` alongside the
  pre-existing `items`/`total` signals, all sourced the same way — from whatever `Sale` object the last
  successful API call returned, never computed locally. `onConfigurePricing()` calls the new
  `SalesService.configurePricing()` (`PATCH /sales/current/pricing`) and applies the returned `Sale`
  exactly like every other mutation on this screen already does.
- **`CreateSaleInput` gained optional `clientId`/`priceList`** for the bulk one-shot path too, kept in
  sync with the backend's own `POST /sales` change even though the live Ventas screen only ever calls the
  incremental `PATCH .../pricing` route.

### Transaccionar (`features/dashboard/transaccionar/`, `transaction-banks/`, `transaction-types/`)

A new operational screen under "Finanzas" (`/dashboard/transaccionar`) for registering bank deposit
operations, plus two admin catalog screens under "Sistema" (`/dashboard/banco-agente`,
`/dashboard/tipo-transaccion`) for the "Banco Agente"/"Tipo de Transacción" lookups it depends on — see
the backend `CLAUDE.md`'s matching section for the stored-function cuadre mechanism this all drives
toward.

- **`transaction-banks-page.component.ts`/`transaction-types-page.component.ts`** are structural clones
  of the Categories/Businesses admin screen (same component split — summary tiles, toolbar, sortable
  table, form modal, delete-confirm modal — same soft-delete "se desactivará" wording, same
  `canManage`/`isAdmin` gating for mutations while `GET` stays open to any authenticated role). Neither
  route is admin-gated at the router level (unlike Usuarios/Roles/Reportería) — any authenticated account
  can view+use both catalogs, matching the backend's own non-`@Roles(...)` read policy; only the two
  report/admin screens (see below) are actually restricted.
- **`TransaccionarPageComponent`** is a two-step flow: a landing grid of transaction-type cards (icon +
  name, sourced live from `TransactionTypeService.getTypes()`, not hardcoded) → selecting one reveals the
  registration form (Banco Agente select, monto total, desglose de efectivo, distribución de
  transacciones, cliente opcional). `BankDepositDraftStore` (`core/services/bank-deposit-draft.store.ts`)
  is the root-provided singleton holding all of this — same reasoning as `PurchaseDraftStore` (see
  "Draft persistence across navigation" under Suppliers/Purchases above): Transaccionar has no
  server-side draft either, nothing is sent to the backend until "Confirmar y Guardar", so this store is
  the only place the in-progress operation lives, persisted to `sessionStorage` (never `localStorage` —
  real money data shouldn't linger indefinitely on a shared machine) scoped by the current user's id, the
  same pattern `PurchaseDraftStore` already established.
- **Three-way cuadre status (`CuadreStatus = 'red' | 'yellow' | 'green'`), computed entirely client-side
  and live**: `cashStatus`/`transactionsStatus` each compare their own running total against
  `totalAmount` (green = exact match, red = over, yellow = under or the monto is still `0`), and
  `overallStatus` is the worse of the two (red beats yellow beats green) — mirrors the backend's own
  exact-match rule inside `register_bank_deposit_operation` (`CASH_TOTAL_MISMATCH`/
  `TRANSACTION_TOTAL_MISMATCH`) as a proactive UX echo, not the real guarantee. `round2()` (rounds before
  comparing) exists specifically because plain float arithmetic on money can otherwise miss an exact match
  by a fraction of a centavo. `canSave` additionally requires both a bank and a type to be selected and at
  least one transaction row — never true for a `0` total, since an empty draft isn't a valid cuadre.
- **`setTransactionCount(count)` resizes `transactionAmounts` by padding with `0`/truncating** — the page
  component, not the store, is responsible for confirming with the user before calling this when shrinking
  would silently discard an already-typed amount.
- **`formatDenomination()` (in `cash-breakdown-table`/`save-confirm-modal`) is a small, deliberately local
  helper**, not a reuse of the shared `formatCurrency` from `core/utils/number-format.util.ts` — it labels
  a fixed bill/coin denomination (`Q200`, `Q0.50`, no thousands separator needed, 0 decimals for whole
  denominations vs. 2 for coins under `Q1`), a genuinely different formatting need from a money *amount*
  display. Every actual currency total in this feature (row subtotals, "Total Efectivo", the confirm
  modal's summary) does call the shared `formatCurrency` — confirmed directly, not assumed, before
  concluding this wasn't a duplicated-logic bug (`core/utils/number-format.util.ts`'s own doc comment
  explains why that file exists at all: several older modules used to each hand-roll this exact
  `` `Q${value.toFixed(2)}` `` pattern).
- **Day-gate errors surface through the existing `extractErrorMessage`/toast path, unhandled specially** —
  Transaccionar reuses Banks' día-abierto/cerrado cycle (see the backend `CLAUDE.md`), so a save attempt
  against an unopened or already-closed day returns the backend's own real message
  (`BankDepositDayNotOpenedError`/`BankDepositDayAlreadyClosedError`), shown via the same toast mechanism
  every other write error in this app uses — no bespoke "day closed" UI state was built for this screen.
- **No history/list screen was built inside Transaccionar itself** — `BankDepositService.getById()` exists
  for a future receipt-lookup view, but the actual historical listing lives in Reportería (below), not
  duplicated here.

### Reporte de Transacciones (fourth Reportería screen)

`/dashboard/reportes-transacciones` (`features/dashboard/reports/bank-deposits/`) — a fourth admin-only
analytics screen alongside Ventas/Compras/Recargas, same `adminGuard`-guarded route and
`roles: ['SUPER_ADMIN', 'ADMIN']` sidebar entry. Structurally the simpler shape Recargas' own report
established (see the backend `CLAUDE.md`'s "Reportería de Recargas" section) — no `viewMode` toggle, no
detail modal, a plain inline `<table>` rather than a separate sortable-table component, since a
`bank_deposit_operations` row already is the full detail.

- **Reuses the two fully generic Reportería components** (`ReportSummaryComponent`,
  `ReportPaginationComponent`) with zero modification, plus the same draft/applied filter-signal split
  documented under the original Sales/Purchases Reportería section — editing a filter field only ever
  touches `draftStartDate`/`draftTransactionBankId`/etc., and `applyFilters()`/`clearFilters()` are the
  only two places the applied signals (the ones the table, summary tiles, and PDF export actually read)
  change. This is what guarantees "Exportar PDF" can never export a filter edit the visible table hasn't
  already re-fetched against.
- **Filter dropdowns are populated from the two new catalog services** (`TransactionBankService.getBanks()`,
  `TransactionTypeService.getTypes()`) rather than a bespoke lookup — the same services the
  Banco Agente/Tipo de Transacción admin screens already use.
- **Default filter window is "current month"**, same local `firstDayOfMonthIsoDate()`/`todayIsoDate()`
  helper pair redefined in this page's own file — this codebase's established "small per-feature copy"
  convention for this exact 5-line date helper, not imported from another report page.
- **PDF export downloads through the same `Blob`/`downloadBlob()`/`extractBlobErrorMessage()` path** every
  other report export already uses — no new download mechanism for this fourth screen.

### Gestión de Transacciones (`features/dashboard/transaction-days/`)

`/dashboard/gestion-transacciones`, a third "Sistema" day-management screen alongside "Gestión de Días
Cerrados" (`features/dashboard/closed-days/`) and "Gestión de Días de Recargas"
(`features/dashboard/recharge-days/`) — same `adminGuard`-guarded route,
`roles: ['SUPER_ADMIN', 'ADMIN']` nav entry. Neither of those two sibling screens is documented in this
file yet (a pre-existing gap, not introduced here) — read their own source directly
(`closed-days-page.component.ts`/`recharge-days-page.component.ts` and their doc comments) if extending
either.

- **Deliberately reuses `ClosedDaysService` directly, not a third copy of the same endpoints** — this is
  the one place this decision genuinely differs from the closed-days/recharge-days precedent (which are
  fully independent backend cycles and rightly get their own services). Transaccionar's
  `RegisterBankDepositOperationUseCase` (backend) gates every write against the *same* `day_openings` row
  Cuadre de Agentes uses (see the backend `CLAUDE.md`'s "Transaccionar" section) — there is only one
  open/close/reopen/cancel cycle per calendar date, so `TransactionDaysPageComponent` calls
  `ClosedDaysService.getClosedDays/getDayDetail/reopenDay/cancelDay` for exactly that shared data, and
  `DayStatusService.refresh()` after a reopen/cancel, identical to `ClosedDaysPageComponent`. Reopening or
  anulando a day here reopens/anula it in "Gestión de Días Cerrados" too, and vice versa — this is
  correct, not a bug, and both confirmation modals' copy says so explicitly.
- **The list table drops Cuadre de Agentes' own money columns** (Total Bancos/Efectivo/CxC/Activos/
  Resultado — meaningless for Transacciones) and keeps only the day-cycle columns (Fecha/Estado/
  Apertura/Cierre/Abrió/Cerró/Acciones) — `ClosedDayRow` still carries those fields (same shared model,
  reused as-is), the table template just doesn't render them.
- **`TransactionDayDetailModalComponent` is genuinely new**, not a reuse — it still calls
  `ClosedDaysService.getDayDetail(date)` for the status/audit-log fields (same shared data), but
  additionally calls `ReportsService.getBankDepositsReport({ startDate: date, endDate: date, limit: 200 })`
  (already built for "Reporte de Transacciones", see above) for that date's actual Transaccionar
  operations, shown as a table (Hora/Banco Agente/Tipo/Cliente/Monto/Transacciones/Usuario) with a small
  client-computed summary (operation count, transaction count, total amount) — never a bank-balance/
  reconciliation view, unlike the closed-days detail modal it's structurally modeled on. Both requests run
  via `forkJoin` so the modal has one `loading` state, not two sequential spinners.
- **`ReopenConfirmModalComponent`/`CancelConfirmModalComponent` are small, deliberate copies**, not a
  reuse of closed-days' own — their backend call is identical (`ClosedDaysService.reopenDay/cancelDay`),
  but the copy has to say explicitly that this is the same cycle as Cuadre de Agentes and that
  `bank_deposit_operations` rows are never touched by a reopen/cancel, which the original modals' text
  (written before Transaccionar existed) doesn't mention — this codebase's established "small per-feature
  copy over cross-feature coupling" convention, applied because the text genuinely differs, not the
  backend call.
- **No new backend endpoints, tables, or migrations** — every data source this screen needs
  (`GET/POST /closed-days/*`, `GET /reports/bank-deposits`) already existed before this feature, built for
  "Gestión de Días Cerrados" and "Reporte de Transacciones" respectively.

#### Ver / Anular una operación de Transaccionar (follow-up — never edit/delete)

Added after "Gestión de Transacciones" first shipped, in direct response to "necesito poder ver, modificar
o eliminar una transacción específica, sin borrar nada ni tocar datos ya registrados": the recommended and
implemented answer is **Ver** (full detail) + **Anular** (soft void, admin-only) — never a real edit, never
a real delete. See the backend `CLAUDE.md`'s matching section for the `isVoided`/`voidedAt`/`voidedBy`/
`voidReason` migration and the `POST /bank-deposits/:id/void` endpoint this is built on.

- **`BankDepositDetailModalComponent`** (`features/dashboard/reports/bank-deposits/components/
  bank-deposit-detail-modal/`) is genuinely shared, not duplicated — imported directly by both "Reporte de
  Transacciones" (its own table) and `TransactionDayDetailModalComponent` (the day-detail modal's
  operations table). This is a deliberate exception to this codebase's usual "small per-feature copy"
  convention: the need (full detail of one `BankDepositOperation` — cash breakdown, transaction
  distribution, void banner if applicable) is byte-identical in both places, the same reasoning
  `SalePricingBarComponent` already reuses `ClientSearchSelectComponent` for. It calls
  `BankDepositService.getOperationById()` (already existed) on open/id change.
- **`VoidConfirmModalComponent`** (`.../reports/bank-deposits/components/void-confirm-modal/`) is a small,
  deliberate copy of the reopen/cancel confirm-modal pattern (mandatory reason, min 5 chars, dumb —
  parent owns the actual `BankDepositService.voidOperation()` call) — its own copy explicitly tells the
  user nothing is deleted/edited and that the fix for a wrong monto/banco/desglose is to anular this one
  and register a new correct one via Transaccionar. Only wired into "Reporte de Transacciones" (not the
  day-detail modal) — that screen already has the filters/search to find the right operation across dates,
  so anular doesn't need a second entry point.
- **`BankDepositService.voidOperation(id, reason)`** is the one new frontend method — `POST
  /bank-deposits/:id/void`. No `canManage`/`isAdmin` gating needed anywhere in this feature: both
  "Reporte de Transacciones" (route) and "Gestión de Transacciones" (route) are already `adminGuard`-gated
  end to end, so every viewer who can reach either screen is already an admin.
- **A voided row stays fully visible with a badge, never hidden or grayed out of existence** — "Reporte de
  Transacciones"' table gained an "Estado" column (`Vigente`/`Anulada`, `status-badge--active`/
  `status-badge--voided`) and an "Acciones" column (Ver always enabled, Anular disabled once already
  voided); the row itself gets a `report-table__row--voided` dimming class. The day-detail modal's own
  operations table mirrors this with the existing `status-badge--CLOSED`/`--CANCELLED` classes (relabeled
  "Vigente"/"Anulada" in that context) plus a `detail-table__row--voided` dimming class and a "Ver" action.
- **Every client-computed total now excludes voided operations** — `TransactionDayDetailModalComponent`'s
  `activeOperations` computed (`operations().filter(op => !op.isVoided)`) is what `operationsTotal`/
  `transactionsTotal` and the "Operaciones vigentes" tile are derived from; the raw `operations()` signal
  (every row, voided included) is only ever used to render the table itself. This mirrors the backend's
  own `getReportSummary()` exclusion — "Reporte de Transacciones"' own summary tiles/by-bank breakdown
  already exclude voided rows because they come from that same backend aggregate, no frontend-side
  filtering was needed there.
- **Verified directly, not assumed**: `psql`-checked the real `bank_deposit_operations` table before
  touching anything — zero rows existed at that point, so no live click-through was performed in that
  session pass. In a later, explicitly user-authorized follow-up ("registra una transacción de prueba y
  pruébalo tú mismo"), a real test operation was registered end-to-end (opening today's day via the normal
  Agentes Bancarios flow first, since Transaccionar requires it), then Ver/Anular were both exercised
  live against it — the row stayed fully visible with the "Anulada" badge, the report's own totals dropped
  to exclude it, and the detail modal's void banner rendered correctly, all confirmed via screenshots and
  a final `psql` check of the row's own `is_voided`/`voided_at`/`void_reason` columns.

### Resumen dashboard's "Bancos" tile — real, live monthly transaction count (follow-up)

`DashboardHomeComponent` (`features/dashboard/home/`) renders `DASHBOARD_SUMMARY`'s four cards
(Sistema/Finanzas/Bancos/Librería) — all still mock (`core/data/dashboard-summary.data.ts`'s own doc
comment already flagged this as a "phase 2" placeholder) **except "Bancos"**, whose `value`/`description`
are now overridden with the real `BankDepositService.getMonthlyCount()` figure (`GET
/bank-deposits/monthly-count` — see the backend `CLAUDE.md`'s matching section), labeled "Total de
Transacciones este mes".

- **`summary$` changed from a bare `getSummary()` passthrough to a `combineLatest` + `map`** that merges
  the mock array with the live count, replacing only the `id: 'bancos'` item's `value` (via the shared
  `formatQuantity()`, same thousands-separator formatter every other count in this app uses) and
  `description`. The other three cards flow through completely unmodified.
- **`catchError(() => of(null))` on the monthly-count call, not on the whole `combineLatest`** — Resumen is
  reached by every authenticated account immediately after login with no route guard, so a transient
  network failure on this one call must never break the page; on failure the "Bancos" card silently keeps
  showing its mock value/description instead (no error toast, no broken layout) rather than the real one.
- **No admin gating needed anywhere in this change** — `getMonthlyCount()` hits the one
  `bank-deposits` route that is deliberately NOT behind `@Roles`, exactly because this page has no
  `adminGuard` and needed a number every role can see.
- **Verified directly**: navigated to `/dashboard` after registering-then-anulando one test operation and
  observing a second, genuinely real operation appear in the same dataset (registered by the actual
  business user concurrently, mid-session) — the tile correctly showed `1` (the one real, non-anulada
  transaction that month), not `2` and not `0`, confirming the anulada exclusion and the real-count wiring
  both work together correctly against live, non-fabricated data.

### Resumen — Indicadores del mes (follow-up — Ventas de Recargas / Ventas / Compras / Transacciones Bancarias)

`FinancialIndicatorsComponent` (`features/dashboard/home/components/financial-indicators/`) renders four
admin-only sections below the existing four mock summary cards — sourced from `GET /dashboard/summary`
(`DashboardMetricsService`, see the backend `CLAUDE.md`'s "Dashboard" section for the full query design).
Dumb/presentational: `DashboardHomeComponent` owns the fetch, the admin gate, and loading/error state;
this component only ever renders whatever `metrics` input it's handed (or a loading placeholder), with no
date-range logic of its own — `period` is rendered exactly as the backend computed it.

- **Admin-gated at both the fetch and the render** — `DashboardHomeComponent`'s constructor only calls
  `DashboardMetricsService.getSummary()` when `AuthService.isAdmin()` is `true`, and the template only
  mounts `<app-financial-indicators>` behind the same `@if (isAdmin())`. A `USER`-role account never
  issues this request at all and never sees these four sections — the backend's own `@Roles('ADMIN',
  'SUPER_ADMIN')` is the real enforcement regardless, same two-layer pattern (hide + guard) already
  established for Usuarios/Roles/Reportería elsewhere in this app. This is the one place Resumen now
  actually differs by role — every other card on this page is still open to any authenticated account.
- **`catchError(() => of(null))` on the metrics call** — a transient failure hides just this one section
  (`financialMetrics` stays `null`, nothing renders) rather than breaking the whole Resumen page, same
  resilience reasoning already applied to the "Bancos" tile's own monthly-count fetch above.
- **Gotcha caught and fixed live, not assumed correct**: `CardComponent`'s own `:host { display: block; }`
  (`shared/ui/card/card.component.scss`) won a CSS specificity/ordering tie against an external
  `.stat-card { display: flex; flex-direction: column; }` class applied directly to `<app-card
  class="stat-card">` from this component's own stylesheet — both rules compile to equal-specificity
  selectors (`:host[_nghost-x]` vs `.stat-card[_ngcontent-y]`), so which one wins depends on Angular's
  build-time style ordering, not anything predictable from the template. Confirmed directly in the
  browser: label/date/amount spans rendered side-by-side on one line instead of stacked. Fixed by never
  trying to flex-style the `<app-card>` host element itself — each stat card wraps its projected content
  in its own plain `<div class="stat-card">` *inside* `<app-card>`, a normal element fully owned by this
  component's own scoped stylesheet with no competing `:host` rule to lose a specificity tie against. The
  general lesson: style a wrapping element inside `<app-card>`'s projected content, never the `<app-card>`
  tag itself, for any layout (flex/grid) requirement — background/border/padding-level styling on the host
  class is fine, layout of the projected children is not.
- **`periodDate` (`year`/`month` → a `Date`, purely for the `date: 'MMMM yyyy'` pipe) is the only place
  this component touches `Date` at all** — never used for any range computation, which is entirely
  server-side; `TitleCasePipe` capitalizes the Spanish month name the locale-aware `date` pipe already
  produces (e.g. `septiembre 2026` → `Septiembre 2026`).
- **Verified directly against live, non-fabricated data**: the four sections rendered real September
  figures matching independent `psql` cross-checks of `sales`/`purchases`/`recharge_daily_balances`/
  `bank_deposit_operations` (see the backend `CLAUDE.md`'s own verification note) — confirmed no console
  errors, confirmed the responsive grid (`1fr` → `repeat(2,1fr)` at `sm` → `repeat(3,1fr)` at `lg`, the
  same `bp.respond()` pattern already proven working on `transaction-days`/`bank-deposits-report`'s own
  card grids this same session) via direct CSS review rather than re-verifying a pattern already exercised
  live twice this session.

### Alertas y Notificaciones — Navbar bell (`features/dashboard/topbar/components/alert-bell/`)

`AlertBellComponent` (selector `app-alert-bell`) sits in `DashboardTopbarComponent`'s topbar, between the
theme toggle and the user-menu dropdown — self-contained, like `RegisterPurchaseFormComponent`/
`SalesSummaryCardComponent` (calls `AlertsService` directly, no parent-owned state). Backs the
centralized alert system described in the backend `CLAUDE.md`'s own "Alertas y Notificaciones" section —
read that first for the actual data model (`Alert`, priority/type rules, why nothing is ever persisted as
a historical log).

- **Not a WebSocket** — this app has no real-time transport anywhere (`SalesDraftStore`/`PurchaseDraftStore`
  are local/`sessionStorage`-only); the bell polls `GET /alerts` every 60s (`setInterval`, cleared via
  `DestroyRef.onDestroy`), refetches whenever the panel is opened (`togglePanel()`), and refetches on every
  `NavigationEnd` (a navigation is frequently the moment an alert's underlying condition just changed —
  paying a purchase, closing a recharge day, registering a transfer). A transient fetch failure silently
  keeps the last-known state on screen rather than showing a broken/blank bell, same resilience reasoning
  already established for the Resumen dashboard's own tiles.
- **The badge shows `count` (unread), the panel lists every item up to `total`** (read or not) — opening an
  alert never removes it from the list on its own, only its underlying condition resolving does that (see
  backend doc). Clicking an alert row calls `AlertsService.markAsRead(key)` (optimistically flips
  `isRead`/decrements the local unread count without waiting for the response — a failed mark-read is a
  harmless no-op, worth staying silent about rather than toasting), closes the panel, and navigates to
  `alert.route`. "Marcar todas como leídas" calls `markAllAsRead()` and flips every currently-shown item.
- **"Marcar como pagada" lives directly on a purchase alert row inside the panel itself** — `isPayable(alert)`
  gates on `alert.type` being `PURCHASE_PAYMENT_DUE`/`PURCHASE_PAYMENT_OVERDUE`, and `alert.referenceId` is
  already the purchase id, so `markPurchaseAsPaid()` can call `PurchasesService.markAsPaid(referenceId)`
  (`POST /purchases/:id/pay`) with nothing else to look up. This was a deliberate, minimal UI placement —
  no purchase-history/list page exists yet to put the action on instead (see the backend `CLAUDE.md`'s
  `MarkPurchaseAsPaidUseCase` doc comment: explicitly not a full cuentas-por-pagar module), and the alert
  panel already has everything the action needs. The action is a `<span role="button">` nested inside the
  alert's own `<button>` row (native `<button>`-in-`<button>` nesting isn't valid HTML), with
  `event.stopPropagation()` so clicking "Marcar como pagada" never also triggers the row's own
  mark-read-and-navigate click handler.
- **`core/models/alert.model.ts`** exports `Alert`/`AlertType`/`AlertPriority` (mirroring the backend shape
  exactly) plus three lookup constants — `ALERT_PRIORITY_TONE` (feeds `<app-badge tone>`),
  `ALERT_PRIORITY_ICON`, `ALERT_TYPE_ICON` — so priority/type never gets a second, drifting color/icon
  decision anywhere else this feature might render an alert later. `AlertsService`
  (`core/services/alerts.service.ts`) is a thin 3-method wrapper (`getAlerts`/`markAsRead`/`markAllAsRead`)
  around `${environment.apiUrl}/alerts`.
- **New `bell`/`check-check` icons** added to `shared/ui/icon/icon-registry.ts` for the trigger button and
  the "marcar todas como leídas" action respectively — neither existed before this feature.
- **Purchases (`/dashboard/compras`) gained a "Tipo de compra" `<select>` (Contado/Crédito) and a
  conditional "Fecha de pago" date input**, both wired straight into `PurchaseDraftStore`
  (`paymentType`/`paymentDueDate` signals, persisted to `sessionStorage` alongside everything else the
  store already tracked — same pattern, no new persistence mechanism). The due-date field only renders
  `@if (draft.paymentType() === 'CREDITO')`, is required before "Guardar compra" will proceed
  (`PurchasesPageComponent.requestSave()` shows a toast and refuses to open the confirm modal otherwise —
  the same backend-required field is validated server-side too, this is a proactive echo not the real
  guarantee), and its `[min]` is bound to the purchase date itself (can't set a payment due date earlier
  than the purchase). `.purchases__form-row`'s grid widened from a fixed `2fr 1fr` to `repeat(2,1fr)` /
  `repeat(4,1fr)` at `sm`/`lg` to fit the two new fields without cramming.
- **Product detail page (`/dashboard/inventario/:id`) gained an inline-editable "Stock mínimo" column** on
  its existing "Inventario por ubicación" table, admin-only (`isAdmin()`, same UI-only gating every other
  admin action in this app uses — the backend's own `@Roles(...)` is the real enforcement). Follows
  `RechargeTableComponent`'s established "draft record keyed by row id, not a reactive form" idiom exactly:
  `draftMinStock: signal<Record<string, string>>` is seeded once per `locationId` in `fetchDetail()`'s
  success handler — **only for ids not already tracked**, so a value the admin is mid-typing is never
  clobbered by a refetch (identical reasoning to Recargas' own `draftFinalBalance`). Saving calls
  `InventoryLocationsService.setMinStock(productId, locationId, minStock)`
  (`PATCH /inventory/products/:productId/locations/:locationId/min-stock`) and refetches the whole detail
  view on success.
- **New admin-only `/dashboard/configuracion-alertas`** (`features/dashboard/alert-settings/`,
  `adminGuard`-gated route + `roles: ['SUPER_ADMIN', 'ADMIN']` sidebar entry under "Sistema", reusing the
  `bell` icon) — two independent `app-card` panels: "Compras a crédito" (one number input, días de
  anticipación, `AlertSettingsService.getSettings()`/`.updateSettings()`) and "Saldo mínimo de recargas"
  (one number input + Guardar per recharge type, `RechargesService.updateTypeMinBalance()` — new method,
  `PATCH /recharges/types/:id/min-balance`; `RechargeType` gained a `minBalance` field it didn't carry
  before this feature). **Stock mínimo per producto is deliberately NOT duplicated on this screen** — it
  already lives on each product's own detail page, right next to the stock it thresholds (see above); the
  page's own subtitle says so explicitly, so an admin looking for it here isn't left wondering where it
  went. `core/services/alert-settings.service.ts` and `core/models/alert.model.ts`'s
  `AlertSettings`/`UpdateAlertSettingsInput` types are new, following every other admin-settings service in
  this app's exact `get`/`update` shape.
- **Verified live end to end against real data**, not only via a build check: the bell's empty state
  ("No hay alertas activas") was confirmed correct by cross-checking zero qualifying rows directly in
  Postgres beforehand; a recharge type's saldo mínimo, a product's stock mínimo, and a real `CREDITO`
  purchase's fecha de pago were each temporarily set to trigger their respective alert, confirmed to
  appear in the bell with the correct title/priority/description, and reverted (or, for the purchase,
  resolved via "Marcar como pagada" and confirmed `PAID` in the database) — leaving no fabricated
  configuration behind. The `/dashboard/configuracion-alertas` screen and the product detail page's inline
  stock-mínimo editor were both exercised live in the browser, not just build-checked.

### Sidebar reorganization — Inventario promoted, Heladería · Compras/Ventas later removed (follow-up)

A navigation/UI-only cleanup ticket (explicitly scoped to "no refactorización general", no business-logic
changes) asked to: (1) remove "Heladería · Compras"/"Heladería · Ventas" from the sidebar since they
duplicate the general Compras/Ventas, (2) promote "Inventario" out from under "Librería" to be its own
top-level item, (3) fix the Dashboard's Ventas/Compras/Recargas/Transacciones card row alignment, (4) add
the ability to work on several Compras invoices at once (open multiple tabs). Two of those four needed a
scope check before touching anything, done live with the user via `AskUserQuestion` before any file
changed:

- **Heladería · Compras / Heladería · Ventas were initially kept, then removed in a direct follow-up
  request.** First pass: confirmed with the user that "Heladería" is backed by an entirely separate,
  parallel backend module (`modules/ice-creams/`, its own `ice_creams`/`ice_cream_purchases`/
  `ice_cream_sales` tables) with zero overlap with the general `products`/`purchases`/`sales` module — an
  ice-cream item cannot be bought or sold through the general `POST /purchases`/`POST /sales`, since it
  was never in the `products` table those endpoints (and their product-search) read from — so removing the
  menu entries risked cutting off the only working path for a real heladería purchase/sale. Before acting
  on the follow-up request to remove them anyway, this was checked directly against real data rather than
  assumed still true: `ice_creams`/`ice_cream_purchases`/`ice_cream_sales` all had **zero rows** — the
  dedicated module had never actually been used — while the general `categories` table already had a
  ready-to-use "Helados" category with zero products assigned. Removing the two menu entries therefore
  orphans no real data; heladería products/purchases/sales going forward just use the general
  Compras/Ventas screens under that existing category. `dashboard-nav.data.ts`'s `Finanzas` children lost
  exactly those two entries — `Heladería · Inventario` stayed (never asked to be removed). Per the same
  "no eliminar código obsoleto en esta tarea" instruction from the original ticket, the `heladeria-compras`/
  `heladeria-ventas` routes, components, and backend module were all left completely untouched — only the
  menu entry points are gone; a direct URL still reaches the old screens.
- **"Inventario" is now a top-level sidebar item, not nested under "Librería"** — `dashboard-nav.data.ts`:
  `Librería` lost its `children` array entirely (now a plain link to its own existing `/dashboard/libreria`
  placeholder route, rendered the same way `Resumen` is — `DashboardSidebarComponent`'s template branches
  purely on whether `item.children` is present, so dropping the key was the whole change), and a new
  sibling `{ label: 'Inventario', icon: 'package', path: 'inventario' }` entry was added at the same level
  as `Finanzas`/`Sistema`/`Reportería`/`Agentes Bancarios`. **Zero route changes were needed** — `/dashboard/
  inventario` was already a flat top-level route in `app.routes.ts` (never `/dashboard/libreria/
  inventario`), confirmed before editing anything by grepping the whole app for `libreria/inventario`
  references (zero hits) and checking that both existing internal navigations to inventory
  (`product-detail-page.component.ts`, `inventory-page.component.ts`) already called
  `router.navigate(['/dashboard/inventario', ...])` directly. This app has no breadcrumb component at all,
  so there was nothing to update there either. Since the route, its guard (none — open to any authenticated
  role, same as before), and the component behind it are all completely unchanged, every permission a user
  had for Inventario before this change is identical after it.

#### Dashboard indicator cards — alignment fix (CSS-only, no metrics touched)

`financial-indicators.component.html`/`.scss` — the visual complaint was that the "Compras" card (which
has no Mayor/Menor breakdown — a purchases total has no day-by-day figures to break down, by the backend's
own design) sat top-aligned with a large empty gap at the bottom, next to "Transacciones Bancarias" (which
does have a Mayor/Menor footer) in the same grid row. The card boxes themselves were already the same
height (CSS Grid's own default `align-items: stretch` already equalizes every item in a row to the tallest
one) — the actual problem was *unused whitespace inside the shorter card*, not misaligned box edges.

- Every card's hero amount + caption (+ optional Mayor/Menor footer) is now wrapped in one new
  `.metric-card__content` element; `.metric-card__body` (unchanged in every other respect) gained
  `height: 100%`, and `.metric-card__content` is `flex: 1; display: flex; flex-direction: column;
  justify-content: center`. A card with a footer that already nearly fills the available height (Recargas/
  Ventas/Transacciones Bancarias) is visually unaffected; a card with less content (Compras) now centers
  that content in the space it actually has instead of leaving a dead zone below it. `.metric-card__header`
  gained `flex-shrink: 0` so the title row never gets squeezed by the centering.
- **No data, calculation, color, typography, icon, or spacing-token changed** — confirmed live in the
  browser before and after: the exact same `Q 29.10` "Compras" figure, same accent colors, same card
  shadows/borders, just recentered within its card.

#### Compras — multiple simultaneous drafts (tabs)

Added per an explicit follow-up ask ("poder abrir varias compras... a la vez"), scoped to **Compras only**
after checking with the user first: Ventas' own "borrador" is a real, server-persisted `OPEN` sale gated by
a DB-level partial unique index (`UQ_sales_open_per_user` — at most one open sale per user, the mechanism
behind its real-time stock reservation), so supporting concurrent Ventas drafts would mean changing that
backend invariant, out of scope for a navigation/UI ticket. Compras' draft was already purely local
(`sessionStorage`, nothing server-side until "Guardar compra"), so multi-draft there is a frontend-only
change.

- **`PurchaseDraftStore` now holds `drafts: PurchaseDraft[]` + `activeDraftId`**, not one flat draft — each
  `PurchaseDraft` (`{ id, supplierId, purchaseDate, items, paymentType, paymentDueDate }`) is completely
  independent. The store still exposes the same flat `supplierId()`/`purchaseDate()`/`items()`/
  `paymentType()`/`paymentDueDate()`/`total()` computed signals as before — each now just reads through
  `activeDraft()` — specifically so `PurchasesPageComponent`'s template needed almost no changes beyond the
  new tab bar; every mutation method (`onProductSelected`, `updateQuantity`, `setSupplier`, ...) keeps its
  exact old signature and now applies to whichever draft is active via one shared private
  `updateActiveDraft()` helper. There is always at least one draft — `closeDraft()` on the last remaining
  one replaces it with a fresh blank draft rather than ever leaving the array empty, so the page always has
  something to render.
- **New store methods**: `openNewDraft()`, `setActiveDraft(id)`, `closeDraft(id)`, `draftTotal(draft)` (for
  the tab bar to show a non-active tab's total without switching to it). `reset()` keeps its old name and
  its old "wipe everything" meaning — the **only** remaining caller is `DashboardLayoutComponent.logout()`,
  unchanged — but now resets to a single fresh draft rather than clearing flat signals. The former
  per-save/per-cancel use of `reset()` was replaced with a new `resetActiveDraft()` (thin wrapper around
  `closeDraft(activeDraftId())`), since ending one invoice must never touch any other open tab.
  `sessionStorage`'s persisted shape changed from one flat draft object to `{ drafts, activeDraftId }`
  under the same per-user key (`cj_purchase_draft:<userId>`) — no migration needed for old-shaped leftover
  data, since it's ephemeral `sessionStorage` and a shape mismatch on `restore()` already fell back to a
  fresh empty draft before this change too (same `catch`/fallback path, now falling back to a
  single-draft array instead of flat fields).
- **`PurchasesPageComponent` gained a tab bar** (`.purchases__tabs`, above the existing form row) — one
  pill per open draft (`draftLabel()`: the chosen supplier's name once picked, else a stable positional
  "Compra N" fallback so an empty new tab is never blank-labeled), a gold dot on any tab that has items
  (`draftHasItems()`), an inline "×" to close that specific tab, and a "+ Nueva compra" button
  (`openNewDraft()`). Closing a tab with items reuses the exact same `CancelConfirmModalComponent` the
  page's own "Cancelar" button already used — both now funnel through one `closeConfirmDraftId` signal
  (`requestCloseTab(id)` / `requestCancel()` is now just `requestCloseTab(activeDraftId())`), so there is
  one confirmation flow, not two. Closing an **empty** tab (no items) skips the confirmation entirely,
  same "nothing to lose" reasoning the original single-draft "Cancelar" already had.
  `confirmSave()` captures the draft id being submitted *before* the API call (not re-read from
  `activeDraftId()` inside the response handler) so the tab that actually gets closed on success is
  unambiguously the one that was saved, not "whatever happens to be active when the response arrives."
- **Verified live, end to end, against the real backend**: opened two tabs, put a different real product in
  each with the same real test supplier, confirmed switching tabs preserved each one's state independently
  (including the sidebar's own draft-dot reflecting "any tab has items", not just the active one), closed a
  tab with items and saw the confirmation modal (declined once, confirmed once — items were lost only on
  confirm), closed an empty tab with no prompt, then saved one of the two populated tabs for real
  (`POST /purchases`, confirmed the resulting row via a direct `psql` check) and confirmed only that tab
  closed afterward — the other open tab's own unrelated item was untouched and still there.

#### Ventas — multiple simultaneous drafts (tabs), the harder sibling of Compras' own

Added right after Compras' own multi-draft feature, per a direct follow-up asking for the same
capability on Ventas. **Genuinely more involved than Compras**: a Ventas "borrador" is a real,
server-persisted `OPEN` sale with stock already reserved, not a purely local draft — so this needed a real
backend change first (`sales.draft_key`, see the backend `CLAUDE.md`'s own "Varias ventas a la vez"
section for the full migration/gotcha writeup) before any frontend work could start.

- **`SalesDraftStore` now holds `drafts: SaleDraftState[]` + `activeDraftId`**, one entry per open tab —
  `{ draftKey, sale: Sale | null, pendingProductIds, isConfiguringPricing, isSaving, isCancelling }`.
  `sale` is `null` until the tab's first product is added (no server-side `sales` row exists yet for that
  tab); once it exists, `items`/`total`/`clientId`/`clientName`/`priceList` for the active tab are all
  `computed()` straight off `activeDraft().sale`, so `SalesPageComponent`'s template needed almost no
  changes beyond a new tab bar (same "flat computed passthrough" trick `PurchaseDraftStore` already uses).
  On construction, `SalesService.getCurrentSales()` (renamed from the old singular `getCurrentSale()`,
  now returns every open sale for the user) seeds one tab per real `OPEN` row found — a genuinely empty
  browser session still starts with exactly one fresh blank tab, same as Compras.
- **Closing a tab is never purely local, unlike Compras** — real stock may already be reserved server-side.
  `SalesPageComponent.requestCloseTab(draftKey)` picks one of three paths: a tab whose `sale` is still
  `null` closes instantly (`closeDraftWithoutServerRow()`, no network call — nothing was ever reserved); a
  tab with a real `sales` row but zero current items closes via a **silent** `cancelDraft()` (still a real
  `DELETE /sales/current?draftKey=...` call, to clean up that now-empty `OPEN` row server-side, but no
  confirmation prompt — there's nothing visible for the user to lose); a tab with real items shows the
  existing `SaleCancelConfirmModalComponent` first, and only calls `cancelDraft()` on confirm. All three
  paths funnel through the same `closeConfirmDraftId` signal / `requestCancel()` = `requestCloseTab
  (activeDraftId())` pattern Compras already established.
- **`confirmSale()`/`cancelDraft()` both remove their own tab locally only after the network call
  succeeds** (via the same `removeDraftLocally()` helper Compras' `closeDraft()` uses — never leaves zero
  tabs, replaces the last one with a fresh blank draft), and every other open tab's `sale`/pending state is
  untouched by either call, since both are scoped to one specific `draftKey` throughout.
- **`SalesService`**: `adjustSaleItem`/`configurePricing`/`confirmSale`/`cancelSale` all gained a required
  `draftKey` parameter (query param for the `DELETE`, body field for the rest); `getCurrentSale()` was
  renamed `getCurrentSales()` and now returns `Sale[]`. `Sale` itself gained `draftKey: string | null`.
- **Real bug caught live during this feature's own first end-to-end test, not assumed correct**: a
  pre-existing `OPEN` sale from earlier testing had been backfilled to the literal `draft_key` value
  `'default'` by the backend migration — the frontend correctly picked it up as a real tab, but the very
  first `adjust_sale_item` call against it failed with `400 draftKey must be a UUID`, because the request
  DTOs were originally written with `@IsUUID()`. Fixed on the backend (`@IsString() @IsNotEmpty()
  @MaxLength(64)` instead — the domain never actually required UUID-shaped keys, only opaque, per-tab
  uniqueness) rather than by discarding or reformatting that real, pre-existing draft on the frontend
  side. A second real bug was found in the same live-testing pass — `cancel_open_sale` silently drifting
  `inventory_stock` out of sync with `products.stock` on every cancel — see the backend `CLAUDE.md` for
  the full writeup; both were fixed before this feature was considered done, not left as known issues.
- **Verified live, end to end, against the real backend, including the bug-fix round-trip**: opened two
  tabs, added a different real product with real reserved stock to each, confirmed both showed up as
  independent `OPEN` rows in the database with distinct `draft_key`s and correct line items, saved one
  (`POST /sales/confirm`) and confirmed via `psql` that only that row flipped to `CONFIRMED` while the
  other stayed `OPEN` and untouched, then cancelled the remaining tab through the real confirmation modal
  and verified via `psql` that its stock was fully restored (after fixing the `inventory_stock` drift bug
  above) and zero `OPEN` sales remained. Every product's `products.stock` was cross-checked against the
  sum of its own `inventory_stock` rows afterward and confirmed to match exactly, project-wide, not just
  for the two products this test happened to touch.

#### Ventas — spacing fix between the pricing bar and the product search box

A direct follow-up ("no hay espacio entre ellos") reported the "Cliente/Lista de precios" pricing bar and
the product search box directly below it rendering with zero visual gap. Root cause, confirmed by reading
both components' own stylesheets before changing anything: neither `app-sale-pricing-bar` nor
`app-product-search` carries any margin of its own (both are card-styled but spacing-agnostic, matching
this app's usual "the parent page owns inter-block spacing" convention — see `.purchases__form-row`'s own
`margin-bottom`), and `sales-page.component.scss` never actually declared any spacing between them or
between the header and the pricing bar — only `.sales__receipt` had a `margin-top`, which only affected
what came *after* the search box. Fixed with one small addition targeting both child components by tag
name from the parent's own stylesheet (`app-sale-pricing-bar, app-product-search { display: block;
margin-bottom: var(--space-6); }`) — a normal, supported Angular pattern (a parent's emulated-encapsulation
styles can target a child component's host element), not a new component or a change to either child.
Verified live in the browser: the pricing bar, the search box, and the header above them now all have
consistent, even spacing.

### Kardex financiero — Estado de Cuenta (Cuentas por Cobrar / Activos)

Both `/dashboard/cuentas-por-cobrar` and `/dashboard/activos` gained a new "Ver estado de cuenta" row
action (an `eye` icon, **open to any authenticated role** — unlike edit/delete, viewing a statement isn't a
mutation) that opens `AccountStatementModalComponent` (`shared/ui/account-statement-modal/`) — the
client's saldo actual, a "Registrar Cargo"/"Registrar Abono" flow (admin-only, gated by `canManage`) with a
live saldo-anterior/monto/saldo-nuevo preview and the global `ConfirmDialogService`
(`type: 'FINANCIAL_OPERATION'`) before saving, date-range filters, and the Kardex table itself
(Fecha/Concepto/Cargo/Abono/Saldo, with a "Saldo inicial del periodo" row and a totals footer). See the
backend `CLAUDE.md`'s own "Kardex financiero" section for the underlying `register_*_movement`/
`getStatement` mechanics this all calls into.

- **One shared component for both modules, not two near-identical copies** — a deliberate exception to
  this codebase's usual "small per-feature copy over cross-feature coupling" convention (see Ventas'/
  Compras' own product-search components), justified the same way `ClientSearchSelectComponent`'s reuse in
  `SalePricingBarComponent` already was: the UI and mechanics are byte-identical between Cuentas por
  Cobrar and Activos (the backend's own Kardex design is explicitly the same for both), so duplicating the
  component would only be duplicating code, not diverging behavior. The actual "never share balances or
  movements" separation the ticket required lives entirely in which concrete service the parent page
  injects — `KardexAccountService` (`core/models/kardex.model.ts`) is a structural interface both
  `AccountReceivableService` and `AssetService` satisfy (`implements KardexAccountService`), each only
  ever calling its own module's endpoints (`/accounts-receivable/*` vs `/assets/*`).
- **`AccountReceivable`/`Asset` both gained a `movementType: KardexMovementType` field**, mirroring the
  backend's `AccountReceivableOutput`/`AssetOutput`. `Asset`'s own doc comment was corrected — `amount` is
  no longer "may be negative"; that capability now lives in `movementType` (see the backend's own writeup
  of why `CHK_assets_amount_positive` was re-added).
- **A real reactivity bug was caught and fixed during this feature's own live testing, not assumed
  correct**: the "Saldo nuevo" preview was originally a `computed()` reading
  `this.form.controls.amount.value` — but a Reactive Forms `FormControl`'s value is a plain property, not
  a signal, so Angular's signal graph never saw it change and the preview silently stayed frozen at
  whatever it computed on the very first render, even though the adjacent "Monto: {{ ... }}" line (a
  direct template expression, not a `computed()`) updated correctly on every keystroke. Confirmed live:
  typing an amount updated "Monto" but "Saldo nuevo" stayed stuck at the opening balance. Fixed by making
  `previewNewBalance()` a plain method instead of a `computed()` — the template already re-evaluates it on
  every change-detection cycle, the same way the adjacent line already worked. **General lesson for this
  codebase**: never wrap a Reactive Forms `FormControl`/`FormGroup` value read in `computed()` — it will
  not invalidate on user input; call it as a plain method from the template instead, exactly like every
  other form-value-derived display expression already in this app does.
- **`RegisterKardexMovementInput`/`KardexStatement`/`KardexStatementFilters`/`KardexAccountService`** (all
  in `core/models/kardex.model.ts`) and the matching `registerCharge`/`registerPayment`/`getStatement`/
  `getCurrentBalance` methods on both `AccountReceivableService`/`AssetService` mirror the backend's
  `POST .../charges`/`POST .../payments`/`GET .../statement`/`GET .../balance` contract exactly.
- **No new route was added** — the statement view is a modal reachable from the existing
  `accounts-receivable-page`/`assets-page` list screens, not a separate page/route. The existing flat CRUD
  list screens are otherwise completely unchanged (still full create/edit/deactivate, still the same
  toolbar/pagination) — this feature is purely additive.
- **`fetchRecords()` on both page components was widened from `private` to accessible-from-template**
  (Angular's strict template type-checking rejects a `private`-called method from a binding) — it's now
  also the `(changed)` handler on `<app-account-statement-modal>`, so registering a cargo/abono refetches
  the underlying list (a new row exists now) the same way saving the legacy create/edit form already did.
- **Verified live, end to end**: opened the statement for a real client with a real Q14,608.00 balance,
  registered a real Q500.00 abono with the live preview and confirmation dialog both showing the correct
  Q14,108.00 result, confirmed the Kardex table and totals updated correctly; attempted an abono exceeding
  the balance and confirmed the backend's `AbonoExceedsBalanceError` message ("El abono no puede ser mayor
  al saldo pendiente del cliente.") surfaced correctly with the form still open and nothing written;
  reversed the test abono with a real corrective cargo once confirmed with the user (both movements stayed
  permanently visible in the Kardex table afterward — never deleted); separately opened the statement for
  a real Activos client with several real historical rows and confirmed the running-balance column
  (783.46 → 1,783.46 → 1,918.05 → 1,938.05) computed correctly against real, non-fabricated data, read-only.

### Catálogos maestros — Presentaciones y Medidas

`/dashboard/presentaciones-medidas` (`features/dashboard/presentation-units/`), new "Sistema" nav entry —
two master catalogs (Tipos de Presentación, Unidades de Medida) that replace what used to be free text
across the app. See the backend `CLAUDE.md`'s own "Catálogos maestros" section for the full
migration/architecture writeup this all sits on top of.

- **One container page, two fully self-contained tab components** — `PresentationUnitsPageComponent` only
  tracks which tab is active; `PresentationTypesTabComponent`/`UnitsOfMeasureTabComponent` each fetch,
  filter, and mutate directly (same "self-contained" pattern as `RegisterPurchaseFormComponent`/
  `SalesSummaryCardComponent` elsewhere in this app), including their own inline create/edit modal — no
  summary/toolbar/table split into separate files the way `account-types` uses, a deliberate scope
  reduction for two near-identical catalogs built together.
- **The "ya existe pero está inactiva, ¿desea activarla?" prompt lives entirely in these two components**,
  not the backend (see the backend `CLAUDE.md`'s own reasoning: the global error envelope has no room for
  a structured "here's the existing id" payload). Before submitting a create, each component searches its
  own already-loaded `items()` list (fetched with `includeInactive: true`) for a case-insensitive,
  trimmed name match; if found and inactive, the global `ConfirmDialogService` (`type: 'UPDATE'`, custom
  title/message) offers "Activar existente" instead of ever calling `create()`. Verified live: creating "
  bolsa test qa " (different case, padding) against an inactive "Bolsa Test QA" correctly triggered this
  prompt and reactivated the same row rather than creating a duplicate.
- **Reactivation uses the same generic `PATCH .../:id { isActive: true }`** both the "reactivate a
  duplicate" flow and the table's own inline "Activar" action (a `rotate-ccw` icon button, shown only for
  an inactive row) call — no separate endpoint or method.
- **Deactivating shows a usage-aware warning, never blocks**: the confirm dialog's message includes
  "Actualmente la utilizan N producto(s) — seguirá funcionando para esos productos..." whenever
  `usageCount > 0`, sourced directly from the list row the backend already computed (see that module's own
  `usageCount` correlated-subquery doc comment) — never a second request just to check usage.
- **`ProductFormModalComponent` gained a required "Unidad de medida" `<select>`**, populated from
  `UnitOfMeasureService.getUnitsOfMeasure()` (fetched once in `InventoryPageComponent`'s constructor,
  identical pattern to `categoryOptions`/`businessOptions`), positioned right after Categoría/Negocio.
  `Product`/`ProductInput` both gained `unitOfMeasureId`/`unitOfMeasure`/`unitOfMeasureAbbreviation`.
- **The same form's inline "Presentaciones adicionales" `FormArray`** (add Caja/Paquete at product-creation
  time — a real, pre-existing capability this ticket's own research surfaced, not a new one) had its
  free-text `name` input replaced with a `presentationTypeId` `<select>`, sourced from
  `PresentationTypeService.getPresentationTypes()` with "Unidad" filtered out (auto-created separately,
  never picked here) — the old `forbiddenPresentationName` validator (which blocked typing literally
  "Unidad") is gone entirely; excluding it from the dropdown's own options makes that validator moot.
- **`PresentationFormModalComponent`** (the product-detail page's own "add/edit presentation" modal) got
  the identical text-input-to-`<select>` change, self-contained (fetches
  `PresentationTypeService.getPresentationTypes()` itself in `ngOnChanges`) — "Unidad" stays in the options
  only while editing the product's own immutable "Unidad" row (whose `presentationTypeId` control is
  `disable()`d, so it can never actually change), otherwise excluded exactly like the product form's own
  array.
- **Zero changes needed in Purchases/Ventas/Inventory-transfer/product-detail's own display code** —
  `ProductPresentation.name` is still a plain resolved string (now sourced from the catalog via the
  backend's join, but the frontend shape is unchanged), so every existing `presentation.name`/
  `presentation.name === 'Unidad'` reference across those screens kept working without modification —
  confirmed by grepping every such usage across the app before concluding no further changes were needed,
  not assumed.
- **Verified live end-to-end**: the new page renders with real seeded data (2 tipos de presentación with
  correct usage counts matching a direct `psql` check exactly — Caja: 3 productos, Unidad: 4 productos;
  5 unidades de medida, Unidad: 4 productos); created and reactivated synthetic test rows through the real
  confirm-dialog flow (all removed afterward, zero residual rows); opened a real product's "Agregar
  producto"/detail-page presentation editor and confirmed both dropdowns show only real, active catalog
  entries; ran a real purchase against an existing multi-presentation product and confirmed the
  presentation `<select>` still resolves "Unidad (factor 1)"/"Caja (factor 12)" exactly as before this
  feature — no regression in Compras' own product/presentation flow.

### Notifications

`NotificationService` (`core/services/notification.service.ts`) is a global toast queue —
`success()`/`error()`/`info()` push onto a `signal<Toast[]>`, each auto-dismissing after 4s or on manual
close. `ToastContainerComponent` (`shared/ui/toast/`) renders that signal and is mounted once in
`app.component.html` (`--z-toast` already existed in `_tokens.scss` before this was built — nothing else
used it). Any feature needing create/update/delete feedback should inject `NotificationService` rather
than rolling its own inline success/error banner.

### Design tokens

All color/type/spacing/radius/shadow/motion values are CSS custom properties defined once in
`src/styles/_tokens.scss` (`:root`) — components consume `var(--color-primary)`, `var(--space-4)`,
etc., never hardcoded values, so the whole visual identity can be retuned from that one file (or live,
in devtools, while iterating). Breakpoints are SCSS variables in `src/styles/_breakpoints.scss`,
applied mobile-first through the `respond($name)` mixin in `_mixins.scss`
(`@include respond(lg) { ... }`). `angular.json` sets `stylePreprocessorOptions.includePaths` to
`src/styles`, so any component SCSS can `@use 'breakpoints' as bp;` / `@use 'mixins' as *;` without
relative-path climbing.

### Non-obvious gotchas already solved here

- **`ButtonComponent` conditionally renders `<a>` (routerLink), `<a>` (external href), or `<button>`**
  depending on which inputs are set. Content projected into `<app-button>` must go through a single
  `<ng-template #label><ng-content /></ng-template>` reused via `[ngTemplateOutlet]` in each branch —
  putting a separate `<ng-content>` in each `@if`/`@else if`/`@else` branch silently drops the
  projected content in two of the three branches. Follow the same pattern for any future
  polymorphic-element component.
- **Fragment (`#anchor`) scrolling is handled entirely by `FragmentScrollService`**, not by the
  router's `withInMemoryScrolling`. That router feature was removed from `app.config.ts` on purpose:
  its `scrollPositionRestoration` races with (and overwrites) a manually triggered scroll on the same
  navigation, and its `anchorScrolling` never fires for a fragment-only change on an already-active
  route (e.g. clicking "Contacto" while already on `/`) nor retries once a lazy-loaded route's DOM
  exists. `FragmentScrollService` instead subscribes to `router.routerState.root.fragment` directly and
  retries the `document.getElementById` lookup across animation frames. Any new anchor link just needs
  a matching `id`/`sectionId` on the target `SectionComponent` — no router config changes needed.
