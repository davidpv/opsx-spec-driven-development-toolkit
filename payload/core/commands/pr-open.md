---
description: Open a PR for the current change against the integration branch (platform-agnostic, worktree-aware)
---

Open a pull/merge request for the change `$ARGUMENTS` (or the one inferred from the current branch — strip a leading Jira key like `PROJ-123-` from the branch name before matching against `openspec/changes/`).

Resolve `git.work_mode` (`automated` / alias `worktree` → automated; `supervised` → supervised; anything else → stop).

- **automated:** the change is typically implemented inside `<worktree-dir>/<change>/` on a `feature/<change>` branch. `/ship` handles the merge internally, so `/pr-open` is optional — most users skip it and let `/ship` squash-merge directly.
- **supervised:** the GUI usually has the PR button. `/pr-open` is still useful when you want a GitHub/GitLab URL from the CLI. Push the **current** branch (do not rename it). Never `git checkout -b`.

`/pr-open` is still useful when:

- A external reviewer wants a GitHub/GitLab PR URL before the change lands.
- `automated` users who want a reviewed PR before `/ship` merges.

**Steps**

1. Read `workflow.yaml` (`git.integration_branch`, `git.work_mode`, `git.worktree.dir`, `platform.provider`). Verify: working tree clean, all tasks in `tasks.md` checked. If tasks remain, list them and ask whether to continue as draft.

   If the current branch IS the integration branch: there is nothing to open a PR against. Tell the user, and offer to skip the PR and go to `/ship` (archive path). Do **not** rewrite history onto a new feature branch in `supervised` mode.

   If the implementation branch has not been pushed yet (`git rev-parse --verify origin/<current-branch>` fails), `/pr-open` pushes it:
   ```bash
   git push -u origin "<current-branch>"
   ```
   In `automated` this is often `feature/<change>` with no upstream. In `supervised` use the GUI's branch name as-is.

2. Run `/review-change <change>` (spec-reviewer). On REVISE, show findings and stop unless the user overrides.

3. Build the PR description from `templates/pr-description.md`, filling it from `proposal.md`, the delta specs, the branch's commit log, and the linked task (frontmatter `change:` match in `backlog/tasks/`).

4. Detect the platform:
   - `provider: auto` → parse `git remote get-url origin`; github.com → `gh`, gitlab → `glab`. Check the CLI exists (`command -v`).
   - With a CLI: push the branch and create the PR targeting the integration branch, title `<type>(<change>): <proposal title>`.
   - Without CLI or `provider: none`: push the branch, write the description to `backlog/exports/pr/<change>.md`, and print the compare URL so the user can open the PR manually.

5. Update the linked task frontmatter to `status: in-progress` if not already. Print the PR URL (or export path) and suggest `/ship <change>` once approved.
