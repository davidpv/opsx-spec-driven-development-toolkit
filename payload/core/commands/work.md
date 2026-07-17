---
description: Apply changes via SubAgents (parallel, default) or sequentially — gated by workflow.use_subagents; verify and report back (does not merge)
---

`/work` is the batch-implementation entrypoint. It runs the same daily commands (`/opsx:apply`, `/opsx:verify`) for one or more changes. Its execution mode is governed by `workflow.use_subagents` in `payload/core/workflow.yaml`:

- `use_subagents: yes` (default) — **delegate each change to its own SubAgent in its own git worktree**, in parallel. SubAgents do **not** merge — they apply, verify, and report.
- `use_subagents: no` — apply the changes **sequentially** on the main checkout (one worktree per change, one change at a time: apply + verify, then the next). No SubAgents are spawned.

The user inspects the consolidated report and then runs `/ship <change>` per change in sequence.

This is the workflow described in https://intent-driven.dev/blog/2026/04/01/openspec-git-worktrees-opencode/. Use it when you have multiple independent changes ready to implement.

**Input**: `$ARGUMENTS` is an optional list of change names (e.g., `/work add-auth speed-up-search`). If omitted, all active changes that have completed proposal + review are considered.

**Steps**

1. **Pre-flight check**

   - SubAgent support (only required when parallel mode is selected): confirm the runtime supports SubAgents. If the user is on an agent that doesn't (e.g., a constrained Codex config or CI without task delegation), refuse with a clear message: *"Multi-agent worktrees need SubAgent support. Use sequential `/opsx:apply` per change instead."* This check is skipped when `workflow.use_subagents: no` (see below).
   - Read `git.work_mode` and `git.worktree.dir` from `workflow.yaml`. If `work_mode != worktree`, refuse and tell the user to set `git.work_mode: worktree` in `workflow.yaml` first — `/work` requires worktrees (one per change, in both modes).
   - Read `workflow.use_subagents` from `workflow.yaml`. Store the resolved value as `WORK_PARALLEL` (`yes` or `no`). If the key is missing, default to `yes`. If the value is anything other than `yes` or `no`, abort with a clear message: *"Invalid `workflow.use_subagents` value: '<value>'. Allowed: `yes`, `no`."*
   - Confirm the user is on the integration branch (`develop`). `/work` coordinates from `develop`; running inside a worktree would mean coordinating from the wrong view.

2. **Resolve the candidate changes**

   ```bash
   openspec list --json
   ```

   For each active change, `openspec status --change "<name>" --json` to read:
   - `schemaName`
   - `applyRequires` and the per-artifact status (every applyRequires artifact must be `done`)
   - `artifactPaths.tasks.existingOutputPaths` — the tasks file
   - `artifactPaths.specs.existingOutputPaths` — the delta specs

   Filter to changes where:
   - All `applyRequires` artifacts are `done`.
   - Tasks still have unchecked items (i.e. not yet implemented, or partially implemented).
   - The change does NOT already have a verification record newer than its last code commit.

   If `$ARGUMENTS` listed specific changes, intersect with the candidate set. If the intersection is empty, say so and stop.

3. **Detect conflicts between candidates**

   For each pair of changes, compare:
   - The delta spec paths (`artifactPaths.specs.existingOutputPaths`). If two changes declare the same capability, **they conflict** — OpenSpec can't safely apply them in parallel without an integration step.
   - The tasks files: keywords that suggest they touch overlapping modules.

   Group candidates into **worktrees-isolated groups**:
   - A change conflicts with at most one group (the conflict set).
   - Non-conflicting changes may run in parallel in their own worktrees.

   Print the grouping to the user before spawning agents, e.g.:
   ```
   ## Parallel build plan

   **Group A (parallel, 3 agents, 3 worktrees)**
   - `add-auth` → worktree at `.worktrees/add-auth/` on branch `feature/add-auth`
   - `speed-up-search` → worktree at `.worktrees/speed-up-search/` on branch `feature/speed-up-search`
   - `refactor-errors` → worktree at `.worktrees/refactor-errors/` on branch `feature/refactor-errors`

   **Group B (serial, after A)**
   - `add-billing` (overlaps with `add-auth` on the `auth` capability)
   ```

   **Confirm with the user via AskUserQuestion** before spawning agents. Default = proceed.

4. **Execute**

   Branch on `WORK_PARALLEL` (resolved in step 1):

   - **`WORK_PARALLEL == yes`** → go to step 4a (parallel SubAgent flow).
   - **`WORK_PARALLEL == no`** → go to step 4b (sequential flow).

   **4a. For each parallel group, fan out to SubAgents**

   The coordinator (this main session) does **not** write code or create files outside the worktrees itself. Each SubAgent gets its own worktree.

   Use the **Task tool** with `subagent_type: "openspec"` (or the runtime-specific equivalent — Claude Code's `Task`, opencode's `task`, Codex's subagent; whatever the agent exposes). The `openspec` agent is the spec-driven-development SubAgent that knows how to run `/opsx:apply` and `/opsx:verify` inside a worktree. Spawn one SubAgent per change in the parallel group. Provide the SubAgent with:

   - The change name.
   - The worktree path to create/reuse: `<worktree-dir>/<change>/`.
   - The feature branch to use: `feature/<change>` (or `feature/<task-id>-<change>` if the change is linked to a real Jira key in `backlog/tasks/`).
   - The base branch: `git.worktree.base_branch` or `git.integration_branch`.
   - The instruction body below.

   **SubAgent prompt template (give verbatim to each SubAgent):**

   ```
   You are implementing an OpenSpec change in your own git worktree. The coordinator (this main session) will NOT merge — you apply, verify, and report. Merging is the user's job.

   ## Setup
   1. cd into the main checkout. Confirm you are on `<integration_branch>` (default `develop`) before any work.
   2. Run `openspec status --change "<change>" --json` and read all `applyRequires` artifacts (proposal, specs, design, tasks). They should already be done — if any are missing, STOP and report which ones; do not invent them.
   3. Run:
      git worktree add "<worktree-dir>/<change>/" -b "feature/<change>" "<base-branch>"
      cd "<worktree-dir>/<change>/"
   4. If the worktree already exists, just `cd` into it.

   ## Apply
   5. Run `openspec instructions apply --change "<change>" --json`. The CLI gives you `contextFiles` (the artifact paths) and the task list.
   6. Read every `contextFiles` file.
   7. For each unchecked task in `tasks.md`:
      - Make the code change inside this worktree only. Never touch the main checkout.
      - Mark `- [ ]` → `- [x]` immediately after each task.
      - **Never run `git commit` yourself.** After completing each task, suggest `/git-commit` to the user — the user runs the command to review the message and finalize the commit. Footers must include `Change: <change>` and `Task: <tasks.md step number>`.
      - If running unattended (no user present to run `/git-commit`), stage the changes with `git add <paths>` and continue; do not commit. The user will run `/git-commit` to clean up the staged but uncommitted work when they next take over.
   8. Pause and report if a task is genuinely ambiguous — do NOT invent answers.

   ## Verify
   9. Run `/opsx:verify <change>` inside the worktree. This generates a CRITICAL/WARNING/SUGGESTION report and writes it to `<worktree-dir>/<change>/.openspec/verify-<timestamp>.md`. Stage the record (do NOT commit — the user runs `/git-commit`).
   10. CRITICAL issues must be fixed before you report back — iterate on tasks until verify is clean or only WARNING/SUGGESTION remain.

   ## Report
   11. Report back to the coordinator:
       - Worktree path + branch
       - Number of tasks completed
       - Final verification assessment (CRITICAL / WARNING / SUGGESTION counts)
       - Suggested `/ship <change>` command

   ## DO NOT
   - DO NOT run `/ship`, `/opsx:archive`, or any merge command.
   - **DO NOT run `git commit`.** Only stage changes with `git add`; the user runs `/git-commit` to finalize.
   - DO NOT touch the main checkout.
   - DO NOT switch branches — stay on `feature/<change>` in your worktree.
   - DO NOT delete the worktree when you finish.
   ```

   **4b. Sequential apply on the main checkout (no SubAgents)**

   The coordinator itself runs `/opsx:apply` and `/opsx:verify` for each change, one at a time, on the main checkout. No SubAgent is spawned. Each change still gets its own worktree (the verify gate requires it), and the worktree is left in place for `/ship` to merge later — the same shape as parallel mode, just driven by the coordinator.

   For each change in the order they were given in `$ARGUMENTS` (or, if `$ARGUMENTS` was omitted, the order returned by `openspec list`):

   1. **Create the worktree** (from the main checkout, on the integration branch):
      ```bash
      git worktree add "<worktree.dir>/<change>/" -b "feature/<change>" "<base-branch>"
      cd "<worktree.dir>/<change>/"
      ```
      If the worktree already exists, just `cd` into it. If the branch `feature/<change>` already exists on the integration branch, `git worktree add` will fail — abort with a clear message and let the user decide (typically: `git worktree remove` and re-run, or skip the change).

   2. **Apply.** Run `openspec instructions apply --change "<change>" --json` to read the task list and context files. For each unchecked task in `tasks.md`:
      - Make the code change inside this worktree only. Never touch the main checkout.
      - Mark `- [ ]` → `- [x]` immediately after each task.
      - **Never run `git commit` yourself.** After completing each task, suggest `/git-commit` to the user — the user runs the command to review the message and finalize the commit. Footers must include `Change: <change>` and `Task: <tasks.md step number>`.
      - If running unattended (no user present to run `/git-commit`), stage the changes with `git add <paths>` and continue; do not commit.

   3. **Verify.** Run `/opsx:verify <change>` inside the worktree. CRITICAL issues MUST be fixed (iterate on tasks) before moving on; WARNING/SUGGESTION are tolerable but reported.

   4. **Gate.** If verify reports any CRITICAL issue that wasn't fixed, or if the user aborted apply mid-task, abort the sequential loop immediately:
      - Do **not** start the next change.
      - Leave the failed change's worktree intact so the user can inspect or iterate.
      - Skip to step 5 (aggregate reports) and emit the consolidated report — the failed change is listed with `verify FAIL`, and any remaining unstarted changes are listed as `pending`.

   5. **Move on.** `cd` back to the main checkout (`cd "$(git worktree list | awk '/(main checkout)/{print $1}')"` is fragile — use `cd <repo-root>` tracked before the loop) and proceed to the next change.

   DO NOT, in sequential mode:
   - Spawn any SubAgent (the `openspec` agent or otherwise).
   - Run `/ship`, `/opsx:archive`, or any merge command. Merging is still the user's job, per change, via `/ship <change>`.
   - Run `git commit` on the user's behalf. Stage with `git add` only; the user runs `/git-commit`.
   - Delete a worktree between changes.

5. **Aggregate reports**

   The format of the final report depends on `WORK_PARALLEL`:

   **5a. Parallel (`WORK_PARALLEL == yes`)** — when all SubAgents report back, print the multi-row table:

   ```
   ## /work reports (mode: parallel)

   | Change | Worktree | Tasks | Verify | Action |
   |--------|----------|-------|--------|--------|
   | add-auth | .worktrees/add-auth/ | 6/6 ✓ | Clean | `/ship add-auth` |
   | speed-up-search | .worktrees/speed-up-search/ | 4/5 ⚠ | 0 CRITICAL, 2 WARNING | review warnings, then `/ship speed-up-search` |
   | refactor-errors | .worktrees/refactor-errors/ | 3/7 ✗ | 1 CRITICAL | re-run `/work refactor-errors` to fix + re-verify |
   ```

   **5b. Sequential (`WORK_PARALLEL == no`)** — at the end of the loop, print a consolidated report with one row per change the user supplied (regardless of whether it was applied or stayed pending due to an earlier failure):

   ```
   ## /work reports (mode: sequential)

   | Change | Worktree | Tasks | Verify | Action |
   |--------|----------|-------|--------|--------|
   | add-auth | .worktrees/add-auth/ | 6/6 ✓ | Clean | `/ship add-auth` |
   | speed-up-search | .worktrees/speed-up-search/ | 5/6 ✓ | 0 CRITICAL, 2 WARNING | review warnings, then `/ship speed-up-search` |
   | refactor-errors | .worktrees/refactor-errors/ | 3/7 ✗ | 1 CRITICAL | re-run `/work refactor-errors` to fix + re-verify |

   Pending (loop aborted before this change):
   - `optimise-cache`
   ```

   In sequential mode the Action column for pending changes is always "not started — loop aborted at `<failed-change>`". In all cases, no branch is merged by `/work`; merging stays with `/ship`.

6. **What the user does next**

   The coordinator suggests the user:
   - For each change with a clean verify, run `/ship <change>` to merge + archive + close.
   - For each change with WARNING/SUGGESTION, review and decide whether to ship or re-run `/work <change>` to iterate.
   - For each change with a CRITICAL issue, re-run `/work <change>` to fix and re-verify it in its worktree.

   `/ship` is run **per change, in sequence**, so each merge + archive sees the right view of `develop`. Running `/ship` for change A first means change B's archive runs against a `develop` that already contains A's specs — matches the merge → archive discipline.

**Output On Start**

The opening message reflects the active mode:

```
## /work — build plan (mode: parallel, workflow.use_subagents=yes)

<grouping from step 3>

I'll now spawn <N> SubAgents, each in its own worktree, to apply + verify in parallel. SubAgents do not merge. After they report, you run `/ship <change>` per change in sequence.

Proceed? [Y/n]
```

```
## /work — build plan (mode: sequential, workflow.use_subagents=no)

I'll now apply the following changes in order, one at a time, on the main checkout (one worktree per change, no SubAgents):

- `feat-a`
- `feat-b`
- `feat-c`

If any change fails verify, the loop aborts and pending changes are skipped. You run `/ship <change>` per change in sequence after this finishes.

Proceed? [Y/n]
```

**Output On Completion**

```
## /work reports (mode: <parallel|sequential>)

<table from step 5>

Next: inspect each row, then run `/ship <change>` per change in sequence.
```

**Guardrails**

- **Always confirm the build plan with the user before starting**, in both modes — parallel asks for the grouping, sequential asks for the order.
- **Always confirm the user is on the integration branch** before starting. Coordinating from inside a worktree would corrupt the merge order.
- **SubAgents MUST NOT merge.** Their only writes are inside their own worktree and the verification record. Re-state this in the SubAgent prompt (parallel mode only).
- **In sequential mode, the coordinator MUST NOT spawn SubAgents** — apply + verify run in the main session.
- **Serialise merges, not implementation.** `/work` parallelises (or serialises) the apply+verify phase; the merge phase stays sequential and human-controlled via `/ship`.
- **If any change reports CRITICAL issues**, do not include that change in the suggested next step table's "Action" column — recommend fixing it instead. In sequential mode, the same applies and the loop also aborts before the next change.
- **`workflow.use_subagents` is the ONLY switch for `/work`'s mode.** There is no env-var override. Projects that need to toggle it per invocation edit `workflow.yaml`.
- **Suggestions are advice, not actions.** `/work` prints plans and reports; the user runs `/ship` and any follow-up fix commands.