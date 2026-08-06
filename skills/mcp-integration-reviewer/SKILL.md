---
name: "mcp-integration-reviewer"
description: "Load when adding or reviewing MCP servers, agent tools, tool schemas, internal API bridges, structured search, docs/ticketing/analytics connectors, or agent-accessible write tools."
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
    - mcp-server
    - mcp-tool
    - agent-tool-schema
    - internal-tool-bridge
    - structured-search-tool
    - agent-accessible-api
    - agent-write-tool
  paths:
    - full-path
    - review-path
    - policy-path
---

# MCP Integration Reviewer

Review MCP servers and similar agent tool bridges for reliable routing, strict
schemas, least privilege, bounded output, safe writes, and visible failures.

## Deterministic Protocol and Schema Pass

When the server can run over stdio, validate it directly without registering it
with an MCP client:

```bash
agent-directives mcp-validate <executable> [server-args...] \
  --timeout-ms 5000 \
  --max-output-bytes 65536 \
  --format json
```

The command launches without a shell, performs initialize and tools/list
JSON-RPC requests, bounds stdout/stderr, terminates timeouts, and deterministically
checks tool names/descriptions, duplicate/vague routing, object schemas, required
properties, common bounds, collection limits, and supplied annotation types.

Interpret exit classes:

- `0`: protocol completed and deterministic schema checks found no issue;
- `1`: tool-quality findings require review/fix;
- `2`: invalid options, launch/timeout/output, malformed protocol, or missing
  required responses make the evidence unusable.

Exit `0` is not security or production approval. If the server is not stdio or
the command is unavailable, exercise the equivalent initialization/tool-list
path with the project's own harness and record the missing automated coverage.

## Manual Review the Command Cannot Replace

### Surface and Routing

Inventory exposed tools/resources/prompts, read vs write behavior, systems
touched, auth identity, and expected output size. Names and descriptions must
tell an agent when to use the capability, when not to, required identifiers, and
side effects.

### Runtime Validation and Output

Confirm server-side validation—not only JSON Schema hints—plus structured errors,
pagination/limits for reads, stable bounded output, cancellation/timeouts,
rate/concurrency controls, and dependency-failure behavior.

### Auth, Secrets, and Data Boundaries

Review least privilege, user/service/admin identity separation, tenant/project
scoping, secret redaction from logs/errors/model output, and audit logging for
sensitive reads and meaningful writes.

### Write Safety

For mutations, require safeguards proportional to impact: preview/dry-run,
explicit confirmation for destructive/deploy/billing/permission/data actions,
idempotency or retry protection, auditability, and rollback/recovery guidance.
Prefer separate read and write tools over an ambiguous generic operation.

## Output

```md
## MCP Integration Review

### Tool Surface
- Tools/resources: <names>
- Write-capable: <which>
- Auth and sensitive data: <scope>

### Deterministic Validation
- Command/transport: <exact invocation or fallback>
- Protocol: <ok/findings/error>
- Schema/routing findings: <summary>
- Bounds/cleanup evidence: <summary>

### Findings
#### BLOCKER / SHOULD FIX: <title>
- Evidence: <file:line, behavior, or report finding>
- Agent/tool risk: <misuse/exposure/write/ambiguity>
- Smallest fix: <specific change>

### Verification Needed
- <permission, validation, dry-run, audit, retry, or failure proof>

### Verdict
- APPROVE / COMMENT / REQUEST_CHANGES
```

Prefer narrow fixes: split tools, tighten schema, add bounds, redact a field,
lower permissions, add preview/idempotency/audit, or improve descriptions.

The command replaces ad hoc MCP registration, protocol probing, schema scanning,
and output bounding. This skill still owns security, authorization, operational,
write-safety, and production-readiness judgment.
