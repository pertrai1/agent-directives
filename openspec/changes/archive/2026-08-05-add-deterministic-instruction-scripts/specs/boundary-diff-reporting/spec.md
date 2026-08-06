## ADDED Requirements

### Requirement: Boundary diff extracts changed edges locally
The system SHALL inspect a git comparison and report added or changed static imports, dynamic imports, re-exports, package dependency entries, and production-to-test edges for supported JavaScript and TypeScript source without requiring an MCP or network service.

#### Scenario: Added static and dynamic imports
- **WHEN** a comparison adds one static import and one dynamic import
- **THEN** the report lists both source-to-target edges with edge kind, source path, target text, and observed status

#### Scenario: Package dependency changes
- **WHEN** a compared `package.json` adds, removes, or changes a dependency entry
- **THEN** the report lists the dependency name, section, old value, and new value in lexical order

### Requirement: Boundary diff does not invent architectural approval
The system SHALL classify an edge as a violation only when an explicit supported rule proves it; otherwise it SHALL label the edge observed or unclear and leave policy judgment to the reviewer.

#### Scenario: No boundary configuration exists
- **WHEN** changed imports are found but no supported explicit boundary rule is available
- **THEN** the report emits the edges as observed or unclear without a pass verdict

### Requirement: Boundary diff rejects unsafe comparisons
The system SHALL invoke git with argument arrays, validate comparison references and positive output limits, preserve unusual file names, and return invalid-evidence status when git cannot provide the requested diff.

#### Scenario: Invalid base reference
- **WHEN** the requested base cannot be resolved
- **THEN** the command returns a concise error and exit class `2` without invoking a shell
