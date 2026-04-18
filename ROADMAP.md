# Roadmap: Agent Directives

Implementation plan for extracting reusable directives, skills, and templates
from `eslint-plugin-llm-core` into this standalone collection.

**Source repo:** `/Users/robsimpson/Repos/eslint-plugin-llm-core`

---

## Phase 0 — Scaffolding

Create the directory structure. No content yet — just the bones.

| Task | Deliverable | Done |
|------|-------------|------|
| 0.1 | Create `directives/` directory | [x] |
| 0.2 | Create `skills/` directory | [x] |
| 0.3 | Create `templates/` directory | [x] |
| 0.4 | Create `docs/` directory | [x] |

**Verify:** All four directories exist. `ls -d directives/ skills/ templates/ docs/` succeeds.

---

## Phase 1 — Directives (7 files)

Each directive is adapted from a source file in
`eslint-plugin-llm-core/.agents/directives/`. Every file must:

- Be usable standalone (no prerequisites from other directives)
- Include a source-traceability comment at the top
- Contain zero project-specific content (no npm scripts, no ESLint references,
  no `src/rules/` paths, no external step-number references)
- Use generic descriptions where the source uses specific commands or paths

### 1.1 `directives/test-driven-development.md`

**Source:** `TEST_DRIVEN_DEVELOPMENT.md` (247 lines)

**Key adaptations:**
- Remove AGENTS.md step-number prerequisite callout → replace with "When to load" note
- Remove cross-reference to TYPE_DRIVEN_DEVELOPMENT.md in cycle diagram
- Replace `npm test && npm run lint && npm run build` with generic GATES description
- Remove `npm run update:eslint-docs` reference
- Keep verbatim: all 7 TDD rules, forbidden-patterns table, quick-reference table

**Acceptance criteria (from REQUIREMENTS §2.1):**
- [x] All 7 TDD rules present
- [x] Forbidden-patterns table present
- [x] Quick-reference table present
- [x] RED/GREEN/REFACTOR cycle description present
- [x] "TDD applies to fixes and review changes too" section present
- [x] No specific npm scripts
- [x] No AGENTS.md step numbers
- [x] No type-first prerequisite
- [x] GATES phase described generically

### 1.2 `directives/type-driven-development.md`

**Source:** `TYPE_DRIVEN_DEVELOPMENT.md` (150 lines)

**Key adaptations:**
- Remove AGENTS.md step-number reference
- Replace `tsc --noEmit` with generic type-check description (keep `tsc --noEmit` as example)
- Keep: define-verify-confirm-handoff flow, forbidden-patterns table, error-handling pattern, "when types are complex" confirmation gate

**Acceptance criteria (from REQUIREMENTS §2.2):**
- [x] 5-step type-first flow present
- [x] Forbidden-patterns table present
- [x] Error-handling pattern guidance present
- [x] "When types are complex" confirmation gate present
- [x] Type-check commands generic with TypeScript as example
- [x] No AGENTS.md step numbers
- [x] Hand-off references TDD generically (not a file path)

### 1.3 `directives/task-framing.md`

**Source:** `TASK_FRAMING.md` (107 lines)

**Key adaptations:**
- Remove AGENTS.md prerequisite callout
- Remove "Repo-Specific Triggers" section
- Remove "Supplemental References" links
- Generalize evidence-order hierarchy: replace `.agents/directives/` and `.github/instructions/` with generic descriptions

**Acceptance criteria (from REQUIREMENTS §2.3):**
- [x] 8-point framing checklist present
- [x] "When a proposal should precede implementation" section present
- [x] Evidence-order hierarchy with generic descriptions present
- [x] No specific project file paths
- [x] No AGENTS.md step numbers
- [x] No project-specific trigger list

### 1.4 `directives/error-memory.md`

**Source:** `ERROR_MEMORY.md` (147 lines)

**Key adaptations:**
- Remove AGENTS.md prerequisite callout
- Generalize "Can an ESLint rule catch it?" to "Can a linter rule, type guard, or CI check catch it?"
- Generalize CODEBASE_NAVIGATION phase name cross-reference to "during the codebase survey/orientation phase"
- Keep: 4-condition write criteria, file format, entry structure, monthly review, retirement, compaction pipeline

**Acceptance criteria (from REQUIREMENTS §2.4):**
- [x] 4-condition write criteria present
- [x] "When NOT to write" exclusion list present
- [x] Entry structure template present
- [x] Monthly review with retirement mechanism present
- [x] Compaction-pipeline integration present
- [x] Prevention strategies reference generic tooling
- [x] No AGENTS.md step numbers
- [x] Cross-references use descriptive phrases (not phase names)

### 1.5 `directives/session-decisions.md`

**Source:** `SESSION_DECISIONS.md` (164 lines)

**Key adaptations:**
- Remove AGENTS.md prerequisite callout
- Generalize "Repo-Specific Triggers" to generic "cross-cutting areas" description
- Keep: 4-condition write criteria, exclusion list, frontmatter schema, naming convention, template reference, progressive-disclosure workflow, forbidden-patterns table

**Acceptance criteria (from REQUIREMENTS §2.5):**
- [x] 4-condition write criteria present
- [x] "When NOT to write" exclusion list present
- [x] Complete frontmatter schema present
- [x] File-naming convention present (`docs/decisions/YYYY-MM-DD-<topic>.md`)
- [x] 5 required sections for each log entry present
- [x] Progressive-disclosure retrieval workflow present
- [x] Forbidden-patterns table present
- [x] No AGENTS.md step numbers
- [x] No specific project file paths

### 1.6 `directives/codebase-navigation.md`

**Source:** `CODEBASE_NAVIGATION.md` (269 lines) — most project-specific coupling

**Key adaptations:**
- Remove AGENTS.md prerequisite callout
- Keep SAFE pattern structure with token budgets
- Keep context-discipline rules (5 rules)
- Replace ALL ESLint-specific file-path examples with generic equivalents
- Remove "If the task is a new rule" section entirely
- Replace ast-grep references with generic AST-aware search note
- Keep forbidden-patterns table

**Acceptance criteria (from REQUIREMENTS §2.6):**
- [x] SAFE pattern with token budgets present
- [x] Context-discipline rules (5 rules) present
- [x] All file-path examples are generic
- [x] No ESLint-specific task checklists
- [x] Forbidden-patterns table present
- [x] Quick-reference table with generic descriptions present

### 1.7 `directives/verification.md`

**Source:** `VERIFICATION.md` (176 lines) — most heavily ESLint-specific

**Key adaptations:**
- Keep core concept (structured evidence, 30-second scan, PR output location)
- Replace ESLint-specific proof sections with generic framework:
  - Functional proof
  - Test coverage proof
  - Integration proof
  - Documentation proof (if applicable)
- Keep "For Bug Fixes" and "For Docs / Chore Changes" sections (generalize commands)
- Keep forbidden-patterns table

**Acceptance criteria (from REQUIREMENTS §2.7):**
- [x] Core concept (structured evidence, 30-second scan) present
- [x] PR output location requirement present
- [x] Generic proof framework with examples present
- [x] "For Bug Fixes" section present
- [x] "For Docs / Chore Changes" section present
- [x] Forbidden-patterns table present
- [x] No ESLint-specific proof sections
- [x] No specific npm commands (generic descriptions with examples marked as such)

---

## Phase 2 — Skills (1 file)

### 2.1 `skills/test-reviewer.md`

**Source:** `skills/test-reviewer.md` (237 lines)

**Key adaptations:** None. Copy verbatim.

**Acceptance criteria (from REQUIREMENTS §3.1):**
- [x] Content identical to source
- [x] No ESLint-specific references
- [x] Covers all 4 rules
- [x] Contains 6-step review process
- [x] Contains output format for flagged tests

---

## Phase 3 — Templates (4 files)

All templates use `<!-- FILL IN: description -->` placeholders. Templates are
the ONLY files that contain placeholders.

### 3.1 `templates/AGENTS.md`

**Source:** `AGENTS.md` from eslint-plugin-llm-core (125 lines)

**Structure to replicate:**
- Comment block at top explaining purpose and usage
- Why / What / Commands / Mandatory Workflow sections
- Commands table with placeholder rows (build, test, lint, + extra)
- Light Path table (4 steps: BASELINE → FIX → GATES → COMMIT)
- Full Path table (steps: ORIENT → BASELINE → TYPES → RED → GREEN → REFACTOR → VERIFY → GATES → COMMIT)
- Directives table listing all 7 directives with relative paths
- Skills table listing test-reviewer with relative path
- Task Framing section
- Decision Log Lookup section

**Acceptance criteria (from REQUIREMENTS §4.1):**
- [x] All source sections present
- [x] `grep -c "FILL IN"` returns ≥ 10
- [x] Light Path and Full Path tables present with step numbers
- [x] All 7 directives in Directives table
- [x] test-reviewer in Skills table
- [x] No ESLint-specific content
- [x] Comment block at top

### 3.2 `templates/CLAUDE.md`

**Structure:** Same as AGENTS.md but:
- Directives listed by name with one-line descriptions (not file-path table)
- Instruction: "Load the relevant directive from the directives/ directory before each task."

**Acceptance criteria (from REQUIREMENTS §4.2):**
- [x] Why, What, Commands, Mandatory Workflow sections present
- [x] Uses `<!-- FILL IN -->` placeholders
- [x] Directives listed by name with one-line descriptions
- [x] Light Path and Full Path tables present
- [x] No ESLint-specific content

### 3.3 `templates/copilot-instructions.md`

**Structure:** Condensed version. Key rules inlined (TDD, types first, no
skipping steps). Points to `directives/` for details.

**Acceptance criteria (from REQUIREMENTS §4.3):**
- [x] Light Path and Full Path tables present
- [x] Key rules summary present
- [x] References directives/ directory
- [x] Uses `<!-- FILL IN -->` placeholders
- [x] No ESLint-specific content

### 3.4 `templates/decision-log.md`

**Structure:** Blank template matching frontmatter schema and 5 required sections
from session-decisions.md.

**Acceptance criteria (from REQUIREMENTS §4.4):**
- [x] Full frontmatter schema present
- [x] All 5 required sections with placeholder guidance present
- [x] No real decision content — all placeholder text is clearly instructional

---

## Phase 4 — README

### 4.1 `README.md`

**Structure:**
1. What this is (one paragraph)
2. What's included (table: Workflow / Navigation / Memory / Skills)
3. Quick start (5 steps)
4. Directive details (2-3 sentences each)
5. Customization guidance
6. Tool compatibility note

**Acceptance criteria (from REQUIREMENTS §5):**
- [x] Answers what / included / how-to-use
- [x] Directive/skill summary table present
- [x] 5-step quick-start present
- [x] Customization guidance present
- [x] Tool-compatibility note present
- [x] Under 200 lines

---

## Phase 5 — Cross-Cutting Verification

Run after all content is in place.

### 5.1 No Circular Dependencies

- [x] `grep -rn "Prerequisite: Load" directives/` returns zero matches
- [x] Every "When to load" section describes task context (not workflow step numbers)

### 5.2 No Project-Specific Content

- [x] `grep -rn "npm run" directives/ skills/` returns zero matches
- [x] `grep -rn "src/rules\|src/index\|createRule\|eslint-docs" directives/ skills/` returns zero matches
- [x] `grep -rn "Step [0-9]" directives/ skills/` returns zero matches (code-example comments only)
- [x] Technology names only appear as examples with context

### 5.3 Placeholder Convention

- [x] All templates use `<!-- FILL IN: description -->` consistently
- [x] `grep -c "FILL IN" templates/AGENTS.md` returns ≥ 10
- [x] Every placeholder includes a description

### 5.4 Source Traceability

- [x] Source traceability removed per project preference (no external repo references in shipped files)
- [x] Files are self-contained with no prerequisite comments

---

## Dependency Order

```
Phase 0 (scaffolding)     ← no dependencies, do first
  │
  ├── Phase 1 (directives) ← all 7 can be done in parallel
  ├── Phase 2 (skills)     ← independent, can parallel with Phase 1
  │
  ├── Phase 3 (templates)  ← depends on Phase 1 (needs directive names/paths)
  ├── Phase 4 (README)     ← depends on Phase 1 + 2 (needs summary of all content)
  │
  └── Phase 5 (verification) ← depends on everything above
```

**Parallelizable groups:**
- Group A (do together): Phase 0 → Phase 1 + Phase 2
- Group B (after Group A): Phase 3 + Phase 4
- Group C (after Group B): Phase 5

---

## Effort Estimates

| Phase | Files | Complexity | Notes |
|-------|-------|------------|-------|
| 0 | 0 files (dirs only) | Trivial | `mkdir -p` |
| 1.1–1.5 | 5 directives | Moderate | Remove project coupling, keep structure |
| 1.6 | 1 directive | High | Most ESLint-specific — heavy rewrite of examples |
| 1.7 | 1 directive | High | Heavily ESLint-specific — replace proof framework |
| 2.1 | 1 skill | Trivial | Verbatim copy |
| 3.1 | 1 template | Moderate | Structure from source, fill with placeholders |
| 3.2–3.3 | 2 templates | Low | Adapt AGENTS.md template, remove directive tables |
| 3.4 | 1 template | Low | Extract schema from session-decisions.md |
| 4.1 | 1 README | Moderate | Summarize everything, stay under 200 lines |
| 5.1–5.4 | Verification | Low | `grep` checks, fix any failures |

**Highest-risk items:** §1.6 (codebase-navigation) and §1.7 (verification) —
these have the most project-specific content to strip while preserving value.
