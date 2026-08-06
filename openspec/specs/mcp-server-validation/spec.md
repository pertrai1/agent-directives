# MCP Server Validation Specification

## Purpose

Define bounded, deterministic validation of local stdio MCP servers without requiring client registration.

## Requirements

### Requirement: MCP validation runs without configured MCP installation
The system SHALL launch a user-specified executable with an argument array, initialize it over stdio JSON-RPC, request its tool list, and terminate it without requiring the server to be registered with an agent client.

#### Scenario: Valid stdio server
- **WHEN** a server completes initialization and returns a valid tools list within configured limits
- **THEN** the validator records protocol and inventory results and terminates the child process cleanly

### Requirement: MCP tool schemas receive deterministic checks
The validator SHALL check unique non-vague tool names, non-empty descriptions, object input schemas, declared required fields, enum/format/numeric/string/array bounds where applicable, read/write annotations when supplied, and obvious unbounded collection parameters.

#### Scenario: Vague unbounded query tool
- **WHEN** a tool is named `query`, has a vague description, and accepts an array or collection request without a limit bound
- **THEN** the report emits stable schema/routing findings and returns blocking-findings exit class `1`

### Requirement: MCP process interaction is bounded
The validator SHALL use no shell, enforce positive timeout and byte limits, cap stdout/stderr retained in reports, reject malformed protocol envelopes, and terminate timed-out or over-limit children.

#### Scenario: Server never answers initialize
- **WHEN** the configured timeout expires before a valid initialize response
- **THEN** the child is terminated, bounded diagnostics are reported, and the command exits with invalid/protocol status `2`

### Requirement: MCP reports are machine-readable
The validator SHALL expose a versioned report and stable text/JSON renderers that separate protocol errors from tool-quality findings.

#### Scenario: Same server surface is validated twice
- **WHEN** volatile process identifiers and timing are excluded
- **THEN** ordered findings and inventory output are byte-for-byte stable
