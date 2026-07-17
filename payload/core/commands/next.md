---
description: Detect where you are in the pipeline and suggest the next step
---

Inspect the repository state and tell the user exactly where they are in the pipeline and what to do next. `$ARGUMENTS` may name a change or task to focus on; otherwise infer from the current branch, the current worktree (if any), and then from the most recently modified artifacts. `/next` only suggests — it never executes the suggested command.

**State inspection (run all, fast):**

- `git branch --show-current`, `git status --short`, unpushed commits (`git log @{u}..` if upstream exists)
- `git worktree list` and `pwd` — figure out whether the user is on `develop`, inside a worktree, or on a feature branch
- `backlog/tasks/*.md` frontmatter: `status`, `change`, draft IDs (`-Dnn`)
- `openspec/changes/`: in-flight changes; for the focused one, `openspec status --change <name> --json` and unchecked items in `tasks.md`
- For each worktree, `.openspec/verify-*.md` or `.openspec/verify.log`: has verify run recently?
- Open PR if a platform CLI exists (`gh pr status` / `glab mr list`)

**Decision table (first match wins).**

Only ever suggest a wrapper command — `/start`, `/work`, or `/ship`. Never suggest a low-level primitive (`/opsx:*`, `/git-commit`, `/review-change`, `/task-*`, `/req-capture`) as the next step; the wrappers invoke those internally. Detect state precisely, but map it to the wrapper for the current phase.

| State | Suggest |
|-------|---------|
| Nothing in backlog, no in-flight change | `/start` — guided entry: it routes an existing Jira ticket, a direct proposal, or creating the task first |
| Work still being set up on `develop` (discovery without tasks, `status: draft` tasks, or a change with incomplete/unreviewed artifacts) | `/start` — it continues the on-ramp: task setup → propose → review |
| Reviewed proposal on `develop`, not yet built (no worktree, or a worktree with unchecked tasks / uncommitted work / verify not yet run) | `/work <name>` — builds it in a worktree (apply + verify), or resumes an in-progress build |
| Multiple active changes ready to build | `/work [changes...]` — mode is governed by `workflow.use_subagents` in `payload/core/workflow.yaml` (default `yes`): `yes` fans out one SubAgent per non-conflicting change, `no` applies them sequentially on the main checkout |
| Build complete and verified (report on `feature/<change>`, PR open, or work pushed) | `/ship <name>` — verify gate → merge → archive → cleanup → close |
| Worktree branch merged into `develop` but not archived, or worktree path still lingering | `/ship <name>` — re-run to finish archive + cleanup |
| Change archived but task not `done` | `/ship <name>` — re-run to finish close-out, then `/start` for the next |
| Everything closed | list pending tasks from the backlog and suggest `/start` on the highest-priority one |

**Output format:** three short sections — *Where you are* (one line, may mention the low-level detail so the user understands the state), *Next step* (one wrapper command with why), *Also possible* (0–2 wrapper alternatives). Be terse; no walls of text. `/next` never runs the suggested command — it only prints it.