---
description: Open a PR for the current change against the integration branch (platform-agnostic)
---

Open a pull/merge request for the change `$ARGUMENTS` (or the one inferred from the current branch — strip a leading Jira key like `PROJ-123-` from the branch name before matching against `openspec/changes/`).

**Steps**

1. Read `workflow.yaml` (`git.integration_branch`, `git.work_mode`, `platform.provider`). Verify: working tree clean, all tasks in `tasks.md` checked. If tasks remain, list them and ask whether to continue as draft.

   If the current branch IS the integration branch (flexible mode), there is nothing to open a PR against: tell the user, and offer either (a) skip the PR and go straight to `/ship`, or (b) move the unpushed commits to a new feature branch (named `feature/<task id>-<change>` if the change is linked to a task with a real Jira key, else `feature/<change>`) via `git branch <name> && git reset --hard origin/<integration>` to get a reviewed PR.

2. Run `/review-change <change>` (spec-reviewer). On REVISE, show findings and stop unless the user overrides.

4. Build the PR description from `templates/pr-description.md`, filling it from `proposal.md`, the delta specs, the branch's commit log, and the linked task (frontmatter `change:` match in `backlog/tasks/`).

5. Detect the platform:
   - `provider: auto` → parse `git remote get-url origin`; github.com → `gh`, gitlab → `glab`. Check the CLI exists (`command -v`).
   - With a CLI: push the branch and create the PR targeting the integration branch, title `<type>(<change>): <proposal title>`.
   - Without CLI or `provider: none`: push the branch, write the description to `backlog/exports/pr/<change>.md`, and print the compare URL so the user can open the PR manually.

6. Update the linked task frontmatter to `status: in-progress` if not already. Print the PR URL (or export path) and suggest `/ship <change>` once approved.
