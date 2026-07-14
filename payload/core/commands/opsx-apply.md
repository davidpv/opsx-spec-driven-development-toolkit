---
description: Implement tasks from an OpenSpec change inside a git worktree (or feature branch)
---

Implement tasks from an OpenSpec change. Operates inside a git worktree by default (one worktree per change), so multiple changes can be built in parallel without disturbing `develop` or each other.

**Input**: Optionally specify a change name (e.g., `/opsx-apply add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` to get available changes and use the **AskUserQuestion tool** to let the user select

   Always announce: "Using change: <name>" and how to override (e.g., `/opsx-apply <other>`).

2. **Check status to understand the schema**

   ```bash
   openspec status --change "<name>" --json
   ```

   Parse the JSON to understand:
   - `schemaName`: The workflow being used (e.g., "spec-driven")
   - `planningHome`, `changeRoot`, and `actionContext`: planning scope and edit constraints
   - Which artifact contains the tasks (typically "tasks" for spec-driven, check status for others)

   **If `state: "blocked"`**: show message, suggest using `/opsx:propose` to finish the artifacts.

3. **Resolve the working branch (worktree-or-feature gate)**

   Read `git.work_mode` from `workflow.yaml`. Three cases:

   - **`worktree` (default)** — Create (or reuse) the worktree for this change:
     1. Compute the worktree path: `git.worktree.dir` (default `.worktrees`) joined with the change name, e.g. `.worktrees/<change>/`.
     2. Compute the worktree branch: `feature/<change>` (or `feature/<task-id>-<change>` if `backlog/tasks/*.md` has a linked task with a real Jira key, not a `-Dnn` draft).
     3. Compute the base branch: `git.worktree.base_branch` or `git.integration_branch` (default `develop`).
     4. If the worktree already exists at that path (`git worktree list | grep <path>`), reuse it: `cd <worktree-path>` and continue. Otherwise create it:
        ```bash
        git worktree add "<worktree-dir>/<change>" -b "<worktree-branch>" "<base-branch>"
        ```
     5. Run all subsequent file edits and shell commands inside `<worktree-dir>/<change>/`. Use absolute paths or `cd` first; do NOT edit files in the main checkout.
     6. If `git worktree add` fails (e.g., the feature branch already exists from a previous attempt), refuse and tell the user to either pick a different change name, or run `git worktree remove` on the stale path first.

   - **`feature`** — Plain feature branch, no worktree:
     1. Refuse if current branch is `main` or `develop`. Ask for the Jira ID (if the change is linked to a backlog task) and create/switch to `feature/<task-id>-<change>` or `feature/<change>`.
     2. All edits happen in the main checkout on that branch.

   - **`flexible`** — Ask with **AskUserQuestion** where to implement:
     - Feature branch (recommended)
     - Directly on the integration branch

   In all cases, **never implement on `main`**. Refuse outright and stop.

4. **Get apply instructions**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   This returns:
   - `contextFiles`: artifact ID -> array of concrete file paths (varies by schema - could be proposal/specs/design/tasks or spec/tests/implementation/docs)
   - Progress (total, complete, remaining)
   - Task list with status
   - Dynamic instruction based on current state

   **Handle states:**
   - If `state: "blocked"` (missing artifacts): show message, suggest using `/opsx:continue`
   - If `state: "all_done"`: congratulate, suggest `/opsx:verify` then `/ship`
   - Otherwise: proceed to implementation

   **Workspace guard:** If status JSON reports `actionContext.mode: "workspace-planning"` and `allowedEditRoots` is empty, explain that full workspace apply is not supported in this slice. Treat linked repos and folders as read-only context, ask the user to select an affected area through an explicit implementation workflow, and STOP before editing files.

5. **Read context files**

   Read every file path listed under `contextFiles` from the apply instructions output. The files depend on the schema being used:
   - **spec-driven**: proposal, specs, design, tasks
   - Other schemas: follow the `contextFiles` from CLI output

6. **Show current progress**

   Display:
   - Schema being used
   - Progress: "N/M tasks complete"
   - Remaining tasks overview
   - Dynamic instruction from CLI
   - Working directory: `<worktree-dir>/<change>/` (so the user knows where the edits will land)

7. **Implement tasks (loop until done or blocked)**

   For each pending task:
   - Show which task is being worked on
   - Make the code changes required (inside the worktree / feature branch)
   - Keep changes minimal and focused
   - Mark task complete in the tasks file: `- [ ]` → `- [x]`
   - **Never run `git commit` automatically.** At each task boundary, suggest `/git-commit` so the user reviews the message and finalizes the commit themselves. The commit must happen before moving to the next task — this is the recovery point pattern, but the LLM does not create the commit; the user does via `/git-commit`.

   **Pause if:**
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - Error or blocker encountered → report and wait for guidance
   - User interrupts

8. **On completion or pause, show status**

   Display:
   - Tasks completed this session
   - Overall progress: "N/M tasks complete"
   - Working branch and worktree path
   - If all done: suggest `/opsx:verify <change>` (in the worktree)
   - If paused: explain why and wait for guidance

**Output During Implementation**

```
## Implementing: <change-name> (schema: <schema-name>)

Worktree: <worktree-dir>/<change>/ on branch <worktree-branch>

Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete — next: /git-commit (LLM does not auto-commit; user reviews and runs /git-commit)
```

**Output On Completion**

```
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Worktree:** <worktree-dir>/<change>/
**Branch:** <worktree-branch>
**Progress:** 7/7 tasks complete ✓

### Completed This Session
- [x] Task 1
- [x] Task 2
...

All tasks complete. Next: `/opsx:verify <change>` (run inside the worktree), then `/ship <change>`.
```

**Output On Pause (Issue Encountered)**

```
## Implementation Paused

**Change:** <change-name>
**Worktree:** <worktree-dir>/<change>/

**Issue Encountered**
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

**Guardrails**

- Keep going through tasks until done or blocked
- Always read context files before starting (from the apply instructions output)
- If task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task
- Update task checkbox immediately after completing each task
- Pause on errors, blockers, or unclear requirements - don't guess
- Use contextFiles from CLI output, don't assume specific file names
- **All edits MUST happen inside the worktree** (or feature branch) — never in the main checkout for another change
- **Never run `git commit`.** Suggest `/git-commit` at every task boundary so the user creates the commit themselves — never edit the next task on top of an uncommitted state, but never commit on the user's behalf either.

**Fluid Workflow Integration**

This skill supports the "actions on a change" model:

- **Can be invoked anytime**: Before all artifacts are done (if tasks exist), after partial implementation, interleaved with other actions
- **Allows artifact updates**: If implementation reveals design issues, suggest updating artifacts - not phase-locked, work fluidly