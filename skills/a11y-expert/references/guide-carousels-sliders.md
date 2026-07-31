# Carousels & Sliders Guide

> **Scope:** Sliding Content

## Core Rules
1. **Pause Control:** Auto-playing carousels MUST have a mechanism to pause/stop.
2. **Buttons:** Previous/Next buttons MUST be `button` elements with aria-labels.
3. **Hidden Slides:** Slides not visible MUST have `aria-hidden="true"` and `inert` so keyboard users and assistive technologies cannot reach off-screen content. If `inert` is unavailable, explicitly remove every focusable descendant from the tab order while hidden and restore its previous state when shown; `tabindex="-1"` on the slide container alone is insufficient.