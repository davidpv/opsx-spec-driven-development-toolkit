---
description: Create a semantic (conventional) commit traced to the current OpenSpec change
---

Create one or more semantically organized conventional commits for the staged/pending work. `$ARGUMENTS` may name the change; otherwise infer it from the current branch — `feature/<change>` or `feature/<task id>-<change>` per `workflow.yaml` (strip a leading Jira key like `PROJ-123-` before matching against `openspec/changes/`).

In worktree mode (default), this command runs **inside the worktree** at `<worktree-dir>/<change>/`. The traceability footers and commit conventions are identical; only the working directory differs.

**Steps**

1. Read `workflow.yaml` (`git.commit_convention`, `git.commit_scope_from`, `git.branch_prefix`, `git.worktree.dir`). Run `git status` and `git diff` to see what changed. If nothing changed, say so and stop.

2. Identify the OpenSpec change and which `tasks.md` task(s) this work completes. If the diff mixes unrelated concerns, propose splitting into multiple commits and stage selectively (`git add -p` by file groups).

3. Build the messages:
   - **type**: feat | fix | refactor | test | docs | chore — from the nature of the diff, not the task title.
   - **scope**: the change name (or a tighter module name if obvious).
   - **subject**: imperative, ≤72 chars.
   - **body**: what & why, wrapped at 72.
   - **footer**: `Change: <change-name>` and `Task: <tasks.md step number(s)>`; add `Jira: <task id>` (e.g. `PROJ-123`) if the change is linked to a backlog task. `BREAKING CHANGE:` when applicable.

4. Show the messages, commit on approval, then tick the completed task(s) in `tasks.md` and amend or include that in the commit.

5. Suggest the next step: if `tasks.md` has unchecked steps, `/opsx:apply` to continue; if all are done, `/opsx:verify` then `/ship` (single-change mode) or `/ship <change>` and inspect reports (multi-agent mode).

**Branch policy (`git.work_mode` in `workflow.yaml`)**

This is the safety net. `/opsx:apply` already enforces the worktree-or-feature gate before any edit; `/git-commit` re-checks at commit time so an out-of-band agent or a missed step cannot accidentally commit to the wrong branch.

- On `main`: never commit. Offer to switch to the integration branch or to the worktree for the relevant change.
- On the integration branch (e.g. `develop`) — only allowed in narrow cases:
  - If `work_mode: flexible`, the user is committing code directly; confirm with the user the first time in the session.
  - Otherwise (commit happened during propose/apply/verify/archive), check that the staged changes match the expected kind: proposal/design/tasks/specs during propose, an archive commit during `/ship`, a verification record during verify. If anything else is staged, refuse.
- On `feature/<change>` outside a worktree (the `feature` mode): commit normally.
- Inside a worktree at `<worktree-dir>/<change>/` on `feature/<change>` (the default): commit normally. The current branch — not the directory — is the source of truth for the gate.
- When creating a feature branch: look up the linked task (frontmatter `change:` match in `backlog/tasks/`); if found and its `id` is a real Jira key (not a `-Dnn` draft), name the branch `feature/<id>-<change>`, otherwise `feature/<change>`.