---
name: angular-security
description: Concrete Angular security rules — XSS prevention, HttpClient discipline, secret handling, route guards, and SSR safety.
version: 1.1.0
required: false
category: angular
tools:
  - claude
  - copilot
  - codex
  - cursor
source_urls:
  - https://angular.dev/best-practices/security
  - https://angular.dev/api/platform-browser/DomSanitizer
  - https://angular.dev/guide/http/security
  - https://angular.dev/guide/ssr
  - https://github.com/angular/angular/tree/main/skills/dev-skills/angular-developer/references
applies_to:
  - src/app/**/*.component.ts
  - src/app/**/*.component.html
  - src/app/**/*.service.ts
  - src/app/**/*.interceptor.ts
  - src/app/**/*.guard.ts
  - src/app/**/*.routes.ts
  - src/environments/**/*.ts
  - src/**/*.server.ts
  - server.ts
---

# Angular Security Rules

**Load when:** Touching code that handles user input, renders untrusted HTML, calls external APIs, manages auth/tokens, configures route guards, or runs under SSR.

## Version Awareness

Sanitization, route guard, and SSR APIs evolve between versions — verify the version with `ng version` before suggesting an API. Do not introduce APIs that don't exist in the project's Angular version, and do not rip out a guard or sanitization step as a side effect of an unrelated change.

## Sources

- Angular Security Best Practices — https://angular.dev/best-practices/security
- DomSanitizer API — https://angular.dev/api/platform-browser/DomSanitizer
- HttpClient Security — https://angular.dev/guide/http/security
- Angular SSR Guide — https://angular.dev/guide/ssr

## Rules

### XSS prevention

Angular auto-sanitizes interpolation and property bindings. Do not bypass the sanitizer with user-controlled input.

```typescript
// WRONG — bypasses sanitization, classic XSS
this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(userInput);

// CORRECT — explicit sanitization, returns string with dangerous content stripped
this.safeHtml = this.sanitizer.sanitize(SecurityContext.HTML, userInput);
```

- Never call `bypassSecurityTrustHtml` / `bypassSecurityTrustScript` / `bypassSecurityTrustStyle` / `bypassSecurityTrustUrl` / `bypassSecurityTrustResourceUrl` on user-controlled input. If you must bypass, the source must be a static, trusted constant, with a comment explaining why.
- Avoid `[innerHTML]` for untrusted content. Use `{{ value }}` interpolation or `[innerText]` for plain text. If rich content is required, render it through a sanitizing pipe.
- Never bind `[href]` or `[src]` directly to user-provided URLs without scheme validation — Angular sanitizes some URL contexts but not all.
- Never build templates by string concatenation with user data.

### HttpClient discipline

Use `HttpClient` exclusively — not raw `fetch()` or `XHR` — so interceptors (auth headers, error mapping, retry, logging) apply uniformly.

```typescript
// WRONG — bypasses interceptors entirely
const res = await fetch('/api/users');

// CORRECT
users$ = this.http.get<User[]>('/api/users');
```

- Attach auth tokens via an interceptor, never by hand on every call. One source of truth for `Authorization` headers.
- Type and validate API responses. Treat external data as `unknown` at the boundary and narrow with a schema (Zod / io-ts / hand-rolled guard) before letting it flow into typed signals or components.
- Never log full HTTP responses that may contain tokens, PII, or credentials. Redact before logging.
- For SSR fetches, prefer relative URLs (or the configured base URL) so the server doesn't re-hit the public host.

### Secret and config management

```typescript
// WRONG — hardcoded secret in source
const apiKey = 'sk-live-xxxxxxxxxxxxxxxxxxxxxxxx';

// CORRECT — env config shape, real value injected by CI/CD
import { environment } from '../environments/environment';
const apiKey = environment.apiKey;
```

- Treat `environments/environment*.ts` as configuration shape, not as a place to commit production secrets. Real secrets come from CI/CD env vars or a secret manager.
- Do not introduce `process.env.*` reads into browser-bound code unless the build pipeline is configured to inline them safely.
- Never commit `.env` files containing real credentials.

### Route guards

Every authenticated or role-restricted route must have a guard. Hiding a UI element is not access control.

```typescript
{
  path: 'admin',
  canMatch: [authGuard, roleGuard('admin')],
  loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
}
```

- Use `canMatch` for sensitive routes so the route's lazy chunk is not loaded at all for unauthorized users.
- Use `canDeactivate` to prevent accidental data loss on unsaved forms — but never as a security mechanism.
- Guards must trust a server-side check too. The server is the security boundary; the client guard is a UX gate.

### Auth tokens

- Store tokens in HTTP-only cookies when the backend supports it. If using `localStorage` / `sessionStorage`, accept the XSS risk and mitigate accordingly.
- Refresh tokens belong in HTTP-only cookies or a dedicated secure storage layer — never in plain `localStorage`.
- Clear all auth state on logout, including in-memory signals, interceptors caches, and storage.

### SSR safety

When the app runs under Angular SSR:

- Never access `window`, `document`, `localStorage`, `sessionStorage`, or `navigator` directly. Gate browser-only code with `isPlatformBrowser(this.platformId)` or inject the `DOCUMENT` token for DOM access.
- Sanitize user input on the server too — DOM-based XSS is reachable through SSR'd markup.
- Do not place server-only secrets into `TransferState` — anything serialized there ships to the client.
- Watch for hydration mismatches: server-rendered markup must equal initial client render. Diverging output is both a bug and a possible injection vector.

### Content Security Policy

Configure CSP headers server-side. Specifically:

- Avoid `unsafe-inline` in `script-src`. If SSR emits inline state, use Angular's CSP nonce support and propagate the nonce on every inline tag.
- Avoid `unsafe-eval` — Angular AOT does not need it.
- Restrict `connect-src` to the API origins the app actually uses.

### Dependencies

- Treat `npm audit` / `pnpm audit` / `yarn audit` findings as real signals. Resolve high-severity issues before shipping touched code paths.
- Do not pin to versions with known active CVEs as a workaround for a feature change.

## Deep-Dive Reference Materials

Coding agents should fetch the raw text of these references programmatically when verifying accessibility standards and headless component configurations:

- **Angular Aria Components:** Building headless, accessible components (Accordion, Listbox, Combobox, Menu, Tabs, Toolbar, Tree, Grid) and styling ARIA attributes. Read [angular-aria.md](https://raw.githubusercontent.com/angular/angular/main/skills/dev-skills/angular-developer/references/angular-aria.md)

## Anti-patterns to refuse

- `bypassSecurityTrust*` on a value derived in any way from user input.
- `[innerHTML]` bound to a request body, query param, or form value without sanitization.
- `fetch('/api/...')` in a service that already has `HttpClient` available.
- Auth checks done only by hiding a button — no guard, no server-side check.
- `window.localStorage.getItem(...)` in code that also runs under SSR.

## Evidence

- For changes that affect rendering of untrusted content: a test asserting the rendered output does not contain the dangerous payload.
- For auth/guard changes: a `RouterTestingHarness` test that exercises both allowed and denied branches.
- For interceptor changes: a `HttpTestingController` test confirming the header / retry / error mapping behavior.
- For dependency upgrades touching security: the audit report after the change.
