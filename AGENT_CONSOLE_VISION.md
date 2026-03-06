# Agent Console Vision

## Thesis

The long-term control surface for Axiom should feel closer to VMD's command-driven workflow than to a static viewer UI, but adapted for the web and for agent-native operation.

## What We Are Building Toward

- A persistent right-hand console that always has access to the active structure, camera, render state, measurements, and export pipeline.
- Conversational control over viewer actions:
  - camera presets and framing
  - render modes and quality
  - semantic selection
  - measurements and annotations
  - export tasks
  - scene automation and scripting
- A backend agent that can inspect scene state, reason about user intent, and chain multiple viewer operations together.
- A system that works online, shares state, and can be embedded into scientific workflows instead of living as a desktop-only local tool.

## VMD-Inspired, Not VMD-Cloned

Keep the parts that matter:

- dark, utilitarian, technical aesthetic
- command surface always available
- power-user friendly interaction model
- scripting and automation as first-class features

Do not inherit the old limitations:

- no desktop-only assumptions
- no split between "GUI users" and "scripters"
- no modal plugin maze
- no requirement that automation be manual Tcl/Python scripting

## Near-Term Implementation Path

1. Local command bridge in the sidebar for basic viewer actions.
2. Structured command API for camera, render, selection, measurement, and export operations.
3. Real conversational agent backend that maps freeform requests onto those structured operations.
4. Scene-aware memory and workflow execution ("do the same cleanup as last time", "export the publication view").
5. Multi-agent workflows for analysis, reporting, and dataset-specific automation.

## Design Rule

The sidebar should never be a passive chatbot bolted onto the viewer.
It should be the primary programmable surface for manipulating the scene.
