---
id: US-000
title: <short title>
status: draft        # draft | enriched | proposed | in-progress | done
discovery: <topic>   # source file in backlog/discovery/
change: ~            # openspec change name once /opsx-propose runs
jira_key: ~          # filled if/when imported into Jira
priority: ~          # must | should | could | wont (MoSCoW)
language: ~          # es | en — set by /story-generate after asking the user
estimate: ~          # story points
---

# US-000 — <short title>

**As a** <role>
**I want** <capability>
**So that** <business value>

## Acceptance criteria

```gherkin
Scenario: <name>
  Given <precondition>
  When <action>
  Then <observable outcome>
```

## Notes & edge cases

<!-- Added by /story-enrich: error paths, permissions, empty states, limits. -->

## Definition of Done

- [ ] Acceptance criteria covered by tests
- [ ] Spec deltas archived in openspec/specs/
- [ ] PR merged into the integration branch
