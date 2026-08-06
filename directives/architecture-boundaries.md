---
name: architecture-boundaries
description: Preserves architecture DAG boundaries for imports, exports, packages, services, shared code, and dependency direction.
version: 1.1.0
required: false
category: architecture
tools:
  - claude
  - copilot
  - codex
  - cursor
triggers:
  - imports
  - exports
  - packages
  - architecture
  - shared-code
  - dependency-direction
routing:
  load: conditional
---

# Architecture Boundaries Directive

**When to load:** Before changing imports, exports, module structure, feature
folders, shared utilities, packages, services, or dependency direction.

Tests prove behavior, not architectural fit. Preserve the project's directed
dependency graph.

## Command-First Edge Discovery

After the intended base ref is known, collect changed JavaScript/TypeScript and
package edges locally:

```bash
agent-directives boundary-diff --base <base-ref> --format json
```

Use `--head <ref>` for a committed comparison and `--max-edges <n>` to keep
evidence bounded. The report lists changed static imports, dynamic imports,
re-exports, package dependency entries, and production-to-test candidates in
stable order.

Interpret exit classes:

- `0`: edge evidence was collected; this is not architectural approval.
- `1`: a deterministic candidate such as production-to-test leakage needs review.
- `2`: the ref, limit, repository, or git evidence is invalid; do not verify from it.

The command reports syntax-level facts. Only an explicit project rule can prove
an edge allowed or forbidden. Unconfigured edges remain `observed` or `unclear`.

If the command is unavailable, inspect added/changed imports, exports,
`package.json` dependency sections, file moves, and public entry points directly
from the diff. Preserve unusual paths and state that manual extraction was used.

## Load the Boundary Contract

Use progressive disclosure in this order:

1. Project instructions and active architecture decisions
2. Architecture docs and contribution rules
3. Package/workspace structure and package `exports`
4. TypeScript paths/project references and boundary lint configuration
5. Existing patterns near the changed files

For each touched production file, record its zone/package/service, public entry
point, allowed dependencies, and whether the rule is explicit or inferred. If an
inference would materially change implementation, surface it before coding.

## Review Every Changed Edge

Forbidden unless an explicit project rule permits it:

- domain/core importing UI, application, framework, or infrastructure;
- shared/common importing feature-specific or application-specific code;
- sibling features importing each other's internals;
- UI importing database, filesystem, network, or infrastructure directly;
- production importing tests, fixtures, mocks, or test helpers;
- deep imports that bypass a package/feature public API;
- new cycles between files, packages, layers, or services.

When an edge would violate the DAG, prefer dependency inversion, a public API,
an injected callback/port, or moving genuinely stable behavior downward. Do not
move code to `shared` merely to make an import compile.

## Optional Enforcement Evidence

Run project-configured lint, dependency, monorepo, Fallow, or graph checks after
the local edge report. Examples when already available:

```bash
npx fallow dead-code --boundary-violations
npx fallow dead-code --circular-deps
npx gitnexus impact SymbolName --direction upstream
```

Do not install or configure a new enforcement system during unrelated work.
GitNexus is impact evidence unless the project defines enforcing graph queries.

## Verification Output

Include:

```md
### Architecture Boundaries
- Contract sources: <explicit/inferred sources>
- Modified zones: <zones/packages/services>
- Changed edges: <from → to, observed/candidate>
- Judgment: <allowed/violation/unclear with rule>
- Cycles/public API/test leakage: <evidence>
- Tool evidence: <commands/results or unavailable fallback>
- Verdict: Pass / Pass with uncertainty / Block
```

Block on a proven violation. Name uncertainty rather than inventing a confident
architecture rule.

## Forbidden Patterns

| Pattern | Why forbidden |
| --- | --- |
| Treating exit `0` as architecture approval | The report extracts facts, not policy |
| Approving an edge because tests pass | Tests do not validate dependency direction |
| Deep-importing internals for convenience | Bypasses the public contract |
| Adding boundary policy as drive-by cleanup | Cross-cutting policy requires explicit review |
| Ignoring cycles because runtime works | Cycles degrade build and refactor reliability |
| Calling code `shared` without checking dependents | Can reverse the DAG |
