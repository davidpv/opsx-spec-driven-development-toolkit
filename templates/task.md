---
id: PROJ-000        # Jira issue key, provided by the user (placeholder PROJ-D01 if not created yet)
title: <short title>
status: draft        # draft | enriched | proposed | in-progress | done
discovery: <topic>   # source file in backlog/discovery/
change: ~            # openspec change name once /opsx-propose runs
priority: ~          # must | should | could | wont (MoSCoW)
estimate: ~          # story points or hours, per project convention
language: ~          # es | en — set by /task-generate after asking the user
---

# PROJ-000 — <short title>

## Goal

<what must exist or behave differently when this task is done, and why>

## Context

<relevant background: affected modules, related specs, dependencies on other tasks>

## Acceptance criteria

```gherkin
Scenario: <name>
  Given <precondition>
  When <action>
  Then <observable outcome>
```

## Notes & edge cases

<!-- Added by /task-enrich: error paths, permissions, empty states, limits. -->

## Definition of Done

- [ ] Acceptance criteria covered by tests
- [ ] Spec deltas archived in openspec/specs/
- [ ] Work merged into the integration branch
