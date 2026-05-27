---
name: angular-project-structure
description: Concrete Angular workspace, file-naming, feature-folder, and provider-bootstrapping standards for agents working in Angular applications.
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
  - https://angular.dev/tools/cli
  - https://angular.dev/reference/configs/workspace-config
  - https://angular.dev/guide/ngmodules/standalone
  - https://github.com/angular/angular/tree/main/skills/dev-skills/angular-developer/references
applies_to:
  - angular.json
  - package.json
  - src/main.ts
  - src/app/**/*.ts
  - src/app/**/*.html
---

# Angular Project Structure Rules

**Load when:** The project contains `angular.json` or `@angular/core`, or the task touches Angular app structure, routes, file layout, providers, or bootstrap configuration.

## Version Awareness

Confirm the Angular version (`ng version` or `package.json`) before suggesting structure. Standalone APIs and the v17+ application builder are now defaults; do not invent NgModules on a standalone-first project, and do not migrate a working NgModule layout as a side effect of an unrelated change.

## Sources

- Angular Style Guide — https://angular.dev/style-guide
- Angular CLI Overview — https://angular.dev/tools/cli
- Angular Workspace Configuration — https://angular.dev/reference/configs/workspace-config
- Standalone APIs — https://angular.dev/guide/ngmodules/standalone

## Rules

### File and folder naming

Follow Angular CLI conventions — one artifact per file. Use kebab-case file names and PascalCase class names:

- `user-profile.component.ts` + `user-profile.component.html` + `user-profile.component.scss` + `user-profile.component.spec.ts`
- `user.service.ts`, `auth.guard.ts`, `date-format.pipe.ts`, `logging.interceptor.ts`, `user.resolver.ts`
- Test files live next to the unit they test, named `<name>.spec.ts`.
- Generate scaffolding with the CLI rather than handwriting it: `ng generate component features/users/user-card --change-detection=OnPush --inline-style=false`.

### Feature folders

Group by feature, then by artifact. Do not create catch-all `shared/` or `utils/` buckets for unrelated code.

```
src/app/
  core/                 # app-wide singletons: auth, http interceptors, app-level guards
  shared/               # reusable presentational components, pipes, directives
  features/
    users/
      users.routes.ts
      user-list/
        user-list.component.{ts,html,scss,spec.ts}
      user-detail/
        user-detail.component.{ts,html,scss,spec.ts}
      user.service.ts
      user.model.ts
    auth/
      auth.routes.ts
      ...
  app.config.ts         # application providers (router, http, etc.)
  app.routes.ts         # top-level routes
  app.component.ts      # root component
```

- Keep route configuration co-located with the feature it serves (`users.routes.ts`), and lazy-load via `loadChildren`.
- Place app-wide providers (`provideRouter`, `provideHttpClient`, interceptors, error handlers) in `app.config.ts`. Bootstrap from `main.ts` with `bootstrapApplication(AppComponent, appConfig)`.
- A new directory or top-level folder must be justified by existing project evidence. Follow project routing, state-management, and shared-library boundaries before adding new locations.

### Standalone bootstrap

```typescript
// main.ts
bootstrapApplication(AppComponent, appConfig).catch(console.error);

// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimationsAsync(),
  ],
};
```

- Use functional providers (`provideRouter`, `provideHttpClient`, `provideAnimationsAsync`) over the legacy module forms on standalone-first projects.
- Register HTTP interceptors functionally via `withInterceptors([...])`. Class-based `HTTP_INTERCEPTORS` multi-providers are reserved for NgModule-centered projects.

### Routing layout

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },
  {
    path: 'users',
    loadChildren: () => import('./features/users/users.routes').then(m => m.USERS_ROUTES),
  },
  { path: '**', loadComponent: () => import('./shared/not-found/not-found.component').then(m => m.NotFoundComponent) },
];
```

- Lazy-load every feature area with `loadChildren` (or `loadComponent` for a single route). Eagerly loading feature trees inflates the initial bundle.
- Use `withComponentInputBinding()` so route params and query params bind to component `input()` signals automatically.
- Put guards/resolvers next to the route file (`users.guards.ts`, `user.resolver.ts`), not in a global `guards/` bucket.

### Workspace and config files

- Treat `angular.json`, `tsconfig*.json`, builder targets, and `package.json` script changes as project-wide changes. Keep edits narrow and verify with the configured command (`ng build`, `ng test`, `ng lint`).
- Do not switch the application builder, change `target`/`module` settings, or rename top-level paths casually — those are coordinated migrations.
- `environments/environment*.ts` files describe configuration shape, not real secrets. Inject production secrets via CI/CD, not source.

### Cross-ecosystem hygiene

- Do not add React, Vue, or other-framework conventions to an Angular project. If shared code must straddle frameworks, isolate it behind a framework-neutral library.
- Match the project's existing module system (ESM vs CommonJS) and import style. Use path aliases from `tsconfig.json` where the project already defines them.

## Deep-Dive Reference Materials

Coding agents should fetch the raw text of these references programmatically when planning workspace boundaries, scaffolding, dependency injection structures, or upgrades:

- **CLI Scaffolding:** CLI command syntax and scaffolding options. Read [cli.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/cli.md)
- **Creating Services:** Generating services, the `providedIn: 'root'` option, and injection guidelines. Read [creating-services.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/creating-services.md)
- **Defining Providers:** Token definition patterns (`InjectionToken`, `useValue`, `useFactory`). Read [defining-providers.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/defining-providers.md)
- **Hierarchical Injectors:** Understanding injector layers (`EnvironmentInjector`, `ElementInjector`), resolution rules, and `viewProviders`. Read [hierarchical-injectors.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/hierarchical-injectors.md)
- **Migrations & Upgrades:** Modernizing older code bases via automated migrations. Read [migrations.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/migrations.md)
- **Angular MCP Server:** Supported features and configuration of the Model Context Protocol language tools. Read [mcp.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/mcp.md)

## Anti-patterns to refuse

- A single `shared/` directory accumulating unrelated services, pipes, components, and constants.
- New NgModules created on a standalone-first project just to host providers — use `app.config.ts` or route-level `providers`.
- Eagerly importing feature components into `app.routes.ts` instead of `loadChildren` / `loadComponent`.
- Editing `angular.json` builders, `tsconfig` paths, or `package.json` scripts as part of an unrelated component or service change.

## Evidence

For behavior-changing Angular work, prefer the project's configured commands. Common examples are:

- `ng test` or the project test script
- `ng build` or the project build script
- `ng lint` or the project lint script when configured

If the project does not expose Angular CLI commands, state the fallback command and lower confidence.
