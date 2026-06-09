---
description: Generate INVEST user stories from a discovery doc into backlog/stories/
---

Generate user stories from the discovery doc `backlog/discovery/$ARGUMENTS.md` using `templates/user-story.md`.

**Steps**

1. Read the discovery doc. If it doesn't exist, list available ones and ask which to use (or suggest `/req-capture` first).

   **Language gate (mandatory):** ask with **AskUserQuestion** whether the stories must be written in **castellano** or **English**. Preselect `content.default_language` from `workflow.yaml`, but always ask — these texts end up in front of the client. Record the choice in each story's frontmatter as `language: es|en`.

2. Read `workflow.yaml` (`backlog.story_id_prefix`) and scan `backlog/stories/` for the highest existing ID to continue the sequence.

3. Slice the functional needs into stories that satisfy **INVEST** (independent, negotiable, valuable, estimable, small, testable). Rules:
   - One user-visible capability per story; split anything you couldn't implement in one OpenSpec change.
   - Every story gets at least one Gherkin scenario per acceptance criterion, including one unhappy path.
   - Non-functional needs become acceptance criteria on the stories they constrain, or their own story if cross-cutting.
   - Do NOT create stories from **Open questions** — list them at the end as "blocked: needs answer".

4. Write each story to `backlog/stories/US-NNN-<slug>.md` with frontmatter filled: `id`, `title`, `status: draft`, `discovery`, `priority` (MoSCoW from the discovery's goals).

5. Show the user the list (id, title, priority) and suggest `/story-enrich US-NNN` for the ones to refine, or `/story-jira US-NNN` to export.
