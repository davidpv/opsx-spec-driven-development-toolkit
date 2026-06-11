---
description: Create a single backlog task directly, without a discovery doc
---

Create one task in `backlog/tasks/` from scratch using `templates/task.md`. `$ARGUMENTS` is a short title or topic; ask for it if missing. For initiatives that need several tasks or a requirements interview, redirect to `/req-capture` instead.

**Steps**

1. Read `workflow.yaml` (`jira.project_key`, `backlog.tasks_dir`).

   **Language gate (mandatory):** ask with **AskUserQuestion** whether the task must be written in **castellano** or **English**, preselecting `content.default_language`. Record it as `language: es|en`.

2. **Mini interview** — ask only what's needed to fill the template, one round if possible:
   - **Goal**: what must exist or behave differently, and why.
   - **Context**: affected modules/specs, dependencies.
   - **Acceptance criteria**: at least one Gherkin scenario per criterion plus one unhappy path. Every Then must be observable/testable.
   - No invented answers: unknowns go to **Notes & edge cases** as open points.

3. **Task ID.** Ask whether a Jira issue already exists for this:
   - Yes → use the real key (then the user probably wanted `/task-import`; offer it if they have ticket content to paste).
   - No → assign the next free draft ID `<project_key>-Dnn` (scan `backlog/tasks/` for the highest `Dnn`). Note it must be renamed (file + frontmatter) when the real key exists.

4. Cross-check against `openspec/specs/` and existing tasks: contradiction or overlap → tell the user before writing.

5. Write `backlog/tasks/<id>-<slug>.md` with frontmatter: `id`, `title`, `status: draft`, `discovery: ~`, `priority` (ask, MoSCoW), `language`.

6. Suggest next: `/task-enrich <id>` to add edge cases and an estimate, then `/task-jira <id>` to export and create the issue in Jira (reminder: confirm the real key afterwards), or `/opsx:propose` if the task is ready to drive a change.
