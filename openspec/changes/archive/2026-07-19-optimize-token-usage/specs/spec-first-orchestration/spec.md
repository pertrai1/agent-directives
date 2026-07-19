## MODIFIED Requirements

### Requirement: Router exposes an early fast path
Adaptive routing SHALL keep its required bootstrap at or below 12 KB, present a condensed path-selection table before detailed workflow guidance, and use progressive disclosure so obvious Light, Review, and Exploration tasks do not require the detailed routing reference. The router SHALL retain compact safety/composition rules and SHALL load installed detailed guidance or equivalent manifest metadata for ambiguous, composite, or high-risk routes.

#### Scenario: Typo task stops at Light Path
- **WHEN** an agent receives a localized non-behavioral typo task
- **THEN** the compact bootstrap identifies Light Path and permits the agent to skip detailed non-Light path guidance

#### Scenario: Composite risk loads detailed routing guidance
- **WHEN** an agent receives a task combining debugging, boundary changes, and production-sensitive behavior
- **THEN** the compact bootstrap selects all applicable paths and loads the detailed routing reference or equivalent metadata before implementation

## ADDED Requirements

### Requirement: Small Batch eligibility is bounded
Adaptive routing SHALL treat Small Batch as an orchestration-amortization modifier, SHALL preserve mandatory Debugging behavior and Workspace Isolation, and SHALL select it only for two to five related low-risk behavioral fixes that share one subsystem and coherent outcome or root cause, fit one reversible change, and avoid every Boundary, Policy, and Production trigger, including internal imports/exports, shared utilities/modules, dependency direction, security, authentication, privacy, persistence, schema migration, external services, public APIs, package boundaries, deployment, and infrastructure.

#### Scenario: Related low-risk fixes use Small Batch
- **WHEN** an agent receives three related behavioral fixes in one subsystem that satisfy every eligibility criterion
- **THEN** the router selects Small Batch and records the fixes as one bounded implementation unit

#### Scenario: Inclusive count boundaries are eligible
- **WHEN** an agent receives exactly two or exactly five related low-risk fixes and every other eligibility criterion passes
- **THEN** the router may select Small Batch

#### Scenario: Counts outside the bound are rejected
- **WHEN** an agent receives one fix or six or more fixes
- **THEN** the router rejects Small Batch and selects the applicable existing path

#### Scenario: Risky or unrelated fixes escalate
- **WHEN** any proposed batch fix is unrelated, changes internal imports/exports or shared utilities/modules, changes dependency direction, crosses a public/package boundary, or touches a policy/production-sensitive trigger
- **THEN** the router rejects Small Batch and selects the applicable Full, Debugging, Boundary, Policy, or production-readiness path

#### Scenario: Discovered coupling ends Small Batch
- **WHEN** implementation reveals unexpected coupling or risk that violates an eligibility criterion
- **THEN** the agent stops implementation, preserves or isolates partial state non-destructively, and updates the route, specification, and baseline before continuing

### Requirement: Small Batch preserves per-fix evidence
The Small Batch workflow SHALL use one durable specification with an acceptance row for every fix, one RED phase containing the complete failing matrix, one GREEN/REFACTOR pass, focused proof for every row, one batch self-audit, one verification summary, and one final full quality-gate run.

#### Scenario: Eligible batch amortizes repeated ceremony
- **WHEN** an eligible Small Batch contains multiple acceptance rows
- **THEN** the agent routes and specifies once, proves every row, and runs the complete project gate suite once after the batch rather than repeating the full workflow for each row

#### Scenario: Specification remains mandatory
- **WHEN** a Small Batch is ready for implementation
- **THEN** the durable batch specification and complete acceptance matrix exist before RED/GREEN or implementation edits begin

### Requirement: Final quality-gate guidance has one canonical source
The workflow SHALL define generic final test, lint, type-check, build, static-analysis, and bounded-output behavior in `directives/verification.md` and its gate helper, while type-driven and test-driven directives retain only their phase-specific checks plus concise handoffs to verification.

#### Scenario: TDD hands off to canonical final gates
- **WHEN** an agent completes RED, GREEN, and REFACTOR under test-driven development
- **THEN** it follows the verification directive for the final project-native gate suite without loading a duplicate generic gate procedure from the TDD directive

#### Scenario: Type-first work retains focused type checks
- **WHEN** an agent defines or changes a type contract
- **THEN** it runs the phase-specific type check and later follows verification for the canonical final gate suite

### Requirement: Lazy routing detail is installed for supported tools
The installation system SHALL support validated non-executable companion assets, SHALL resolve named references from both the source-tree and installed bootstrap locations, and SHALL make every detailed routing reference named by the required bootstrap available after deterministic sync for Claude, Codex, Copilot, and Cursor without classifying the lazy reference as always-loaded prompt content. Validation and installation checks SHALL verify content identity rather than existence alone.

#### Scenario: Noninteractive sync installs routing dependencies
- **WHEN** a user runs noninteractive sync for any supported tool
- **THEN** the compact bootstrap and every routing reference it may require are installed at paths consistent with that tool's target layout

#### Scenario: Missing routing dependency fails validation
- **WHEN** the bootstrap or manifest names a routing reference that is absent, stale, tampered, unsafe, or conflicting in the source package or installed target
- **THEN** generation, validation, install tests, or package checks fail before release
