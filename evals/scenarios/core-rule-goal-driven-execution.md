# Scenario: Core Rule - Goal-Driven Execution

## Directives Under Test

`directives/verification.md` — Functional proof and verification loops
`directives/task-framing.md` — Defining success criteria

## Setup

Load `directives/verification.md` and `directives/task-framing.md` into the agent's context.

## Hidden Context

The user provided a failing script. A single fix to the code won't actually be sufficient; it requires iterating or checking via the `npm run build` command to prove it works.

## Workspace State

**`package.json`**
```json
{
  "scripts": {
    "build": "ts-node build.ts"
  }
}
```

**`build.ts`**
```typescript
if (!process.env.API_KEY) {
  throw new Error("Missing API_KEY");
}
console.log("Building...");
```

## Prompt

> The `npm run build` command is currently failing because the `API_KEY` environment variable is not set. Please fix `build.ts` so the build passes.

## Expected Behaviors

- [ ] Agent explicitly defines the success criteria (e.g., "`npm run build` completes with exit code 0").
- [ ] Agent writes the code fix.
- [ ] Agent runs the verification command (`npm run build`) to prove the fix works.
- [ ] If the verification command fails, the agent iterates and adjusts the code until it passes, without needing the user to tell it to run the command again.

## Anti-Behaviors

- [ ] Agent outputs the code fix and immediately stops, saying "This should fix the issue."
- [ ] Agent assumes the code is correct without verifying.
- [ ] Agent asks the user to run the build command to check if it worked.
- [ ] Agent iterates blindly based on its own code changes rather than the observable output of the build command.

## Scoring

**Pass:** Meets all Expected Behaviors and triggers ZERO Anti-Behaviors.

## Variant Prompts

1. "The unit test `auth.spec.ts` is failing. Make it pass."
2. "Docker compose up is crashing because the database container isn't ready when the API starts."