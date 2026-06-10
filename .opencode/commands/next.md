---
description: Detect where you are in the pipeline and suggest the next step
---

Inspect the repository state and tell the user exactly where they are in the pipeline and what to do next. `$ARGUMENTS` may name a change or task to focus on; otherwise infer from the current branch, then from the most recently modified artifacts.

**State inspection (run all, fast):**

- `git branch --show-current`, `git status --short`, unpushed commits (`git log @{u}..` if upstream exists)
- `backlog/tasks/*.md` frontmatter: `status`, `change`, draft IDs (`-Dnn`)
- `openspec/changes/`: in-flight changes; for the focused one, `openspec status --change <name> --json` and unchecked items in `tasks.md`
- Open PR if a platform CLI exists (`gh pr status` / `glab mr list`)

**Decision table (first match wins):**

| State | Suggest |
|-------|---------|
| Nothing in backlog, no in-flight change | `/req-capture <topic>` for an initiative, or `/opsx:propose` for a direct change |
| Discovery doc without tasks | `/task-generate <topic>` |
| Tasks with `status: draft` | `/task-enrich <id>` (list them) |
| Enriched tasks not exported and no `change:` | `/task-jira <id>` (optional) and/or `/opsx:propose` |
| Change with incomplete artifacts | continue `/opsx:propose` / `/opsx:continue` |
| Change complete but not reviewed | `/review-change <name>` |
| Reviewed, but still on main/integration with no work | branch gate: create the feature branch, then `/opsx:apply` |
| Unchecked steps in `tasks.md` | `/opsx:apply` (list remaining steps) |
| Uncommitted working-tree changes | `/git-commit` |
| All steps done, on feature branch, no PR | `/pr-open` |
| PR open / work pushed on integration branch | `/ship` |
| Change archived but task not `done` | finish `/ship` close-out (task status, Jira transition) |
| Everything closed | list pending tasks from the backlog, suggest the highest-priority one |

**Output format:** three short sections — *Where you are* (one line), *Next step* (one command with why), *Also possible* (0–2 alternatives, e.g. optional Jira export). Be terse; no walls of text.
