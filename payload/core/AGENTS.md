# Agent Instructions — Spec-Driven Development with OpenSpec

This repository follows **spec-driven development**: no code is written until the change is captured as an OpenSpec proposal with specs, design, and tasks. OpenSpec is the machinery that enforces this; opencode is the agent that executes it.

## The golden rule

> **Spec → Plan → Code. Never skip a stage.**

If a request arrives as "build X" and there is no OpenSpec change for it, your first move is `/opsx:propose` — not writing code.

## The four wrapper commands

The pipeline is exposed to users through four top-level wrappers. Everything else (`/opsx:*`) is an internal primitive invoked by the wrappers — callable by power users, but not part of the daily path.

- **`/start`** — entry: route new work (existing Jira ticket / direct change / new task) and chain up to a reviewed proposal on `develop`, ready for `/work`.
- **`/next`** — recovery point: inspect state and suggest the next step (always a wrapper). Always suggest, never auto-advance.
- **`/work [changes...]`** — build: implement a change in its own git worktree (apply + verify). One change or several — with multiple changes it fans out to SubAgents in parallel. SubAgents do not merge.
- **`/ship <change>`** — closing button: verify gate + merge into the integration branch + archive on develop + cleanup worktree + close the linked task. One command = done.

The daily path is **`/start → /work → /ship`**, with `/next` as the "what now?" helper. Everything under `/opsx:*` (plus `/git-commit`, `/review-change`, `/task-*`, `/req-capture`) is an internal primitive the wrappers call — never suggest them to the user as the next step.

## Workflow

The full pipeline runs from requirements to merge. Stages 0–1 are optional for trivial changes; stages 2–6 are mandatory.

0. **Discover** — `/req-capture <topic>` interviews the user and writes `backlog/discovery/<topic>.md`. No invented answers: unknowns go to Open questions.
1. **Tasks** — `/task-generate <topic>` slices the discovery into tasks under `backlog/tasks/`. Alternative entries: `/task-import <key>` normalizes an existing Jira ticket (pasted by the user) into the backlog; `/task-new <title>` creates a single task without a discovery doc. Task IDs ARE Jira keys (`<project_key>-<n>`, provided by the user; `-Dnn` drafts until the issue exists). `/task-enrich <id>` adds edge cases, estimates, and unhappy paths; `/review-task <id>` audits; `/task-jira <id>` exports Jira wiki markup to `backlog/exports/jira/` (not needed for imported tickets).
2. **Propose on develop** — `/opsx:propose <change-name>` runs on the integration branch (`develop`) and creates `openspec/changes/<name>/` with proposal, delta specs, design, and tasks. **Propose must run on `develop`, never inside a worktree or feature branch** — OpenSpec needs to see all active changes and the authoritative specs to detect conflicts. If the change implements a backlog task, the proposal references its ID and the task frontmatter gets `change: <name>`. End the run with a commit on `develop`.
3. **Specify & plan** — Delta specs (requirements + GIVEN/WHEN/THEN) as ADDED/MODIFIED/REMOVED; `design.md` for the approach; `tasks.md` for checkable steps. All artifacts are committed together in one commit on `develop` for a clean recovery point.
4. **Review** — `/review-change <name>` audits the change before implementation.
5. **Implement in a worktree** — `/opsx:apply <name>`. When `git.work_mode == worktree` (default for new projects), the command creates a git worktree at `.worktrees/<change>/` on a new branch `feature/<change>` (or `feature/<task-id>-<change>` if the change is linked to a real Jira key) and runs tasks inside it. With `work_mode: feature`, it falls back to a plain feature branch. With `work_mode: flexible`, it asks the user where to implement. Commits happen at every task boundary; `/git-commit` is suggested (not auto-run) so the user approves messages.
6. **Verify in the worktree** — `/opsx:verify <name>` runs inside `.worktrees/<change>/`. Confirms completeness (tasks done, requirements present), correctness (requirements implemented, scenarios covered), and coherence (design followed, patterns consistent). Refuses if not run inside the worktree.
7. **Merge, then archive, then close** — `/ship <name>` is the one-button close. Steps in order: verify gate → merge the worktree branch into `develop` (squash by default, gh/glab/web-UI fallback as today) → run `/opsx:archive` on `develop` so delta specs sync into `openspec/specs/` with the full view of every other merged change → clean up the worktree and local branch → close the linked task.

For multiple independent changes, run `/work` instead of `/opsx:apply`: it spawns one SubAgent per non-conflicting change, each in its own worktree. SubAgents apply + verify and report back. The user inspects each report, then runs `/ship` per change in sequence so each merge + archive has the right view of `develop`.

Traceability chain: **Discovery → Task (Jira) → Change → tasks.md step → Commit → PR**. Note: "task" means a backlog/Jira task; tasks.md inside a change holds implementation steps.

## Branch discipline (mandatory)

| Step | Required branch | Why |
|---|---|---|
| `/opsx:propose` | `develop` (integration) | Must see all in-flight changes + `openspec/specs/` |
| `/opsx:apply` | inside `.worktrees/<change>/` (default) | Isolated implementation |
| `/opsx:verify` | inside `.worktrees/<change>/` | Verify against the actual code that will be merged |
| `/ship` (merge step) | `develop`, after verify | Code lands first, then specs sync |
| `/opsx:archive` | `develop`, after merge | Spec-sync needs the full view of every other merged change |
| `/opsx:sync` | `develop` | Same reasoning as archive |
| `/req-capture` | `develop` | Discovery doc is a planning artifact, lives with OpenSpec changes |
| `/task-import` | `develop` | Tasks are planning artifacts, live with their discovery doc |
| `/task-new` | `develop` | Same |
| `/task-generate` | `develop` | Same |
| `/task-enrich` | `develop` | Edits happen where the task was created |
| `/task-jira` | `develop` | Jira exports derive from the tasks on `develop` |

Each step refuses to run on the wrong branch and prints the required one. **Never commit directly to `main`** (release branch). The management-plane branch discipline has the same shape as the governance-plane one: **planning lives on `develop`, code lives in worktrees**.

## Commit discipline

Commit at every logical boundary:

- After `/opsx:propose` creates the change directory, all generated artifacts (proposal, specs, design, tasks) are committed together in one commit.
- After each completed task inside the worktree.
- After `/opsx:verify` (the verification report is itself a state change worth committing).
- After `/opsx:archive` (spec-sync is a meaningful state change on `develop`).
- After `/req-capture` writes the discovery doc.
- After each new/edit produced by `/task-import`, `/task-new`, `/task-generate`, `/task-enrich`.
- After `/task-jira` (optional — exports are paste-targets; commit if you want them in history).

A dense commit history is the recovery point when a SubAgent session goes wrong mid-apply — there is always a clean place to resume from rather than starting over.

## Guided flow

The pipeline is guided: the user should never have to remember what comes next. **Only ever suggest a wrapper command as the next step — `/start`, `/work`, or `/ship` (with `/next` as the recovery helper). Never surface a low-level primitive (`/opsx:*`, `/git-commit`, `/review-change`, `/task-*`, `/req-capture`) as the next step; the wrappers invoke those internally. The daily path is `/start → /work → /ship`.**

- **`/start` is the entry point** — when work begins, it asks which situation applies and routes accordingly: an existing Jira ticket (user pastes it), no ticket and propose directly, or no ticket and the task must exist first. Internally it may chain `/task-import`, `/req-capture`, `/task-new`, `/task-generate`, `/opsx:explore`, `/opsx:propose`, and the review — but it ends at a reviewed proposal on `develop` and hands the user `/work` as the next step. `/start` does not build.
- **`/next` is the recovery point** — when the user seems lost, returns after a break, or asks "what now?", run the `/next` logic: inspect git state, worktree state, task frontmatter, change artifacts, and PR state, then report where they are and the single best next action — always a wrapper. `/next` only suggests; the user runs the suggested command.
- **After a proposal is ready** — the next step is always `/work` (it creates the worktree, applies, and verifies). Never suggest `/opsx:apply` or `/opsx:verify` directly.
- **After a build is complete and verified** — the next step is always `/ship`.
- **After `/ship`** — list pending backlog tasks and suggest `/start` on the highest-priority one.
- Suggestions are advice, not actions: never run the suggested command without the user asking.

## Rules for agents

- `openspec/specs/` is the source of truth for current system behavior. Read it before proposing changes; never edit it directly — it only changes via `/opsx:archive`.
- Requirements use RFC-2119 keywords (MUST/SHALL/SHOULD/MAY). Each requirement has at least one scenario.
- If during implementation you discover the spec was wrong or incomplete, stop, update the spec, then continue. Do not silently diverge. On `develop`, use `/opsx:sync` to apply the delta; inside the worktree, edit the delta spec and re-sync after merge.
- Keep changes small: one concern per change, one change per worktree branch.
- Validate before archiving: `openspec validate <change> --strict`. `/ship` runs this as part of its verify gate.
- `workflow.yaml` at the repo root defines branches, commit convention, Jira/export settings, and worktree settings. Pipeline commands read it; never hardcode branch names or platforms.
- Task frontmatter (`status`, `change`, `id`) is the pipeline state of a backlog task. Commands keep it updated; don't bypass it.
- Never commit directly to `main` (release branch only). Working on `develop` is allowed when `git.work_mode: flexible`; worktrees (`work_mode: worktree`, default) are the recommended path. With `work_mode: feature`, a plain feature branch is mandatory.
- Feature branch naming: `feature/<task id>-<change>` when the change is linked to a backlog task with a real Jira key (e.g. `feature/PROJ-123-speed-up-search`), `feature/<change>` otherwise. When inferring the change from a branch name, strip the leading Jira key.
- **Branch gate**: no implementation work starts until the working branch is resolved (worktree created, or feature branch checked out). This applies to `/opsx:apply` and to any ad-hoc code edit. `/git-commit` re-checks at commit time as a safety net.
- All artifacts are written in the language the user configures in `workflow.yaml` (`content.default_language`).

## Repository layout

| Path | Purpose |
|------|---------|
| `backlog/` | Upstream product artifacts: discovery docs, tasks (Jira-mapped), Jira/PR exports |
| `openspec/specs/` | Current behavior, source of truth |
| `openspec/changes/` | In-flight changes (proposal, specs, design, tasks) |
| `openspec/changes/archive/` | Completed changes, audit history |
| `templates/` | Discovery, task, and PR description templates |
| `workflow.yaml` | Tool-agnostic pipeline config (branches, commits, Jira, worktrees) |
| `.worktrees/` | Per-change git worktrees (created by `/opsx:apply`, removed by `/ship`) |
| `.opencode/` | opencode agents, commands, and OpenSpec skills |

## Stack

This is a stack-agnostic template. When it is instantiated for a real project, record the tech stack and conventions in `openspec/config.yaml` (`context:` block) and extend this file.