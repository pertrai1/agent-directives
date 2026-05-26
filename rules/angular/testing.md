---
name: angular-testing
description: Angular testing rules for component, service, and integration-style Angular changes.
version: 1.0.0
required: false
category: angular
tools:
  - claude
  - copilot
  - codex
  - cursor
source_urls:
  - https://angular.dev/guide/testing
  - https://angular.dev/style-guide
applies_to:
  - src/app/**/*.spec.ts
  - src/app/**/*.component.ts
  - src/app/**/*.service.ts
---

# Angular Testing Rules

**Load when:** Adding, changing, or reviewing Angular tests, or making Angular behavior changes that should be covered by tests.

## Sources

Track source material explicitly so future updates can verify whether the rule is stale:

- Angular Testing Guide — https://angular.dev/guide/testing
- Angular Style Guide — https://angular.dev/style-guide

## Rules

- Prefer behavior-focused tests over implementation-detail tests. Assert visible output, emitted events, service effects, and observable state rather than private methods.
- For component changes, update or add component tests unless existing coverage already proves the changed behavior.
- For service changes, test the service contract and failure paths without over-mocking project-owned logic.
- Keep test setup local and readable. Do not add shared testing helpers unless at least two call sites need the same project-specific setup.
- Preserve the project's current Angular test runner and utilities. Do not migrate Karma/Jasmine/Jest/Vitest/Testing Library choices as part of a feature fix.
- Avoid brittle snapshots for Angular templates unless the project already uses them and the assertion is intentionally structural.

## Evidence

Use the narrowest configured test command that covers the touched behavior, then broaden only when needed. If no narrow command exists, use the project test script or Angular CLI test target and state the scope.
