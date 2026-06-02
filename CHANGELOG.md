# agent-directives

## 0.5.0

### Minor Changes

- [#53](https://github.com/pertrai1/agent-directives/pull/53) [`90de630`](https://github.com/pertrai1/agent-directives/commit/90de630424a227021ad9acf4dfaca099d368204c) Thanks [@pertrai1-bot](https://github.com/pertrai1-bot)! - Introduce Python rules pack (coding-style, patterns, project-structure, security, testing) and update adaptive routing to lazily load rules on Python workspaces.

## 0.4.3

### Patch Changes

- [#51](https://github.com/pertrai1/agent-directives/pull/51) [`dfaa2a9`](https://github.com/pertrai1/agent-directives/commit/dfaa2a984bb5b6e9d87fcfc1c4be3d6e72494fc9) Thanks [@pertrai1](https://github.com/pertrai1)! - Clarify adaptive routing so installed rule frontmatter is authoritative when a target repo does not include the package manifest.

## 0.4.2

### Patch Changes

- [#49](https://github.com/pertrai1/agent-directives/pull/49) [`c3f67dc`](https://github.com/pertrai1/agent-directives/commit/c3f67dc2d7032a6b17697ef1b3cc37e6ff7d3402) Thanks [@pertrai1](https://github.com/pertrai1)! - Clarify AGENTS.md path references and make GitNexus instructions conditional on repositories that use GitNexus.

## 0.4.1

### Patch Changes

- [#46](https://github.com/pertrai1/agent-directives/pull/46) [`39c12f3`](https://github.com/pertrai1/agent-directives/commit/39c12f3a691968f3958c855e982d5a2e05cc9991) Thanks [@pertrai1-bot](https://github.com/pertrai1-bot)! - Link raw official Angular developer references directly into the Angular rule pack to support lightweight, on-demand reference loading.

## 0.4.0

### Minor Changes

- [#44](https://github.com/pertrai1/agent-directives/pull/44) [`d297d33`](https://github.com/pertrai1/agent-directives/commit/d297d33f71115e53576d36e960c3dfd644608ddd) Thanks [@pertrai1](https://github.com/pertrai1)! - Expand the Angular rule pack with new security, coding-style, and patterns rules, and flesh out the existing components-and-templates, project-structure, and testing rules.

  Switch the adaptive-routing directive from an inline per-rule table to manifest-driven rule discovery, so rule packs no longer add always-loaded routing metadata as they grow. Surface each entry's `applies_to` file globs in `manifest.json` to make it a self-sufficient discovery index.

## 0.3.0

### Minor Changes

- [#42](https://github.com/pertrai1/agent-directives/pull/42) [`797aeab`](https://github.com/pertrai1/agent-directives/commit/797aeabcd8549be6315206bda186e09e61d96a53) Thanks [@pertrai1-bot](https://github.com/pertrai1-bot)! - Add lazy-loaded rule entries and an initial Angular rule pack with CLI auto-detection support.

## 0.2.1

### Patch Changes

- [#40](https://github.com/pertrai1/agent-directives/pull/40) [`eafd548`](https://github.com/pertrai1/agent-directives/commit/eafd548a35a2b4e698ec5941e977bb349d6d4aae) Thanks [@pertrai1-bot](https://github.com/pertrai1-bot)! - Update README commands now that the package is published on npm.

## 0.2.0

### Minor Changes

- [#38](https://github.com/pertrai1/agent-directives/pull/38) [`b1978fc`](https://github.com/pertrai1/agent-directives/commit/b1978fc142702b22cfc8c8fd7648c24bd1fe6627) Thanks [@pertrai1-bot](https://github.com/pertrai1-bot)! - Add npm package release setup with Changesets, built CLI output, package pack verification, and GitHub Actions release automation.
