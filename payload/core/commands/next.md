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

**Decision table (first match wins):**

| State | Suggest |
|-------|---------|
| Nothing in backlog, no in-flight change | `/start` — guided entry: existing Jira ticket (`/task-import`), direct proposal (`/opsx:propose`), or create the task first (`/task-new`, `/req-capture`) |
| Discovery doc without tasks | `/task-generate <topic>` |
| Tasks with `status: draft` | `/task-enrich <id>` (list them) |
| Enriched tasks not exported and no `change:` | `/task-jira <id>` (optional) and/or `/opsx:propose` |
| Change with incomplete artifacts (on `develop`) | continue `/opsx:propose` / `/opsx:continue` |
| Change complete but not reviewed (on `develop`) | `/review-change <name>` |
| Reviewed on `develop`, no worktree yet | `/opsx:apply <name>` — creates the worktree |
| Inside `<worktree-dir>/<change>/`, unchecked tasks | `/opsx:apply` (continue, list remaining steps) |
| Inside worktree, uncommitted changes | `/git-commit` |
| Inside worktree, all tasks done | `/opsx:verify <name>` (run inside the worktree) |
| Verify report committed on `feature/<change>`, user on `develop` | `/ship <name>` |
| PR open or work pushed on integration branch | `/ship <change>` (does verify → merge → archive → cleanup) |
| Worktree branch merged into `develop`, worktree path still exists | cleanup: tell the user the path so they can `git worktree remove` (or warn that `/ship` did not clean up because `auto_remove: false`) |
| Multiple active changes | `/work [changes...]` to fan out into parallel worktrees (one SubAgent per change) |
| Change archived but task not `done` | finish close-out: open the task file, set `status: done`, commit (or rerun `/ship`) |
| Everything closed | list pending tasks from the backlog, suggest the highest-priority one |

**Output format:** three short sections — *Where you are* (one line), *Next step* (one command with why), *Also possible* (0–2 alternatives, e.g. optional Jira export or `/work` for parallelism). Be terse; no walls of text. `/next` never runs the suggested command — it only prints it.