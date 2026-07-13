---
description: Guided entry point — find out how this work starts, route to the right first command, and chain up to a reviewed proposal ready for /work
---

Single entry point for new work. Figure out which of the three starting situations applies and route the user there. `$ARGUMENTS` may hint at the topic or a Jira key; use it to preselect answers, never to skip the questions.

After a route is chosen, `/start` chains the downstream setup automatically so the user ends with a reviewed proposal on the integration branch, ready to build with `/work`. No separate `/task-generate` then `/opsx:propose` — `/start` walks the path up to the proposal. `/start` does NOT build: once the proposal is ready, the next step is always `/work` (build) and then `/ship` (close). Keep the user on the `/start → /work → /ship` path; never hand them a low-level `/opsx:*` command as the next step.

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

   - **A →** ask for the Jira key (e.g. `PROJ-123`) if not in `$ARGUMENTS`, then run `/task-import <key>`. After the task lands in `backlog/tasks/`, ask the user whether to also propose now (so the user ends with a reviewed proposal ready for `/work`).
     - If yes: chain into `/opsx:propose <name>` (inferring or asking for a kebab-case change name; if the task has a real Jira key, the build branch will be `feature/<key>-<change>`).
     - Then suggest `/work <name>` to build it — do not build here.
     - **Never skip the gates downstream.** Propose must run on the integration branch; `/work` creates the worktree.

   - **B →** ask one follow-up with **AskUserQuestion**: does the user already know what to change?
     - Yes, the change is clear → `/opsx:propose <name>` (ask for a short kebab-case change name). After artifacts land on the integration branch, suggest `/work <name>` to build — do not build silently.
     - No, needs investigation first → `/opsx:explore`, reminding that it ends by suggesting `/opsx:propose`.

   - **C →** ask one follow-up with **AskUserQuestion**: initiative or single task?
     - **Initiative** (several tasks, requirements unclear) → `/req-capture <topic>`, then chain into `/task-generate <topic>` (which lists the resulting task IDs), then `/opsx:propose` per task — confirm with the user the first time you do this in a session. Once proposals are ready, suggest `/work`.
     - **Single task** (one verifiable outcome, scope clear) → `/task-new <title>`. After the task lands, ask the user whether to also propose now; if yes, chain into `/opsx:propose <name>`, then suggest `/work <name>`.

4. **Never skip the gates downstream.** Whatever the route, the golden rule holds: no code until an OpenSpec change exists, is reviewed, and the working branch (worktree or feature branch) is resolved. `/start` only chooses the on-ramp and walks the first steps of the chain — the user confirms before any commit or worktree creation happens.

5. **After `/start` finishes a chain**, print a one-line summary: where the user ended up (a reviewed proposal on the integration branch), and the suggested next step — always `/work <name>` to build it (or `/next` if the user wants to double-check the state first).

**Output format:** after routing, one line stating the situation chosen and the command now running. If the user aborts the questions, list the three routes with their commands so they can invoke one manually.