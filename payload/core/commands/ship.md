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
   - **supervised, not on the integration branch:** this is the implementation session. Run the verify gate (step 4) against **cwd**, then skip merge/archive/cleanup. Print the branch name and: merge this branch in the GUI, then re-run `/ship <change>` from a planning session on `<integration_branch>`. NEVER `git checkout`. Stop after the report.
   - **supervised, on the integration branch:** this is the planning session. Skip the verify gate, merge, and cleanup. A GUI workspace whose **branch** is the integration branch is valid — do not refuse because `pwd` is a linked worktree. Continue at **landed?** (step 2b), then archive (step 6) + close. NEVER `git checkout`.

2b. **Landed? (supervised planning session only)**

   A failed ancestor check is **not** proof the change is unmerged. Squash and rebase merges do not make the implementation branch an ancestor of `<integration_branch>`. The GUI often deletes the branch afterwards. Never refuse with "merge in the GUI first" on ancestry alone, and never loop that refuse.

   The change has **landed** if any of these is true. Stop at the first hit. Skip a check when its ref or CLI is missing.

   1. A candidate branch is an ancestor of `HEAD` (`git merge-base --is-ancestor <branch> HEAD`).
   2. A merged PR/MR exists for the change (`gh pr list --state merged --search "<change>"`, or `glab mr list --merged`). A hit counts even if the local branch is gone.
   3. `git log -30 --grep="<change>"` on the integration branch shows a merge or squash commit for it.
   4. A candidate branch still exists and `git diff <branch> HEAD` for the files that branch changed (exclude `.openspec/`) is empty — the content is already on the integration branch.

   If none match, ask **once**: "I can't prove `<change>` is on `<integration_branch>`. Squash merges and deleted branches look unmerged to git. Did you already merge it in the GUI?" On yes, it has landed — continue to archive. On no, stop and tell them to merge in the GUI, then re-run `/ship <change>` here. Do not ask again in the same session after a yes.

3. **Locate the worktree and feature branch for the change**

   **If `supervised`**, skip the `.worktrees/` lookup. Do not require the branch to be named `feature/<change>`. `$ARGUMENTS` is the change name, not a branch. In the implementation session the branch is the current one. In the planning session, candidates are only refs that actually exist: a branch named in the conversation, `feature/<task-id>-<change>` when a linked task has a real Jira key, and `feature/<change>`. If none exist, there is no implementation branch to inspect — that is normal after a GUI squash that deleted it. Do not invent one, and do not stop because it is missing.

   **If `automated`:** compute the expected worktree path: `<git.worktree.dir>/<change>/` (default `.worktrees/<change>/`).

   Compute the feature branch for the change:
   - Look up the linked task in `backlog/tasks/*.md` for `change: <name>` in frontmatter.
   - If found and its `id` is a real Jira key (not a `-Dnn` draft), the branch is `feature/<task-id>-<change>`.
   - Otherwise `feature/<change>`.

   **If `automated`**, confirm the worktree and branch exist. If either is missing, tell the user the change has not been built yet (suggest `/work <change>`) and stop. Do not run this lookup in `supervised` — a missing branch there is not a failure.

   ```bash
   git worktree list | grep "<worktree-path>"
   git branch --list "<feature-branch>"
   git rev-parse --verify "<feature-branch>"
   ```

4. **Verify gate (implementation session and automated only)**

   The verify gate runs before a merge: in **automated**, and in the **supervised implementation session**. The supervised planning session skips this step (step 2). Do not `git show` a branch that may have been deleted. Do not send the user back to `/work` from the planning session — `/work` refuses to run on the integration branch.

   Read the newest `.openspec/verify-*.md` (or `.openspec/verify.log`) from the implementation checkout: cwd in supervised, or `git show <feature-branch>:.openspec/verify-*.md` in automated. The working tree counts; the record does not have to be the only committed file.

   The record is **fresh** when it exists, it has no `CRITICAL` issues, and no source file changed after it was written. The commit that adds or updates `.openspec/verify-*` is not a source change. `/work`'s single batch commit, which includes that record, does **not** make it stale. Uncommitted edits to source files after the record do.

   If the record is missing, do not refuse outright and do not also treat that as a pass. Degraded path: `openspec validate <change> --strict` and every task in `tasks.md` is checked. If both pass, say it is a degraded pass and continue. If either fails, refuse with the exact gap and tell them to re-run `/work <change>` in the implementation session.

   If the record exists and has `CRITICAL` issues, list them and refuse. Do not merge.

5. **Merge the feature branch into the integration branch**

   **If `supervised`:** skip this entire step (and step 7 cleanup). The GUI merges. The implementation session already stopped after the verify report. The planning session continues only after step 2b says the change has landed.

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

   Run the archive logic yourself. Do not print `/opsx:archive` and wait. The change name is already bound — do not ask which change.

   - Branch guard already passed. A linked worktree on the integration branch is allowed. Do not refuse it.
   - Sync delta specs into `openspec/specs/` (the `openspec-sync-specs` logic, with this change name). Do not ask "sync now or archive without syncing". Do not spawn a SubAgent.
   - If artifacts or tasks are incomplete, warn in the report. Do not stop for confirmation.
   - Move the change into `openspec/changes/archive/YYYY-MM-DD-<change>/`.
   - Do not `git commit` in this step. Do not stop between the move and step 8. Staging and the single `/git-commit` suggestion happen once, after the task is closed.

   The code merge from step 5 (or the GUI) has already landed. This step only syncs specs and archives the change.

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

   Stage the archive and the task close together, then suggest `/git-commit` **once**:

   ```bash
   git add openspec/specs openspec/changes backlog/tasks/<id>.md
   ```

   > **Do not run `git commit`.** This is the one wait at the end of `/ship`. The user runs `/git-commit` to review the close-out commit. Do not suggest it before the archive move and the task update are both staged.

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
- Implementation session (not on the integration branch): verify, print the branch name and "merge this branch in your GUI / open PR", stop.
- Planning session on the integration branch: a linked worktree is fine. Decide landed with step 2b (squash and a deleted branch still count), then archive + close. Do not re-check the verify record. Do not tell the user to run `/work` from here.
- Bind the change by `$ARGUMENTS` / conversation / the single active change in `openspec/changes/`. `$ARGUMENTS` is a change name, not a branch.

In all modes, the order rule is preserved: **verify → merge (opsx or GUI) → archive on the integration branch → cleanup (automated only) → close task**.

**Guardrails**

- **automated:** refuse to run if not on the integration branch. Print the required branch.
- **supervised:** never `git checkout`; never merge or remove worktrees. Archive on the integration branch after the change has landed (step 2b). A GUI worktree on that branch is a valid planning session.
- Refuse to merge in the implementation session or in `automated` if the verify gate fails (degraded path failed, stale source changes after the record, or CRITICAL issues). Do not apply that refuse in the planning session.
- Never merge `main` into the integration branch. Only the specific implementation branch for this change.
- Never archive on a feature branch. Archive always happens on the integration branch. The checkout may be a linked worktree; the branch is what matters.
- If `git pull --rebase` fails (diverged `develop`), stop and ask the user to resolve before any merge happens. (`automated` only.)
- If the merge fails (conflicts), stop. Do NOT proceed to archive. Tell the user to resolve the conflict in the main checkout, re-run `/ship`.
- Confirm the merge strategy with the user the first time `/ship` runs in a session; default to squash. (`automated` only.)
- `/ship` runs archive itself. Do not print `/opsx:archive` (or any other primitive) and wait. The only wait is the final `/git-commit` suggestion, after stage.
- **Do not run `git commit`.** Stage the archive and the task close, then suggest `/git-commit` once.
