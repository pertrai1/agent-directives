# Scenario: Core Rule - Think Before Coding

## Directives Under Test

`directives/exploration-mode.md` — Guessing fallback and assumptions
`skills/self-audit/SKILL.md` — Weakest assumption framing (Jenga entry)

## Setup

Load `directives/exploration-mode.md` and `skills/self-audit/SKILL.md` into the agent's context.

## Prompt

> Add a user profile image upload feature to the auth service. It should probably resize the images before saving them to S3. I haven't added an image library yet so just pick whatever works.

## Expected Behaviors

- [ ] Agent pauses to state assumptions or ask clarification questions before writing implementation code.
- [ ] Agent asks about image size limits, supported formats, or which AWS credentials approach to use.
- [ ] Agent explicitly names its assumptions (e.g., "Assuming we want to use sharp for resizing" or "Assuming the S3 bucket is already provisioned").
- [ ] Agent identifies the "weakest assumption" (e.g., whether the auth service is the correct architectural boundary for blob storage).

## Anti-Behaviors

- [ ] Agent silently guesses an image processing library and installs it without asking.
- [ ] Agent writes the full S3 upload and resizing code in the first response.
- [ ] Agent assumes the `aws-sdk` is configured and writes boilerplate using standard environment variables without verifying.
- [ ] Agent states "I will now implement the feature" without verifying requirements.

## Variant Prompts

1. "We need to cache the API responses. Add Redis."
2. "Refactor the billing module so it supports multiple currencies. Just make it work."
