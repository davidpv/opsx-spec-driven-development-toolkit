---
description: Guided requirements elicitation — produces a discovery doc in backlog/discovery/ on the integration branch
---

Capture requirements for the topic `$ARGUMENTS` through a structured interview, and write the result to `backlog/discovery/<topic>.md` using `templates/discovery.md`.

> **Branch guard (mandatory).** This command MUST run on the integration branch (`develop`, configured as `git.integration_branch` in `workflow.yaml`). It MUST NOT run inside a git worktree. Discovery docs are management-plane planning artifacts and live alongside OpenSpec changes on `develop` — never in a worktree.

**Steps**

0. **Branch guard**

   ```bash
   git branch --show-current
   git worktree list
   pwd
   ```

   - Read `git.integration_branch` from `workflow.yaml`.
   - If the current branch is not the integration branch, refuse and tell the user to `git checkout <integration_branch>` first.
   - If `git worktree list` shows the working dir is inside a worktree, refuse and tell the user to run this from the main checkout.

1. If no topic was given, ask what problem or initiative we are exploring. Derive a kebab-case topic name.

2. Interview the user with the **AskUserQuestion tool**, one round at a time, covering in order:
   - Who are the stakeholders/users affected, and what is the problem today?
   - What does success look like? (measurable if possible)
   - Functional needs — what must the system let users do?
   - Non-functional needs — performance, security, compliance, availability.
   - Constraints, assumptions, and explicit non-goals.

   Ask follow-ups when an answer is vague ("fast" → "fast meaning what latency, for how many users?"). Stop when each template section has substance or the user says "enough".

3. Read `openspec/specs/` and note any existing requirements that overlap or conflict; record them under **Constraints & assumptions**.

4. Write `backlog/discovery/<topic>.md` from `templates/discovery.md`. Unanswered items go to **Open questions** — never invent answers.

5. **Stage and suggest `/git-commit` (no auto-commit)**

   > **Never run `git commit` automatically.** All commits are user-driven. Stage the discovery doc on `develop` and suggest `/git-commit` for the user to finalize.

   ```bash
   git add backlog/discovery/<topic>.md
   ```

   The user runs `/git-commit` to review the message and create the commit.

6. Suggest the next step: `/task-generate <topic>`.