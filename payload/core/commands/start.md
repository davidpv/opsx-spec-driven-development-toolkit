---
description: Guided entry point — find out how this work starts, route to the right first command, and chain into the worktree when applicable
---

Single entry point for new work. Figure out which of the three starting situations applies and route the user there. `$ARGUMENTS` may hint at the topic or a Jira key; use it to preselect answers, never to skip the questions.

After a route is chosen, `/start` chains the downstream steps automatically so the user ends with either a worktree ready to implement or a proposal on the integration branch waiting for review. No separate `/task-generate` then `/opsx:propose` then `/opsx:apply` — `/start` walks the path.

**Steps**

1. **Quick state check** (fast, no deep inspection):
   ```bash
   git branch --show-current
   git worktree list
   ```
   In-flight changes in `openspec/changes/` (excluding `archive/`); tasks in `backlog/tasks/` with `status` other than `done`.
   - If `$ARGUMENTS` matches an existing task or change, or the current branch maps to an in-flight change → this is not new work. Run the `/next` logic instead and stop.
   - If there is other unrelated in-flight work, mention it in one line ("FYI: PROJ-123 is in progress") but continue — starting something new is allowed.

2. **Entry question.** Ask with **AskUserQuestion**: *"How does this work start?"*
   - **A. A Jira ticket already exists** — the work is already defined in Jira.
   - **B. No ticket — investigate or propose directly** — technical change or exploration; no backlog tracking needed (it can be linked later).
   - **C. No ticket — create the task first** — the work must exist in the backlog/Jira before any spec or code.

3. **Route by answer.** The user's selection counts as asking to proceed, so run the routed command's logic directly:

   - **A →** ask for the Jira key (e.g. `PROJ-123`) if not in `$ARGUMENTS`, then run `/task-import <key>`. After the task lands in `backlog/tasks/`, ask the user whether to also propose now (so the user ends in a worktree ready to implement, or with the proposal ready for review).
     - If yes: chain into `/opsx:propose <name>` (inferring or asking for a kebab-case change name; if the task has a real Jira key, use `feature/<key>-<change>` as the worktree branch).
     - Then chain into `/opsx:apply <name>` (which creates the worktree) — confirm with the user the first time in the session.
     - **Never skip the gates downstream.** Propose must run on the integration branch; apply creates the worktree.

   - **B →** ask one follow-up with **AskUserQuestion**: does the user already know what to change?
     - Yes, the change is clear → `/opsx:propose <name>` (ask for a short kebab-case change name). After artifacts land on the integration branch, suggest `/review-change <name>` and `/opsx:apply <name>` (which creates the worktree) — but do not run them silently without the user's go.
     - No, needs investigation first → `/opsx:explore`, reminding that it ends by suggesting `/opsx:propose`.

   - **C →** ask one follow-up with **AskUserQuestion**: initiative or single task?
     - **Initiative** (several tasks, requirements unclear) → `/req-capture <topic>`, then chain into `/task-generate <topic>` (which lists the resulting task IDs), then `/opsx:propose` per task — confirm with the user the first time you do this in a session.
     - **Single task** (one verifiable outcome, scope clear) → `/task-new <title>`. After the task lands, ask the user whether to also propose now; if yes, chain into `/opsx:propose <name>` then `/opsx:apply <name>` (which creates the worktree).

4. **Never skip the gates downstream.** Whatever the route, the golden rule holds: no code until an OpenSpec change exists, is reviewed, and the working branch (worktree or feature branch) is resolved. `/start` only chooses the on-ramp and walks the first steps of the chain — the user confirms before any commit or worktree creation happens.

5. **After `/start` finishes a chain**, print a one-line summary: where the user ended up (worktree path + branch, or proposal on the integration branch), and what the suggested next step is (almost always `/next` to keep going, or `/review-change` if a proposal was created on `develop`).

**Output format:** after routing, one line stating the situation chosen and the command now running. If the user aborts the questions, list the three routes with their commands so they can invoke one manually.