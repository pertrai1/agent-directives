---
name: accessibility
description: Applies accessibility requirements to user-facing HTML, templates, UI components, forms, custom widgets, focus behavior, and frontend interaction tests or reviews.
version: 1.1.0
required: false
category: workflow
tools:
  - claude
  - copilot
  - codex
  - cursor
assets:
  - references/accessibility-detail.md
triggers:
  - accessibility
  - a11y
  - html-template
  - ui-component
  - form
  - aria
  - keyboard-navigation
  - focus-management
  - screen-reader
routing:
  load: conditional
  paths:
    - full-path
    - review-path
  applies_to:
    - implementation
    - review
    - testing
---

# Accessibility Directive

Load this directive when a task creates, edits, tests, or reviews user-facing UI
markup or interaction behavior. Typical triggers include HTML templates, JSX/TSX,
Vue, Svelte, Angular templates, forms, dialogs, modals, popovers, menus, tabs,
toasts, validation messages, focus behavior, keyboard shortcuts, ARIA, images,
icons, motion, or frontend tests that simulate user interaction.

Do not load it for backend-only logic, data migrations, CLI code, internal scripts,
or docs-only prose unless those changes alter user-facing UI instructions or
accessibility requirements.

Load the companion `directives/references/accessibility-detail.md` only when
the task involves a custom composite widget (combobox, listbox, menu,
treeview, tabs with dynamic panels, grid) or an explicit screen-reader pass
or accessibility audit. It expands this directive; it is not separately
required.

## Core Rule

Accessibility is part of the behavior contract for user interfaces. Treat it as a
baseline implementation, testing, and review concern, not as optional polish added
after the UI appears to work.

Prefer the platform before custom behavior: semantic HTML, native controls, real
labels, browser focus behavior, and native validation usually require less ARIA
and fail less often than rebuilt widgets.

## Implementation Requirements

When editing UI code, verify the relevant items before marking the task done:

- Use native elements first: `<button>` for actions, `<a href>` for navigation,
  form controls for input, and semantic headings/landmarks for structure.
- Give every interactive control an accessible name. Icon-only controls need a
  descriptive label; decorative icons/images must be hidden or use empty alt text.
- Preserve visible keyboard focus. Never remove outlines unless an equally visible
  `:focus-visible` replacement exists.
- Provide a complete keyboard path for pointer interactions. Avoid positive
  `tabindex`; fix DOM order instead.
- Manage focus for overlays: move focus into dialogs/popovers when they open,
  keep background content unavailable when required, and restore focus to the
  trigger on close.
- Label every form control with a real label. Placeholder text is not a label.
- Make validation understandable and announced: include inline error text, connect
  it with `aria-describedby`, set `aria-invalid` when invalid, and focus the first
  invalid field after submit when appropriate.
- Do not rely on color alone for status, errors, or required state. Add text,
  iconography, shape, underline, or another redundant cue.
- Announce dynamic content intentionally: use polite status regions for routine
  updates, alerts only for urgent errors, and keep action/error toasts dismissible
  instead of timing them out.
- Respect reduced-motion preferences and do not block zoom or text resizing.
- Keep touch and pointer targets large enough to activate reliably, especially for
  icon-only or dense controls.

## Testing Requirements

When tests are in scope, prefer behavior-level accessibility checks over brittle
implementation assertions:

- Query controls by role and accessible name where the testing framework supports
  it.
- Cover keyboard activation and traversal for custom or composite widgets.
- Assert focus movement and restoration for dialogs, popovers, menus, and route or
  step changes.
- Assert form errors are visible, associated with controls, and reachable after
  submit.
- Use automated accessibility tooling when the project already has it, but do not
  treat a clean automated scan as proof that keyboard or screen-reader behavior is
  correct.

## Review Requirements

When reviewing UI changes, include accessibility in the material-risk scan:

- Can the primary flow be completed with a keyboard only?
- Does each control expose a useful name, role, and state?
- Are focus order, focus visibility, and focus restoration coherent?
- Are errors, loading states, disabled states, and dynamic updates perceivable
  without relying on color or pointer hover?
- Is ARIA minimal and correct, or would a native element remove the need for it?

Flag accessibility defects as material findings when they block task completion,
hide information from assistive technology, create keyboard traps, remove visible
focus, or make critical form/error flows unusable.

## Common Mistakes

| Mistake | Prefer |
| --- | --- |
| `<div onClick>` or `<span onClick>` for an action | `<button type="button">` |
| Link-like navigation without `href` | `<a href="...">` |
| `outline: none` with no replacement | Visible `:focus-visible` styling |
| Placeholder as the only label | Visible `<label>` or equivalent programmatic label |
| Positive `tabindex` | Correct DOM order; only `0` or `-1` when needed |
| Icon-only button with no label | Descriptive accessible name and decorative icon hidden |
| Error shown only with a red border | Inline error text plus association to the field |
| Timed action/error toast | Dismissible persistent message or sufficient user control |

## Verification Evidence

For UI implementation or review, report the smallest relevant evidence:

- Keyboard path checked or covered by tests.
- Accessible names/labels checked for changed controls.
- Focus behavior checked for overlays, validation, and dynamic step changes.
- Automated accessibility checks run when already available in the project.
- Any unverified screen-reader, contrast, motion, or zoom behavior called out as a
  verification gap instead of implied as covered. Use
  `directives/references/accessibility-detail.md` for screen-reader test
  procedures and complex ARIA widget patterns when in scope.
