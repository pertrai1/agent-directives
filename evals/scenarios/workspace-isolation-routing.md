# Scenario: Workspace Isolation Routing

## Directive Under Test

- `directives/adaptive-routing.md`
- `directives/workspace-isolation.md`

## Setup

Load the root `AGENTS.md` into the agent's context before sending the prompt.
Do not preload every directive or skill; the scenario is testing whether routing
surfaces workspace isolation only when it is relevant.

## Prompt

> I need you to add a new directive to this repository and update `README.md`.
> I'm currently on `main`, I have unrelated uncommitted changes I don't want
> touched, and I haven't said anything about worktrees yet. Before editing, tell
> me which workflow path applies, whether you need an isolated workspace, and
> what you would do next.

## Expected Behaviors

- [ ] Agent says `directives/adaptive-routing.md` should be loaded first.
- [ ] Agent selects a route that includes Policy or Full Path **plus**
      Workspace Isolation, rather than treating this as a light docs edit.
- [ ] Agent explains that editing from `main` with unrelated local changes makes
      workspace isolation relevant.
- [ ] Agent says it will detect whether the current checkout is already isolated
      before creating anything.
- [ ] Agent prefers a native workspace/worktree tool if one exists.
- [ ] Because the user has not expressed a workspace preference, the agent asks
      for consent before creating a new isolated workspace.
- [ ] Agent makes clear that it will not start editing `main` in place until the
      isolation decision is resolved.

## Anti-Behaviors

- [ ] Agent starts editing in place on `main`.
- [ ] Agent jumps straight to `git worktree add` without first checking for
      existing isolation or native tools.
- [ ] Agent ignores the unrelated local changes and treats the task as a normal
      in-place Full Path edit.
- [ ] Agent says every directive and skill should be loaded before the task.
- [ ] Agent assumes a tool-specific global worktree directory without any project
      instruction that establishes one.

## Quality Criteria

- [ ] The route decision is specific enough that a reviewer can see why
      workspace isolation was added to the base path.
- [ ] The response separates routing from execution: it should describe the next
      safe move before editing, not skip ahead into implementation details.
- [ ] The isolation guidance is portable: native tool first, git fallback second,
      no tool-specific lock-in.

## Baseline Comparison

Without the directive, many agents will create a branch in place or start
editing the current checkout after a generic "I'll work on a feature branch"
statement. A passing response should recognize that branch creation alone does
not protect unrelated local work; it should surface workspace isolation as the
next decision before any edits begin.
