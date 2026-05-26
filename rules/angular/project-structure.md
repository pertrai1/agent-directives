---
name: angular-project-structure
description: Angular workspace and project-structure standards for agents working in Angular applications.
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
  - https://angular.dev/tools/cli
  - https://angular.dev/reference/configs/workspace-config
applies_to:
  - angular.json
  - package.json
  - src/app/**/*.ts
  - src/app/**/*.html
---

# Angular Project Structure Rules

**Load when:** The project contains `angular.json` or `@angular/core`, or the task touches Angular app structure, routes, components, services, templates, or tests.

## Sources

Track source material explicitly so future updates can verify whether the rule is stale:

- Angular Style Guide — https://angular.dev/style-guide
- Angular CLI Overview — https://angular.dev/tools/cli
- Angular Workspace Configuration — https://angular.dev/reference/configs/workspace-config

## Rules

- Prefer Angular CLI-generated structure and names unless the project already has a stronger local convention.
- Keep related files together by feature or component. Do not create broad catch-all folders for unrelated utilities.
- Keep Angular-specific code under the existing app/source root; do not introduce a parallel structure unless project evidence requires it.
- Follow existing project routing, state-management, and shared-library boundaries before adding new locations.
- Treat `angular.json`, builder targets, and TypeScript config edits as project-wide changes. Keep them narrow and verify with the relevant configured Angular command.
- Do not add framework rules from another ecosystem, such as React or Vue, to Angular-only work.

## Evidence

For behavior-changing Angular work, prefer the project's configured commands. Common examples are:

- `ng test` or the project test script
- `ng build` or the project build script
- `ng lint` or the project lint script when configured

If the project does not expose Angular CLI commands, state the fallback command and lower confidence.
