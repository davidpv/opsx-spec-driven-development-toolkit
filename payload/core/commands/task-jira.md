---
description: Export tasks as Jira-ready markup to backlog/exports/jira/
---
Export the task `$ARGUMENTS` (a Jira key like `PROJ-123`, `all`, or a status like `enriched`) to Jira-compatible markup.

**Steps**

1. Read `workflow.yaml` (`jira.project_key`, `jira.export_dir`, `jira.default_issue_type`). Resolve which tasks to export from the argument; default to all with `status: enriched`.

   **Language gate (mandatory):** ask with **AskUserQuestion** whether the Jira export must be in **castellano** or **English** — always ask, even if the task has a `language:` in its frontmatter (the Jira project may use a different language). Preselect the task's language or `content.default_language`. If the export language differs from the task's, translate the full content, keeping Gherkin keywords (`Given/When/Then`) in English.
2. For each task render `backlog/exports/jira/<id>.md` in **Jira wiki markup** (not GitHub markdown):

   - `h2.` headings, `*bold*`, `{code}...{code}` blocks for Gherkin (only {code} blocks, there is a bug in Jira not recognizing {code:gherkin} markdown, it only recognizes {code} blocks), `||header||` tables, `# / *` lists.
   - Structure: Summary line (`<id> — <title>`), issue type (`jira.default_issue_type` unless the task says otherwise), priority, `h2. Goal`, `h2. Acceptance criteria` with each scenario in a `{code}` block, `h2. Notes`, and a final line `Source: backlog/tasks/<file>` for traceability.
   - Do not include the YAML frontmatter.
3. Print where the files were written and remind the user: paste into Jira's description field with the wiki editor, or bulk-import.
4. **Draft IDs**: if any exported task has a draft ID (`<project_key>-Dnn`), remind the user to create the issue in Jira and then rename the task file and its `id:` frontmatter to the real key — offer to do the rename if they provide the keys now.
