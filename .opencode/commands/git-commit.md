---
description: Create a semantic (conventional) commit traced to the current OpenSpec change
---

Create a conventional commit for the staged/pending work. `$ARGUMENTS` may name the change; otherwise infer it from the current branch — `feature/<change>` or `feature/<task id>-<change>` per `workflow.yaml` (strip a leading Jira key like `PROJ-123-` before matching against `openspec/changes/`).

**Steps**

1. Read `workflow.yaml` (`git.commit_convention`, `git.commit_scope_from`, `git.branch_prefix`). Run `git status` and `git diff` to see what changed. If nothing changed, say so and stop.

2. Identify the OpenSpec change and which `tasks.md` task(s) this work completes. If the diff mixes unrelated concerns, propose splitting into multiple commits and stage selectively (`git add -p` by file groups).

3. Build the message:
   - **type**: feat | fix | refactor | test | docs | chore — from the nature of the diff, not the task title.
   - **scope**: the change name (or a tighter module name if obvious).
   - **subject**: imperative, ≤72 chars.
   - **body**: what & why, wrapped at 72.
   - **footer**: `Change: <change-name>` and `Task: <tasks.md step number(s)>`; add `Jira: <task id>` (e.g. `PROJ-123`) if the change is linked to a backlog task. `BREAKING CHANGE:` when applicable.

4. Show the message, commit on approval, then tick the completed task(s) in `tasks.md` and amend or include that in the commit.

Branch policy (`git.work_mode` in `workflow.yaml`):
- On `main`: never commit. Offer to switch to the integration branch or create a feature branch.
- On the integration branch: allowed if `work_mode: flexible` (confirm with the user the first time in the session); if `work_mode: feature`, offer to create a feature branch first.
- When creating a feature branch: look up the linked task (frontmatter `change:` match in `backlog/tasks/`); if found and its `id` is a real Jira key (not a `-Dnn` draft), name the branch `feature/<id>-<change>`, otherwise `feature/<change>`.
- On a feature branch: commit normally.
