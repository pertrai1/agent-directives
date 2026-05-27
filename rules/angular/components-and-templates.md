---
name: angular-components-and-templates
description: Concrete patterns for building modern Angular components, signal-based inputs/outputs, OnPush change detection, and v17+ control-flow templates.
version: 1.2.0
required: false
category: angular
tools:
  - claude
  - copilot
  - codex
  - cursor
source_urls:
  - https://angular.dev/style-guide
  - https://angular.dev/guide/components
  - https://angular.dev/guide/templates
  - https://angular.dev/guide/signals
  - https://angular.dev/guide/components/inputs
  - https://angular.dev/guide/components/outputs
  - https://github.com/angular/angular/tree/main/skills/dev-skills/angular-developer/references
applies_to:
  - src/app/**/*.component.ts
  - src/app/**/*.component.html
  - src/app/**/*.component.css
  - src/app/**/*.component.scss
---

# Angular Components and Templates Rules

**Load when:** Creating, changing, or reviewing Angular components, templates, component styles, inputs/outputs, lifecycle behavior, or view logic.

## Version Awareness

Check the project's Angular version before writing code — APIs differ significantly between versions. Use `ng version` or inspect `package.json`. Match the project's existing component style first; do not migrate component styles as part of an unrelated change.

## Sources

- Angular Style Guide — https://angular.dev/style-guide
- Angular Components Guide — https://angular.dev/guide/components
- Angular Templates Guide — https://angular.dev/guide/templates
- Angular Signals Guide — https://angular.dev/guide/signals

## Rules

### Component shape

- Prefer standalone components (v17+ default). Add `standalone: true` and declare template dependencies in `imports`. Do not mix standalone and NgModule registration for the same component.
- Default to `ChangeDetectionStrategy.OnPush` on all new components.
- Keep components focused on presentation and UI coordination. Move data access, business rules, and cross-component state to services or state primitives the project already uses.
- One artifact per file — `user-card.component.ts`, `user-card.component.html`, `user-card.component.scss`, `user-card.component.spec.ts`.

```typescript
@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './user-card.component.html',
  styleUrl: './user-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCardComponent {
  user = input.required<User>();
  highlight = input(false, { transform: booleanAttribute });
  select = output<string>();

  onClick() {
    this.select.emit(this.user().id);
  }
}
```

### Inputs and outputs

- On v17.1+ projects, prefer signal-based `input()` / `input.required()` / `output()` over decorators. Stay on `@Input()`/`@Output()` only if the project is uniformly decorator-based and the file you are editing already uses them.
- Type every input and output. Do not introduce `any` to make a binding compile — narrow the source data at the boundary instead.
- Use `input.required<T>()` when a parent must supply the value. Provide defaults (`input(false)`) only when the absence has a meaningful, documented behavior.
- Two-way binding uses `model()` (e.g., `value = model<string>('')`). Do not invent custom `xChange` outputs when `model()` covers the use case.

### Templates (v17+ control flow)

Use the built-in block syntax. Always provide `track` in `@for`.

```html
@if (isLoading()) {
  <app-spinner />
} @else if (error()) {
  <app-error [message]="error()" />
} @else {
  @for (item of items(); track item.id) {
    <app-item [item]="item" (select)="onSelect($event)" />
  } @empty {
    <p>No items found.</p>
  }
}

@switch (status()) {
  @case ('active')  { <app-active /> }
  @case ('pending') { <app-pending /> }
  @default          { <app-unknown /> }
}
```

- Keep templates declarative. Move complex branching, transformations, or side effects into the component class, a `computed`, or a pure pipe.
- Call signals as functions in the template (`items()`, not `items`). Do not access `.value` on a signal — that is not the public API.
- Use the `async` pipe for Observables in templates rather than subscribing manually. Prefer converting to signals via `toSignal()` when possible.
- Use `@defer` for non-critical UI blocks (below the fold, behind interaction). Pair with `@placeholder`, `@loading`, and `@error` blocks.

### Lifecycle and DOM access

- Use `inject()` over constructor injection. Keep constructors empty.
- For DOM work that must run after the view renders, prefer `afterRenderEffect` / `afterNextRender`. Do not reach into the DOM from `ngOnInit`.
- Use `viewChild()` / `viewChildren()` / `contentChild()` (signal queries) over the decorator forms on v17.2+ projects.
- Avoid `ngOnChanges` when an `input()` signal plus a `computed` or `effect` expresses the dependency directly.

### Styles

- Keep `ViewEncapsulation.Emulated` (default). Use `ViewEncapsulation.None` only for design-system roots that intentionally bleed styles.
- Scope styles to the component file. Use `:host`, `:host-context`, and CSS custom properties for themeable values rather than global selectors.
- Preserve existing accessibility patterns. New interactive elements need keyboard support, programmatic labels, focus management, and semantic HTML appropriate to the component.

### Change detection hygiene

- Signals and the `async` pipe drive change detection on `OnPush` components automatically. Do not reach for `ChangeDetectorRef.markForCheck()` or `detectChanges()` unless you have a documented, narrow reason.
- Do not mutate input objects in place when `OnPush` is in effect — produce new references.

## Deep-Dive Reference Materials

Coding agents should fetch the raw text of these references programmatically when editing related UI and components:

- **Component Fundamentals:** Standalone anatomy, template control flow (`@if`, `@for`). Read [components.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/components.md)
- **Inputs:** Signal-based inputs, transforms, and model inputs. Read [inputs.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/inputs.md)
- **Outputs:** Signal-based outputs and custom event best practices. Read [outputs.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/outputs.md)
- **Host Elements:** Host bindings and attribute injection. Read [host-elements.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/host-elements.md)
- **Component Styling:** Reusable component styles and encapsulation. Read [component-styling.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/component-styling.md)
- **Tailwind CSS:** Integrating and styling components with Tailwind. Read [tailwind-css.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/tailwind-css.md)

## Anti-patterns to refuse

- `@Component({ standalone: false })` on new components without an NgModule that already owns it.
- `ChangeDetectionStrategy.Default` on new components.
- Using `*ngIf` / `*ngFor` / `*ngSwitch` on projects that have adopted block syntax.
- Calling `.subscribe()` from a template, or storing computed/derived values in plain signals updated via `effect()`.
- Typing inputs/outputs as `any`, or bypassing the type system with `!` to silence template errors.

## Evidence

For component behavior changes, include one of:

- updated component/unit tests,
- existing tests that already cover the changed behavior,
- or a stated reason tests are unavailable plus a lower-confidence fallback such as build/typecheck output (`ng build`, `tsc --noEmit`).
