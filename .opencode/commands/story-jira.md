---
description: Export user stories as Jira-ready markup to backlog/exports/jira/
---

Export the story `$ARGUMENTS` (an ID like `US-003`, `all`, or a status like `enriched`) to Jira-compatible markup.

**Steps**

1. Read `workflow.yaml` (`jira.project_key`, `jira.export_dir`, `jira.issue_type_map`). Resolve which stories to export from the argument; default to all with `status: enriched`.

   **Language gate (mandatory):** ask with **AskUserQuestion** whether the Jira export must be in **castellano** or **English** — always ask, even if the story has a `language:` in its frontmatter (the Jira project may use a different language). Preselect the story's language or `content.default_language`. If the export language differs from the story's, translate the full content, keeping Gherkin keywords (`Given/When/Then`) in English.

2. For each story render `backlog/exports/jira/<id>.md` in **Jira wiki markup** (not GitHub markdown):
   - `h2.` headings, `*bold*`, `{code}...{code}` blocks for Gherkin, `||header||` tables, `# / *` lists.
   - Structure: Summary line (`<id> — <title>`), issue type from the map, priority, story narrative, `h2. Acceptance criteria` with each scenario in a `{code}` block, `h2. Notes`, and a final line `Source: backlog/stories/<file>` for traceability.
   - Do not include the YAML frontmatter.

3. Print where the files were written and remind the user: paste into Jira's description field with the wiki editor, or bulk-import. When they have the issue key, record it back in the story frontmatter (`jira_key`) — offer to do it if they provide the keys now.
