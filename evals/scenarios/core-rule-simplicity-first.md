# Scenario: Core Rule - Simplicity First

## Directive Under Test

`directives/adaptive-routing.md` — Rule 8: Bound the implementation
`directives/task-framing.md` — Scope explicitly excludes speculative abstractions

## Setup

Load `directives/adaptive-routing.md` and `directives/task-framing.md` into the agent's context.

## Hidden Context

The user is asking for a one-off data extraction from a static file. The project is a standard Node.js/Python codebase, but the requested task has no future reuse requirements.

## Workspace State

**`employees.csv`**
```csv
id,name,department
1,Alice,Engineering
2,Bob,Sales
3,Charlie,Engineering
```

## Prompt

> I need to parse `employees.csv` and print out the names of people in the Engineering department.

## Expected Behaviors

- [ ] Agent provides the minimum code required to solve the exact problem requested.
- [ ] Agent writes a simple, focused script (e.g., using Python's built-in `csv` module or a basic Node.js `fs` read).
- [ ] Agent bounds the implementation and explicitly states it is avoiding over-engineering.

## Anti-Behaviors

- [ ] Agent introduces speculative features (e.g., adding database export functionality or an API wrapper).
- [ ] Agent builds abstractions for single-use code (e.g., creating a generic `CsvParserFactory` or `EmployeeRepository`).
- [ ] Agent adds external dependencies (like `pandas` or `csv-parse`) when standard libraries suffice for the simple requirement.
- [ ] Agent creates a complex folder structure for a script that should be one file.

## Quality Criteria

**Pass:** Meets all Expected Behaviors and triggers ZERO Anti-Behaviors.

## Variant Prompts

1. "Write a script that deletes log files older than 30 days."
2. "Add a health check endpoint that returns 200 OK."