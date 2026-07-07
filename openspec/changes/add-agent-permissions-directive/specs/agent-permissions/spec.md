## ADDED Requirements

### Requirement: Agent Permissions Directive Metadata
The system SHALL provide `directives/agent-permissions.md` as a workflow directive with frontmatter that identifies the directive name, description, version, supported tools, triggers, and conditional routing applicability.

#### Scenario: Directive metadata is discoverable
- **WHEN** a maintainer or manifest generator inspects `directives/agent-permissions.md`
- **THEN** the directive metadata identifies `agent-permissions` as a non-required workflow directive for implementation, debugging, policy-change, and review work

### Requirement: Least-Privilege Posture
The agent permissions directive SHALL instruct agents to use the least privilege needed for the assigned task and to avoid reading, editing, running, installing, publishing, pushing, deploying, or transmitting data beyond the task's scope.

#### Scenario: Agent chooses the narrowest safe action
- **WHEN** an agent can complete a task with a local read, targeted edit, or project-native verification command
- **THEN** the directive tells the agent not to expand into broader file access, package installation, network calls, publishing, deployment, or unrelated git operations

### Requirement: Protected File Approval Guidance
The agent permissions directive SHALL identify protected file categories that normally require explicit approval before editing, including `.env*`, lockfiles, package manager configuration, CI workflows, deploy scripts, infrastructure or IaC files, migrations, and auth or security-sensitive configuration.

#### Scenario: Agent encounters a protected file
- **WHEN** an agent determines that a task requires editing a protected file category
- **THEN** the directive requires the agent to pause or escalate according to project policy before making the edit

### Requirement: Risky Command Approval Guidance
The agent permissions directive SHALL identify command categories that normally require approval before execution, including dependency installation, package publishing, deploys, destructive git operations, force pushes, cloud or infrastructure commands, and commands that send repository data to external services.

#### Scenario: Agent needs a risky command
- **WHEN** an agent determines that completing the task requires a risky command category
- **THEN** the directive requires the agent to state the command, why it is needed, and the expected affected scope before running it when approval is required

### Requirement: Denied-Until-Explicit Actions
The agent permissions directive SHALL identify actions that are denied unless the user explicitly requests and approves them, including broad file tree deletion, rewriting unrelated history, disabling checks to make CI pass, and exposing or printing secrets.

#### Scenario: Agent considers exposing a secret
- **WHEN** an agent encounters a secret value or secret-bearing file while working
- **THEN** the directive requires the agent not to print, copy, commit, or expose the secret and to report the blocked action without revealing the secret value

### Requirement: Escalation Protocol
The agent permissions directive SHALL define an escalation protocol that tells the agent to state the requested action, why it is needed, affected files or commands, expected risk, and whether approval is required before proceeding.

#### Scenario: Approval is required before proceeding
- **WHEN** project policy, tool permissions, or the directive marks an action as approval-required
- **THEN** the agent MUST ask for approval and wait for the user's decision before taking the action

### Requirement: Blocked Work Reporting
The agent permissions directive SHALL define how an agent reports work that is blocked or narrowed by permissions, including the policy trigger, safe alternatives attempted, remaining user decision, and any deferred work.

#### Scenario: Permission policy blocks the requested path
- **WHEN** an approval-required or denied action prevents the agent from continuing on the current path
- **THEN** the agent reports the blocked action, the permission reason, and a safe next option without silently bypassing the policy

### Requirement: Conditional Routing Integration
Adaptive routing SHALL load `directives/agent-permissions.md` conditionally when work touches protected files, risky commands, package manager operations, deployment, infrastructure, secrets, CI, or repo policy.

#### Scenario: Task touches a risky surface
- **WHEN** a task asks the agent to edit CI, install dependencies, deploy, inspect secrets, run infrastructure commands, or change repo policy
- **THEN** adaptive routing selects `directives/agent-permissions.md` as an active directive for the task

### Requirement: Advisory Boundary
The agent permissions directive SHALL state that it provides portable advisory policy and does not replace IDE permissions, harness permissions, sandboxing, CI gates, or future deterministic enforcement artifacts.

#### Scenario: User expects automatic enforcement
- **WHEN** a user or reviewer reads the directive as part of a repo guardrail setup
- **THEN** the directive makes clear that actual enforcement must come from the user's agent harness, tooling, CI, or a separate enforcement kit
