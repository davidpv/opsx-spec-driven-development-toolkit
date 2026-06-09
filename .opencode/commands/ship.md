---
description: Finish a change — validate, archive specs, merge the PR into the integration branch
---

Ship the change `$ARGUMENTS` (or the one inferred from the current branch). This is the closing gate of the pipeline; every step must pass before the next runs.

**Steps**

1. **Validate** — `openspec validate <change> --strict` and confirm every task in `tasks.md` is checked. Fail fast otherwise.

2. **Archive** — run `/opsx-archive` for the change so delta specs merge into `openspec/specs/`. Commit the archive result on the feature branch with `chore(<change>): archive openspec change`.

3. **Merge** — read `workflow.yaml` for platform and integration branch:
   - With `gh`/`glab` and an open PR: check CI/approval status; if green, merge (squash by default — confirm strategy with the user the first time) and delete the remote branch.
   - Without CLI: instruct the user to merge in the web UI, and wait for confirmation before continuing.

4. **Close the loop** —
   - `git checkout <integration_branch> && git pull`, delete the local feature branch.
   - Update the linked story: `status: done`.
   - If the story has a `jira_key`, remind the user to transition the Jira issue (we don't have API access).

5. Report: change archived, PR merged, story closed — and list any follow-up stories from the same discovery still pending.
