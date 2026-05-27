---
"agent-directives": minor
---

Expand the Angular rule pack with new security, coding-style, and patterns rules, and flesh out the existing components-and-templates, project-structure, and testing rules.

Switch the adaptive-routing directive from an inline per-rule table to manifest-driven rule discovery, so rule packs no longer add always-loaded routing metadata as they grow. Surface each entry's `applies_to` file globs in `manifest.json` to make it a self-sufficient discovery index.
