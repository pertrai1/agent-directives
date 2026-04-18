# Requirements: Agent Directives

**NOTE**: all of the files needed to start the directives are located at /Users/robsimpson/Repos/eslint-plugin-llm-core.

A reusable collection of directives, skills, and templates that give coding
agents disciplined TDD workflows, structured codebase navigation, persistent
error memory, and durable decision logging. Extracted from production use in
an ESLint plugin repo. Designed for copy-configure-run adoption in any
TypeScript project.

---

## 1. Directory Structure

### Requirements

- The repo MUST contain a `directives/` directory with one markdown file per
  directive.
- The repo MUST contain a `skills/` directory with one markdown file per skill.
- The repo MUST contain a `templates/` directory with starter files for
  project-level configuration.
- The repo MUST contain a `docs/` directory with usage instructions.
- Each directive file MUST be usable on its own — agents load individual files,
  not the entire collection.
- No files outside `templates/` may contain `{{PLACEHOLDER}}` markers. Directives
  must be complete and usable as-shipped.

### Acceptance Criteria

- [ ] `ls directives/` shows 7 files (one per directive)
- [ ] `ls skills/` shows at least `test-reviewer.md`
- [ ] `ls templates/` shows `AGENTS.md`, `CLAUDE.md`, and
  `copilot-instructions.md` templates
- [ ] No `{{PLACEHOLDER}}` text in any file under `directives/` or `skills/`
- [ ] Every file under `directives/` can be read and followed without reading
  any other directive first (cross-references are "see also", not prerequisites)

---

## 2. Directives

### 2.1 test-driven-development.md

**Source:** `.agents/directives/TEST_DRIVEN_DEVELOPMENT.md` from
eslint-plugin-llm-core.

**What changes from source:**

- Remove the "Prerequisite: This directive runs at Step 2 of the mandatory
  workflow. See AGENTS.md." callout. Replace with a brief "When to load" note
  (e.g., "Load this directive before writing or modifying any implementation
  code.").
- Remove the cross-reference to `TYPE_DRIVEN_DEVELOPMENT.md` in the cycle
  diagram and step-by-step process. The TDD directive must stand alone — type
  dependencies are a project-level choice, not a TDD requirement.
- Replace `npm test && npm run lint && npm run build` with a generic GATES
  description: "Run the project's full quality-gate command suite (test, lint,
  build/type-check). The specific commands depend on the project."
- Remove the `npm run update:eslint-docs` reference. That's project-specific.
- Keep all rules (no implementation without failing test, one test at a time,
  minimum code to pass, no refactor during GREEN, no skipping RED, no
  retrofitting) verbatim — these are the high-value content.
- Keep the forbidden-patterns table and quick-reference table.

**Acceptance Criteria:**

- [ ] Contains all 7 TDD rules from the source
- [ ] Contains the forbidden-patterns table
- [ ] Contains the quick-reference table
- [ ] Contains the RED/GREEN/REFACTOR cycle description
- [ ] Contains the "TDD applies to fixes and review changes too" section
- [ ] No references to specific npm scripts (build, test, lint, eslint-docs)
- [ ] No references to AGENTS.md step numbers
- [ ] No prerequisite that types must be defined first (that belongs in
  type-driven-development, not here)
- [ ] GATES phase described generically, not with specific commands

### 2.2 type-driven-development.md

**Source:** `.agents/directives/TYPE_DRIVEN_DEVELOPMENT.md` from
eslint-plugin-llm-core.

**What changes from source:**

- Remove the AGENTS.md step-number reference.
- Replace specific `tsc --noEmit` references with a generic type-check
  description. Include `tsc --noEmit` as an example for TypeScript projects.
- Keep the define-verify-confirm-handoff flow.
- Keep the forbidden-patterns table.
- Keep the error-handling pattern (discriminated unions vs null).
- Keep the "when types are complex" user-confirmation gate.

**Acceptance Criteria:**

- [ ] Contains the 5-step type-first flow (check, define, verify, confirm, hand off)
- [ ] Contains the forbidden-patterns table (no `any`, no `Function`, etc.)
- [ ] Contains the error-handling pattern guidance
- [ ] Contains the "when types are complex" confirmation gate
- [ ] Type-check commands described generically with TypeScript as an example
- [ ] No references to AGENTS.md step numbers
- [ ] Hand-off section references TDD generically, not a specific file path

### 2.3 task-framing.md

**Source:** `.agents/directives/TASK_FRAMING.md` from eslint-plugin-llm-core.

**What changes from source:**

- Remove the AGENTS.md prerequisite callout.
- Remove the "Repo-Specific Triggers" section (that's project-specific).
- Remove the "Supplemental References" links (those files won't exist in other
  projects).
- Keep the 8-point minimum framing checklist verbatim.
- Keep the "When a proposal should precede implementation" section.
- Keep the evidence-order hierarchy (adapted: remove project-specific file paths,
  keep the concept of repo-internal evidence before external docs).
- Generalize the evidence order to remove specific file paths like
  `.agents/directives/` and `.github/instructions/`. Use generic descriptions:
  "project-level instructions (AGENTS.md, CLAUDE.md, or equivalent)" and
  "scoped instructions for the area you're working in."

**Acceptance Criteria:**

- [ ] Contains the 8-point framing checklist (problem, success criteria,
  constraints, definitions, assumptions, failure modes, alternatives, evidence
  plan)
- [ ] Contains the "when a proposal should precede implementation" section
- [ ] Contains the evidence-order hierarchy with generic descriptions
- [ ] No references to specific project file paths
- [ ] No references to AGENTS.md step numbers
- [ ] No project-specific trigger list

### 2.4 error-memory.md

**Source:** `.agents/directives/ERROR_MEMORY.md` from eslint-plugin-llm-core.

**What changes from source:**

- Remove the AGENTS.md prerequisite callout.
- In the prevention strategies, generalize "Can an ESLint rule catch it?" to
  "Can a linter rule, type guard, or CI check catch it?"
- Keep the write criteria (4 conditions), the file format, the entry structure,
  the monthly review process, and the retirement mechanism.
- Keep the compaction-pipeline integration.
- Generalize the cross-reference to CODEBASE_NAVIGATION.md to say "during
  the codebase survey/orientation phase" instead of "during the Anchor phase
  of CODEBASE_NAVIGATION" — the phase name is specific to the SAFE pattern.

**Acceptance Criteria:**

- [ ] Contains the 4-condition write criteria
- [ ] Contains the "when NOT to write" exclusion list
- [ ] Contains the entry structure template (Error, Frequency, Severity,
  Symptom, Bad Pattern, Correct Pattern, Prevention)
- [ ] Contains the monthly review process with retirement mechanism
- [ ] Contains the compaction-pipeline integration checklist
- [ ] Prevention strategies reference generic tooling (linter, type guard, CI)
  not specific ESLint rules
- [ ] No references to AGENTS.md step numbers
- [ ] Cross-references to other directives use descriptive phrases, not
  specific phase names that only make sense after reading another directive

### 2.5 session-decisions.md

**Source:** `.agents/directives/SESSION_DECISIONS.md` from
eslint-plugin-llm-core.

**What changes from source:**

- Remove the AGENTS.md prerequisite callout.
- Keep the write criteria (4 conditions), the "when NOT to write" section, the
  frontmatter schema, the file-naming convention, the template reference, and
  the progressive-disclosure retrieval workflow.
- The decision-log template file should be included in `templates/` as
  `decision-log.md`.
- Generalize the "Repo-Specific Triggers" section: replace specific file paths
  with a generic description of "cross-cutting areas that create durable
  conventions."
- Keep the forbidden-patterns table.

**Acceptance Criteria:**

- [ ] Contains the 4-condition write criteria
- [ ] Contains the "when NOT to write" exclusion list
- [ ] Contains the complete frontmatter schema (date, task, domain, kind, scope,
  status, triggers, applies_to, supersedes)
- [ ] Contains the file-naming convention (`docs/decisions/YYYY-MM-DD-<topic>.md`)
- [ ] Contains the 5 required sections for each log entry (Title, Context,
  Decision, Rejected Alternatives, Consequences)
- [ ] Contains the progressive-disclosure retrieval workflow
- [ ] Contains the forbidden-patterns table
- [ ] No references to AGENTS.md step numbers
- [ ] A corresponding `templates/decision-log.md` exists with the blank template
- [ ] No references to specific project file paths

### 2.6 codebase-navigation.md

**Source:** `.agents/directives/CODEBASE_NAVIGATION.md` from
eslint-plugin-llm-core.

**What changes from source:**

This directive has the most project-specific coupling. The SAFE pattern
(Survey → Anchor → Filter → Execute) and the token-budget discipline are the
high-value generic content. The file-path examples and specific grep commands
are ESLint-plugin-specific.

- Remove the AGENTS.md prerequisite callout.
- Keep the SAFE pattern structure (Survey, Anchor, Filter, Execute) with token
  budgets.
- Keep the context-discipline rules (read by slice, grep before cat, summarize
  between tasks, compact after 5+ tasks).
- Keep the compaction → session-decisions pipeline integration.
- Replace all ESLint-specific file-path examples with generic equivalents.
  Use placeholder-style examples that illustrate the *kind* of thing to look
  for, not specific paths:
  - `src/index.ts → public API` becomes a description: "the project's entry
    point — main export file, router, or public API surface"
  - `src/rules/no-empty-catch.ts` becomes "a representative source file in
    the area you're working in"
  - `grep "createRule" src/rules/rule.ts` becomes
    `grep "export.*function\|export.*const\|export type" path/to/file.ts`
- Remove the "If the task is a new rule" section entirely — that's a
  project-specific checklist that belongs in a project's own instructions, not
  a generic directive.
- Replace the ast-grep references with a generic note: "If your project uses
  AST-aware search tools (e.g., ast-grep), prefer those over regex for
  structural queries."
- Keep the forbidden-patterns table.

**Acceptance Criteria:**

- [ ] Contains the SAFE pattern (Survey, Anchor, Filter, Execute) with token
  budgets (~2K, ~3K, ~2-5K)
- [ ] Contains the context-discipline rules (5 rules: read by slice, grep
  before cat, summarize between tasks, compact after 5+, compact → decisions
  pipeline)
- [ ] All file-path examples are generic or illustrative — no references to
  `src/rules/`, `no-empty-catch`, `createRule`, or other ESLint-specific paths
- [ ] No ESLint-plugin-specific task checklists (new-rule file list)
- [ ] Contains the forbidden-patterns table
- [ ] Contains the quick-reference table with generic descriptions

### 2.7 verification.md

**Source:** `.agents/directives/VERIFICATION.md` from eslint-plugin-llm-core.

**What changes from source:**

This is the most heavily ESLint-specific directive. The Detection Proof and
Contract Proof sections are entirely about ESLint rules. The generic core is
the concept of structured verification evidence before merging, and the PR
output format.

- Keep the core concept: structured evidence that a reviewer can scan in 30
  seconds, produced after REFACTOR and before GATES.
- Keep the PR output location requirement (verification summary in PR body).
- Keep the forbidden-patterns table (generic: "tests pass, ship it" etc.).
- Replace the ESLint-specific proof sections with a generic framework. Instead
  of "Detection Proof / Test Coverage Proof / Contract Proof / Docs Proof",
  provide a template structure:
  - **Functional proof** — demonstrate the change does what it claims (hit and
    clean-pass, or equivalent)
  - **Test coverage proof** — list passing test cases grouped by category
  - **Integration proof** — confirm the change is wired into the project
    correctly (exports, config, registration)
  - **Documentation proof** (if applicable) — confirm docs are updated
- Each proof section should include an example but clearly mark it as an
  example that projects should adapt.
- The "For Bug Fixes" and "For Docs / Chore Changes" sections are nearly
  generic already — keep them, replacing specific commands with generic ones.

**Acceptance Criteria:**

- [ ] Contains the core concept (structured evidence, 30-second scan)
- [ ] Contains the PR output location requirement
- [ ] Contains the generic proof framework (functional, test coverage,
  integration, documentation) with examples
- [ ] Contains the "For Bug Fixes" verification section
- [ ] Contains the "For Docs / Chore Changes" verification section
- [ ] Contains the forbidden-patterns table
- [ ] No ESLint-specific proof sections (Detection Proof with eslint CLI,
  Contract Proof with meta.docs.url, Docs Proof with update:eslint-docs)
- [ ] No specific npm commands — generic descriptions with project-specific
  examples marked as such

---

## 3. Skills

### 3.1 test-reviewer.md

**Source:** `skills/test-reviewer.md` from eslint-plugin-llm-core.

**What changes from source:**

Nothing. This skill is already fully generic. Copy verbatim.

**Acceptance Criteria:**

- [ ] Content is identical to the source file
- [ ] No ESLint-specific references
- [ ] Covers all 4 rules: no implementation mirroring, strong assertions, edge
  cases required, behavior over mocks
- [ ] Contains the review process (6-step checklist)
- [ ] Contains the output format for flagged tests

---

## 4. Templates

### 4.1 AGENTS.md template

**Purpose:** A starter AGENTS.md that projects copy and fill in with their own
commands, tech stack, and scope.

**Requirements:**

- Must include the same section structure as the source AGENTS.md: Why, What,
  Commands, Mandatory Workflow (Light Path and Full Path), Directives, Skills,
  Task Framing, Decision Log Lookup.
- Must use clearly marked placeholders for project-specific values. Use the
  convention `<!-- FILL IN: description -->` so they're visible in rendered
  markdown and easy to find with grep.
- The Commands table must have placeholder rows for build, test, lint, and at
  least one extra row for project-specific commands.
- The Mandatory Workflow must include both Light Path and Full Path tables.
  Step numbers and phase names are fixed. Command placeholders use the
  `<!-- FILL IN -->` convention.
- The Directives table must list all 7 directives with relative paths
  (e.g., `directives/test-driven-development.md`).
- The Skills table must list test-reviewer with a relative path.
- The Full Path must include ORIENT (referencing codebase-navigation), BASELINE,
  TYPES (referencing type-driven-development), RED, GREEN, REFACTOR, VERIFY
  (referencing verification), GATES, and COMMIT steps.
- Must include a comment block at the top explaining what this file is and how
  to use it.

**Acceptance Criteria:**

- [ ] Contains all sections from the source AGENTS.md
- [ ] All project-specific values use `<!-- FILL IN: description -->` markers
- [ ] `grep -c "FILL IN" templates/AGENTS.md` returns at least 10 markers
- [ ] Light Path and Full Path tables are present with step numbers
- [ ] All 7 directives referenced in the Directives table
- [ ] test-reviewer referenced in the Skills table
- [ ] No ESLint-specific content (no rules, no createRule, no eslint-docs)
- [ ] Comment block at top explains purpose and usage

### 4.2 CLAUDE.md template

**Purpose:** A CLAUDE.md (for Claude Code) with the same content structure as
the AGENTS.md template but without the directive cross-reference tables. Claude
Code loads CLAUDE.md as a single context block, so directive references should
be inline instructions rather than file links.

**Requirements:**

- Same Why, What, Commands, Mandatory Workflow structure as AGENTS.md template.
- Same `<!-- FILL IN -->` placeholder convention.
- Instead of a Directives table, include a "Directives" section that says
  "Load the relevant directive from the directives/ directory before each task."
  List the 7 directives by name with one-line descriptions.
- Light Path and Full Path tables identical to AGENTS.md template.

**Acceptance Criteria:**

- [ ] Contains Why, What, Commands, Mandatory Workflow sections
- [ ] Uses `<!-- FILL IN -->` placeholders
- [ ] Directives listed by name with one-line descriptions (not file-path
  tables)
- [ ] Light Path and Full Path tables present
- [ ] No ESLint-specific content

### 4.3 copilot-instructions.md template

**Purpose:** A `.github/copilot-instructions.md` template. Copilot loads this
automatically and doesn't support directive references, so key workflow rules
must be inlined.

**Requirements:**

- Condensed version of the workflow. Focus on what Copilot needs to know
  immediately: mandatory workflow steps, key rules (TDD, types first, no
  skipping steps).
- Must include the Light Path and Full Path tables.
- Must include a note pointing to the `directives/` directory for detailed
  guidance on each phase.
- Same `<!-- FILL IN -->` placeholder convention for commands and tech stack.

**Acceptance Criteria:**

- [ ] Contains Light Path and Full Path tables
- [ ] Contains key rules summary (TDD, types first, verification before merge)
- [ ] References directives/ directory for detailed guidance
- [ ] Uses `<!-- FILL IN -->` placeholders for commands
- [ ] No ESLint-specific content

### 4.4 decision-log.md template

**Purpose:** Blank template for decision log entries, matching the frontmatter
schema and section structure from session-decisions.md.

**Requirements:**

- Must contain the complete YAML frontmatter schema with placeholder values.
- Must contain all 5 required sections (Title, Context, Decision, Rejected
  Alternatives, Consequences).
- Must include inline instructions (in comments) for each section explaining
  what to write.

**Acceptance Criteria:**

- [ ] Contains the full frontmatter schema from session-decisions.md
- [ ] Contains all 5 required sections with placeholder guidance
- [ ] No content that looks like a real decision — all placeholder text is
  clearly instructional

---

## 5. README

**Requirements:**

The README is the entry point. It must answer three questions for someone
considering adoption: what this is, what's included, and how to use it.

**Content:**

1. **What this is** — A collection of agent directives, skills, and templates
   extracted from production use. One paragraph. No hype.
2. **What's included** — A table listing each directive and skill with a
   one-line description. Grouped by category:
   - Workflow (TDD, type-first, verification)
   - Navigation (codebase navigation, task framing)
   - Memory (error memory, session decisions)
   - Skills (test reviewer)
3. **Quick start** — Step-by-step instructions:
   1. Copy `templates/AGENTS.md` (or CLAUDE.md or copilot-instructions.md) to
      your project root.
   2. Fill in the `<!-- FILL IN -->` placeholders with your project's commands
      and tech stack.
   3. Copy the `directives/` directory to your project
      (`.agents/directives/` is the conventional location).
   4. Copy the `skills/` directory to your project (`skills/` or
      `.agents/skills/`).
   5. Copy `templates/decision-log.md` to `docs/decisions/TEMPLATE.md` in your
      project.
4. **Directive details** — For each directive, a 2-3 sentence summary of what
   it governs and when to load it. Not the full content — just enough to decide
   if it's relevant.
5. **Customization** — A section explaining that directives are designed to be
  used as-shipped, but projects may want to:
  - Add project-specific examples to codebase-navigation.md
  - Add project-specific proof sections to verification.md
  - Add the project's own scoped instructions alongside the directives
6. **Tool compatibility** — A brief note on which tools each template targets:
  - `AGENTS.md` → OpenCode, generic agents
  - `CLAUDE.md` → Claude Code
  - `copilot-instructions.md` → GitHub Copilot
  - Directives are tool-agnostic — any agent that can read markdown files can
    use them.

**Acceptance Criteria:**

- [ ] Answers what this is, what's included, and how to use it
- [ ] Contains the directive/skill summary table
- [ ] Contains the 5-step quick-start instructions
- [ ] Contains the customization guidance
- [ ] Contains the tool-compatibility note
- [ ] README is under 200 lines

---

## 6. Cross-Cutting Requirements

### 6.1 No Circular Dependencies

Directives MUST NOT require each other to be loaded in a specific order. Each
directive must be usable independently. Cross-references are "see also" — they
add context but are not prerequisites.

**Acceptance Criteria:**

- [ ] No directive contains "Prerequisite: Load X before this directive"
- [ ] Every directive's "When to load" section describes the task context, not
  a workflow step number from another document

### 6.2 No Project-Specific Content

No file under `directives/` or `skills/` may contain:

- Specific npm script names (`npm run build`, `npm test`, `npm run lint`)
- Specific file paths (`src/rules/`, `src/index.ts`, `docs/rules/`)
- Specific technology references (ESLint, vitest, createRule, prettier)
- Specific workflow step numbers referencing an external document

Technology names MAY appear as examples (e.g., "For TypeScript projects, run
`tsc --noEmit`") but must be clearly marked as examples, not requirements.

**Acceptance Criteria:**

- [ ] `grep -rn "npm run" directives/ skills/` returns zero matches
- [ ] `grep -rn "src/rules\|src/index\|createRule\|eslint-docs" directives/ skills/`
  returns zero matches
- [ ] `grep -rn "Step [0-9]" directives/ skills/` returns zero matches (no
  external step references)
- [ ] Technology names appear only as examples with context
  ("For TypeScript projects...", "If using vitest...")

### 6.3 Placeholder Convention

All project-specific values in templates MUST use the convention:

```
<!-- FILL IN: description of what to put here -->
```

This renders as invisible in most markdown viewers (good for agents that read
raw markdown, easy to find with grep).

**Acceptance Criteria:**

- [ ] All templates use `<!-- FILL IN -->` consistently
- [ ] `grep -c "FILL IN" templates/AGENTS.md` returns ≥ 10
- [ ] Every placeholder includes a description, not just `<!-- FILL IN -->`

### 6.4 Source Traceability

Every directive and skill must include a comment at the top (HTML comment, not
rendered markdown) noting its origin:

```
<!--
Source: eslint-plugin-llm-core .agents/directives/X.md
Last synced: YYYY-MM-DD
Adaptations: [list of changes from source]
-->
```

This helps future maintainers know what changed from the original and when.

**Acceptance Criteria:**

- [ ] Every file in `directives/` and `skills/` has a source-traceability
  comment at the top
- [ ] Comment includes source path, last-synced date, and list of adaptations
