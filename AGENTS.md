# Agent Instructions — Spec-Driven Development with OpenSpec

This repository follows **spec-driven development**: no code is written until the change is captured as an OpenSpec proposal with specs, design, and tasks. OpenSpec is the machinery that enforces this; opencode is the agent that executes it.

## The golden rule

> **Spec → Plan → Code. Never skip a stage.**

If a request arrives as "build X" and there is no OpenSpec change for it, your first move is `/opsx:propose` — not writing code.

## Workflow

1. **Propose** — `/opsx:propose <change-name>` creates `openspec/changes/<name>/` with proposal, delta specs, design, and tasks. The proposal states the why, scope, and non-goals.
2. **Specify** — Delta specs (requirements + GIVEN/WHEN/THEN scenarios) under `openspec/changes/<name>/specs/`, expressed as ADDED/MODIFIED/REMOVED against the current specs.
3. **Plan** — `design.md` records the technical approach and trade-offs; `tasks.md` breaks it into checkable steps.
4. **Review** — `/review-change <name>` audits the change before implementation.
5. **Implement** — `/opsx:apply`. Code must trace back to a task; tasks trace to requirements.
6. **Archive** — `/opsx:archive` merges delta specs into `openspec/specs/` (the source of truth).

## Rules for agents

- `openspec/specs/` is the source of truth for current system behavior. Read it before proposing changes; never edit it directly — it only changes via `/opsx:archive`.
- Requirements use RFC-2119 keywords (MUST/SHALL/SHOULD/MAY). Each requirement has at least one scenario.
- If during implementation you discover the spec was wrong or incomplete, stop, update the spec, then continue. Do not silently diverge.
- Keep changes small: one concern per change, one change per branch.
- Validate before archiving: `openspec validate <change> --strict`.

## Repository layout

| Path | Purpose |
|------|---------|
| `openspec/specs/` | Current behavior, source of truth |
| `openspec/changes/` | In-flight changes (proposal, specs, design, tasks) |
| `openspec/changes/archive/` | Completed changes, audit history |
| `.opencode/` | opencode agents, commands, and OpenSpec skills |

## Stack

This is a stack-agnostic template. When it is instantiated for a real project, record the tech stack and conventions in `openspec/config.yaml` (`context:` block) and extend this file.
