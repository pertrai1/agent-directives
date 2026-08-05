## ADDED Requirements

### Requirement: Deterministic verification report model
The system SHALL build a versioned verification report containing lexically ordered changed files, applicable gate results, bounded failure excerpts, test evidence when available, and explicit unverified fields without converting missing evidence into a pass.

#### Scenario: Complete report is stable
- **WHEN** the same repository state and gate outcomes are supplied twice
- **THEN** the report data and rendered section ordering are byte-for-byte stable except for explicitly excluded volatile timing fields

#### Scenario: Missing evidence remains visible
- **WHEN** test, integration, documentation, or functional evidence cannot be derived mechanically
- **THEN** the report marks that field unverified and does not emit a checked assertion

### Requirement: Verification report output is bounded and machine-readable
The system SHALL render the same ordered report as bounded Markdown text or JSON and SHALL reject non-positive output limits.

#### Scenario: Failed gate output exceeds the cap
- **WHEN** a gate emits more lines or bytes than the configured maximum
- **THEN** the rendered report contains a deterministic truncation marker and the retained actionable tail without exceeding the cap

### Requirement: Verification report separates execution failure from invalid input
The CLI integration SHALL exit `0` when all executed gates pass, `1` when a gate fails or a blocking verification finding exists, and `2` for invalid options or unavailable required repository evidence.

#### Scenario: Gate failure is reportable
- **WHEN** one applicable gate completes with a non-zero status
- **THEN** the report includes the failed gate and the CLI exits `1` rather than treating the report itself as malformed
