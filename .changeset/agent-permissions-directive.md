---
"agent-directives": minor
---

Add `directives/agent-permissions.md` — a portable advisory directive defining agent read/write/command/network permission boundaries, protected file categories, risky command categories, denied-until-explicit actions, and escalation/blocked-work reporting protocols. Route it conditionally via adaptive routing when work touches protected files, risky commands, package manager operations, deploys, infra, secrets, CI, or repo policy.
