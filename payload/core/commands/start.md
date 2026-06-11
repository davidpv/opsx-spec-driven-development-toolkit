---
description: Guided entry point — find out how this work starts and route to the right first command
---

Single entry point for new work. Figure out which of the three starting situations applies and route the user there. `$ARGUMENTS` may hint at the topic or a Jira key; use it to preselect answers, never to skip the questions.

**Steps**

1. **Quick state check** (fast, no deep inspection): `git branch --show-current`, in-flight changes in `openspec/changes/` (excluding `archive/`), tasks in `backlog/tasks/` with `status` other than `done`.
   - If `$ARGUMENTS` matches an existing task or change, or the current branch maps to an in-flight change → this is not new work. Run the `/next` logic instead and stop.
   - If there is other unrelated in-flight work, mention it in one line ("FYI: PROJ-123 is in progress") but continue — starting something new is allowed.

2. **Entry question.** Ask with **AskUserQuestion**: *"How does this work start?"*
   - **A. A Jira ticket already exists** — the work is already defined in Jira.
   - **B. No ticket — investigate or propose directly** — technical change or exploration; no backlog tracking needed (it can be linked later).
   - **C. No ticket — create the task first** — the work must exist in the backlog/Jira before any spec or code.

3. **Route by answer.** The user's selection counts as asking to proceed, so run the routed command's logic directly:

   - **A →** ask for the Jira key (e.g. `PROJ-123`) if not in `$ARGUMENTS`, then run `/task-import <key>`.
   - **B →** ask one follow-up with **AskUserQuestion**: does the user already know what to change?
     - Yes, the change is clear → `/opsx:propose <name>` (ask for a short kebab-case change name).
     - No, needs investigation first → `/opsx:explore`, reminding that it ends by suggesting `/opsx:propose`.
   - **C →** ask one follow-up with **AskUserQuestion**: initiative or single task?
     - **Initiative** (several tasks, requirements unclear) → `/req-capture <topic>`, then `/task-generate`.
     - **Single task** (one verifiable outcome, scope clear) → `/task-new <title>`.

4. **Never skip the gates downstream.** Whatever the route, the golden rule holds: no code until an OpenSpec change exists, is reviewed, and the branch gate is resolved. `/start` only chooses the on-ramp.

**Output format:** after routing, one line stating the situation chosen and the command now running. If the user aborts the questions, list the three routes with their commands so they can invoke one manually.
