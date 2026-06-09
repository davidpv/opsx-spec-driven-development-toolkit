# Agent Instructions — Spec-Driven Development with OpenSpec

This repository follows **spec-driven development**: no code is written until the change is captured as an OpenSpec proposal with specs, design, and tasks. OpenSpec is the machinery that enforces this; opencode is the agent that executes it.

## The golden rule

> **Spec → Plan → Code. Never skip a stage.**

If a request arrives as "build X" and there is no OpenSpec change for it, your first move is `/opsx:propose` — not writing code.

## Workflow

The full pipeline runs from requirements to merge. Stages 0–1 are optional for trivial changes; stages 2–6 are mandatory.

0. **Discover** — `/req-capture <topic>` interviews the user and writes `backlog/discovery/<topic>.md`. No invented answers: unknowns go to Open questions.
1. **Stories** — `/story-generate <topic>` slices the discovery into INVEST stories under `backlog/stories/` (US-NNN). `/story-enrich <id>` adds edge cases, estimates, and unhappy paths; `/review-story <id>` audits; `/story-jira <id>` exports Jira wiki markup to `backlog/exports/jira/`.
2. **Propose** — `/opsx:propose <change-name>` creates `openspec/changes/<name>/` with proposal, delta specs, design, and tasks. If the change implements a story, the proposal references its ID and the story frontmatter gets `change: <name>`.
3. **Specify & plan** — Delta specs (requirements + GIVEN/WHEN/THEN) as ADDED/MODIFIED/REMOVED; `design.md` for the approach; `tasks.md` for checkable steps.
4. **Review** — `/review-change <name>` audits the change before implementation.
5. **Implement** — `/opsx:apply` on a `feature/<change>` branch. Commit with `/git-commit`: conventional commits whose footer traces `Change:`/`Task:`/`Story:`.
6. **Deliver** — `/pr-open` creates the PR against the integration branch (`workflow.yaml`); `/ship` validates, runs `/opsx:archive`, merges, and closes the story.

Traceability chain: **Discovery → Story → Change → Task → Commit → PR**.

## Rules for agents

- `openspec/specs/` is the source of truth for current system behavior. Read it before proposing changes; never edit it directly — it only changes via `/opsx:archive`.
- Requirements use RFC-2119 keywords (MUST/SHALL/SHOULD/MAY). Each requirement has at least one scenario.
- If during implementation you discover the spec was wrong or incomplete, stop, update the spec, then continue. Do not silently diverge.
- Keep changes small: one concern per change, one change per branch.
- Validate before archiving: `openspec validate <change> --strict`.
- `workflow.yaml` at the repo root defines branches, commit convention, and Jira/export settings. Pipeline commands read it; never hardcode branch names or platforms.
- Story frontmatter (`status`, `change`, `jira_key`) is the pipeline state of a story. Commands keep it updated; don't bypass it.
- Never commit directly to `main` or the integration branch.
- **Client-facing content language**: any command or agent that generates text exposed to the client (discovery docs, user stories, Jira exports, PR descriptions) MUST ask the user whether to write it in castellano or English before generating — every time, preselecting `content.default_language` from `workflow.yaml`. Never assume the language.

## Repository layout

| Path | Purpose |
|------|---------|
| `backlog/` | Upstream product artifacts: discovery docs, user stories, Jira/PR exports |
| `openspec/specs/` | Current behavior, source of truth |
| `openspec/changes/` | In-flight changes (proposal, specs, design, tasks) |
| `openspec/changes/archive/` | Completed changes, audit history |
| `templates/` | Discovery, user-story, and PR description templates |
| `workflow.yaml` | Tool-agnostic pipeline config (branches, commits, Jira) |
| `.opencode/` | opencode agents, commands, and OpenSpec skills |

## Stack

This is a stack-agnostic template. When it is instantiated for a real project, record the tech stack and conventions in `openspec/config.yaml` (`context:` block) and extend this file.
