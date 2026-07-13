---
description: Fan out independent changes to SubAgents in parallel worktrees; verify and report back (does not merge)
---

`/work` is the multi-agent entrypoint. It runs the same daily commands (`/opsx:apply`, `/opsx:verify`) but **delegates each change to its own SubAgent in its own git worktree**, in parallel. SubAgents do **not** merge — they apply, verify, and report. The user inspects each report, then runs `/ship <change>` per change in sequence.

This is the workflow described in https://intent-driven.dev/blog/2026/04/01/openspec-git-worktrees-opencode/. Use it when you have multiple independent changes ready to implement.

**Input**: `$ARGUMENTS` is an optional list of change names (e.g., `/work add-auth speed-up-search`). If omitted, all active changes that have completed proposal + review are considered.

**Steps**

1. **Pre-flight check**

   - SubAgent support: confirm the runtime supports SubAgents. If the user is on an agent that doesn't (e.g., a constrained Codex config or CI without task delegation), refuse with a clear message: *"Multi-agent worktrees need SubAgent support. Use sequential `/opsx:apply` per change instead."*
   - Read `git.work_mode` and `git.worktree.dir` from `workflow.yaml`. If `work_mode != worktree`, refuse and tell the user to set `git.work_mode: worktree` in `workflow.yaml` first — `/work` requires worktrees (one per SubAgent).
   - Confirm the user is on the integration branch (`develop`). `/work` coordinates the SubAgents from `develop`; running inside a worktree would mean coordinating from the wrong view.

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

4. **For each parallel group, fan out to SubAgents**

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
      - Commit at every logical boundary using `/git-commit` (suggested, user-style). Footers must include `Change: <change>` and `Task: <tasks.md step number>`.
   8. Pause and report if a task is genuinely ambiguous — do NOT invent answers.

   ## Verify
   9. Run `/opsx:verify <change>` inside the worktree. This generates a CRITICAL/WARNING/SUGGESTION report and writes it to `<worktree-dir>/<change>/.openspec/verify-<timestamp>.md`. Commit that record.
   10. CRITICAL issues must be fixed before you report back — iterate on tasks until verify is clean or only WARNING/SUGGESTION remain.

   ## Report
   11. Report back to the coordinator:
       - Worktree path + branch
       - Number of tasks completed
       - Final verification assessment (CRITICAL / WARNING / SUGGESTION counts)
       - Suggested `/ship <change>` command

   ## DO NOT
   - DO NOT run `/ship`, `/opsx:archive`, or any merge command.
   - DO NOT touch the main checkout.
   - DO NOT switch branches — stay on `feature/<change>` in your worktree.
   - DO NOT delete the worktree when you finish.
   ```

5. **Aggregate reports**

   When all parallel SubAgents report back, the coordinator prints a summary:

   ```
   ## /work reports

   | Change | Worktree | Tasks | Verify | Action |
   |--------|----------|-------|--------|--------|
   | add-auth | .worktrees/add-auth/ | 6/6 ✓ | Clean | `/ship add-auth` |
   | speed-up-search | .worktrees/speed-up-search/ | 4/5 ⚠ | 0 CRITICAL, 2 WARNING | review warnings, then `/ship speed-up-search` |
   | refactor-errors | .worktrees/refactor-errors/ | 3/7 ✗ | 1 CRITICAL | re-run `/work refactor-errors` to fix + re-verify |
   ```

6. **What the user does next**

   The coordinator suggests the user:
   - For each change with a clean verify, run `/ship <change>` to merge + archive + close.
   - For each change with WARNING/SUGGESTION, review and decide whether to ship or re-run `/work <change>` to iterate.
   - For each change with a CRITICAL issue, re-run `/work <change>` to fix and re-verify it in its worktree.

   `/ship` is run **per change, in sequence**, so each merge + archive sees the right view of `develop`. Running `/ship` for change A first means change B's archive runs against a `develop` that already contains A's specs — matches the merge → archive discipline.

**Output On Start**

```
## /work — parallel build plan

<grouping from step 3>

I'll now spawn <N> SubAgents, each in its own worktree, to apply + verify in parallel. SubAgents do not merge. After they report, you run `/ship <change>` per change in sequence.

Proceed? [Y/n]
```

**Output On Completion (parallel group)**

```
## /work reports

<table from step 5>

Next: inspect each row, then run `/ship <change>` per change in sequence.
```

**Guardrails**

- **Always confirm the parallel plan with the user before spawning agents.** Users have the right to drop conflicts from the group.
- **Always confirm the user is on the integration branch** before spawning. Coordinating from inside a worktree would corrupt the merge order.
- **SubAgents MUST NOT merge.** Their only writes are inside their own worktree and the verification record. Re-state this in the SubAgent prompt.
- **Serialise merges, not implementation.** `/work` parallelises the apply+verify phase; the merge phase stays sequential and human-controlled via `/ship`.
- **If a SubAgent reports CRITICAL issues**, do not include that change in the suggested next step table's "Action" column — recommend fixing it instead.
- **Suggestions are advice, not actions.** `/work` prints plans and reports; the user runs `/ship` and any follow-up fix commands.