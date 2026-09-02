# opsx — Spec-Driven Development Toolkit

[![npm version](https://img.shields.io/npm/v/@davidpv/opsx.svg)](https://www.npmjs.com/package/@davidpv/opsx)

A stack-agnostic CLI that scaffolds **spec-driven development** on top of [OpenSpec](https://github.com/Fission-AI/OpenSpec), for [opencode](https://opencode.ai), [Claude Code](https://docs.claude.com/en/docs/claude-code) or [Codex](https://developers.openai.com/codex).

The principle: **Spec → Plan → Code.** Code is the last artifact produced, never the first. Every change is structured as proposal + specs + design + tasks, implemented in an isolated checkout, with full traceability back to the requirements. It follows the [OpenSpec + git-worktree](https://intent-driven.dev/blog/2026/04/01/openspec-git-worktrees-opencode/) discipline.

## Install

```bash
npx @davidpv/opsx init
```

Needs only **Node.js >= 18** and a git repo. `init` walks you through picking your agent (opencode / Claude Code / Codex), branches, Jira key, language, and working mode, then writes everything in place.

## The model: three commands, one principle

Two planes coexist. The **management plane** (Jira) decides *what work exists*; the **governance plane** (OpenSpec) decides *how the system must behave* — and only the latter authorizes code.

```mermaid
flowchart LR
    subgraph MGMT["Management plane — what work exists (Jira)"]
        direction LR
        D["Discovery<br/>backlog/discovery/"] --> T["Task PROJ-123<br/>backlog/tasks/<br/>goal + acceptance criteria"]
    end

    subgraph GOV["Governance plane — how the system must behave (OpenSpec)"]
        direction LR
        C["Change<br/>proposal + delta specs<br/>+ design + tasks<br/>(on develop)"] -- "archive (after merge)" --> S["openspec/specs/<br/>SOURCE OF TRUTH"]
        S -. "read before proposing" .-> C
    end

    W["Isolated checkout<br/>automated: .worktrees/&lt;change&gt;/<br/>supervised: GUI worktree"]
    CODE["Code<br/>commits in the isolated checkout"]

    T -- "a task authorizes NO code<br/>it only motivates a change" --> C
    C -- "/work builds it in isolation" --> W
    W -- "code in the isolated checkout" --> CODE
    CODE -- "/ship: merge then archive" --> C
```

A well-written task authorizes nothing: implementation starts only when an OpenSpec change exists, is reviewed, and an isolated checkout is resolved for it. **Jira rules the backlog, the spec rules the code.**

The daily path is just three wrapper commands (with `/next` as a "what now?" helper):

| Command | What it does |
|---|---|
| `/start` | Route new work and chain up to a reviewed proposal on `develop` |
| `/work [changes...]` | Build a change in isolation (apply + verify) |
| `/ship <change>` | Verify gate, then merge + archive + close (see working modes) |

Everything under `/opsx:*` (and `/task-*`, `/review-*`, `/git-commit`) is an internal primitive the wrappers call — not part of the daily path. **`/git-commit` is the user's tool** — no pipeline command (including the LLM) auto-commits; the user always approves commit messages via `/git-commit` or the GUI commit button.

## Working modes

`git.work_mode` in `workflow.yaml` decides **who owns git isolation**. Commits stay user-driven in both modes — "automated" means isolation is automated, not that the LLM auto-commits.

| Mode | Who owns worktrees / branches / merge | When to use |
|---|---|---|
| **`automated`** (default) | opsx creates `.worktrees/<change>/` on `feature/<change>`, `/ship` merges and removes the worktree | CLI agents (opencode TUI, Claude Code / Codex in a terminal) |
| **`supervised`** | The agent GUI already isolated this session. opsx never creates/removes worktrees, never creates/switches/deletes branches, never merges | VS Code Agents window, Superset.sh, GitHub Copilot app, Cursor |

`worktree` is a deprecated alias of `automated`. `feature` and `flexible` are no longer supported — pick one of the two modes above.

**Automated** daily path (one CLI checkout):

```
/start → /work → /ship
```

opsx creates the worktree, implements, verifies, squash-merges into `develop`, archives, and cleans up.

**Supervised** daily path (two sessions — git will not check out the same branch in two worktrees):

```
[planning session on develop]     /start
[new GUI workspace from develop]
[implementation session]          /work      # cwd is already the isolation
[merge / PR in the GUI]
[planning session on develop]     /ship      # archive + close only
```

- `/start` inside a feature worktree refuses (never `git checkout develop`). That session is for `/work`.
- `/work` on `develop` in supervised mode refuses (never creates `.worktrees/`). Create a GUI workspace first.
- `/ship` in the implementation session verifies and tells you to merge in the GUI. Archive runs when you re-run `/ship` from `develop` after the branch has merged.

Propose, archive, and `/task-*` always run on the integration branch. OpenSpec needs every in-flight change plus `openspec/specs/` — planning on a stale GUI branch would miss conflicts.

## Quick start

```bash
npx @davidpv/opsx init      # pick targets, configure branches, Jira key, language, working mode
npx @davidpv/opsx doctor    # verify required tooling (openspec CLI, agent CLIs)
```

Then, inside your agent:

```
/start      # guided entry → reviewed proposal on develop
/work       # build in isolation (apply + verify)
/ship       # verify + merge/archive/close (shape depends on work_mode)
```

For non-trivial initiatives, `/start` will chain the backlog steps (requirements interview, task generation, enrichment) before proposing. You never need to invoke those directly.

## Prerequisites

`npx @davidpv/opsx init` needs only Node.js >= 18. To *use* the scaffolded workflow:

| Requirement | Needed for |
|---|---|
| **Git repository** | Branches, worktrees, gates, traceability |
| **OpenSpec CLI** | Every `/opsx:*` command shells out to `openspec` (`npm i -g @fission-ai/openspec`) |
| **An agent CLI** | opencode / Claude Code / Codex (only the targets you selected) |
| **SubAgent support** | `/work` parallel mode in `automated` (opencode/Claude Code built in; Codex needs config). Unused in `supervised` — the GUI already parallelizes |
| `gh` / `glab` (optional) | PR automation; otherwise the PR description is written to `backlog/exports/pr/` |

`opsx doctor` checks all of this and reports what's missing. It also warns if the checkout looks GUI-managed while `work_mode` is still `automated`.

## Rules that matter

- **Propose on `develop`, never in a feature worktree.** OpenSpec's conflict detection needs the full view of every active change and the authoritative `openspec/specs/`.
- **Verify before merge.** `/ship` refuses to merge (or to tell the GUI to merge) unless a clean verify report exists for the current state of the branch.
- **Merge, then archive.** Code lands on `develop` first, then delta specs sync into `openspec/specs/`. In `automated`, `/ship` does both. In `supervised`, the GUI merges; `/ship` on `develop` archives.
- **`main` is release-only.** Proposals land on the integration branch (`develop` by default). Isolation is either an opsx worktree (`automated`) or a GUI worktree (`supervised`). Configure this with `git.work_mode` in `workflow.yaml`.
- **The LLM never auto-commits.** All commits are user-driven. Every command ends by suggesting `/git-commit` (or the GUI commit button in `supervised`). After modifying any file — code, specs, artifacts, config — the LLM stages and suggests `/git-commit`; the user reviews the message and finalizes the commit.
- **Spec wrong or drifted?** Never diverge silently — run `/opsx:sync` to fix the spec first, then resume.

Traceability chain: **Discovery → Task (Jira) → Change → tasks.md step → user commits via `/git-commit` → merge → archive**. Task IDs ARE Jira keys (`PROJ-123`; `PROJ-Dnn` for drafts).

## Commands

The three wrappers above are all you need day to day. The primitives they call:

<details>
<summary>Tasks — optional, for non-trivial initiatives</summary>

| Command | What it does |
|---|---|
| `/req-capture <topic>` | Requirements interview → `backlog/discovery/<topic>.md` |
| `/task-import <id>` | Import an existing Jira ticket (you paste it) into `backlog/tasks/` |
| `/task-new <title>` | Create a single task directly (draft ID) |
| `/task-generate <topic>` | Slice a discovery doc into tasks; you provide the Jira IDs |
| `/task-enrich <id>` | Add edge cases, unhappy paths, estimate |
| `/review-task <id>` | Audit a task: sizing, testability, traceability |
| `/task-jira <id\|all>` | Export tasks as Jira wiki markup to `backlog/exports/jira/` |

</details>

<details>
<summary>OpenSpec lifecycle — called by the wrappers</summary>

| Command | What it does |
|---|---|
| `/opsx:explore` | Investigate the codebase/specs before proposing |
| `/opsx:propose <name>` | Create a change (proposal, delta specs, design, tasks) on `develop` |
| `/review-change <name>` | Spec-reviewer audit + `openspec validate --strict` |
| `/opsx:apply <name>` | Implement tasks (`automated`: create the worktree; `supervised`: use cwd) |
| `/git-commit` | Conventional commit traced to change/step/Jira task — **the user-only commit tool; LLM never auto-commits** |
| `/opsx:verify <name>` | Verify implementation matches artifacts (required before `/ship`) |
| `/opsx:sync` | Sync specs with reality when they drift |
| `/opsx:archive <change>` | Sync delta specs into `openspec/specs/` after merge |
| `/pr-open [name]` | Create a PR against the integration branch (gh/glab/file fallback). Optional in `supervised` — the GUI usually has the PR button |

</details>

## Repository layout

```
.
├── AGENTS.md          # Rules every agent must follow
├── workflow.yaml      # Pipeline config: branches, work_mode, commits, Jira
├── templates/         # discovery.md, task.md, pr-description.md
├── backlog/           # discovery/, tasks/ (Jira IDs), exports/ (jira + pr)
├── .worktrees/        # Per-change git worktrees in automated mode (gitignored)
├── .opencode/         # commands, skills, agents (or .claude/ / .codex/)
└── openspec/
    ├── config.yaml    # Project context + per-artifact rules
    ├── specs/         # Source of truth (current behavior)
    └── changes/       # In-flight changes; archive/ keeps history
```

## Keeping opsx updated

Upgrading the npm package does **not** deploy new commands/skills to an existing project — you must also run `opsx update`:

```bash
npm update -g @davidpv/opsx     # 1. upgrade the package
npx @davidpv/opsx update        # 2. deploy new/changed files into your project
```

`opsx update` creates new files, overwrites unmodified ones, and keeps files you've edited (use `--force` to overwrite). The `AGENTS.md` managed block and `opencode.json` / `settings.json` keys are merged without clobbering your customizations.

If your project still has `git.work_mode: worktree`, that alias keeps working; rename it to `automated` when convenient. If it still has `feature` or `flexible`, set `automated` or `supervised` — those old values are no longer valid.

```bash
npx @davidpv/opsx --version     # installed version
npx @davidpv/opsx doctor        # verify tooling and project state
```

Check the [CHANGELOG](https://github.com/anomalyco/opsx-spec-driven-development-toolkit/releases) for breaking changes before updating.
