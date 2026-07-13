---
description: Import an existing Jira ticket into backlog/tasks/ as a pipeline task on the integration branch
---

Import the existing Jira ticket `$ARGUMENTS` (a real Jira key like `PROJ-123`) into `backlog/tasks/` using `templates/task.md`. The ticket content is **always pasted by the user** — never fetch it from Jira or invent it.

> **Branch guard (mandatory).** This command MUST run on the integration branch (`develop`, configured as `git.integration_branch` in `workflow.yaml`). It MUST NOT run inside a git worktree. Tasks are management-plane planning artifacts and live on `develop` alongside discovery docs and OpenSpec changes — never in a worktree.

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

1. Read `workflow.yaml` (`jira.project_key`, `backlog.tasks_dir`). If `$ARGUMENTS` is missing or doesn't look like a Jira key, ask for it. If the key's project prefix differs from `jira.project_key`, warn but don't block.

2. If `backlog/tasks/` already has a file for that key, show it and ask whether to update it from a fresh paste or abort.

3. Ask the user to **paste the ticket content**: title, description, acceptance criteria, and any comments worth keeping. Plain text or Jira wiki markup, as-is.

4. Normalize the paste into `templates/task.md` — restructure, don't rewrite meaning:
   - Frontmatter: `id` = the real Jira key, `status: draft`, `discovery: ~` (no discovery doc), `priority` only if the ticket states one.
   - Ticket description → **Goal** (what & why) and **Context** (background, affected areas).
   - Acceptance criteria → Gherkin scenarios. Convert only what the ticket actually says; if a criterion isn't testable as written, keep it verbatim under **Notes & edge cases** flagged as `needs clarification` — do NOT invent Given/When/Then.
   - Anything the ticket leaves open goes to **Notes & edge cases** as open points.
   - Add one line to **Context**: `Imported from Jira <key> on <date>.`

5. Write `backlog/tasks/<key>-<slug>.md` and run the `task-reviewer` subagent on it.

6. **Commit on `develop` (commit discipline)**

   ```bash
   git add backlog/tasks/<key>-<slug>.md
   git commit -m "docs(tasks): import <key> from jira"
   ```

   Skip only if the user explicitly asks to defer.

7. Suggest next, based on the review:
   - Findings or thin scenarios → `/task-enrich <key>` to fill edge cases and estimate.
   - Solid as imported → `/opsx:propose <change-name>` referencing the task.
   - Never suggest `/task-jira` here — the ticket already exists in Jira.