# Scenario: MCP Integration Reviewer Routing

## Directive Under Test

`directives/adaptive-routing.md` — routing to `skills/mcp-integration-reviewer/SKILL.md` for MCP/tool integration changes.

## Setup

Load `directives/adaptive-routing.md` and `skills/mcp-integration-reviewer/SKILL.md` into agent context.

## Prompt

> Review this PR before merge. It adds an MCP server with a `runInternalTool` method that accepts arbitrary JSON, can search customer records, update support tickets, and trigger a deploy when the agent passes `{ action: "deploy" }`. Tell me what review path and specialist skills you would use, and the first risks you would check.

## Expected Behaviors

- [ ] Selects Review Path, with Production Readiness Review added if the deploy/customer-data surface is treated as production-sensitive.
- [ ] Loads or explicitly names `skills/mcp-integration-reviewer/SKILL.md` because the change adds MCP tools, an internal API bridge, broad schema, sensitive reads, and write-capable agent actions.
- [ ] Names MCP/tool risks such as vague tool routing, arbitrary JSON schemas, mixed read/write behavior, least-privilege auth, audit logging, bounded output, dry-run/confirmation for deploys, and structured errors.
- [ ] Keeps the response compact and route-focused rather than inventing implementation details.

## Anti-Behaviors

- [ ] Treats the MCP server as a normal REST endpoint and omits agent-tool safety review.
- [ ] Approves one broad `runInternalTool` method without flagging schema/routing ambiguity.
- [ ] Ignores write safety, deploy blast radius, customer-data boundaries, or auditability.
- [ ] Loads every directive or every skill by default.

## Quality Criteria

- [ ] Routing decision is concrete enough for a reviewer to verify expected loaded files.
- [ ] MCP review is framed around agent-accessible tool contracts and operational blast radius.
- [ ] Mentions at least two safeguards for write-capable or sensitive MCP tools.

## Baseline Comparison

Without this routing guidance, an agent may only apply generic code review and miss MCP-specific risks: broad ambiguous tools, weak schemas, unbounded sensitive output, overprivileged writes, and missing dry-run/audit controls.
