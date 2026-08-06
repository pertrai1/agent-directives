## ADDED Requirements

### Requirement: Handoff state report is generated from live repository facts
The system SHALL build a bounded, versioned handoff-state report containing branch, upstream, ahead/behind counts when available, staged/unstaged/untracked files, diffstat, recent commits, and stash summary without mutating repository state.

#### Scenario: Dirty repository handoff
- **WHEN** handoff state runs with staged, unstaged, and untracked files
- **THEN** the report preserves each category separately, sorts path lists, and emits a Markdown capsule scaffold with deterministic fields prefilled

### Requirement: Handoff scaffold preserves judgment placeholders
The system SHALL prefill only observable repository facts and SHALL leave explicit placeholders for user intent, decisions, risks, rejected context, and next directive input.

#### Scenario: Generated capsule is not falsely complete
- **WHEN** no human or agent-supplied judgment fields are provided
- **THEN** validation reports the remaining placeholders rather than marking the handoff complete

### Requirement: Decision records support deterministic listing and validation
The system SHALL list active decision frontmatter, filter by domain, trigger, and path, validate naming/frontmatter/required sections/placeholders/supersession references, and create an in-memory template proposal without writing unless a future explicit mutation command is invoked.

#### Scenario: Active path match
- **WHEN** an active decision's `applies_to` glob matches a requested path
- **THEN** the matching record is returned in stable newest-first order without reading unrelated record bodies into output

#### Scenario: Invalid decision record
- **WHEN** a record has a malformed date, missing required field, placeholder text, or broken supersedes reference
- **THEN** validation returns deterministic findings and blocking-findings exit class `1`
