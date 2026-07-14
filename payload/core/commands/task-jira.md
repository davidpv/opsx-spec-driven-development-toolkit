---
description: Export tasks as Jira-ready markup to backlog/exports/jira/ — on the integration branch
---

Export the task `$ARGUMENTS` (a Jira key like `PROJ-123`, `all`, or a status like `enriched`) to Jira-compatible markup.

> **Branch guard (mandatory).** This command MUST run on the integration branch (`develop`, configured as `git.integration_branch` in `workflow.yaml`). It MUST NOT run inside a git worktree. Jira exports live on `develop` alongside the tasks they derive from — never in a worktree.

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

1. Read `workflow.yaml` (`jira.project_key`, `jira.export_dir`, `jira.default_issue_type`). Resolve which tasks to export from the argument; default to all with `status: enriched`.

2. For each task render `backlog/exports/jira/<id>.md` in **Jira wiki markup** (not GitHub markdown):

   - `h2.` headings, `*bold*`, `{code}...{code}` blocks for Gherkin (only {code} blocks, there is a bug in Jira not recognizing {code:gherkin} markdown, it only recognizes {code} blocks), `||header||` tables, `# / *` lists.
   - Structure: Summary line (`<id> — <title>`), issue type (`jira.default_issue_type` unless the task says otherwise), priority, `h2. Goal`, `h2. Acceptance criteria` with each scenario in a `{code}` block, `h2. Notes`, and a final line `Source: backlog/tasks/<file>` for traceability.
   - Do not include the YAML frontmatter.

3. Print where the files were written and remind the user: paste into Jira's description field with the wiki editor, or bulk-import.

4. **Draft IDs**: if any exported task has a draft ID (`<project_key>-Dnn`), remind the user to create the issue in Jira and then rename the task file and its `id:` frontmatter to the real key — offer to do the rename if they provide the keys now.

5. **Stage and suggest `/git-commit` (no auto-commit, optional)**

   > **Never run `git commit` automatically.** All commits are user-driven. The Jira exports are paste-targets; staging them is optional, and the commit is the user's decision.

   ```bash
   git add backlog/exports/jira/
   ```

   The user runs `/git-commit` if they want the export history captured. Skip the suggestion entirely if the user prefers to leave exports uncommitted.