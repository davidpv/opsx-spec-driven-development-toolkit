---
description: Guided requirements elicitation — produces a discovery doc in backlog/discovery/
---

Capture requirements for the topic `$ARGUMENTS` through a structured interview, and write the result to `backlog/discovery/<topic>.md` using `templates/discovery.md`.

**Steps**

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

5. Suggest the next step: `/task-generate <topic>`.
