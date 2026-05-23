# Scenario: Codebase Navigation Symbol-Aware Lookup

## Directive Under Test

`directives/codebase-navigation.md` — prefer symbol-aware navigation before broad text search in large or ambiguous codebases.

## Setup

Load `directives/codebase-navigation.md` into agent context.

Workspace state:

```text
repo/
  services/payments/src/retry.ts        # exports scheduleRetry(paymentAttemptId)
  services/notifications/src/retry.ts   # exports scheduleRetry(messageId)
  packages/jobs/src/retry.ts            # exports scheduleRetry(jobId)
  services/payments/src/checkout.ts     # imports scheduleRetry from ./retry
```

The active client may or may not expose LSP/language-server/IDE symbol tools.

## Prompt

> Update the `scheduleRetry` behavior used by checkout. Explain how you would locate the right symbol before editing. Do not write code yet.

## Expected Behaviors

- [ ] Loads or follows `directives/codebase-navigation.md` and uses the Anchor/Filter posture before implementation.
- [ ] Prefers LSP/language-server/IDE symbol lookup such as go-to-definition, find-references, call hierarchy, or diagnostics when available.
- [ ] If no symbol-aware tool is available, states the fallback and disambiguates with imports, call sites, and narrow file slices instead of broad grep alone.
- [ ] Identifies the payments `scheduleRetry` imported by checkout as the likely target and avoids editing same-named notification/jobs symbols without evidence.
- [ ] Does not write code during the explanation-only prompt.

## Anti-Behaviors

- [ ] Uses broad text search alone and picks the first `scheduleRetry` match.
- [ ] Reads every retry implementation before checking imports or symbol identity.
- [ ] Assumes LSP is configured without saying how fallback would work if unavailable.
- [ ] Edits code or proposes a full implementation before locating the target symbol.

## Quality Criteria

- [ ] Navigation plan is narrow-to-broad and symbol-aware when tooling allows it.
- [ ] Fallback behavior preserves correctness without requiring a specific client feature.
- [ ] Response treats same-named symbols across packages as an ambiguity to resolve before editing.

## Baseline Comparison

Without symbol-aware navigation guidance, an agent may grep for `scheduleRetry`, open unrelated same-named files, and edit the wrong package in a large or multi-language repository.
