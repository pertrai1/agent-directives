---
name: accessibility-detail
description: Lazy companion detail for screen-reader test procedures and complex ARIA widget patterns.
version: 1.0.0
required: false
category: workflow
tools:
  - claude
  - copilot
  - codex
  - cursor
---

# Accessibility — Detailed Reference

Load this companion only when the task involves a custom composite widget
(combobox, listbox, menu, treeview, tabs with dynamic panels, grid) or an
explicit screen-reader/audit pass. It expands `directives/accessibility.md`;
it is not a separately required directive.

## Screen Reader Test Procedures

Automated scans do not exercise screen-reader announcement or navigation
behavior. When a change touches a dialog, custom widget, dynamic status
region, or form validation flow, verify with at least one screen reader
before marking accessibility work done.

Pick one per platform available in the project's test environment:

- **macOS / Safari or Chrome** — VoiceOver (`Cmd+F5`). Use VO+Right/Left to
  traverse, VO+Space to activate, Tab for the standard keyboard path. Check
  the rotor (`VO+U`) for landmarks, headings, and form controls.
- **Windows / Chrome or Edge** — NVDA (free) or JAWS. Use browse mode for
  reading order and forms mode (auto-entered on focusable controls) for
  interaction. Insert+F7 (NVDA) or Insert+F3 (JAWS) lists landmarks/headings/
  forms — use it to confirm heading structure and control names match intent.
- **Mobile** — VoiceOver (iOS) or TalkBack (Android) with swipe navigation,
  when the surface is touch-primary.

For each screen reader pass, confirm:

- The control's announced role and name match its visible purpose (no
  "button" read as "clickable text", no unlabeled icon buttons).
- Dynamic updates (toasts, inline errors, step changes) are announced without
  requiring the user to manually re-navigate to them.
- Dialog/popover open announces the dialog and its accessible name; close
  returns focus and announcement to the trigger.
- Reading order via the screen reader matches visual order; no content is
  skipped or duplicated.

Record which screen reader/browser pairing was actually run. Do not report
"screen-reader verified" without naming the tool and pairing used — this
directive's parent verification-evidence rule treats an unnamed check as
unverified.

## Complex ARIA Widget Patterns

Prefer a native or existing library implementation of these widgets before
building one from scratch; each has interaction subtleties that are easy to
get wrong by hand. When a custom build is required, match the current WAI-ARIA
Authoring Practices pattern for the widget rather than inventing key handling.
Minimum expectations per widget family:

- **Combobox / autocomplete** — `role="combobox"` on the input, with
  `aria-expanded`, `aria-controls` pointing to the listbox, and
  `aria-activedescendant` tracking the highlighted option instead of moving
  DOM focus. Arrow keys move the highlighted option; Enter selects; Escape
  closes without selecting.
- **Listbox / select-like widgets** — options need `role="option"` and
  `aria-selected`; the listbox owns a single roving tabindex or uses
  `aria-activedescendant`, never per-option positive tabindex.
- **Menu / menu button** — trigger has `aria-haspopup="menu"` and
  `aria-expanded`; opening moves focus to the first item; arrow keys traverse,
  Escape closes and returns focus to the trigger, and outside click/blur
  closes the menu.
- **Treeview** — `role="tree"`/`role="treeitem"` with `aria-expanded` on
  expandable nodes and one roving tabindex across visible nodes; Left/Right
  collapse/expand or move to parent/first child.
- **Tabs with dynamic panels** — `role="tablist"`/`tab`/`tabpanel` with
  `aria-selected` on the active tab; only the active tab is in the Tab order
  (others use `tabindex="-1"`), Arrow keys move between tabs, and the panel's
  heading or first focusable element receives focus if the pattern calls for
  automatic panel focus.
- **Grid / data grid with cell navigation** — `role="grid"`/`row`/`gridcell`
  with a single roving tabindex on the active cell; arrow keys move the
  active cell, not the page focus outline; editable cells announce edit mode.

## Formal Audit / WCAG Mapping

Use this section only when a task explicitly requests a standalone
accessibility audit or conformance mapping, per the specialist-selection
guidance in `directives/references/adaptive-routing-detail.md`. Map findings
to the relevant WCAG 2.2 success criterion (e.g., 2.1.1 Keyboard, 2.4.7 Focus
Visible, 4.1.2 Name Role Value, 3.3.1 Error Identification) instead of only
describing the symptom — this makes findings actionable against a named
standard and comparable across audits.
