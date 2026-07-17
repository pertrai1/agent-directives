---
name: angular-patterns
description: Concrete Angular application patterns — smart/dumb component split, service-layer ownership, routing/guards/resolvers, HTTP interceptors, and reactive state with signals or RxJS.
version: 1.1.0
required: false
category: angular
tools:
  - claude
  - copilot
  - codex
  - cursor
source_urls:
  - https://angular.dev/guide/components
  - https://angular.dev/guide/routing
  - https://angular.dev/guide/http
  - https://angular.dev/guide/di
  - https://angular.dev/guide/signals
  - https://github.com/angular/angular/tree/main/skills/dev-skills/angular-developer/references
applies_to:
  - src/app/**/*.component.ts
  - src/app/**/*.component.html
  - src/app/**/*.service.ts
  - src/app/**/*.store.ts
  - src/app/**/*.routes.ts
  - src/app/**/*.guard.ts
  - src/app/**/*.resolver.ts
  - src/app/**/*.interceptor.ts
---

# Angular Patterns Rules

**Load when:** Building or reviewing Angular feature code that crosses components and services — data flow, routing, HTTP, forms, or state.

## Version Awareness

Functional guards/resolvers/interceptors, `inject()`, signal inputs, `resource()`, `linkedSignal`, and `withComponentInputBinding()` are version-gated. Match the project's Angular version before introducing a pattern, and keep an existing file consistent with the style already in it.

## Sources

- Angular Components Guide — https://angular.dev/guide/components
- Angular Routing Guide — https://angular.dev/guide/routing
- Angular HTTP Guide — https://angular.dev/guide/http
- Angular Dependency Injection Guide — https://angular.dev/guide/di
- Angular Signals Guide — https://angular.dev/guide/signals

## Rules

### Smart / dumb component split

Smart (container) components own data fetching and state. Dumb (presentational) components receive inputs and emit outputs only — no service injection, no router access.

```typescript
// Smart — owns data
@Component({
  selector: 'app-user-page',
  standalone: true,
  imports: [UserCardComponent],
  template: `
    @if (userResource.isLoading()) { <app-spinner /> }
    @else if (userResource.error()) { <app-error /> }
    @else { <app-user-card [user]="userResource.value()!" (select)="onSelect($event)" /> }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPageComponent {
  private userService = inject(UserService);
  userId = input.required<string>();

  userResource = resource({
    request: () => ({ id: this.userId() }),
    loader: ({ request }) => firstValueFrom(this.userService.getUser(request.id)),
  });

  onSelect(id: string) { /* navigate or update state */ }
}
```

```typescript
// Dumb — pure presentation, no inject(), no router
@Component({
  selector: 'app-user-card',
  standalone: true,
  template: `<button (click)="select.emit(user().id)">{{ user().name }}</button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCardComponent {
  user = input.required<User>();
  select = output<string>();
}
```

### Service layer

Services own all data access and business logic. Components delegate — no `HttpClient` in components, no `fetch()` in components.

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`/api/users/${id}`);
  }
}
```

- One service per cohesive domain concept. Do not bury unrelated APIs in a god service.
- Scope a service to a component/route subtree (component `providers: [...]`) only when its lifecycle must follow that subtree. Otherwise prefer `providedIn: 'root'`.

### Reactive state

```typescript
// Local state
count = signal(0);
doubled = computed(() => this.count() * 2);
selectedItem = linkedSignal(() => this.items()[0]);

// Bridge an Observable into a signal
users = toSignal(this.userService.getUsers(), { initialValue: [] });
```

- Derived values live in `computed` / `linkedSignal` — never in a separate writable signal updated by `effect`.
- Use `takeUntilDestroyed(this.destroyRef)` for manual subscriptions:

```typescript
export class UserComponent {
  private destroyRef = inject(DestroyRef);
  private userService = inject(UserService);

  ngOnInit() {
    this.userService.updates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(update => this.handleUpdate(update));
  }
}
```

### Routing

```typescript
// app.routes.ts (or feature.routes.ts)
export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'admin',
    canMatch: [authGuard],                              // canMatch prevents the chunk from loading at all
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  {
    path: 'users/:id',
    resolve: { user: userResolver },
    loadComponent: () => import('./users/user-detail.component').then(m => m.UserDetailComponent),
  },
];
```

- Use `canMatch` (not `canActivate`) for sensitive routes — the route module never loads for unauthorized users, so the code isn't shipped to them.
- Lazy-load every feature with `loadChildren` (or `loadComponent` for a single route).
- Pre-fetch with `resolve` when the destination cannot meaningfully render without the data.
- Enable component input binding once at app level (`withComponentInputBinding()`), then bind route params via `input()`:

```typescript
export class UserDetailComponent {
  id = input.required<string>();  // route param :id binds automatically
}
```

### Functional guards and resolvers

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated()
    ? true
    : inject(Router).createUrlTree(['/login']);
};

export const userResolver: ResolveFn<User> = (route) =>
  inject(UserService).getUser(route.paramMap.get('id')!);
```

- Prefer functional `CanActivateFn` / `CanMatchFn` / `ResolveFn` / `HttpInterceptorFn` over class-based equivalents on standalone-first projects.

### HTTP interceptors

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

// app.config.ts
provideHttpClient(withInterceptors([authInterceptor, errorInterceptor, retryInterceptor]))
```

- Register cross-cutting concerns (auth, error mapping, retries, logging) as interceptors. Do not duplicate header logic across services.
- Keep interceptors small and composable; one concern per interceptor.

### Forms

Match the project's existing form strategy. For complex validation, prefer Reactive Forms. For v21+ projects starting fresh, Signal Forms are appropriate.

```typescript
// Reactive Forms — standard approach for most apps
export class LoginComponent {
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit() {
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();
    // ...
  }
}
```

- Use `fb.nonNullable` / `NonNullableFormBuilder` so controls are typed as `T` rather than `T | null`.
- Avoid mixing reactive and template-driven forms in the same form.

### Async data with `resource()`

Use `resource()` for reactive async fetching that depends on signals — it manages loading/error/value automatically and reloads when the request signal changes.

```typescript
export class UserDetailComponent {
  userId = input.required<string>();

  userResource = resource({
    request: () => ({ id: this.userId() }),
    loader: ({ request }) =>
      firstValueFrom(inject(UserService).getUser(request.id)),
  });
}
```

State: `userResource.value()`, `userResource.isLoading()`, `userResource.error()`, `userResource.reload()`.

### RxJS operator choice

| Operator | Use for |
| --- | --- |
| `switchMap` | Search, navigation, latest-wins |
| `mergeMap` | Independent parallel requests |
| `exhaustMap` | Form submits — ignore re-clicks until current completes |
| `concatMap` | Ordered queueing |

Always end an HTTP-backed inner stream with `catchError` so the outer stream survives failures.

### Rendering strategies

- **CSR** (default) — standard SPA.
- **SSR + Hydration** — `ng add @angular/ssr`. Improves first paint and SEO.
- **SSG / Prerender** — for content-heavy public routes.

Under SSR, never touch `window`, `document`, `localStorage`, or `navigator` directly — gate with `isPlatformBrowser(this.platformId)` or inject via the `DOCUMENT` token.

### Accessibility

- Reuse Angular CDK primitives (Listbox, Menu, Dialog, Overlay, Tree, A11y `LiveAnnouncer`/`FocusTrap`) rather than re-implementing ARIA wiring.
- Style ARIA state attributes rather than toggling presentation classes:

```css
[aria-selected="true"] { background: var(--color-selected); }
[aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; }
```

## Deep-Dive Reference Materials

Coding agents should fetch the raw text of these references programmatically when writing or modifying general architectural patterns, forms, routing, or HTTP mechanics:

- **Form Management:** Signal-based forms (v21+), template-driven, and reactive forms. Read [signal-forms.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/signal-forms.md), [template-driven-forms.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/template-driven-forms.md), and [reactive-forms.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/reactive-forms.md)
- **Route Definitions:** URL paths, static vs dynamic segments, wildcards, and redirects. Read [define-routes.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/define-routes.md)
- **Route Loading & Outlets:** Lazy loading strategies and named `<router-outlet>` routing. Read [loading-strategies.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/loading-strategies.md) and [show-routes-with-outlets.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/show-routes-with-outlets.md)
- **Navigation & Access Control:** Declarative or programmatic routing, and route security with guards. Read [navigate-to-routes.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/navigate-to-routes.md) and [route-guards.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/route-guards.md)
- **Pre-fetching & Lifecycle:** Route resolvers (`ResolveFn`) and navigation lifecycle stages. Read [data-resolvers.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/data-resolvers.md) and [router-lifecycle.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/router-lifecycle.md)
- **Rendering Strategies:** SSR with hydration, SSG (prerendering), and CSR. Read [rendering-strategies.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/rendering-strategies.md)
- **Transition Animations:** Customizing View Transitions API routes. Read [route-animations.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/route-animations.md)

## Anti-patterns to refuse

- `HttpClient` injected into a presentational component.
- Subscriptions in components without `takeUntilDestroyed` (or a documented manual `ngOnDestroy` cleanup).
- `canActivate` on a route whose entire chunk should be withheld from unauthorized users — use `canMatch`.
- Class-based `HTTP_INTERCEPTORS` providers on a standalone-first project.
- Manual `subscribe()` + assign-to-property to flow Observable data into the view when `async` pipe or `toSignal` covers the use case.

## Evidence

- Targeted tests for the changed behavior (see `.agents/rules/angular/testing.md`).
- `ng lint` (or project equivalent) on touched files.
- `ng build` to verify typed templates and route configuration compile.
