<!--
Thanks for contributing. Pick the section(s) that fit your change and delete the rest.
The CI pipeline runs typecheck, validate, manifest-drift, and CLI tests — make sure
they pass locally before requesting review.
-->

## Summary

<!-- 1–3 sentences. What changed and why. Link any related issues. -->

## Type of change

- [ ] New directive
- [ ] New skill
- [ ] Edit to existing directive or skill
- [ ] New template
- [ ] New eval scenario
- [ ] CLI / tooling change
- [ ] Docs only

## Pre-merge checklist

- [ ] `npm run typecheck` passes
- [ ] `npm run validate` passes
- [ ] `npm run manifest` produced no diff (or the regenerated manifest is committed)
- [ ] `npm run test:cli` passes
- [ ] Adaptive routing (`directives/adaptive-routing.md`) updated if a new skill was added
- [ ] README or CONTRIBUTING updated if the public surface changed

## Test plan

<!--
Bullet what you ran locally and what you verified by hand.
Example:
- npm run check
- npm run cli -- sync --tool claude --yes in a scratch project; confirmed expected files appear
-->
