---
description: Open a PR for the current change against the integration branch (platform-agnostic)
---

Open a pull/merge request for the change `$ARGUMENTS` (or the one inferred from the current branch).

**Steps**

1. Read `workflow.yaml` (`git.integration_branch`, `platform.provider`). Verify: working tree clean, branch is `feature/<change>`, all tasks in `tasks.md` checked. If tasks remain, list them and ask whether to continue as draft.

2. Run `/review-change <change>` (spec-reviewer). On REVISE, show findings and stop unless the user overrides.

3. **Language gate (mandatory):** ask with **AskUserQuestion** whether the PR description must be in **castellano** or **English**, preselecting `content.default_language` from `workflow.yaml`.

4. Build the PR description from `templates/pr-description.md`, filling it from `proposal.md`, the delta specs, the branch's commit log, and the linked story (frontmatter `change:` match in `backlog/stories/`).

5. Detect the platform:
   - `provider: auto` → parse `git remote get-url origin`; github.com → `gh`, gitlab → `glab`. Check the CLI exists (`command -v`).
   - With a CLI: push the branch and create the PR targeting the integration branch, title `<type>(<change>): <proposal title>`.
   - Without CLI or `provider: none`: push the branch, write the description to `backlog/exports/pr/<change>.md`, and print the compare URL so the user can open the PR manually.

6. Update the linked story frontmatter to `status: in-progress` if not already. Print the PR URL (or export path) and suggest `/ship <change>` once approved.
