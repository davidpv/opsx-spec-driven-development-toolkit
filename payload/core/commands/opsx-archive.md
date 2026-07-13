---
description: Archive a completed change — runs on the integration branch, after the worktree branch has merged
---

Archive a completed change. The delta specs merge into `openspec/specs/`, the source of truth.

> **Branch guard — non-negotiable.** `/opsx:archive` MUST run on the integration branch (`develop`, configured as `git.integration_branch` in `workflow.yaml`). It MUST NOT run on a feature branch or inside a worktree. The spec-sync needs the full view of every other merged change to detect conflicts; running it on a worktree branch would blind it to that context and produce spec drift.
>
> **Order discipline.** Archive runs **after** the worktree branch has been merged into the integration branch (i.e., after `/ship` step 3). The flow is **merge → archive**, in that order, every time. This command is what `/ship` calls internally between merge and cleanup.

**Input**: Optionally specify a change name after `/opsx-archive` (e.g., `/opsx-archive add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

0. **Branch guard**

   ```bash
   git branch --show-current
   git worktree list
   ```

   - Read `git.integration_branch` from `workflow.yaml`.
   - If the current branch is not the integration branch, refuse and tell the user to `git checkout <integration_branch>` first.
   - If `git worktree list` shows the working dir is inside a worktree, refuse and tell the user to run this from the main checkout, not from inside a worktree path.

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show only active changes (not already archived).
   Include the schema used for each change if available.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check artifact completion status**

   Run `openspec status --change "<name>" --json` to check artifact completion.

   Parse the JSON to understand:
   - `schemaName`: The workflow being used
   - `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`: path and scope context
   - `artifacts`: List of artifacts with their status (`done` or other)

   If status reports `actionContext.mode: "workspace-planning"`, explain that workspace archive is not supported in this slice and STOP. Do not move workspace changes into repo-local archives or edit linked repos.

   **If any artifacts are not `done`:**
   - Display warning listing incomplete artifacts
   - Prompt user for confirmation to continue
   - Proceed if user confirms

3. **Check task completion status**

   Read the tasks file (typically `tasks.md`) to check for incomplete tasks.

   Count tasks marked with `- [ ]` (incomplete) vs `- [x]` (complete).

   **If incomplete tasks found:**
   - Display warning showing count of incomplete tasks
   - Prompt user for confirmation to continue
   - Proceed if user confirms

   **If no tasks file exists:** Proceed without task-related warning.

4. **Assess delta spec sync state**

   Use `artifactPaths.specs.existingOutputPaths` from status JSON to check for delta specs. If none exist, proceed without sync prompt.

   **If delta specs exist:**
   - Compare each delta spec with its corresponding main spec at `openspec/specs/<capability>/spec.md`
   - Determine what changes would be applied (adds, modifications, removals, renames)
   - Show a combined summary before prompting

   **Prompt options:**
   - If changes needed: "Sync now (recommended)", "Archive without syncing"
   - If already synced: "Archive now", "Sync anyway", "Cancel"

   If user chooses sync, use the **Skill tool** to invoke `openspec-sync-specs` for change `<name>` (agent-driven). Proceed to archive regardless of choice.

5. **Perform the archive**

   Create an `archive` directory under `planningHome.changesDir` if it doesn't exist:

   ```bash
   mkdir -p "<planningHome.changesDir>/archive"
   ```

   Generate target name using current date: `YYYY-MM-DD-<change-name>`

   **Check if target already exists:**
   - If yes: Fail with error, suggest renaming existing archive or using different date
   - If no: Move `changeRoot` to the archive directory

   ```bash
   mv "<changeRoot>" "<planningHome.changesDir>/archive/YYYY-MM-DD-<name>"
   ```

6. **Commit the archive result on the integration branch**

   The spec-sync is a meaningful state change. Commit it so the next proposal sees the updated `openspec/specs/`:

   ```bash
   git add openspec/specs/
   git commit -m "chore(<change>): archive openspec change"
   ```

   Skip if the user has already committed or asks to defer.

7. **Display summary**

   Show archive completion summary including:
   - Change name
   - Schema that was used
   - Archive location
   - Whether specs were synced (if applicable)
   - Note about any warnings (incomplete artifacts/tasks)

**Output On Success**

```
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** the archive path derived from `planningHome.changesDir`/YYYY-MM-DD-<name>/
**Specs:** ✓ Synced to main specs and committed on <integration_branch>

All artifacts complete. All tasks complete.
```

**Output On Error (Archive Exists)**

```
## Archive Failed

**Change:** <change-name>
**Target:** the archive path derived from `planningHome.changesDir`/YYYY-MM-DD-<name>/

Target archive directory already exists.

**Options:**
1. Rename the existing archive
2. Delete the existing archive if it's a duplicate
3. Wait until a different date to archive
```

**Guardrails**

- **Always run the branch guard first.** Refuse and exit if the working branch or working dir is wrong.
- Always prompt for change selection if not provided
- Use artifact graph (`openspec status --json`) for completion checking
- Don't block archive on warnings - just inform and confirm
- Preserve `.openspec.yaml` when moving to archive (it moves with the directory)
- Show clear summary of what happened
- If sync is requested, use the Skill tool to invoke `openspec-sync-specs` (agent-driven)
- If delta specs exist, always run the sync assessment and show the combined summary before prompting
- The final spec-sync commit lands on the integration branch, not on the worktree branch