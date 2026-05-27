---
name: angular-coding-style
description: Concrete Angular coding-style patterns — signals, dependency injection with inject(), change detection, RxJS usage, and TypeScript strictness for Angular code.
version: 1.0.0
required: false
category: angular
tools:
  - claude
  - copilot
  - codex
  - cursor
source_urls:
  - https://angular.dev/style-guide
  - https://angular.dev/guide/signals
  - https://angular.dev/guide/di
  - https://angular.dev/guide/components/dependency-injection
  - https://rxjs.dev/guide/operators
applies_to:
  - src/app/**/*.ts
  - src/**/*.ts
---

# Angular Coding Style Rules

**Load when:** Writing or reviewing Angular TypeScript — components, services, directives, pipes, guards, resolvers, interceptors, or any code that uses Angular's DI / signals / RxJS surface.

## Version Awareness

Many of the patterns below (`inject()`, signal primitives, `linkedSignal`, `resource`, functional guards/interceptors, `takeUntilDestroyed`) are version-gated. Check `package.json` / `ng version` and use the patterns the installed version supports — do not introduce a v18+ API into a v15 project.

## Sources

- Angular Style Guide — https://angular.dev/style-guide
- Angular Signals Guide — https://angular.dev/guide/signals
- Angular Dependency Injection Guide — https://angular.dev/guide/di
- RxJS Operators — https://rxjs.dev/guide/operators

## Rules

### Dependency injection

Use `inject()` over constructor injection in components, services, guards, resolvers, interceptors, and pipes. Keep constructors empty (or remove them) so DI calls live at field declarations next to their use.

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private router = inject(Router);
}
```

```typescript
// Avoid on new code — verbose and harder to tree-shake/refactor
constructor(private http: HttpClient, private router: Router) {}
```

Use `InjectionToken` for non-class dependencies (config, env, capability flags):

```typescript
export const API_URL = new InjectionToken<string>('API_URL');

// In providers:
{ provide: API_URL, useValue: 'https://api.example.com' }

// At call site:
private apiUrl = inject(API_URL);
```

- Prefer `providedIn: 'root'` for app-wide singletons. Scope a service to a component/route only when its lifecycle must follow that subtree.
- `inject()` runs in an injection context. Calls outside a constructor/field initializer/factory need `runInInjectionContext` — do not stash `inject` calls inside arbitrary functions.

### Signals

Use signals for reactive state. Three primitives:

```typescript
count = signal(0);                                  // writable
doubled = computed(() => this.count() * 2);         // derived, read-only
selectedItem = linkedSignal(() => this.items()[0]); // writable derived: resets with source, also user-settable
```

- Never duplicate derived data in a separate writable signal updated through `effect()` — use `computed` (or `linkedSignal` if it must also be writable).
- Bridge Observables to signals with `toSignal(stream$, { initialValue: ... })`. Do not assign Observable values into signals from manual `.subscribe()` callbacks.
- For async fetching backed by signals, prefer `resource({ request, loader })` on v19+ projects:

```typescript
userResource = resource({
  request: () => ({ id: this.userId() }),
  loader: ({ request }) => fetch(`/api/users/${request.id}`).then(r => r.json()),
});
// Access: userResource.value(), userResource.isLoading(), userResource.error(), userResource.reload()
```

#### `effect()` usage

Reserve `effect()` for genuine side effects that must react to signal changes — logging, third-party DOM libraries, telemetry. Never use `effect()` to keep two signals in sync; that is what `computed` / `linkedSignal` are for.

```typescript
// Correct — side effect that must react
effect(() => analytics.track('user_changed', { id: this.user().id }));

// Wrong — derived state, use computed
effect(() => this.fullName.set(`${this.first()} ${this.last()}`));
```

For DOM work that must run after the view renders, use `afterRenderEffect` (or `afterNextRender` for one-shot work).

### Change detection

- Default to `ChangeDetectionStrategy.OnPush` on every new component.
- Drive view updates via signals or the `async` pipe. Avoid `ChangeDetectorRef.markForCheck()` / `detectChanges()` unless you have a narrow, documented reason (e.g., third-party callback outside the zone).
- Consider zoneless change detection (`provideExperimentalZonelessChangeDetection()` / `provideZonelessChangeDetection()` on supporting versions) only as a project-level decision, never as a side effect of a feature change.

### RxJS

When the project still uses RxJS for streams alongside (or instead of) signals:

| Operator | Use for |
| --- | --- |
| `switchMap` | Search, navigation, latest-wins — cancels prior inner stream |
| `mergeMap` | Independent parallel inner streams |
| `exhaustMap` | Form submissions, idempotency — ignores new emissions until current completes |
| `concatMap` | Ordered queueing |

- Always handle errors with `catchError`. Never let a long-lived stream die silently and stop emitting.
- Use `takeUntilDestroyed(this.destroyRef)` for manual subscriptions in components/directives. Do not roll a manual `ngOnDestroy` + `Subject<void>` + `takeUntil` on new code.
- Prefer the `async` pipe in templates over manual subscribe + assign. If the data is needed in component logic too, expose it as a signal via `toSignal`.

```typescript
search$ = this.query$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(q => this.service.search(q).pipe(catchError(() => of([])))),
);
```

### TypeScript strictness

- Run with `strict: true` and `strictTemplates: true` (Angular compiler option). Do not weaken either to make a change compile.
- Type every public surface: component inputs/outputs, service method signatures, route data, interceptor return types.
- Treat external data as `unknown` at the boundary. Narrow it with a validator (Zod, io-ts, hand-rolled type guard) before binding it to typed signals or components.
- Do not use `any`, `as any`, or non-null `!` to silence template type errors — fix the type or narrow the value.

### File-level style

- One artifact per file. Co-locate template (`.html`) and styles (`.scss`/`.css`) with the component class.
- Imports ordered: Angular core/common, third-party, project absolute (`@/...`), project relative (`./...`). Match the project's existing convention if it differs.
- Member order inside a class: signal fields → injected dependencies → inputs/outputs → other state → constructor (if any) → lifecycle hooks → public methods → private methods. Adjust to project style if it has a stronger local convention.

## Anti-patterns to refuse

- Constructor-injected dependencies on a project that has already adopted `inject()`.
- `effect()` used to synchronize signals.
- Manual `.subscribe()` in components without `takeUntilDestroyed`, or with a hand-rolled `destroy$` subject.
- `any` introduced to make typed templates compile, or `as any` casts on `HttpClient` responses.
- Calling `inject()` outside an injection context (e.g., inside an arbitrary helper function not invoked from a factory).

## Evidence

For style-aligned changes, run the project's lint and typecheck:

- `ng lint` (or the project's lint script) on touched files
- `tsc --noEmit` or `ng build` to verify typed templates and the public TypeScript surface
- Targeted tests covering the changed behavior (see `rules/angular/testing.md`)
