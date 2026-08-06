## MODIFIED Requirements

### Requirement: Final quality-gate guidance has one canonical source
The workflow SHALL define generic final test, lint, type-check, build, static-analysis, bounded-output behavior, and deterministic verification-report generation in `directives/verification.md` and its installed CLI/helper surface, while type-driven and test-driven directives retain only their phase-specific checks plus concise handoffs to verification. Once a referenced deterministic command is proven and packaged, the owning directive SHALL state when to run it and how to interpret it instead of duplicating its mechanical procedure.

#### Scenario: TDD hands off to canonical final gates
- **WHEN** an agent completes RED, GREEN, and REFACTOR under test-driven development
- **THEN** it follows the verification directive and deterministic report command for the final project-native gate suite without loading a duplicate generic gate procedure from the TDD directive

#### Scenario: Type-first work retains focused type checks
- **WHEN** an agent defines or changes a type contract
- **THEN** it runs the phase-specific type check and later follows verification for the canonical final gate suite and report

#### Scenario: Packaged command replaces mechanical prose
- **WHEN** a directive or skill references one of the new packaged deterministic commands
- **THEN** it retains policy, interpretation, blocking consequences, and a concise unavailable-command fallback while omitting the command's detailed discovery and normalization recipe
