---
name: angular-testing
description: Concrete Angular testing patterns — TestBed configuration, signal-input harnesses, router and HTTP testing utilities, and behavior-first test design.
version: 1.1.0
required: false
category: angular
tools:
  - claude
  - copilot
  - codex
  - cursor
source_urls:
  - https://angular.dev/guide/testing
  - https://angular.dev/guide/testing/components-basics
  - https://angular.dev/guide/testing/services
  - https://angular.dev/guide/testing/http
  - https://material.angular.io/cdk/test-harnesses/overview
applies_to:
  - src/app/**/*.spec.ts
  - src/app/**/*.test.ts
  - src/**/*.spec.ts
---

# Angular Testing Rules

**Load when:** Adding, changing, or reviewing Angular tests, or making Angular behavior changes that should be covered by tests.

## Version Awareness

Check which test runner the project uses before writing tests — Angular projects today commonly run Jasmine + Karma, Jest, or Vitest. Inspect `angular.json` (`test` target builder) and `package.json` scripts. Use the matchers, spies, and lifecycle hooks of the configured runner; do not import Jest APIs into a Jasmine project or vice versa.

## Sources

- Angular Testing Guide — https://angular.dev/guide/testing
- Component Testing Basics — https://angular.dev/guide/testing/components-basics
- Service Testing — https://angular.dev/guide/testing/services
- HttpClient Testing — https://angular.dev/guide/testing/http
- CDK Test Harnesses — https://material.angular.io/cdk/test-harnesses/overview

## Rules

### What to test

- **Components:** input/output bindings, rendered output for each meaningful state, user interactions (via harnesses or `DebugElement.triggerEventHandler`).
- **Services:** every public method, error paths, HTTP interactions, and any caching/state behavior.
- **Pipes:** pure transformation — plain unit tests, no `TestBed` needed.
- **Guards / resolvers:** allowed and denied branches, redirect targets, and dependency interactions.
- **Directives:** host bindings, host listeners, and any DOM side effects.

Prefer behavior over implementation: assert visible output, emitted events, and observable state — not private methods or rendered class names that exist only to drive other tests.

### TestBed setup for standalone components

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UserCardComponent } from './user-card.component';

describe('UserCardComponent', () => {
  let fixture: ComponentFixture<UserCardComponent>;
  let component: UserCardComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCardComponent], // import the standalone component directly
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(UserCardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());
});
```

- Import standalone components directly into `imports`. Do not stub them into a fake NgModule.
- Use `provideHttpClient()` + `provideHttpClientTesting()` for any code path that uses `HttpClient`. Do not `HttpClientModule` on standalone-first projects.

### Signal inputs

Set signal-based inputs via `componentRef.setInput()`; assigning to the field directly will not work.

```typescript
it('renders the user name', () => {
  fixture.componentRef.setInput('user', { id: '1', name: 'Ada' });
  fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('[data-testid="name"]')?.textContent).toContain('Ada');
});
```

### Signal-based outputs

```typescript
it('emits select on click', () => {
  const events: string[] = [];
  fixture.componentRef.setInput('user', { id: '1', name: 'Ada' });
  fixture.componentInstance.select.subscribe(id => events.push(id));

  fixture.nativeElement.querySelector('button')!.click();
  expect(events).toEqual(['1']);
});
```

### Component harnesses

Prefer CDK component harnesses over raw DOM queries for UI interaction — they are resilient to markup changes.

```typescript
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';

const loader = TestbedHarnessEnvironment.loader(fixture);
const saveButton = await loader.getHarness(MatButtonHarness.with({ text: 'Save' }));
await saveButton.click();
```

### Router testing

```typescript
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter } from '@angular/router';

it('binds :id route param to component input', async () => {
  TestBed.configureTestingModule({
    providers: [provideRouter([{ path: 'users/:id', component: UserDetailComponent }])],
  });
  const harness = await RouterTestingHarness.create();
  const detail = await harness.navigateByUrl('/users/42', UserDetailComponent);
  expect(detail.userId()).toBe('42');
});
```

- Use `RouterTestingHarness` for routed components. Do not stub `ActivatedRoute` with hand-rolled mocks unless the test specifically exercises route metadata edge cases.

### HTTP testing

```typescript
it('GETs the user list', () => {
  const service = TestBed.inject(UserService);
  let result: User[] = [];

  service.getUsers().subscribe(users => (result = users));

  const req = httpMock.expectOne('/api/users');
  expect(req.request.method).toBe('GET');
  req.flush([{ id: '1', name: 'Ada' }]);

  expect(result).toEqual([{ id: '1', name: 'Ada' }]);
});
```

- One `expectOne` per request. Call `httpMock.verify()` in `afterEach` so unexpected requests fail the test.

### Async testing

- `fakeAsync` + `tick()` / `flush()` for deterministic, controllable async (timers, RxJS schedulers).
- `waitForAsync` + `fixture.whenStable()` for tests that genuinely need real microtasks.
- Avoid `setTimeout` in tests outside `fakeAsync` — flake risk.

```typescript
it('debounces the search', fakeAsync(() => {
  component.search('a');
  component.search('ab');
  tick(300);
  expect(searchSpy).toHaveBeenCalledTimes(1);
  expect(searchSpy).toHaveBeenCalledWith('ab');
}));
```

### Service tests

Inject services directly — no fixture required.

```typescript
describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());
});
```

### Test design

- Keep setup local and readable. Add shared testing helpers only when at least two call sites need the same project-specific setup.
- Use `data-testid` (or the project's existing convention) for stable selectors. Do not assert on CSS classes or text that changes with copy edits.
- Avoid brittle template snapshots unless the project already uses them and the assertion is intentionally structural.
- Do not migrate the project's test runner, assertion library, or harness choices as part of a feature change.

## Anti-patterns to refuse

- Setting signal inputs by assignment (`component.user = ...`) instead of `componentRef.setInput()`.
- Importing `HttpClientTestingModule` / `RouterTestingModule` on standalone-first projects when `provideHttpClientTesting` / `provideRouter` + `RouterTestingHarness` are available.
- Spying on private methods or asserting on internal state to validate that a component "did the right thing."
- Wrapping every test in `fakeAsync` reflexively, then forgetting `tick()` and getting silent timeouts.
- New shared "test utils" modules created for one consumer.

## Evidence

Use the narrowest configured test command that covers the touched behavior, then broaden only when needed.

- File-scoped: `ng test --include='**/user-card.component.spec.ts'` or the project's equivalent.
- Project-scoped: `ng test --no-watch --code-coverage` (or the project test script) in CI mode.
- If no narrow command exists, run the full project test script and state the scope.
