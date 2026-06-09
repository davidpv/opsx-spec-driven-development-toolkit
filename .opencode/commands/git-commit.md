---
description: Create a semantic (conventional) commit traced to the current OpenSpec change
---

Create a conventional commit for the staged/pending work. `$ARGUMENTS` may name the change; otherwise infer it from the current branch (`feature/<change>` per `workflow.yaml`).

**Steps**

1. Read `workflow.yaml` (`git.commit_convention`, `git.commit_scope_from`, `git.branch_prefix`). Run `git status` and `git diff` to see what changed. If nothing changed, say so and stop.

2. Identify the OpenSpec change and which `tasks.md` task(s) this work completes. If the diff mixes unrelated concerns, propose splitting into multiple commits and stage selectively (`git add -p` by file groups).

3. Build the message:
   - **type**: feat | fix | refactor | test | docs | chore — from the nature of the diff, not the task title.
   - **scope**: the change name (or a tighter module name if obvious).
   - **subject**: imperative, ≤72 chars.
   - **body**: what & why, wrapped at 72.
   - **footer**: `Change: <change-name>` and `Task: <task number(s)>`; add `Story: US-NNN` if the change's proposal references one. `BREAKING CHANGE:` when applicable.

4. Show the message, commit on approval, then tick the completed task(s) in `tasks.md` and amend or include that in the commit.

Never commit directly to `main` or the integration branch — if on one of them, offer to create `feature/<change>` first.
