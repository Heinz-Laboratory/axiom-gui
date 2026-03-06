# Axiom Viewer UI Redesign Brief

## Goal

Rebuild the viewer as a light-first scientific workbench that prioritizes the actual molecular workflow:

1. load a structure
2. understand what was loaded
3. manipulate the scene quickly
4. measure, export, and automate from a clear secondary surface

The current shell is functional but too visually heavy, too uniformly dense, and too close to a developer dashboard. The redesign should feel like a modern analysis instrument.

## Research Principles

- Keep the interface keyboard-operable and visibly focusable. Custom controls need real focus states and equivalent keyboard interaction.
- Maintain minimum pointer target sizing and spacing. Small chip-style controls are acceptable only if spacing and hit areas remain usable.
- Avoid drag-only interaction as the only route to an action. Camera manipulation can stay drag-first, but fit/reset and direct scene actions need obvious pointer alternatives.
- Use responsive layouts instead of fixed desktop assumptions. The stage remains primary on desktop, but panels need to collapse into clear vertical flows on narrower screens.
- Use progressive disclosure for advanced controls. The main scene should not compete with every advanced setting at once.
- Keep form and file-ingest controls explicit and well labeled. Load actions should be scannable at a glance.

Reference notes:

- W3C WCAG 2.2 `Focus Appearance` and `Target Size` guidance: the redesign keeps pill controls, toggles, and inspector tabs within larger click targets and uses visible focus rings rather than invisible custom states.
- Nielsen Norman Group `Progressive Disclosure`: the right rail moved from “all panels at once” to a tabbed inspector so advanced controls are still present but no longer compete with the viewport.
- Apple HIG / modern desktop-app inspector patterns: the layout now treats the viewport as the primary work surface, with supporting intake/context on the left and a secondary inspector on the right.

## Product-Specific UX Rules

- The viewport is the product. It should dominate the layout and have a clean perimeter with minimal decorative noise.
- The left rail is for getting data in and understanding the active structure.
- The right rail is an inspector. It should default to summary and control tabs rather than dumping every panel at once.
- The agent console remains present, but as a first-class automation surface inside the inspector rather than the visual centerpiece.
- Structure metadata should read like lab instrumentation output: concise, ordered, and easy to scan.
- Quick render-mode and camera actions stay near the viewport, where they belong.

## Aesthetic Direction

Working title: `Paper Lab Workbench`

- Light mineral background instead of dark chrome
- Warm white cards with soft blue-gray borders
- Cobalt, teal, and amber as functional accents
- Editorial-scientific typography: a refined display face for section anchors, technical sans for UI, mono for scene diagnostics
- Subtle drafting-grid and specimen-table cues rather than glowing cyber motifs

## Implementation Plan

1. Establish a new global token system and typography stack.
2. Rebuild the shell layout around a large central stage with calmer side rails.
3. Convert the right rail into tabbed, progressively disclosed inspector sections.
4. Rewrite ingest, sample, structure summary, and agent surfaces to match the new hierarchy.
5. Revalidate interactions, accessibility affordances, and Playwright coverage.
