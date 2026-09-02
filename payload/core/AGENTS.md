# Agent Instructions — Spec-Driven Development with OpenSpec

This repository follows **spec-driven development**: no code is written until the change is captured as an OpenSpec proposal with specs, design, and tasks. OpenSpec is the machinery that enforces this; the agent executes it.

## The golden rule

> **Spec → Plan → Code. Never skip a stage.**

If a request arrives as "build X" and there is no OpenSpec change for it, your first move is `/opsx:propose` — not writing code.

## Resolve `git.work_mode` (every command)

Read `git.work_mode` from `workflow.yaml` before any git topology:

- `automated` or deprecated alias `worktree` → **automated**
- `supervised` → **supervised**
- `feature`, `flexible`, or anything else → **stop**. Tell the user to set `automated` (opsx owns worktrees) or `supervised` (the agent GUI owns isolation).

**Automated** means isolation is automated (opsx creates worktrees, branches, merge). It does **not** mean the LLM auto-commits. Commits stay user-driven in both modes.

## The four wrapper commands

The pipeline is exposed to users through four top-level wrappers. Everything else (`/opsx:*`) is an internal primitive invoked by the wrappers — callable by power users, but not part of the daily path.

- **`/start`** — entry: route new work (existing Jira ticket / direct change / new task) and chain up to a reviewed proposal on `develop`, ready for `/work`.
- **`/next`** — recovery point: inspect state and suggest the next step (always a wrapper). Always suggest, never auto-advance.
- **`/work [changes...]`** — build: implement a change in isolation (apply + verify).
  - **automated:** one git worktree per change. Multiple changes: `workflow.use_subagents` (`yes` default) fans out one SubAgent per non-conflicting change; `no` applies sequentially. SubAgents do not merge.
  - **supervised:** apply + verify in **cwd**. Never create a worktree. One change per session (the GUI already parallelizes). Ignore `use_subagents`.
- **`/ship <change>`** — close:
  - **automated:** verify gate → merge into the integration branch → archive on develop → cleanup worktree → close the linked task.
  - **supervised:** verify gate; do **not** merge or remove worktrees. Tell the user to merge in the GUI. Archive + close only when re-run from `develop` after the branch has merged.

The daily path is **`/start → /work → /ship`**, with `/next` as the "what now?" helper. Everything under `/opsx:*` (plus `/git-commit`, `/review-change`, `/task-*`, `/req-capture`) is an internal primitive the wrappers call — never suggest them to the user as the next step.

## Workflow

The full pipeline runs from requirements to merge. Stages 0–1 are optional for trivial changes; stages 2–6 are mandatory.

0. **Discover** — `/req-capture <topic>` interviews the user and writes `backlog/discovery/<topic>.md`. No invented answers: unknowns go to Open questions.
1. **Tasks** — `/task-generate <topic>` slices the discovery into tasks under `backlog/tasks/`. Alternative entries: `/task-import <key>` normalizes an existing Jira ticket (pasted by the user) into the backlog; `/task-new <title>` creates a single task without a discovery doc. Task IDs ARE Jira keys (`<project_key>-<n>`, provided by the user; `-Dnn` drafts until the issue exists). `/task-enrich <id>` adds edge cases, estimates, and unhappy paths; `/review-task <id>` audits; `/task-jira <id>` exports Jira wiki markup to `backlog/exports/jira/` (not needed for imported tickets).
2. **Propose on develop** — `/opsx:propose <change-name>` runs on the integration branch (`develop`) and creates `openspec/changes/<name>/` with proposal, delta specs, design, and tasks. **Propose must run on `develop`, never inside a feature worktree** — OpenSpec needs to see all active changes and the authoritative specs to detect conflicts. If the change implements a backlog task, the proposal references its ID and the task frontmatter gets `change: <name>`. End the run with a commit on `develop`.
3. **Specify & plan** — Delta specs (requirements + GIVEN/WHEN/THEN) as ADDED/MODIFIED/REMOVED; `design.md` for the approach; `tasks.md` for checkable steps. All artifacts are committed together in one commit on `develop` for a clean recovery point.
4. **Review** — `/review-change <name>` audits the change before implementation.
5. **Implement in isolation** — `/opsx:apply <name>`.
   - **automated:** create (or reuse) a git worktree at `.worktrees/<change>/` on `feature/<change>` (or `feature/<task-id>-<change>` if linked to a real Jira key) and run tasks inside it.
   - **supervised:** use cwd. Never `git worktree add` / `git checkout -b`. Bind the change from `$ARGUMENTS`, conversation, or `openspec/changes/` in this tree — do not require the branch to be named `feature/<change>`.
6. **Verify in the isolated checkout** — `/opsx:verify <name>`.
   - **automated:** must run inside `.worktrees/<change>/`.
   - **supervised:** run in cwd (not on `main`). Write the verify record in this checkout.
7. **Merge, then archive, then close** — `/ship <name>`. Order is **merge → archive**, every time.
   - **automated:** verify gate → merge the worktree branch into `develop` → `/opsx:archive` on `develop` → clean up the worktree and local branch → close the linked task.
   - **supervised:** verify in the implementation session, tell the user to merge in the GUI, stop. After the GUI merge, re-run `/ship` from a develop planning session to archive + close. Never `git merge` / `git worktree remove` / `git branch -d`.

For multiple independent changes in **automated** mode, `/work` uses `workflow.use_subagents`. In **supervised** mode, open one GUI workspace per change and run `/work <name>` in each.

Traceability chain: **Discovery → Task (Jira) → Change → tasks.md step → Commit → PR**. Note: "task" means a backlog/Jira task; tasks.md inside a change holds implementation steps.

## Branch discipline (mandatory)

| Step | Required branch | Why |
|---|---|---|
| `/opsx:propose` | `develop` (integration) | Must see all in-flight changes + `openspec/specs/` |
| `/opsx:apply` | isolated checkout (see mode) | Isolated implementation |
| `/opsx:verify` | same isolated checkout | Verify against the actual code that will be merged |
| `/ship` (merge / instruct) | automated: `develop`; supervised: implementation session then `develop` | Code lands first, then specs sync |
| `/opsx:archive` | `develop`, after merge | Spec-sync needs the full view of every other merged change |
| `/opsx:sync` | `develop` | Same reasoning as archive |
| `/req-capture` | `develop` | Discovery doc is a planning artifact, lives with OpenSpec changes |
| `/task-import` | `develop` | Tasks are planning artifacts, live with their discovery doc |
| `/task-new` | `develop` | Same |
| `/task-generate` | `develop` | Same |
| `/task-enrich` | `develop` | Edits happen where the task was created |
| `/task-jira` | `develop` | Jira exports derive from the tasks on `develop` |

Each step refuses to run on the wrong branch and prints the required one. **Never commit directly to `main`** (release branch). **Planning lives on `develop`, code lives in an isolated checkout.**

If the current branch is not the integration branch and the command is a planning command (`/start` chain, propose, archive, sync, `/task-*`):

- **automated:** refuse and tell the user to `git checkout <integration_branch>` first.
- **supervised:** refuse. NEVER run `git checkout`. Tell the user this session is for `/work`; open a planning session on `<integration_branch>` (VS Code without New Worktree, or Superset branch workspace).

If cwd is a linked worktree **outside** `git.worktree.dir` (or `SUPERSET_WORKSPACE_NAME` is set) and mode is still `automated`: refuse topology commands (`git worktree add/remove`, `git checkout -b`, `git merge`) and tell the user to set `git.work_mode: supervised`.

## Commit discipline (mandatory — user-driven)

> **The LLM NEVER runs `git commit`.** All commits in this project are user-driven. After modifying files, the LLM **always** suggests `/git-commit` and lets the user review the message and finalize the commit. This applies to every modified file, every artifact, and every state change — no exceptions, no auto-commits, no recovery commits, no "internal" commits behind the scenes.

The user is always in control of the commit boundary. They run `/git-commit` when they are ready (or the GUI commit button in supervised mode). No command (`/opsx:*`, `/work`, `/ship`, `/git-commit`, `/task-*`, `/req-capture`) runs `git commit` on behalf of the user.

**Commits SHOULD land at every logical boundary** — the LLM suggests `/git-commit` at each one so the user can act:

- After `/opsx:propose` creates the change directory — all generated artifacts (proposal, specs, design, tasks) in one commit.
- After each completed task inside the isolated checkout.
- After `/opsx:verify` writes the verification record.
- After `/opsx:archive` syncs delta specs into `openspec/specs/`.
- After `/req-capture` writes the discovery doc.
- After each new/edit produced by `/task-import`, `/task-new`, `/task-generate`, `/task-enrich`.
- After `/task-jira` (optional — exports are paste-targets).
- After `/ship` closes the linked task (`status: done`).

The LLM **suggests** `/git-commit` at each of these boundaries and waits for the user. A dense commit history is still the recovery point when a SubAgent session goes wrong mid-apply — but the user creates it, not the agent.

## Guided flow

The pipeline is guided: the user should never have to remember what comes next. **Only ever suggest a wrapper command as the next step — `/start`, `/work`, or `/ship` (with `/next` as the recovery helper). Never surface a low-level primitive (`/opsx:*`, `/git-commit`, `/review-change`, `/task-*`, `/req-capture`) as the next step; the wrappers invoke those internally. The daily path is `/start → /work → /ship`.**

In **supervised** mode, print the two-session split every time `/start`, `/work`, or `/next` runs:

```
planning session on develop  →  /start
GUI workspace from develop   →  /work
merge in the GUI
planning session on develop  →  /ship   (archive + close)
```

- **`/start` is the entry point** — when work begins, it asks which situation applies and routes accordingly. Internally it may chain `/task-import`, `/req-capture`, `/task-new`, `/task-generate`, `/opsx:explore`, `/opsx:propose`, and the review — but it ends at a reviewed proposal on `develop` and hands the user `/work` as the next step. `/start` does not build. In supervised mode, if cwd is not on the integration branch, refuse (never checkout) and point at a planning session.
- **`/next` is the recovery point** — inspect git state, worktree/cwd state, task frontmatter, change artifacts, and PR state, then report where they are and the single best next action — always a wrapper. `/next` only suggests; the user runs the suggested command.
- **After a proposal is ready** — the next step is always `/work`. In automated mode it creates the worktree. In supervised mode, tell the user to open a GUI workspace from develop first if they are still on develop. Never suggest `/opsx:apply` or `/opsx:verify` directly.
- **After a build is complete and verified** — the next step is always `/ship`.
- **After `/ship`** — list pending backlog tasks and suggest `/start` on the highest-priority one.
- Suggestions are advice, not actions: never run the suggested command without the user asking.

## Rules for agents

- `openspec/specs/` is the source of truth for current system behavior. Read it before proposing changes; never edit it directly — it only changes via `/opsx:archive`.
- Requirements use RFC-2119 keywords (MUST/SHALL/SHOULD/MAY). Each requirement has at least one scenario.
- If during implementation you discover the spec was wrong or incomplete, stop, update the spec, then continue. Do not silently diverge. On `develop`, use `/opsx:sync` to apply the delta; inside the isolated checkout, edit the delta spec and re-sync after merge.
- **Never run `git commit`.** The user always commits. After any file modification — code, specs, artifacts, config, anything — finish by suggesting `/git-commit` so the user can review the message and finalize the commit. Do not stage with `git add` and commit in the same turn; let `/git-commit` do both under user control.
- Keep changes small: one concern per change, one isolated checkout per change.
- Validate before archiving: `openspec validate <change> --strict`. `/ship` runs this as part of its verify gate.
- `workflow.yaml` at the repo root defines branches, `work_mode`, commit convention, Jira/export settings, and worktree settings. Pipeline commands read it; never hardcode branch names or platforms.
- Task frontmatter (`status`, `change`, `id`) is the pipeline state of a backlog task. Commands keep it updated; don't bypass it.
- Never commit directly to `main` (release branch only).
- Feature branch naming (**automated** only): `feature/<task id>-<change>` when the change is linked to a backlog task with a real Jira key (e.g. `feature/PROJ-123-speed-up-search`), `feature/<change>` otherwise. When inferring the change from a branch name, strip the leading Jira key. **supervised:** do not rename the GUI's branch; bind the change by argument / conversation / `openspec/changes/`.
- **Branch gate**: no implementation work starts until the working checkout is resolved (opsx worktree created, or cwd already isolated in supervised mode). This applies to `/opsx:apply` and to any ad-hoc code edit. `/git-commit` re-checks at commit time as a safety net.
- All artifacts are written in the language the user configures in `workflow.yaml` (`content.default_language`).

## Repository layout

| Path | Purpose |
|------|---------|
| `backlog/` | Upstream product artifacts: discovery docs, tasks (Jira-mapped), Jira/PR exports |
| `openspec/specs/` | Current behavior, source of truth |
| `openspec/changes/` | In-flight changes (proposal, specs, design, tasks) |
| `openspec/changes/archive/` | Completed changes, audit history |
| `templates/` | Discovery, task, and PR description templates |
| `workflow.yaml` | Tool-agnostic pipeline config (branches, work_mode, commits, Jira, worktrees) |
| `.worktrees/` | Per-change git worktrees in automated mode (created by `/opsx:apply`, removed by `/ship`) |
| `.opencode/` | opencode agents, commands, and OpenSpec skills |

## Stack

This is a stack-agnostic template. When it is instantiated for a real project, record the tech stack and conventions in `openspec/config.yaml` (`context:` block) and extend this file.
