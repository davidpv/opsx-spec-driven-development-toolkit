---
description: Enrich an existing task — edge cases, scenarios, estimate, DoD — on the integration branch
---

Enrich the task `$ARGUMENTS` (a Jira key like `PROJ-123`, or a path) in `backlog/tasks/`.

> **Branch guard (mandatory).** This command MUST run on the integration branch (`develop`, configured as `git.integration_branch` in `workflow.yaml`). It MUST NOT run inside a git worktree. Task edits live on `develop` — never in a worktree.

**Steps**

0. **Branch guard**

   ```bash
   git branch --show-current
   git worktree list
   pwd
   ```

   - Read `git.integration_branch` from `workflow.yaml`.
   - If the current branch is not the integration branch, refuse and tell the user to `git checkout <integration_branch>` first.
   - If `git worktree list` shows the working dir is inside a worktree, refuse and tell the user to run this from the main checkout.

1. Locate the task file. If the argument is ambiguous or missing, list tasks with `status: draft` and ask.

2. Cross-check against `openspec/specs/` and the source discovery doc: does it contradict current behavior? Does it overlap another task?

3. Enrich the task:
   - **Scenarios** — add missing unhappy paths: invalid input, permissions, empty states, concurrency, limits. Every Then must be observable/testable.
   - **Notes & edge cases** — record decisions and discovered constraints.
   - **Estimate** — propose one with a line of justification (points or hours per project convention).
   - **Ambiguities** — if any acceptance criterion is untestable as written, ask the user with **AskUserQuestion** rather than guessing.

4. Update frontmatter: `status: enriched`, `estimate`.

5. Run the `task-reviewer` subagent on the result. If it returns REVISE, fix the findings and re-run once.

6. **Commit on `develop` (commit discipline)**

   ```bash
   git add backlog/tasks/<file>
   git commit -m "docs(tasks): enrich <id>"
   ```

   If the frontmatter `status:` change is in the same edit, that's fine — one commit covers both. Skip only if the user explicitly asks to defer.

7. Suggest next: `/task-jira <id>` to export, or `/opsx-propose` referencing the task to start implementation.