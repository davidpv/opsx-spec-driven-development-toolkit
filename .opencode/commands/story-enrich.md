---
description: Enrich an existing user story — edge cases, scenarios, estimate, DoD
---

Enrich the user story `$ARGUMENTS` (an ID like `US-003`, or a path) in `backlog/stories/`.

**Steps**

1. Locate the story file. If the argument is ambiguous or missing, list stories with `status: draft` and ask.

   **Language gate (mandatory):** if the story has `language:` in its frontmatter, write all additions in that language. If it doesn't, ask with **AskUserQuestion** (castellano or English, preselecting `content.default_language` from `workflow.yaml`) and record it in the frontmatter.

2. Cross-check against `openspec/specs/` and the source discovery doc: does it contradict current behavior? Does it overlap another story?

3. Enrich the story:
   - **Scenarios** — add missing unhappy paths: invalid input, permissions, empty states, concurrency, limits. Every Then must be observable/testable.
   - **Notes & edge cases** — record decisions and discovered constraints.
   - **Estimate** — propose story points with one line of justification.
   - **Ambiguities** — if any acceptance criterion is untestable as written, ask the user with **AskUserQuestion** rather than guessing.

4. Update frontmatter: `status: enriched`, `estimate`.

5. Run the `story-reviewer` subagent on the result. If it returns REVISE, fix the findings and re-run once.

6. Suggest next: `/story-jira <id>` to export, or `/opsx-propose` referencing the story to start implementation.
