# Agent Instructions — Spec-Driven Development with OpenSpec

This repository follows **spec-driven development**: no code is written until the change is captured as an OpenSpec proposal with specs, design, and tasks. OpenSpec is the machinery that enforces this; opencode is the agent that executes it.

## The golden rule

> **Spec → Plan → Code. Never skip a stage.**

If a request arrives as "build X" and there is no OpenSpec change for it, your first move is `/opsx:propose` — not writing code.

## Workflow

The full pipeline runs from requirements to merge. Stages 0–1 are optional for trivial changes; stages 2–6 are mandatory.

0. **Discover** — `/req-capture <topic>` interviews the user and writes `backlog/discovery/<topic>.md`. No invented answers: unknowns go to Open questions.
1. **Tasks** — `/task-generate <topic>` slices the discovery into tasks under `backlog/tasks/`. Task IDs ARE Jira keys (`<project_key>-<n>`, provided by the user; `-Dnn` drafts until the issue exists). `/task-enrich <id>` adds edge cases, estimates, and unhappy paths; `/review-task <id>` audits; `/task-jira <id>` exports Jira wiki markup to `backlog/exports/jira/`.
2. **Propose** — `/opsx:propose <change-name>` creates `openspec/changes/<name>/` with proposal, delta specs, design, and tasks. If the change implements a backlog task, the proposal references its ID and the task frontmatter gets `change: <name>`.
3. **Specify & plan** — Delta specs (requirements + GIVEN/WHEN/THEN) as ADDED/MODIFIED/REMOVED; `design.md` for the approach; `tasks.md` for checkable steps.
4. **Review** — `/review-change <name>` audits the change before implementation.
5. **Implement** — `/opsx:apply`. **Branch gate (mandatory, BEFORE writing any code):** check the current branch first. Never implement on `main`. With `work_mode: feature`, create and switch to the feature branch (naming rule below) before touching any file. With `work_mode: flexible`, ask the user where to implement — feature branch (recommended) or directly on the integration branch — and create/switch accordingly before the first edit. Then commit with `/git-commit`: conventional commits whose footer traces `Change:`/`Task:` (tasks.md step)/`Jira:` (backlog task id).
6. **Deliver** — feature branch: `/pr-open` creates the PR against the integration branch, `/ship` validates, archives, merges and closes the backlog task. Integration branch: skip `/pr-open`; `/ship` validates, archives and pushes (no PR, no review).

Traceability chain: **Discovery → Task (Jira) → Change → tasks.md step → Commit → PR**. Note: "task" means a backlog/Jira task; tasks.md inside a change holds implementation steps.

## Rules for agents

- `openspec/specs/` is the source of truth for current system behavior. Read it before proposing changes; never edit it directly — it only changes via `/opsx:archive`.
- Requirements use RFC-2119 keywords (MUST/SHALL/SHOULD/MAY). Each requirement has at least one scenario.
- If during implementation you discover the spec was wrong or incomplete, stop, update the spec, then continue. Do not silently diverge.
- Keep changes small: one concern per change, one change per branch.
- Validate before archiving: `openspec validate <change> --strict`.
- `workflow.yaml` at the repo root defines branches, commit convention, and Jira/export settings. Pipeline commands read it; never hardcode branch names or platforms.
- Task frontmatter (`status`, `change`, `id`) is the pipeline state of a backlog task. Commands keep it updated; don't bypass it.
- Never commit directly to `main` (release branch only). Working on the integration branch is allowed when `git.work_mode: flexible` in `workflow.yaml`; feature branches + PR are still the recommended path when code review matters. With `work_mode: feature`, a feature branch is mandatory.
- Feature branch naming: `feature/<task id>-<change>` when the change is linked to a backlog task with a real Jira key (e.g. `feature/PROJ-123-speed-up-search`), `feature/<change>` otherwise. When inferring the change from a branch name, strip the leading Jira key.
- **Branch gate**: no implementation work starts until the working branch is resolved (created and checked out). This applies to `/opsx:apply` and to any ad-hoc code edit. `/git-commit` re-checks at commit time as a safety net, but the gate must run first — don't rely on the net.
- **Client-facing content language**: any command or agent that generates text exposed to the client (discovery docs, tasks, Jira exports, PR descriptions) MUST ask the user whether to write it in castellano or English before generating — every time, preselecting `content.default_language` from `workflow.yaml`. Never assume the language.

## Repository layout

| Path | Purpose |
|------|---------|
| `backlog/` | Upstream product artifacts: discovery docs, tasks (Jira-mapped), Jira/PR exports |
| `openspec/specs/` | Current behavior, source of truth |
| `openspec/changes/` | In-flight changes (proposal, specs, design, tasks) |
| `openspec/changes/archive/` | Completed changes, audit history |
| `templates/` | Discovery, task, and PR description templates |
| `workflow.yaml` | Tool-agnostic pipeline config (branches, commits, Jira) |
| `.opencode/` | opencode agents, commands, and OpenSpec skills |

## Stack

This is a stack-agnostic template. When it is instantiated for a real project, record the tech stack and conventions in `openspec/config.yaml` (`context:` block) and extend this file.
