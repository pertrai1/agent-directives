---
name: angular-components-and-templates
description: Angular component and template rules for typed, maintainable Angular UI changes.
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
  - https://angular.dev/guide/components
  - https://angular.dev/guide/templates
applies_to:
  - src/app/**/*.component.ts
  - src/app/**/*.component.html
  - src/app/**/*.component.css
  - src/app/**/*.component.scss
---

# Angular Components and Templates Rules

**Load when:** Creating, changing, or reviewing Angular components, templates, component styles, inputs, outputs, lifecycle behavior, or view logic.

## Sources

Track source material explicitly so future updates can verify whether the rule is stale:

- Angular Style Guide — https://angular.dev/style-guide
- Angular Components Guide — https://angular.dev/guide/components
- Angular Templates Guide — https://angular.dev/guide/templates

## Rules

- Match the project's existing Angular style first, then Angular's current guidance.
- Prefer standalone components for new components unless the project is clearly NgModule-centered.
- Keep components focused on presentation and UI coordination. Move reusable business logic to services, utilities, or state primitives already used by the project.
- Keep templates declarative. Avoid hiding complex branching, transformations, or side effects inside template expressions.
- Type component inputs, outputs, and public component methods explicitly when they form a contract with templates, parents, or tests.
- Do not introduce `any` for template or component data. Narrow external data at the boundary before binding it.
- Preserve existing accessibility patterns. New interactive elements need keyboard, label, and semantic HTML coverage appropriate to the component.
- Avoid drive-by component rewrites, style-system changes, or broad file moves while making localized UI changes.

## Evidence

For component behavior changes, include one of:

- updated component/unit tests,
- existing tests that cover the changed behavior,
- or a stated reason tests are unavailable plus a lower-confidence fallback such as build/typecheck evidence.
