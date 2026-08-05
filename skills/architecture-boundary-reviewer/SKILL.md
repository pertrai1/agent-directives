---
name: "architecture-boundary-reviewer"
description: "Load when changes touch imports, exports, public APIs, file moves, packages, services, layers, shared code, dependency direction, cycles, or the user asks if architecture boundaries still hold."
version: 1.1.0
required: false
category: review
tools:
  - claude
  - copilot
  - codex
  - cursor
routing:
  triggers:
  - imports
  - exports
  - packages
  - shared-code
  - service-boundaries
  - architecture-review
  paths:
    - boundary-path
    - review-path
---

# Architecture Boundary Reviewer

Review whether changed dependency edges preserve the project's architecture DAG.
Tests can pass while imports, public APIs, cycles, or shared-code ownership regress.

## When to Use

Use before merge/final verification for changed imports/exports, file moves,
shared utilities, package dependencies, service calls, entry points, or behavior
moved between layers. Skip pure prose unless it changes architecture policy.

## Start With Deterministic Edge Evidence

Run the local extractor before manually reconstructing the diff:

```bash
agent-directives boundary-diff --base <base-ref> --format json
```

Use `--head <ref>` for committed comparisons. Exit `1` identifies deterministic
candidates such as production-to-test leakage; exit `2` means the comparison is
invalid. Exit `0` means collection succeeded, not that edges are allowed.

If unavailable, manually list changed static/dynamic imports, re-exports,
dependency entries, deep imports, runtime registrations, and file moves.

## Review Process

1. Load the strongest contract: project instructions, active decisions,
   architecture docs, package exports, boundary config, then nearby patterns.
2. Mark every rule explicit or inferred. Do not promote convention to policy
   without saying so.
3. Classify touched production files by zone/layer/package/service and public API.
4. Join extracted edges to those classifications.
5. Review new public exports, moved dependents, and cycle risk.

Check especially:

| Failure | Review question | Default severity |
| --- | --- | --- |
| Upward import | Does core/domain depend on UI/app/infra? | Critical |
| Sideways internal import | Does a feature reach a sibling's internals? | Critical |
| Public API bypass | Does a deep import skip an entry point? | Warning/Critical |
| Cycle | Did the edge close a file/package/layer loop? | Critical |
| Shared pollution | Does shared/common depend on unstable feature code? | Warning |
| Test leakage | Does production depend on fixtures/mocks/tests? | Critical |

Run configured lint, dependency, Fallow, Nx, or GitNexus evidence when available.
Do not install/configure a new enforcement system for the review. Tool absence is
not a pass or automatic failure; state the manual fallback.

## Output

```md
## Architecture Boundary Review

### Contract
- Sources: <explicit/inferred>
- Zones and allowed direction: <summary>

### Changed Edges
| From | To | Extracted status | Reviewer judgment | Rule |
| --- | --- | --- | --- | --- |

### Findings
#### CRITICAL/WARNING: <title>
- Edge and evidence: <path/line/report row>
- Rule: <explicit or inferred>
- Risk: <coupling/cycle/API/test leakage>
- Smallest fix: <port/public API/move/inversion>

### Tool Evidence
- `boundary-diff`: <status>
- configured boundary/cycle/impact checks: <result or unavailable>

### Verdict
- Pass / Pass with named uncertainty / Block
```

Prefer a public API, dependency inversion, injected port/callback, or genuinely
stable lower-layer abstraction. Do not make unrelated repo-wide policy changes
to repair one edge.

## Completion Checklist

- [ ] Contract sources and confidence identified
- [ ] Touched production files classified
- [ ] Every changed edge reviewed; report truncation accounted for
- [ ] Deep imports, public exports, test leakage, and cycles checked
- [ ] Deterministic facts kept separate from reviewer judgment
- [ ] Verdict and smallest fixes are concrete

The command replaces mechanical edge enumeration. This skill still owns
contract discovery, architectural judgment, severity, and remediation.
