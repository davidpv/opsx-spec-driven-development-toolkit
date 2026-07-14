---
description: Ship a change — verify gate, merge the worktree branch into the integration branch, archive on develop, clean up, close the linked task
---

`/ship` is the one-button closing wrapper. It runs the verify gate, merges the worktree branch into the integration branch (`develop`), archives the change on `develop`, cleans up the worktree, and closes the linked task. One command = done.

The order is **merge → archive, every time**: code lands first via the merge, then delta specs sync into `openspec/specs/` with the full view of every other merged change. This matches the OpenSpec + git-worktree discipline from https://intent-driven.dev/blog/2026/04/01/openspec-git-worktrees-opencode/.

`$ARGUMENTS` may name the change; otherwise infer it from the worktree branch the command is run against. `$ARGUMENTS` may also be omitted when invoked from inside `.worktrees/<change>/` — the cwd is enough.

**Steps**

1. **Resolve the change**

   - If `$ARGUMENTS` is given, use it.
   - Else, infer from `git worktree list` and `pwd`:
     - If `pwd` is `<worktree-dir>/<change>/`, use `<change>`.
     - Else if a single worktree exists, use its change name.
     - Else prompt with **AskUserQuestion** listing active changes.

2. **Resolve the working branch (must be the integration branch)**

   ```bash
   git branch --show-current
   ```

   Read `git.integration_branch` from `workflow.yaml`. **Refuse** if the current branch is not the integration branch. `/ship` performs the merge and the archive, both of which require the integration branch. Tell the user to run `git checkout <integration_branch>` first.

3. **Locate the worktree and feature branch for the change**

   Compute the expected worktree path: `<git.worktree.dir>/<change>/` (default `.worktrees/<change>/`).

   Compute the feature branch for the change:
   - Look up the linked task in `backlog/tasks/*.md` for `change: <name>` in frontmatter.
   - If found and its `id` is a real Jira key (not a `-Dnn` draft), the branch is `feature/<task-id>-<change>`.
   - Otherwise `feature/<change>`.

   ```bash
   git worktree list | grep "<worktree-path>"
   git branch --list "<feature-branch>"
   git rev-parse --verify "<feature-branch>"
   ```

   **If the worktree or branch is missing**, tell the user the change has not been built yet (suggest `/work <change>`) and stop.

4. **Verify gate (CRITICAL)**

   The verify gate ensures the implementation actually matches the artifacts before any merge happens.

   - If `git.work_mode == worktree`: read the most recent verification record from `<worktree-dir>/<change>/.openspec/verify-*.md` (or `.openspec/verify.log`) **on that worktree branch**. Use `git show <feature-branch>:.openspec/verify-*.md` (most recent file) so you don't need to switch directories.
   - Check that:
     - The record exists.
     - It was generated **after the last code commit** on `feature/<change>` (i.e., the implementation it claims to verify is the one we're about to merge). If the worktree has new commits since the report, treat it as stale.
     - The final assessment contains no `CRITICAL` issues.

   **If any check fails**, refuse and print the exact issue:
   - No record → "This change hasn't been verified yet. Run `/work <change>` to finish the build (it applies and verifies)."
   - Stale record → "The worktree has new commits since the last verify. Run `/work <change>` to re-apply and re-verify."
   - CRITICAL issues → list them; refuse to merge.

   With `git.work_mode != worktree`, fall back to running `openspec validate <change> --strict` (the lint check) and confirming all tasks in `tasks.md` are checked.

5. **Merge the feature branch into the integration branch**

   Make sure the integration branch is up to date:

   ```bash
   git pull --rebase
   ```

   Push the feature branch (it usually has no upstream when built in a worktree):

   ```bash
   git push -u origin "<feature-branch>"
   ```

   **Merge strategy**:
   - Detect the platform from `platform.provider` in `workflow.yaml` (default `auto`; resolves from `git remote get-url origin` to `github` or `gitlab`).
   - With `gh` or `glab` available: `gh pr merge <PR>` (or `glab mr merge <MR>`) — but only if a PR exists. **If the feature branch was never opened as a PR** (the common case for worktree-built changes), skip the PR step: merge directly with `git merge --squash` and push.
   - Without a CLI or with `platform.provider: none`: merge locally with `git merge --squash "<feature-branch>"` and push; write the PR description fallback to `backlog/exports/pr/<change>.md` so the user can post it manually if they wish.

   In all cases:
   - Confirm merge strategy with the user the first time `/ship` runs in the session (default: squash).
   - On success, delete the remote branch (best effort — skip if the CLI refuses).
   - Never merge `main` into `develop`; only the specific feature branch.

6. **Archive on the integration branch (merge → archive)**

   This is the rule: archive runs **after** the code merge, on `develop`, so spec-sync sees every other merged change.

   Invoke `/opsx-archive <change>` logic:
   - Branch guard already passed in step 2.
   - Sync delta specs into `openspec/specs/`.
   - Commit `chore(<change>): archive openspec change` on `develop`.
   - Move the change into `openspec/changes/archive/YYYY-MM-DD-<change>/`.

   The result is a single commit on `develop` that records the spec-sync; the code merge from step 5 already landed in the previous commit.

7. **Clean up the worktree and local branch**

   Only if `git.worktree.auto_remove` is `true` (default):

   ```bash
   git worktree remove "<worktree-dir>/<change>/"
   git worktree prune
   git branch -d "<feature-branch>"
   ```

   The worktree must already have its `git add` state cleared. If `git worktree remove` fails because the worktree has uncommitted changes, print the path and warn — do not force-remove.

8. **Close the linked task**

   In the linked task file (`backlog/tasks/*.md` with `change: <change>` in frontmatter):
   - Update `status: done`.

   If the task's `id` is a real Jira key (not a `-Dnn` draft), remind the user to transition the Jira issue in their tracker (we don't have API access).

   Stage the task frontmatter update on `develop` and suggest `/git-commit`:

   ```bash
   git add backlog/tasks/<id>.md
   ```

   > **Never run `git commit` automatically.** All commits are user-driven. The user runs `/git-commit` to review the close-out commit.

9. **Report**

   Output:
   ```
## Shipped: <change-name>

- ✓ Verified: <summary line from the verification record>
- ✓ Merged: <feature-branch> → <integration_branch> (<merge strategy>)
- ✓ Archived: openspec/changes/archive/<date>-<change>/, specs synced on <integration_branch>
- ✓ Cleaned: worktree removed, local branch deleted
- ✓ Task closed: <task-id> (status: done, staged for commit)

**One commit still pending:** run `/git-commit` to record the close-out commit on `<integration_branch>`.

Pending backlog tasks: <list, if any — suggest the highest-priority one>
   ```

**Behavior with `git.work_mode != worktree`**

`/ship` works without worktrees too, but the safety guarantees change:

- `work_mode: feature` — the user has been working directly on `feature/<change>` in the main checkout. Steps 3 and 7 have nothing to clean up; the merge + archive + branch-delete proceed directly.
- `work_mode: flexible` — the user may be on `develop` with the change already committed. There is no PR, no remote branch. `/ship` archives on `develop`, skips the merge step (warn that this skips code review), does not delete any branch.

In all modes, the order rule is preserved: **verify (where applicable) → merge (where applicable) → archive on the integration branch → cleanup → close task**.

**Guardrails**

- Refuse to run if not on the integration branch. Print the required branch.
- Refuse to merge if the verify gate fails (no record, stale record, or CRITICAL issues).
- Never merge `main` into the integration branch. Only the specific feature branch for this change.
- Never archive on a worktree branch — archive always happens on the integration branch.
- If `git pull --rebase` fails (diverged `develop`), stop and ask the user to resolve before any merge happens.
- If the merge fails (conflicts), stop. Do NOT proceed to archive. Tell the user to resolve the conflict in the main checkout, re-run `/ship`.
- Confirm the merge strategy with the user the first time `/ship` runs in a session; default to squash.
- Suggestions are advice, not actions: do not auto-call downstream commands; print them in the report.
- **Never run `git commit` automatically** — stage the close-out task update and suggest `/git-commit` for the user to finalize.