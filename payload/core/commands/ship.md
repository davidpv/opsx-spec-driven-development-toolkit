---
description: Ship a change — verify gate, then merge/archive/close (shape depends on work_mode)
---

`/ship` is the closing wrapper. The order is **merge → archive, every time**: code lands first, then delta specs sync into `openspec/specs/` with the full view of every other merged change. This matches the OpenSpec + git-worktree discipline from https://intent-driven.dev/blog/2026/04/01/openspec-git-worktrees-opencode/.

Resolve `git.work_mode` first (`automated` / alias `worktree` → automated; `supervised` → supervised; anything else → stop).

- **automated:** one-button close — verify gate, merge the worktree branch into `develop`, archive on `develop`, clean up the worktree, close the linked task.
- **supervised:** two-phase. In the implementation session: verify and tell the user to merge in the GUI (never `git merge` / `git worktree remove` / `git branch -d`). After the GUI merge, re-run from a `develop` planning session to archive + close.

`$ARGUMENTS` may name the change; otherwise infer it from the worktree branch the command is run against. `$ARGUMENTS` may also be omitted when invoked from inside `.worktrees/<change>/` or from a supervised GUI workspace — the cwd is enough.

**Steps**

1. **Resolve the change**

   - If `$ARGUMENTS` is given, use it.
   - Else, infer from `git worktree list` and `pwd`:
     - If `pwd` is `<worktree-dir>/<change>/`, use `<change>`.
     - Else if a single worktree exists, use its change name.
     - Else prompt with **AskUserQuestion** listing active changes.
   - In `supervised`, also bind from conversation or the single active change in `openspec/changes/`. Do not require the branch to be named `feature/<change>`.

2. **Resolve work_mode and the working branch**

   ```bash
   git branch --show-current
   ```

   Read `git.work_mode` and `git.integration_branch` from `workflow.yaml`. Resolve the mode.

   - **automated:** **Refuse** if the current branch is not the integration branch. `/ship` performs the merge and the archive, both of which require the integration branch. Tell the user to run `git checkout <integration_branch>` first.
   - **supervised, not on the integration branch:** this is the implementation session. Run the verify gate (step 4) against **cwd**, then skip merge/archive/cleanup. Print: merge this branch in the GUI, then re-run `/ship` from a planning session on `<integration_branch>`. NEVER `git checkout`. Stop after the report.
   - **supervised, on the integration branch:** skip merge/cleanup. If the implementation branch is already an ancestor of the integration branch, continue at archive (step 6) + close. If it is not merged yet, refuse: *"merge in the GUI first, then re-run `/ship` here."*

3. **Locate the worktree and feature branch for the change**

   **If `supervised`**, skip the `.worktrees/` lookup. The implementation branch is the current branch (implementation session) or the branch named in `$ARGUMENTS` / conversation (planning session). Do not require `feature/<change>`.

   **If `automated`:** compute the expected worktree path: `<git.worktree.dir>/<change>/` (default `.worktrees/<change>/`).

   Compute the feature branch for the change:
   - Look up the linked task in `backlog/tasks/*.md` for `change: <name>` in frontmatter.
   - If found and its `id` is a real Jira key (not a `-Dnn` draft), the branch is `feature/<task-id>-<change>`.
   - Otherwise `feature/<change>`.

   ```bash
   git worktree list | grep "<worktree-path>"
   git branch --list "<feature-branch>"
   git rev-parse --verify "<feature-branch>"
   ```

   **If `automated` and the worktree or branch is missing**, tell the user the change has not been built yet (suggest `/work <change>`) and stop.

4. **Verify gate (CRITICAL)**

   The verify gate ensures the implementation actually matches the artifacts before any merge happens.

   - If mode is `automated`: read the most recent verification record from `<worktree-dir>/<change>/.openspec/verify-*.md` (or `.openspec/verify.log`) **on that worktree branch**. Use `git show <feature-branch>:.openspec/verify-*.md` (most recent file) so you don't need to switch directories.
   - If mode is `supervised`: read `.openspec/verify-*.md` from cwd (implementation session) or `git show <implementation-branch>:.openspec/verify-*.md` (planning session). Do not require `.worktrees/<change>/`.
   - Check that:
     - The record exists.
     - It was generated **after the last code commit** on the implementation branch (i.e., the implementation it claims to verify is the one we're about to merge). If the checkout has new commits since the report, treat it as stale.
     - The final assessment contains no `CRITICAL` issues.

   **If any check fails**, refuse and print the exact issue:
   - No record → "This change hasn't been verified yet. Run `/work <change>` to finish the build (it applies and verifies)."
   - Stale record → "The checkout has new commits since the last verify. Run `/work <change>` to re-apply and re-verify."
   - CRITICAL issues → list them; refuse to merge.

   If no verify record exists, fall back to running `openspec validate <change> --strict` (the lint check) and confirming all tasks in `tasks.md` are checked — degraded path only.

5. **Merge the feature branch into the integration branch**

   **If `supervised`:** skip this entire step (and step 7 cleanup). The GUI merges. Continue only when already on the integration branch and the implementation branch is merged; otherwise stop after the verify report.

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

   **If `supervised` and not on the integration branch:** already stopped in step 2.

   Invoke `/opsx-archive <change>` logic:
   - Branch guard already passed in step 2.
   - Sync delta specs into `openspec/specs/`.
   - Commit `chore(<change>): archive openspec change` on `develop`.
   - Move the change into `openspec/changes/archive/YYYY-MM-DD-<change>/`.

   The result is a single commit on `develop` that records the spec-sync; the code merge from step 5 (or the GUI) already landed.

7. **Clean up the worktree and local branch**

   Skip entirely when `supervised`. Only if `automated` and `git.worktree.auto_remove` is `true` (default):

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
- ✓ Merged: <feature-branch> → <integration_branch> (<merge strategy>)   # automated; in supervised: "merge in the GUI"
- ✓ Archived: openspec/changes/archive/<date>-<change>/, specs synced on <integration_branch>   # only after merge, on develop
- ✓ Cleaned: worktree removed, local branch deleted   # automated only
- ✓ Task closed: <task-id> (status: done, staged for commit)

**One commit still pending:** run `/git-commit` to record the close-out commit on `<integration_branch>`.

Pending backlog tasks: <list, if any — suggest the highest-priority one>
   ```

**Behavior with `git.work_mode: supervised`**

`/ship` never owns git topology:

- Do **not** `git pull --rebase`, `git merge`, `git push -u`, `git worktree remove`, `git branch -d`.
- Implementation session (not on `develop`): verify, print the branch name and "merge this branch in your GUI / open PR", stop.
- Planning session on `develop` after the GUI merge: archive + close the linked task.
- Bind the change by `$ARGUMENTS` / conversation / `openspec/changes/`; do not require `feature/<change>`.

In all modes, the order rule is preserved: **verify → merge (opsx or GUI) → archive on the integration branch → cleanup (automated only) → close task**.

**Guardrails**

- **automated:** refuse to run if not on the integration branch. Print the required branch.
- **supervised:** never `git checkout`; never merge or remove worktrees. Archive only on the integration branch after the GUI merge.
- Refuse to merge if the verify gate fails (no record, stale record, or CRITICAL issues).
- Never merge `main` into the integration branch. Only the specific implementation branch for this change.
- Never archive on a worktree branch — archive always happens on the integration branch.
- If `git pull --rebase` fails (diverged `develop`), stop and ask the user to resolve before any merge happens. (`automated` only.)
- If the merge fails (conflicts), stop. Do NOT proceed to archive. Tell the user to resolve the conflict in the main checkout, re-run `/ship`.
- Confirm the merge strategy with the user the first time `/ship` runs in a session; default to squash. (`automated` only.)
- Suggestions are advice, not actions: do not auto-call downstream commands; print them in the report.
- **Never run `git commit` automatically** — stage the close-out task update and suggest `/git-commit` for the user to finalize.
