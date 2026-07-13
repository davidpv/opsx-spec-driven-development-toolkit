---
description: Generate work tasks (Jira-mapped) from a discovery doc into backlog/tasks/ — on the integration branch
---

Generate tasks from the discovery doc `backlog/discovery/$ARGUMENTS.md` using `templates/task.md`.

> **Branch guard (mandatory).** This command MUST run on the integration branch (`develop`, configured as `git.integration_branch` in `workflow.yaml`). It MUST NOT run inside a git worktree. Tasks and discovery docs are management-plane planning artifacts and live on `develop` — never in a worktree.

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

1. Read the discovery doc. If it doesn't exist, list available ones and ask which to use (or suggest `/req-capture` first).

2. Read `workflow.yaml` (`jira.project_key`, `backlog.tasks_dir`).

3. Slice the functional needs into tasks. Rules:
   - One verifiable outcome per task; split anything you couldn't implement in one OpenSpec change.
   - Each task gets a **Goal** (what & why), **Context**, and at least one Gherkin scenario per acceptance criterion, including one unhappy path. Every Then must be observable/testable.
   - Non-functional needs become acceptance criteria on the tasks they constrain, or their own task if cross-cutting.
   - Do NOT create tasks from **Open questions** — list them at the end as "blocked: needs answer".

4. **Task IDs are Jira keys.** Show the user the proposed task list (title + one-line goal) and ask them to provide the Jira ID for each (e.g. `PROJ-123`). For tasks not yet created in Jira, assign draft IDs `<project_key>-D01`, `-D02`, ... and note they must be renamed when the real key exists.

5. Write each task to `backlog/tasks/<id>-<slug>.md` with frontmatter filled: `id`, `title`, `status: draft`, `discovery`, `priority` (MoSCoW from the discovery's goals), `language`.

6. **Commit each task individually on `develop` (commit discipline)**

   ```bash
   git add backlog/tasks/<id>-<slug>.md
   git commit -m "docs(tasks): add <id> from <discovery-topic>"
   ```

   One commit per task. Skip only if the user explicitly asks to batch.

7. Suggest `/task-enrich <id>` for the ones to refine, or `/task-jira <id>` to export.