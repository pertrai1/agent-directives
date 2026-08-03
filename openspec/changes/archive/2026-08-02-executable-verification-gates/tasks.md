## 1. Schema Validation & Parsing

- [x] 1.1 Define `VerificationCommand` and add `verification` optional field to `ManifestEntry` interface in `src/manifest.ts`.
- [x] 1.2 Update `scripts/generate-manifest.ts` to parse, validate, and serialize `verification` fields from YAML frontmatter into `manifest.json`.
- [x] 1.3 Update `scripts/validate-directives.ts` to validate the structure of the `verification` frontmatter block during CLI check runs.
- [x] 1.4 Add structured `verification` metadata to at least one required directive (such as `directives/verification.md` or similar).

## 2. CLI `verify` Command Implementation

- [x] 2.1 Add the `verify` command to `src/cli.ts` via Commander.
- [x] 2.2 Implement a dependency-free, glob-to-regex path matcher inside `src/` to filter commands by modified files.
- [x] 2.3 Implement git changed-file detection logic using `git status --porcelain`.
- [x] 2.4 Implement gate execution coordinator that runs matched commands using `child_process` and prints reports.

## 3. Active Script Generation

- [x] 3.1 Implement `.agents/bin/verify` generation logic inside `src/install.ts`.
- [x] 3.2 Set file execution permissions (chmod `0o755`) on the written runner script inside `src/install.ts`.
- [x] 3.3 Ensure the `manifest` generation script updates the global `manifest.json`.

## 4. Verification and Quality Gates

- [x] 4.1 Run typecheck, lint, and unit test suites with `npm run check`.
- [x] 4.2 Validate the final diff and ensure all files are styled cleanly without trailing whitespaces.
- [x] 4.3 Generate a Changeset for release if needed.
