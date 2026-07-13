## ADDED Requirements

### Requirement: Specification precedes implementation
The routing system MUST require agents to create or identify a durable written specification before implementation or behavior-changing work begins. Specification depth MAY scale with task size, but specification presence MUST NOT be optional for implementation.

#### Scenario: Full Path implementation starts from a specification
- **WHEN** an agent routes a feature, bug fix, API addition, or other behavior-changing task to implementation
- **THEN** the agent loads specification-driven development and records the governing specification before RED/GREEN or implementation edits

#### Scenario: Small implementation uses proportional specification depth
- **WHEN** an implementation task is small and well understood
- **THEN** the agent records at least a brief durable proposal and atomic acceptance criteria before implementation rather than skipping specification entirely

#### Scenario: Non-behavioral Light Path remains lightweight
- **WHEN** a task is purely conversational or a non-behavioral typo, formatting, or metadata correction
- **THEN** the router MAY use Light Path framing without requiring a multi-document implementation specification

### Requirement: Router discovers specification and error memory
Adaptive routing SHALL route specification-driven development for every implementation or behavior-changing task and SHALL direct orientation to relevant `docs/ERRORS.md` entries through the error-memory directive when such entries exist.

#### Scenario: Cross-cutting feature loads both concerns
- **WHEN** an agent routes a cross-cutting feature in a repository with relevant error-memory entries
- **THEN** the route includes `directives/specification-driven-development.md` before implementation and `directives/error-memory.md` during orientation

### Requirement: Framing hands off deterministically to specification
Task framing SHALL act as the intake stage and SHALL use specification-driven development's Propose, Design, and Specify phases as the implementation contract instead of offering interchangeable proposal processes.

#### Scenario: Non-trivial implementation is framed once
- **WHEN** a non-trivial task requires a proposal before implementation
- **THEN** task framing establishes intake constraints and hands off to the specification-driven phases without producing a competing proposal template

### Requirement: Router exposes an early fast path
Adaptive routing SHALL present a condensed path-selection table before detailed workflow guidance so an agent can select Light Path without processing unrelated higher-risk path detail.

#### Scenario: Typo task stops at Light Path
- **WHEN** an agent receives a localized non-behavioral typo task
- **THEN** the early table identifies Light Path and permits the agent to skip detailed non-Light path sections

### Requirement: Handoff discovers existing state
Context handoff SHALL instruct agents to inspect the `.agents/` directory for existing handoff, verification, blocked-choice, risky-choice, and cleanup state before assuming a clean start, and SHALL include relevant error memory in orientation where applicable.

#### Scenario: Successor resumes with state files
- **WHEN** a successor session begins in a repository containing agent-state files
- **THEN** it lists or inspects the state directory before declaring the task state clean

### Requirement: Delegation accounts for coordination cost
Subagent-driven development SHALL provide a concrete default heuristic that skips delegation for tasks touching fewer than approximately three files or one clear function/section unless delegation has a specific risk-reduction benefit.

#### Scenario: Small edit remains with parent
- **WHEN** a task touches one clear function or section in fewer than approximately three files and has no specialist isolation need
- **THEN** the parent agent performs the task directly because prompt-writing and review overhead exceeds the expected benefit

### Requirement: Metadata and evals remain aligned
Every changed directive or skill SHALL receive the policy-appropriate version bump, `manifest.json` SHALL match source frontmatter, and focused scenario coverage SHALL exercise each new routing or orchestration behavior.

#### Scenario: Repository validation succeeds
- **WHEN** the change is complete
- **THEN** OpenSpec validation, scenario setup validation, manifest/version checks, repository checks, and whitespace checks pass without generated run artifacts left behind

### Requirement: Published guidance remains aligned
Published README and template guidance SHALL present the same spec-first
implementation gate as adaptive routing, so consumers who start from packaged
templates do not bypass the durable specification requirement.

#### Scenario: Consumer template starts from a specification
- **WHEN** an agent follows a packaged starter template for implementation or behavior-changing work
- **THEN** the template requires creating or identifying a durable written specification before type, test, or implementation phases begin
